// Conexão com a Connect API do Canva (OAuth com PKCE) — usada pelo
// Gerador de Conteúdo pra preencher os modelos de carrossel sozinha
// (Autofill API), sem precisar montar o design na mão.

import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/server";

const AUTH_URL = "https://www.canva.com/api/oauth/authorize";
const TOKEN_URL = "https://api.canva.com/rest/v1/oauth/token";
const API_BASE = "https://api.canva.com/rest/v1";

const SCOPES = [
  "asset:read",
  "asset:write",
  "brandtemplate:content:read",
  "brandtemplate:meta:read",
  "design:content:read",
  "design:content:write",
  "design:meta:read",
].join(" ");

function redirectUri(): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return `${base}/api/canva/callback`;
}

function base64url(input: Buffer): string {
  return input.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function gerarPkce(): { verifier: string; challenge: string } {
  const verifier = base64url(crypto.randomBytes(64));
  const challenge = base64url(crypto.createHash("sha256").update(verifier).digest());
  return { verifier, challenge };
}

export function getCanvaAuthUrl(codeChallenge: string): string {
  const params = new URLSearchParams({
    client_id: process.env.CANVA_CLIENT_ID!,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: SCOPES,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });
  return `${AUTH_URL}?${params.toString()}`;
}

function basicAuthHeader(): string {
  return "Basic " + Buffer.from(`${process.env.CANVA_CLIENT_ID}:${process.env.CANVA_CLIENT_SECRET}`).toString("base64");
}

export async function trocarCodigoPorTokenCanva(code: string, verifier: string): Promise<void> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: basicAuthHeader(),
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      code_verifier: verifier,
      redirect_uri: redirectUri(),
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.error || "Falha ao conectar com o Canva.");

  const supabase = createAdminClient();
  await supabase.from("canva_conexao").upsert({
    id: 1,
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
  });
}

async function renovarTokenCanva(refreshToken: string): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: basicAuthHeader(),
    },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.error || "Falha ao renovar o token do Canva.");
  return data;
}

async function getValidCanvaToken(): Promise<string | null> {
  const supabase = createAdminClient();
  const { data: conexao } = await supabase.from("canva_conexao").select("*").eq("id", 1).maybeSingle();
  if (!conexao) return null;

  if (new Date(conexao.expires_at).getTime() > Date.now() + 60_000) {
    return conexao.access_token;
  }

  const renovado = await renovarTokenCanva(conexao.refresh_token);
  await supabase
    .from("canva_conexao")
    .update({
      access_token: renovado.access_token,
      refresh_token: renovado.refresh_token,
      expires_at: new Date(Date.now() + renovado.expires_in * 1000).toISOString(),
    })
    .eq("id", 1);
  return renovado.access_token;
}

export async function canvaConectado(): Promise<boolean> {
  const supabase = createAdminClient();
  const { data } = await supabase.from("canva_conexao").select("id").eq("id", 1).maybeSingle();
  return !!data;
}

async function canvaRequest<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  const token = await getValidCanvaToken();
  if (!token) throw new Error("Canva não conectado.");
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || data.message || `Erro na API do Canva (${res.status}).`);
  return data as T;
}

export interface CampoDataset {
  tipo: "text" | "image" | "chart" | "outro";
}

// Lê os campos de autofill configurados no modelo (Brand Template) —
// se vier vazio, o modelo ainda não tem campos marcados no Canva.
export async function lerDatasetTemplate(brandTemplateId: string): Promise<Record<string, CampoDataset>> {
  const data = await canvaRequest<{ dataset: Record<string, { type: string }> }>(
    "GET",
    `/brand-templates/${brandTemplateId}/dataset`
  );
  const out: Record<string, CampoDataset> = {};
  for (const [nome, campo] of Object.entries(data.dataset || {})) {
    out[nome] = { tipo: (campo.type as CampoDataset["tipo"]) || "outro" };
  }
  return out;
}

export interface AutofillResultado {
  status: "in_progress" | "success" | "failed";
  designId?: string;
  editUrl?: string;
  viewUrl?: string;
  erro?: string;
}

export async function iniciarAutofill(
  brandTemplateId: string,
  dados: Record<string, { type: "text"; text: string } | { type: "image"; asset_id: string }>
): Promise<string> {
  const res = await canvaRequest<{ job: { id: string } }>("POST", "/autofills", {
    brand_template_id: brandTemplateId,
    data: dados,
  });
  return res.job.id;
}

export async function checarAutofill(jobId: string): Promise<AutofillResultado> {
  const res = await canvaRequest<{
    job: { status: string; result?: { design: { id: string; urls: { edit_url: string; view_url: string } } }; error?: { message: string } };
  }>("GET", `/autofills/${jobId}`);
  const job = res.job;
  if (job.status === "success" && job.result) {
    return {
      status: "success",
      designId: job.result.design.id,
      editUrl: job.result.design.urls.edit_url,
      viewUrl: job.result.design.urls.view_url,
    };
  }
  if (job.status === "failed") return { status: "failed", erro: job.error?.message || "Falha desconhecida." };
  return { status: "in_progress" };
}

// Sobe uma imagem (baixada do Drive) como asset no Canva, pra poder
// usar como campo do tipo "image" no autofill.
export async function subirAssetCanva(imagemBuffer: Buffer, nomeArquivo: string): Promise<string> {
  const token = await getValidCanvaToken();
  if (!token) throw new Error("Canva não conectado.");

  const createRes = await fetch(`${API_BASE}/asset-uploads`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/octet-stream",
      "Asset-Upload-Metadata": JSON.stringify({ name_base64: Buffer.from(nomeArquivo).toString("base64") }),
    },
    body: new Uint8Array(imagemBuffer),
  });
  const createData = await createRes.json();
  if (!createRes.ok) throw new Error(createData.error?.message || "Erro ao enviar imagem pro Canva.");
  const jobId: string = createData.job.id;

  for (let i = 0; i < 15; i++) {
    const statusRes = await fetch(`${API_BASE}/asset-uploads/${jobId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const statusData = await statusRes.json();
    if (statusData.job.status === "success") return statusData.job.asset.id;
    if (statusData.job.status === "failed") throw new Error(statusData.job.error?.message || "Falha ao processar a imagem no Canva.");
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("Tempo esgotado esperando o Canva processar a imagem.");
}
