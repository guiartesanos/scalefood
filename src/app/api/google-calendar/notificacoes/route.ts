import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { processarNotificacaoWebhook } from "@/lib/googleCalendar";

// O Google não manda corpo nenhum nessa notificação — só os headers
// X-Goog-*. "sync" é só o handshake inicial de confirmação do canal
// (disparado na hora de criar o watch), não representa mudança nenhuma.
// Sempre responde 200 rápido: se o Google não recebe um 2xx, reenvia a
// notificação (com backoff), então erro daqui não deve travar a resposta —
// processarNotificacaoWebhook já grava o próprio erro em
// google_calendar_watch.ultimo_erro pra aparecer em Configurações.
export async function POST(request: NextRequest) {
  const channelId = request.headers.get("x-goog-channel-id");
  const channelToken = request.headers.get("x-goog-channel-token");
  const resourceState = request.headers.get("x-goog-resource-state");

  if (resourceState && resourceState !== "sync" && channelId && channelToken) {
    try {
      await processarNotificacaoWebhook(channelId, channelToken);
      revalidatePath("/consultoria");
    } catch {
      // engolido de propósito — ver comentário acima.
    }
  }

  return NextResponse.json({ ok: true });
}
