import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { totalNotasFiscaisAsaas } from "@/lib/asaas";

const MES_NOME = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Vencimento do imposto: todo dia 20, ou o próximo dia útil se cair no
// fim de semana (sábado empurra 2 dias, domingo empurra 1).
function proximoDiaUtil(d: Date): Date {
  const diaSemana = d.getDay();
  if (diaSemana === 6) return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 2);
  if (diaSemana === 0) return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
  return d;
}

// Roda todo dia (ver vercel.json) e só age no dia de vencimento do
// imposto: gera uma conta a pagar avulsa com 7% sobre o total de notas
// fiscais emitidas no Asaas no mês anterior — é uma PREVISÃO, o valor
// fica livre pra editar antes de confirmar como paga (o contador pode
// fechar com um número um pouco diferente).
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const hoje = new Date();
  const vencimento = proximoDiaUtil(new Date(hoje.getFullYear(), hoje.getMonth(), 20));
  if (ymd(hoje) !== ymd(vencimento)) {
    return NextResponse.json({ ok: true, naoEhDiaDeVencimento: true });
  }

  const inicioCompetencia = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
  const fimCompetencia = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
  const competenciaChave = `${inicioCompetencia.getFullYear()}-${String(inicioCompetencia.getMonth() + 1).padStart(2, "0")}`;
  const referencia = `imposto:${competenciaChave}`;

  const supabase = createAdminClient();
  const { data: existente } = await supabase
    .from("contas_pagar_avulsas")
    .select("id")
    .eq("referencia", referencia)
    .maybeSingle();
  if (existente) return NextResponse.json({ ok: true, jaGerado: true });

  const totalNotas = await totalNotasFiscaisAsaas(ymd(inicioCompetencia), ymd(fimCompetencia));
  const valorImposto = Math.round(totalNotas * 0.07 * 100) / 100;
  if (valorImposto <= 0) return NextResponse.json({ ok: true, semNotas: true });

  const { error } = await supabase.from("contas_pagar_avulsas").insert({
    nome: `Imposto (7% s/ notas fiscais de ${MES_NOME[inicioCompetencia.getMonth()]}/${inicioCompetencia.getFullYear()})`,
    valor: valorImposto,
    categoria: "Imposto",
    origem: "imposto_mensal",
    referencia,
    data: ymd(vencimento),
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, valor: valorImposto, totalNotas });
}
