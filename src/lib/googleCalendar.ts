// Conexão com o Google Calendar (OAuth) — usada pra criar/mover os eventos
// das reuniões de consultoria. Reaproveita o mesmo app OAuth do Google Drive
// (GOOGLE_DRIVE_CLIENT_ID/SECRET, mesmo projeto no Google Cloud), só com um
// escopo extra — por isso fica numa conexão própria (google_calendar_conexao),
// separada da do Drive.

import { createAdminClient } from "@/lib/supabase/server";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const SCOPE = "https://www.googleapis.com/auth/calendar";
const EVENTS_URL = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

function redirectUri(): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return `${base}/api/google-calendar/callback`;
}

export function getGoogleCalendarAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_DRIVE_CLIENT_ID!,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: SCOPE,
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
  if (!res.ok) throw new Error(data.error_description || data.error || "Falha ao conectar com o Google Calendar.");

  const supabase = createAdminClient();
  await supabase.from("google_calendar_conexao").upsert({
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
  if (!res.ok) throw new Error(data.error_description || data.error || "Falha ao renovar o token do Google Calendar.");
  return data;
}

async function getValidAccessToken(): Promise<string | null> {
  const supabase = createAdminClient();
  const { data: conexao } = await supabase.from("google_calendar_conexao").select("*").eq("id", 1).maybeSingle();
  if (!conexao) return null;

  if (new Date(conexao.expires_at).getTime() > Date.now() + 60_000) {
    return conexao.access_token;
  }

  const renovado = await renovarToken(conexao.refresh_token);
  await supabase
    .from("google_calendar_conexao")
    .update({
      access_token: renovado.access_token,
      expires_at: new Date(Date.now() + renovado.expires_in * 1000).toISOString(),
    })
    .eq("id", 1);
  return renovado.access_token;
}

export async function calendarConectado(): Promise<boolean> {
  const supabase = createAdminClient();
  const { data } = await supabase.from("google_calendar_conexao").select("id").eq("id", 1).maybeSingle();
  return !!data;
}

function montarHorario(data: string, hora: string, duracaoMin: number): { inicio: string; fim: string } {
  const inicio = new Date(`${data}T${hora}:00`);
  const fim = new Date(inicio.getTime() + duracaoMin * 60_000);
  return { inicio: inicio.toISOString(), fim: fim.toISOString() };
}

export interface EventoCriado {
  id: string;
  htmlLink: string;
}

// Cria o evento da reunião, convidando o cliente por e-mail quando houver.
// Retorna o id + link do evento (pra guardar em
// consultoria_tarefas.google_event_id/google_event_url) ou null se o
// Calendar não estiver conectado — sempre fail-soft, quem chama não deve
// deixar isso quebrar o resto da operação.
export async function criarEventoReuniao(params: {
  titulo: string;
  descricao?: string;
  data: string;
  hora: string;
  duracaoMin: number;
  emailCliente?: string | null;
}): Promise<EventoCriado | null> {
  const token = await getValidAccessToken();
  if (!token) return null;

  const { inicio, fim } = montarHorario(params.data, params.hora, params.duracaoMin);
  const res = await fetch(`${EVENTS_URL}?sendUpdates=all`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      summary: params.titulo,
      description: params.descricao,
      start: { dateTime: inicio },
      end: { dateTime: fim },
      attendees: params.emailCliente ? [{ email: params.emailCliente }] : undefined,
    }),
  });
  const eventoData = await res.json();
  if (!res.ok) throw new Error(eventoData.error?.message || "Erro ao criar evento no Google Calendar.");
  return { id: eventoData.id as string, htmlLink: eventoData.htmlLink as string };
}

// Move um evento já criado pra uma nova data/hora (usado quando a cadência
// de reuniões é redefinida em bloco) — mantém o convite já enviado ao
// cliente em vez de recriar do zero.
export async function atualizarEventoReuniao(eventId: string, data: string, hora: string, duracaoMin: number): Promise<void> {
  const token = await getValidAccessToken();
  if (!token) return;

  const { inicio, fim } = montarHorario(data, hora, duracaoMin);
  const res = await fetch(`${EVENTS_URL}/${eventId}?sendUpdates=all`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ start: { dateTime: inicio }, end: { dateTime: fim } }),
  });
  if (!res.ok) {
    const erro = await res.json();
    throw new Error(erro.error?.message || "Erro ao mover evento no Google Calendar.");
  }
}
