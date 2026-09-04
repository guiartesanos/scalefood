// Conexão com o Google Drive (OAuth) — usada pelo Gerador de Conteúdo
// pra buscar imagens do usuário relacionadas ao tema do carrossel.
// Um único registro guarda o token da conta pessoal conectada.

import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/server";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const SCOPE = "https://www.googleapis.com/auth/drive.readonly";

function redirectUri(): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return `${base}/api/google-drive/callback`;
}

// Nonce anti-CSRF: sem isso, um code obtido pelo próprio atacante (numa
// conta Google dele, contra o mesmo client_id/redirect_uri — ambos
// públicos) podia ser trocado só levando o master a abrir um GET pro
// callback, sequestrando a conexão pra conta do atacante.
export function gerarState(): string {
  return crypto.randomBytes(24).toString("hex");
}

export function getGoogleDriveAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_DRIVE_CLIENT_ID!,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: SCOPE,
    state,
    access_type: "offline",
    prompt: "consent",
  });
  return `${AUTH_URL}?${params.toString()}`;
}

export async function trocarCodigoPorToken(code: string): Promise<void> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_DRIVE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_DRIVE_CLIENT_SECRET!,
      redirect_uri: redirectUri(),
      grant_type: "authorization_code",
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.error || "Falha ao conectar com o Google Drive.");

  const supabase = createAdminClient();
  await supabase.from("google_drive_conexao").upsert({
    id: 1,
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
  });
}

async function renovarToken(refreshToken: string): Promise<{ access_token: string; expires_in: number }> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_DRIVE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_DRIVE_CLIENT_SECRET!,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.error || "Falha ao renovar o token do Google Drive.");
  return data;
}

// Token válido pra chamar a API do Drive — renova sozinho se tiver
// vencido, sem precisar o usuário reconectar toda vez.
async function getValidAccessToken(): Promise<string | null> {
  const supabase = createAdminClient();
  const { data: conexao } = await supabase.from("google_drive_conexao").select("*").eq("id", 1).maybeSingle();
  if (!conexao) return null;

  if (new Date(conexao.expires_at).getTime() > Date.now() + 60_000) {
    return conexao.access_token;
  }

  const renovado = await renovarToken(conexao.refresh_token);
  await supabase
    .from("google_drive_conexao")
    .update({
      access_token: renovado.access_token,
      expires_at: new Date(Date.now() + renovado.expires_in * 1000).toISOString(),
    })
    .eq("id", 1);
  return renovado.access_token;
}

export async function driveConectado(): Promise<boolean> {
  const supabase = createAdminClient();
  const { data } = await supabase.from("google_drive_conexao").select("id").eq("id", 1).maybeSingle();
  return !!data;
}

export interface ImagemDrive {
  id: string;
  nome: string;
  thumbnailLink: string | null;
  webViewLink: string | null;
}

// Busca imagens no Drive cujo nome bate com as palavras do tema —
// simples e rápido, sem precisar indexar nada por fora.
export async function buscarImagensDrive(termo: string): Promise<ImagemDrive[]> {
  const token = await getValidAccessToken();
  if (!token) throw new Error("Google Drive não conectado.");

  const palavras = termo
    .split(/\s+/)
    .filter((p) => p.length > 3)
    .slice(0, 5);
  const condicoes = palavras.map((p) => `name contains '${p.replace(/'/g, "")}'`).join(" or ");
  const q = `mimeType contains 'image/' and trashed = false${condicoes ? ` and (${condicoes})` : ""}`;

  const params = new URLSearchParams({
    q,
    fields: "files(id,name,thumbnailLink,webViewLink)",
    pageSize: "12",
  });

  const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "Erro ao buscar imagens no Drive.");
  return (data.files || []) as ImagemDrive[];
}
