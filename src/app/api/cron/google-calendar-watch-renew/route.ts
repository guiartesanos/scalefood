import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { registrarWatchChannel } from "@/lib/googleCalendar";
import { registrarExecucaoCron } from "@/lib/cronHealth";

// Roda 1x/dia (ver vercel.json) e garante que sempre exista um canal de
// notificações vivo do Google Calendar — cria um do zero se nunca existiu
// (cobre a conexão que já estava ativa antes dessa feature existir, sem
// precisar desconectar/reconectar) e renova com folga antes de expirar
// (o canal dura no máximo alguns dias, ver WEBHOOK_TTL_SECONDS).
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const { data: watch } = await supabase.from("google_calendar_watch").select("expiration").eq("id", 1).maybeSingle();
    const precisaRenovar = !watch || new Date(watch.expiration).getTime() - Date.now() < 2 * 24 * 60 * 60 * 1000;

    if (precisaRenovar) {
      await registrarWatchChannel();
      await registrarExecucaoCron("google-calendar-watch-renew", { ok: true, detalhe: "canal renovado" });
    } else {
      await registrarExecucaoCron("google-calendar-watch-renew", { ok: true, detalhe: "ainda válido, nada a fazer" });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    const mensagem = e instanceof Error ? e.message : String(e);
    await registrarExecucaoCron("google-calendar-watch-renew", { ok: false, erro: mensagem });
    return NextResponse.json({ error: mensagem }, { status: 500 });
  }
}
