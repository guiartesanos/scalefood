import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

// Eventos que significam "dinheiro realmente caiu" — mesmo conjunto usado
// no script de alertas (asaas-alertas/check_payments.py).
const EVENTOS_RECEBIDOS = new Set(["PAYMENT_RECEIVED", "PAYMENT_CONFIRMED", "PAYMENT_RECEIVED_IN_CASH"]);

function brl(v: number) {
  return "R$ " + v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// O Asaas manda esse header com o token configurado no cadastro do
// webhook (asaas-access-token) em toda chamada — é o que garante que
// só o Asaas consegue disparar isso, não qualquer um que ache a URL.
export async function POST(request: NextRequest) {
  const token = request.headers.get("asaas-access-token");
  if (token !== process.env.ASAAS_WEBHOOK_TOKEN) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const evento = body?.event as string | undefined;
  const pagamento = body?.payment;

  if (!pagamento || !evento || !EVENTOS_RECEBIDOS.has(evento)) {
    return NextResponse.json({ ok: true, ignorado: true });
  }

  const supabase = createAdminClient();

  const { data: cliente } = await supabase
    .from("clientes")
    .select("id, nome")
    .eq("asaas_customer_id", pagamento.customer)
    .maybeSingle();

  if (!cliente) {
    return NextResponse.json({ ok: true, cliente_nao_mapeado: pagamento.customer });
  }

  // idempotência: o Asaas pode reenviar o mesmo evento em retry
  const marcador = `[asaas:${pagamento.id}]`;
  const { data: jaProcessado } = await supabase
    .from("tarefas")
    .select("id")
    .ilike("descricao", `%${marcador}%`)
    .maybeSingle();
  if (jaProcessado) {
    return NextResponse.json({ ok: true, ja_processado: true });
  }

  const valor = Number(pagamento.value) || 0;
  const liquido = pagamento.netValue != null ? Number(pagamento.netValue) : valor;
  const taxaReal = Math.max(0, Math.round((valor - liquido) * 100) / 100);

  if (taxaReal > 0) {
    await supabase.from("clientes").update({ taxa: taxaReal, taxa_fonte: "real" }).eq("id", cliente.id);
  }

  await supabase.from("tarefas").insert({
    titulo: `Reservar 7% de imposto — ${cliente.nome}`,
    descricao: `Pagamento Asaas de ${brl(valor)} recebido. Reservar ${brl(valor * 0.07)} (7%) para impostos. ${marcador}`,
    urgencia: "media",
    cliente_nome: cliente.nome,
    coluna: "a-fazer",
  });

  return NextResponse.json({ ok: true });
}
