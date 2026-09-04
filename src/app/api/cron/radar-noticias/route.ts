import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { buscarNoticiasRadar } from "@/lib/radar";

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

  const supabase = createAdminClient();

  // reinicia o radar do zero — o que não foi gerado nem descartado até
  // agora vira "descartado" (expirou, ninguém viu a tempo).
  await supabase.from("radar_noticias").update({ status: "descartado" }).eq("status", "novo");

  const noticias = await buscarNoticiasRadar();
  if (!noticias.length) return NextResponse.json({ ok: true, encontradas: 0 });

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

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, encontradas: noticias.length, novas: count });
}
