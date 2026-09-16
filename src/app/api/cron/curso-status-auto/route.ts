import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { registrarExecucaoCron } from "@/lib/cronHealth";

// Roda 1x/dia (ver vercel.json) — quem comprou só curso (sem consultoria)
// fica em "curso_comprado" por 7 dias corridos a partir do fechamento; se
// ninguém mudar o status manualmente antes disso, conclui sozinho.
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const seteDiasAtras = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from("consultoria_clientes")
      .update({ status: "concluido", status_atualizado_em: new Date().toISOString() })
      .eq("status", "curso_comprado")
      .lte("data_fechamento", seteDiasAtras)
      .select("id");

    if (error) throw new Error(error.message);

    await registrarExecucaoCron("curso-status-auto", { ok: true, detalhe: `${data?.length || 0} concluído(s)` });
    return NextResponse.json({ ok: true, concluidos: data?.length || 0 });
  } catch (e) {
    const mensagem = e instanceof Error ? e.message : String(e);
    await registrarExecucaoCron("curso-status-auto", { ok: false, erro: mensagem });
    return NextResponse.json({ error: mensagem }, { status: 500 });
  }
}
