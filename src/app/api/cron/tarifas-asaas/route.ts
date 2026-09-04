import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { listarTarifasAsaas } from "@/lib/asaas";
import { brl } from "@/lib/data";
import { registrarExecucaoCron } from "@/lib/cronHealth";

// Roda todo dia (ver vercel.json) e refaz o total de tarifas do mês corrente
// a partir do extrato real do Asaas (/financialTransactions), mantendo uma
// única linha em custos_variaveis_extra por mês — identificada por `obs` —
// que é atualizada (nunca duplicada) a cada execução.
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = hoje.getMonth() + 1;
    const inicio = `${ano}-${String(mes).padStart(2, "0")}-01`;
    const fim = hoje.toISOString().slice(0, 10);
    const marcador = `auto:tarifas-asaas:${ano}-${String(mes).padStart(2, "0")}`;

    // Se isso falhar (token do Asaas expirado, API fora do ar), cai no
    // catch abaixo — antes disso o erro simplesmente sumia nos logs de
    // função da Vercel e o número de tarifas do mês ficava desatualizado
    // sem ninguém saber (ver cronHealth.ts / Configurações > Integrações).
    const t = await listarTarifasAsaas(inicio, fim);
    if (t.total <= 0) {
      await registrarExecucaoCron("tarifas-asaas", { ok: true, detalhe: "sem tarifas no período" });
      return NextResponse.json({ ok: true, semTarifas: true });
    }

    const partes = [
      t.transferencia > 0 && `transferência ${brl(t.transferencia)}`,
      t.antecipacao > 0 && `antecipação ${brl(t.antecipacao)}`,
      t.cobranca > 0 && `cobrança ${brl(t.cobranca)}`,
      t.notas > 0 && `notas ${brl(t.notas)}`,
      t.sms > 0 && `SMS ${brl(t.sms)}`,
      t.estorno > 0 && `estorno ${brl(t.estorno)}`,
    ].filter(Boolean);
    const nome = `Tarifas Asaas (${partes.join(" + ").replace(" + estorno", " – estorno")})`;

    const { data: existente } = await supabase
      .from("custos_variaveis_extra")
      .select("id")
      .eq("obs", marcador)
      .maybeSingle();

    if (existente) {
      await supabase.from("custos_variaveis_extra").update({ nome, valor: t.total }).eq("id", existente.id);
    } else {
      await supabase.from("custos_variaveis_extra").insert({
        nome,
        valor: t.total,
        categoria: "Taxas",
        obs: marcador,
      });
    }

    await registrarExecucaoCron("tarifas-asaas", { ok: true, detalhe: `total ${brl(t.total)}` });
    return NextResponse.json({ ok: true, total: t.total });
  } catch (e) {
    const mensagem = e instanceof Error ? e.message : String(e);
    await registrarExecucaoCron("tarifas-asaas", { ok: false, erro: mensagem });
    return NextResponse.json({ error: mensagem }, { status: 500 });
  }
}
