import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { buscarClienteAsaas } from "@/lib/asaas";

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
    .select("id, nome, traf, com, trafego_gestor")
    .eq("asaas_customer_id", pagamento.customer)
    .maybeSingle();

  if (!cliente) {
    // idempotência: mesmo padrão do fluxo com cliente mapeado, pra não
    // duplicar a tarefa se o Asaas reenviar o mesmo evento em retry.
    const marcador = `[asaas:${pagamento.id}]`;
    const { data: jaProcessado } = await supabase
      .from("tarefas")
      .select("id")
      .ilike("descricao", `%${marcador}%`)
      .maybeSingle();
    if (jaProcessado) {
      return NextResponse.json({ ok: true, ja_processado: true });
    }

    const asaasCliente = await buscarClienteAsaas(pagamento.customer);
    const nomePagador = asaasCliente?.name || pagamento.customer;
    const valor = Number(pagamento.value) || 0;

    await supabase.from("tarefas").insert({
      titulo: `Revisar pagamento sem cliente mapeado — ${nomePagador}`,
      descricao: `Pagamento de ${brl(valor)} recebido no Asaas de "${nomePagador}" (customer ${pagamento.customer}), mas essa pessoa não está cadastrada em Clientes ou não tem o asaas_customer_id vinculado. Verificar quem é e cadastrar/vincular. ${marcador}`,
      urgencia: "media",
      cliente_nome: asaasCliente?.name || null,
      coluna: "a-fazer",
    });

    return NextResponse.json({ ok: true, cliente_nao_mapeado: pagamento.customer, tarefa_criada: true });
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

  // cliente pagou -> gera a conta a pagar do repasse de tráfego e da
  // comissão de vendas, uma vez por cliente por mês (não por pagamento —
  // alguns clientes têm 2 assinaturas ativas no Asaas cobrando no mesmo
  // mês, e tráfego/comissão são valores mensais, não por cobrança).
  // referencia com o mês embutido garante essa dedupe via unique index.
  const dataPagamento: string = pagamento.paymentDate || pagamento.clientPaymentDate || pagamento.dueDate;
  const competencia = dataPagamento.slice(0, 7); // "2026-08"

  const trafego = Number(cliente.traf) || 0;
  if (trafego > 0) {
    await supabase.from("contas_pagar_avulsas").insert({
      nome: `Repasse tráfego — ${cliente.nome}`,
      valor: trafego,
      cliente_nome: cliente.nome,
      gestor: cliente.trafego_gestor || "Jota",
      categoria: "Tráfego",
      origem: "trafego_asaas",
      referencia: `trafego:${cliente.id}:${competencia}`,
      data: dataPagamento,
    });
  }

  // toda comissão de vendas vai pro Gui Borrego — regra fixa, não
  // depende de quem é o "dono" (responsável interno) do cliente.
  const comissao = Number(cliente.com) || 0;
  if (comissao > 0) {
    await supabase.from("contas_pagar_avulsas").insert({
      nome: `Comissão de vendas — ${cliente.nome}`,
      valor: comissao,
      cliente_nome: cliente.nome,
      gestor: "Gui Borrego",
      categoria: "Comissão",
      origem: "comissao_asaas",
      referencia: `comissao:${cliente.id}:${competencia}`,
      data: dataPagamento,
    });
  }

  return NextResponse.json({ ok: true });
}
