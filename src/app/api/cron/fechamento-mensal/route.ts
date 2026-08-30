import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

// Vercel Cron chama isso todo dia 1 do mês (ver vercel.json) e manda o
// header Authorization com o CRON_SECRET automaticamente — barra
// qualquer chamada externa que não seja o próprio cron da Vercel.
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const hoje = new Date();
  const mesLabel = hoje.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  const { error } = await supabase.from("tarefas").insert({
    titulo: `Fechamento do mês (${mesLabel}): atualizar faturamento dos clientes`,
    descricao:
      "Passar cliente por cliente em Clientes e atualizar o campo \"faturamento do cliente hoje\" " +
      "(em editar valores), com base no que cada um faturou esse mês. Isso mantém o % de crescimento " +
      "e o alerta de cliente estagnado corretos — hoje ainda é manual, até integrarmos direto com os " +
      "dados de faturamento de cada cliente.",
    urgencia: "alta",
    coluna: "a-fazer",
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
