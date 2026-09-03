"use server";

import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import type { ClienteStatus } from "@/lib/types";
import { listarPagamentosAsaas, buscarClienteAsaas } from "@/lib/asaas";

const PAGAMENTOS_RECEBIDOS = new Set(["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"]);

export async function atualizarStatusCliente(clienteId: string, status: ClienteStatus) {
  await requireProfile();
  const supabase = await createClient();

  // "Cancelado" não é só mais um status: tira o cliente da lista de
  // ativos e joga ele pra clientes_cancelados (mesma tabela que a aba
  // "Clientes cancelados" usa), puxando histórico de pagamentos e
  // telefone do Asaas quando dá.
  if (status === "Cancelado") {
    const { data: cliente } = await supabase.from("clientes").select("*").eq("id", clienteId).single();
    if (!cliente) return { error: "Cliente não encontrado." };

    let totalRecebido = Number(cliente.rec) || 0;
    let primeiroPagamento: string | null = cliente.fechamento;
    let ultimoPagamento: string | null = null;
    let telefone: string | null = null;

    if (cliente.asaas_customer_id) {
      try {
        const [pagamentos, asaasCliente] = await Promise.all([
          listarPagamentosAsaas(cliente.asaas_customer_id),
          buscarClienteAsaas(cliente.asaas_customer_id),
        ]);
        const recebidos = pagamentos.filter((p) => PAGAMENTOS_RECEBIDOS.has(p.status));
        if (recebidos.length) {
          totalRecebido = recebidos.reduce((s, p) => s + Number(p.value), 0);
          const datas = recebidos.map((p) => p.paymentDate).filter((d): d is string => !!d).sort();
          primeiroPagamento = datas[0] || primeiroPagamento;
          ultimoPagamento = datas[datas.length - 1] || null;
        }
        telefone = asaasCliente?.mobilePhone || asaasCliente?.phone || null;
      } catch {
        // Asaas fora do ar ou API mudou — segue o cancelamento com o
        // que já temos localmente em vez de travar o usuário.
      }
    }

    const { error: insertError } = await supabase.from("clientes_cancelados").insert({
      nome: cliente.nome,
      asaas_customer_id: cliente.asaas_customer_id,
      total_recebido: totalRecebido,
      primeiro_pagamento: primeiroPagamento,
      ultimo_pagamento: ultimoPagamento,
      telefone,
      nicho: cliente.nicho,
      dono: cliente.dono,
    });
    if (insertError) return { error: "Erro ao mover pra cancelados: " + insertError.message };

    const { error: deleteError } = await supabase.from("clientes").delete().eq("id", clienteId);
    if (deleteError) return { error: "Cliente duplicado em cancelados, mas não saiu dos ativos: " + deleteError.message };

    revalidatePath("/dashboard");
    revalidatePath("/clientes");
    return { success: true };
  }

  const { error } = await supabase.from("clientes").update({ status }).eq("id", clienteId);
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  revalidatePath("/clientes");
  return { success: true };
}

// mesma classificação usada nos badges de crescimento (clientes/page.tsx) —
// recalculada toda vez que "hoje" muda, pra nunca mais ficar travada
// no valor gravado na criação do cliente.
function calcGrowthNote(entrada: number | null, hoje: number | null): string | null {
  if (entrada == null) return "sem_dado";
  if (hoje == null) return "nao_iniciado";
  if (entrada === 0 && hoje > 0) return "zero_base";
  if (hoje <= entrada) return "estagnado";
  return null;
}

export async function atualizarValoresCliente(formData: FormData) {
  const profile = await requireProfile();
  if (!["master", "financeiro", "onboarding"].includes(profile.role)) {
    return { error: "Seu papel não pode editar valores financeiros de cliente." };
  }

  const supabase = await createClient();
  const clienteId = String(formData.get("clienteId") || "");
  const rec = parseFloat(String(formData.get("rec") || "0")) || 0;
  const traf = parseFloat(String(formData.get("traf") || "0")) || 0;
  const com = parseFloat(String(formData.get("com") || "0")) || 0;
  const imp = parseFloat(String(formData.get("imp") || "0")) || 0;
  const hojeRaw = String(formData.get("hoje") || "");

  const { data: cliente } = await supabase
    .from("clientes")
    .select("nome, rec, taxa, entrada, hoje")
    .eq("id", clienteId)
    .single();

  if (!cliente) return { error: "Cliente não encontrado." };

  const taxa = cliente.taxa || 0;
  const liq = rec - traf - com - imp - taxa;
  const marg = rec ? (liq / rec) * 100 : 0;
  const recAntigo = cliente.rec;
  const hoje = hojeRaw ? parseFloat(hojeRaw) : cliente.hoje;
  const growthNote = calcGrowthNote(cliente.entrada, hoje);

  const { error } = await supabase
    .from("clientes")
    .update({ rec, traf, com, imp, liq, marg, hoje, growth_note: growthNote })
    .eq("id", clienteId);

  if (error) return { error: error.message };

  // registra o delta como evento de receita (upsell/downsell), se mudou
  const delta = rec - recAntigo;
  if (Math.abs(delta) > 0.01) {
    await supabase.from("receita_eventos").insert({
      cliente_id: clienteId,
      cliente_nome: cliente.nome,
      tipo: delta > 0 ? "upsell" : "downsell",
      valor: delta,
      descricao: `Ajuste de recorrência: ${recAntigo} → ${rec}`,
      criado_por: profile.id,
    });
  }

  revalidatePath("/dashboard");
  revalidatePath("/clientes");
  revalidatePath("/financeiro");
  return { success: true };
}
