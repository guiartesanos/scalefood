import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { buscarNoticiasRadar } from "@/lib/radar";

// Roda todo dia (ver vercel.json): busca notícias novas do setor
// (food service/delivery) e insere no radar — ignora duplicata pelo
// link (unique constraint), então rodar de novo no mesmo dia não
// duplica nada.
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const noticias = await buscarNoticiasRadar();
  if (!noticias.length) return NextResponse.json({ ok: true, encontradas: 0 });

  const supabase = createAdminClient();
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
