import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { buscarNoticiasRadar } from "@/lib/radar";
import { registrarExecucaoCron } from "@/lib/cronHealth";

// Roda todo dia às 8h BRT (ver vercel.json): zera o que sobrou de "novo"
// do dia anterior (pra não empilhar pra sempre — decisão consciente,
// senão a lista só cresce) e busca as ~10 notícias mais relevantes do
// dia (ver rankearNoticias em lib/radar.ts pros critérios), ignorando
// duplicata pelo link (unique constraint).
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();

    // reinicia o radar do zero — o que não foi gerado nem descartado até
    // agora vira "descartado" (expirou, ninguém viu a tempo).
    await supabase.from("radar_noticias").update({ status: "descartado" }).eq("status", "novo");

    const noticias = await buscarNoticiasRadar();
    if (!noticias.length) {
      await registrarExecucaoCron("radar-noticias", { ok: true, detalhe: "0 notícias encontradas" });
      return NextResponse.json({ ok: true, encontradas: 0 });
    }

    const { error, count } = await supabase
      .from("radar_noticias")
      .upsert(
        noticias
          .filter((n) => n.link && n.titulo)
          .map((n) => ({
            titulo: n.titulo,
            link: n.link,
            fonte: n.fonte,
            publicado_em: n.publicadoEm ? new Date(n.publicadoEm).toISOString() : null,
          })),
        { onConflict: "link", ignoreDuplicates: true, count: "exact" }
      );

    if (error) {
      await registrarExecucaoCron("radar-noticias", { ok: false, erro: error.message });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await registrarExecucaoCron("radar-noticias", {
      ok: true,
      detalhe: `${noticias.length} encontradas, ${count ?? 0} novas`,
    });
    return NextResponse.json({ ok: true, encontradas: noticias.length, novas: count });
  } catch (e) {
    const mensagem = e instanceof Error ? e.message : String(e);
    await registrarExecucaoCron("radar-noticias", { ok: false, erro: mensagem });
    return NextResponse.json({ error: mensagem }, { status: 500 });
  }
}
