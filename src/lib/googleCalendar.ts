// Conexão com o Google Calendar (OAuth) — usada pra criar/mover os eventos
// das reuniões de consultoria. Reaproveita o mesmo app OAuth do Google Drive
// (GOOGLE_DRIVE_CLIENT_ID/SECRET, mesmo projeto no Google Cloud), só com um
// escopo extra — por isso fica numa conexão própria (google_calendar_conexao),
// separada da do Drive.

import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/server";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const SCOPE = "https://www.googleapis.com/auth/calendar";
const EVENTS_URL = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
const WATCH_URL = `${EVENTS_URL}/watch`;
const CHANNELS_STOP_URL = "https://www.googleapis.com/calendar/v3/channels/stop";

function redirectUri(): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return `${base}/api/google-calendar/callback`;
}

function webhookAddress(): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return `${base}/api/google-calendar/notificacoes`;
}

// Nonce anti-CSRF: sem isso, um code obtido pelo próprio atacante (numa
// conta Google dele, contra o mesmo client_id/redirect_uri — ambos
// públicos) podia ser trocado só levando o master a abrir um GET pro
// callback, sequestrando a conexão pra conta do atacante. Reaproveitado
// também como segredo do canal de notificações (registrarWatchChannel) —
// mesma necessidade de um valor aleatório imprevisível.
export function gerarState(): string {
  return crypto.randomBytes(24).toString("hex");
}

export function getGoogleCalendarAuthUrl(state: string): string {
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
  if (!res.ok) throw new Error(data.error_description || data.error || "Falha ao conectar com o Google Calendar.");

  const supabase = createAdminClient();
  await supabase.from("google_calendar_conexao").upsert({
    id: 1,
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
    ultimo_erro: null,
    ultimo_erro_em: null,
  });

  // Deixa o canal de notificações pronto assim que conecta — sem isso, o
  // primeiro sync só aconteceria no dia seguinte, na próxima passada do
  // cron de renovação. Fail-soft: a conexão em si (criar/mover reunião)
  // não depende disso.
  try {
    await registrarWatchChannel();
  } catch {
    // registrarWatchChannel já grava o próprio erro em google_calendar_watch.
  }
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

// Se a renovação falhar (token revogado, por exemplo), grava o erro na
// conexão em vez de só estourar. Sem isso, agendarPrimeiraReuniao/
// redefinirCadenciaConsultoria engolem o erro (fail-soft de propósito,
// pra não travar a operação) e a conexão quebrada fica invisível pra
// sempre — ninguém percebe que parou de criar evento no Calendar (ver
// calendarStatus, usado em /configuracoes/integracoes).
async function getValidAccessToken(): Promise<string | null> {
  const supabase = createAdminClient();
  const { data: conexao } = await supabase.from("google_calendar_conexao").select("*").eq("id", 1).maybeSingle();
  if (!conexao) return null;

  if (new Date(conexao.expires_at).getTime() > Date.now() + 60_000) {
    return conexao.access_token;
  }

  try {
    const renovado = await renovarToken(conexao.refresh_token);
    await supabase
      .from("google_calendar_conexao")
      .update({
        access_token: renovado.access_token,
        expires_at: new Date(Date.now() + renovado.expires_in * 1000).toISOString(),
        ultimo_erro: null,
        ultimo_erro_em: null,
      })
      .eq("id", 1);
    return renovado.access_token;
  } catch (e) {
    const mensagem = e instanceof Error ? e.message : String(e);
    await supabase
      .from("google_calendar_conexao")
      .update({ ultimo_erro: mensagem, ultimo_erro_em: new Date().toISOString() })
      .eq("id", 1);
    throw e;
  }
}

export async function calendarConectado(): Promise<boolean> {
  const supabase = createAdminClient();
  const { data } = await supabase.from("google_calendar_conexao").select("id").eq("id", 1).maybeSingle();
  return !!data;
}

export interface StatusConexao {
  conectado: boolean;
  erro: string | null;
  erroEm: string | null;
}

export async function calendarStatus(): Promise<StatusConexao> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("google_calendar_conexao")
    .select("ultimo_erro, ultimo_erro_em")
    .eq("id", 1)
    .maybeSingle();
  if (!data) return { conectado: false, erro: null, erroEm: null };
  return { conectado: true, erro: data.ultimo_erro, erroEm: data.ultimo_erro_em };
}

// Mesmo formato de status, pra mostrar em Configurações > Integrações se a
// sincronização automática (webhook) está viva.
export async function calendarWatchStatus(): Promise<StatusConexao> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("google_calendar_watch")
    .select("ultimo_erro, ultimo_erro_em")
    .eq("id", 1)
    .maybeSingle();
  if (!data) return { conectado: false, erro: null, erroEm: null };
  return { conectado: true, erro: data.ultimo_erro, erroEm: data.ultimo_erro_em };
}

const TIMEZONE = "America/Sao_Paulo";

// Monta os horários como string local "ingênua" (sem Z/offset) + timeZone
// explícito no payload do evento — nunca usa Date/toISOString aqui, porque
// isso interpretaria "09:00" como UTC (a função roda em UTC na Vercel) e
// criaria o evento 3h adiantado na agenda do cliente.
function montarHorario(data: string, hora: string, duracaoMin: number): { inicio: string; fim: string } {
  const [h, m] = hora.split(":").map(Number);
  const totalMin = h * 60 + m + duracaoMin;
  const fimHora = `${String(Math.floor(totalMin / 60)).padStart(2, "0")}:${String(totalMin % 60).padStart(2, "0")}`;
  return { inicio: `${data}T${hora}:00`, fim: `${data}T${fimHora}:00` };
}

// Caminho inverso de montarHorario — converte o dateTime que o Google
// devolve (já vem com offset próprio) pra data/hora "de parede" no fuso de
// São Paulo, usando Intl em vez de confiar no offset devolvido (mais
// robusto se algum evento vier com Z/UTC por qualquer motivo).
function paraDataHoraLocal(dateTimeIso: string): { data: string; hora: string } {
  const d = new Date(dateTimeIso);
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
      .formatToParts(d)
      .map((p) => [p.type, p.value])
  );
  return { data: `${partes.year}-${partes.month}-${partes.day}`, hora: `${partes.hour}:${partes.minute}` };
}

function extrairMeetUrl(evento: { conferenceData?: { entryPoints?: { entryPointType: string; uri: string }[] } }): string | null {
  return evento.conferenceData?.entryPoints?.find((e) => e.entryPointType === "video")?.uri || null;
}

export interface EventoCriado {
  id: string;
  htmlLink: string;
  meetUrl: string | null;
}

// Cria o evento da reunião, convidando o(s) cliente(s) por e-mail quando
// houver e já com uma sala do Google Meet anexada. Retorna id/link/meet
// (pra guardar em consultoria_tarefas) ou null se o Calendar não estiver
// conectado — sempre fail-soft, quem chama não deve deixar isso quebrar o
// resto da operação.
export async function criarEventoReuniao(params: {
  titulo: string;
  descricao?: string;
  data: string;
  hora: string;
  duracaoMin: number;
  emails?: string[] | null;
}): Promise<EventoCriado | null> {
  const token = await getValidAccessToken();
  if (!token) return null;

  const { inicio, fim } = montarHorario(params.data, params.hora, params.duracaoMin);
  const emails = (params.emails || []).filter(Boolean);
  const res = await fetch(`${EVENTS_URL}?sendUpdates=all&conferenceDataVersion=1`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      summary: params.titulo,
      description: params.descricao,
      start: { dateTime: inicio, timeZone: TIMEZONE },
      end: { dateTime: fim, timeZone: TIMEZONE },
      attendees: emails.length ? emails.map((email) => ({ email })) : undefined,
      conferenceData: {
        createRequest: { requestId: crypto.randomUUID(), conferenceSolutionKey: { type: "hangoutsMeet" } },
      },
    }),
  });
  const eventoData = await res.json();
  if (!res.ok) throw new Error(eventoData.error?.message || "Erro ao criar evento no Google Calendar.");
  return { id: eventoData.id as string, htmlLink: eventoData.htmlLink as string, meetUrl: extrairMeetUrl(eventoData) };
}

// Move um evento já criado e/ou atualiza os convidados (usado tanto quando
// a cadência é redefinida em bloco quanto quando o e-mail do cliente muda
// depois da reunião já criada) — só monta no PATCH os campos informados,
// mantendo o link do Meet já existente intacto (não precisa reenviar
// conferenceData pra preservá-lo).
export async function atualizarEventoReuniao(
  eventId: string,
  campos: { data?: string; hora?: string; duracaoMin?: number; emails?: string[] | null }
): Promise<void> {
  const token = await getValidAccessToken();
  if (!token) return;

  const body: Record<string, unknown> = {};
  if (campos.data && campos.hora && campos.duracaoMin) {
    const { inicio, fim } = montarHorario(campos.data, campos.hora, campos.duracaoMin);
    body.start = { dateTime: inicio, timeZone: TIMEZONE };
    body.end = { dateTime: fim, timeZone: TIMEZONE };
  }
  if (campos.emails) {
    body.attendees = campos.emails.filter(Boolean).map((email) => ({ email }));
  }
  if (!Object.keys(body).length) return;

  const res = await fetch(`${EVENTS_URL}/${eventId}?sendUpdates=all`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const erro = await res.json();
    throw new Error(erro.error?.message || "Erro ao atualizar evento no Google Calendar.");
  }
}

// ---------------------------------------------------------------------
// Sincronização automática (push notification / webhook) — reflete de
// volta no Food Scale uma reunião editada direto no Google Agenda.
// ---------------------------------------------------------------------

interface EventoListado {
  id: string;
  status: string;
  start?: { dateTime?: string; date?: string };
}

interface PaginaEventos {
  items: EventoListado[];
  nextPageToken?: string;
  nextSyncToken?: string;
}

class ErroSincronizacao extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function listarPagina(token: string, params: URLSearchParams): Promise<PaginaEventos> {
  const res = await fetch(`${EVENTS_URL}?${params.toString()}`, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json();
  if (!res.ok) throw new ErroSincronizacao(data.error?.message || "Erro ao listar eventos do Google Calendar.", res.status);
  return data;
}

// Sincronização completa (sem syncToken) — só usada pra obter o
// nextSyncToken inicial (ou depois de um 410, quando o token anterior
// expira). Não precisa processar os eventos dessa passada: só a próxima
// notificação real vai trazer o que efetivamente mudou dali pra frente.
// `timeMin` só entra aqui (nunca numa chamada com syncToken já
// estabelecido, pra não misturar filtros incompatíveis) — não faz sentido
// mesmo sincronizar reunião que já passou.
async function sincronizacaoCompleta(token: string): Promise<string | undefined> {
  let pageToken: string | undefined;
  let syncToken: string | undefined;
  do {
    const params = new URLSearchParams({ timeMin: new Date().toISOString(), showDeleted: "true", singleEvents: "true" });
    if (pageToken) params.set("pageToken", pageToken);
    const pagina = await listarPagina(token, params);
    pageToken = pagina.nextPageToken;
    syncToken = pagina.nextSyncToken || syncToken;
  } while (pageToken);
  return syncToken;
}

async function listarMudancas(token: string, syncToken: string): Promise<{ eventos: EventoListado[]; syncToken?: string }> {
  const eventos: EventoListado[] = [];
  let pageToken: string | undefined;
  let novoSyncToken: string | undefined;
  do {
    const params = new URLSearchParams({ syncToken, showDeleted: "true", singleEvents: "true" });
    if (pageToken) params.set("pageToken", pageToken);
    const pagina = await listarPagina(token, params);
    eventos.push(...pagina.items);
    pageToken = pagina.nextPageToken;
    novoSyncToken = pagina.nextSyncToken || novoSyncToken;
  } while (pageToken);
  return { eventos, syncToken: novoSyncToken };
}

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

// Aplica no banco só as tarefas de consultoria cujo google_event_id bate
// com algum evento que mudou — o resto da lista (compromissos pessoais do
// dono da agenda, por exemplo) é ignorado. Tarefa já marcada como feita
// nunca é realinhada (mesma regra de redefinirCadenciaConsultoria).
async function aplicarMudancas(supabase: SupabaseAdmin, eventos: EventoListado[]): Promise<void> {
  const ids = eventos.map((e) => e.id);
  if (!ids.length) return;

  const { data: tarefas } = await supabase.from("consultoria_tarefas").select("id, google_event_id, feito").in("google_event_id", ids);
  if (!tarefas?.length) return;

  const porEventId = new Map(tarefas.map((t) => [t.google_event_id as string, t]));

  for (const evento of eventos) {
    const tarefa = porEventId.get(evento.id);
    if (!tarefa || tarefa.feito) continue;

    if (evento.status === "cancelled") {
      await supabase
        .from("consultoria_tarefas")
        .update({ google_event_id: null, google_event_url: null, google_meet_url: null })
        .eq("id", tarefa.id);
      continue;
    }

    if (!evento.start?.dateTime) continue; // evento de dia inteiro — não é o nosso caso
    const { data, hora } = paraDataHoraLocal(evento.start.dateTime);
    await supabase.from("consultoria_tarefas").update({ data_reuniao: data, hora_reuniao: hora }).eq("id", tarefa.id);
  }
}

// Chamada pelo endpoint /api/google-calendar/notificacoes a cada push do
// Google. Confere channelId/token contra o que está salvo (só processa se
// bater — evita alguém disparar uma sincronização chamando o endpoint na
// unha) e faz a sincronização incremental de verdade.
export async function processarNotificacaoWebhook(channelId: string, channelToken: string): Promise<void> {
  const supabase = createAdminClient();
  const { data: watch } = await supabase.from("google_calendar_watch").select("*").eq("id", 1).maybeSingle();
  if (!watch || watch.channel_id !== channelId || watch.channel_token !== channelToken) return;

  const token = await getValidAccessToken();
  if (!token) return;

  try {
    if (!watch.sync_token) {
      const syncToken = await sincronizacaoCompleta(token);
      await supabase.from("google_calendar_watch").update({ sync_token: syncToken ?? null, ultimo_erro: null, ultimo_erro_em: null }).eq("id", 1);
      return;
    }
    const { eventos, syncToken } = await listarMudancas(token, watch.sync_token);
    await aplicarMudancas(supabase, eventos);
    await supabase.from("google_calendar_watch").update({ sync_token: syncToken ?? watch.sync_token, ultimo_erro: null, ultimo_erro_em: null }).eq("id", 1);
  } catch (e) {
    if (e instanceof ErroSincronizacao && e.status === 410) {
      // syncToken expirado/inválido — refaz do zero em vez de propagar erro.
      const syncToken = await sincronizacaoCompleta(token);
      await supabase.from("google_calendar_watch").update({ sync_token: syncToken ?? null, ultimo_erro: null, ultimo_erro_em: null }).eq("id", 1);
      return;
    }
    const mensagem = e instanceof Error ? e.message : String(e);
    await supabase.from("google_calendar_watch").update({ ultimo_erro: mensagem, ultimo_erro_em: new Date().toISOString() }).eq("id", 1);
  }
}

// (Re)cria o canal de notificações — chamada logo após conectar o Calendar
// e diariamente pelo cron de renovação (um canal expira no máximo em
// WEBHOOK_TTL_SECONDS). Para o canal antigo antes de criar um novo, pra
// não deixar lixo de canais abertos na conta do Google.
const WEBHOOK_TTL_SECONDS = 6 * 24 * 60 * 60; // 6 dias — cron roda 1x/dia e renova antes de expirar

export async function registrarWatchChannel(): Promise<void> {
  const token = await getValidAccessToken();
  if (!token) return;

  const supabase = createAdminClient();
  const { data: atual } = await supabase.from("google_calendar_watch").select("*").eq("id", 1).maybeSingle();

  if (atual) {
    try {
      await fetch(CHANNELS_STOP_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ id: atual.channel_id, resourceId: atual.resource_id }),
      });
    } catch {
      // canal antigo pode já ter expirado sozinho — não impede criar um novo.
    }
  }

  const channelId = crypto.randomUUID();
  const channelToken = gerarState();
  const res = await fetch(WATCH_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      id: channelId,
      type: "web_hook",
      address: webhookAddress(),
      token: channelToken,
      params: { ttl: String(WEBHOOK_TTL_SECONDS) },
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    await supabase.from("google_calendar_watch").upsert({
      id: 1,
      channel_id: atual?.channel_id || "",
      resource_id: atual?.resource_id || "",
      channel_token: atual?.channel_token || "",
      expiration: atual?.expiration || new Date().toISOString(),
      sync_token: atual?.sync_token ?? null,
      ultimo_erro: data.error?.message || "Erro ao registrar o canal de notificações.",
      ultimo_erro_em: new Date().toISOString(),
    });
    throw new Error(data.error?.message || "Erro ao registrar o canal de notificações do Google Calendar.");
  }

  const syncToken = await sincronizacaoCompleta(token);
  await supabase.from("google_calendar_watch").upsert({
    id: 1,
    channel_id: channelId,
    resource_id: data.resourceId as string,
    channel_token: channelToken,
    expiration: new Date(Number(data.expiration)).toISOString(),
    sync_token: syncToken ?? null,
    ultimo_erro: null,
    ultimo_erro_em: null,
  });
}
