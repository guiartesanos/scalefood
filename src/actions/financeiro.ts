"use server";

import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { logExclusao } from "@/lib/auditoria";
import { hojeISOBR } from "@/lib/tz";

function brl(v: number | null | undefined) {
  return "R$ " + Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function requireFinanceiro(role: string) {
  return role === "master" || role === "financeiro" || role === "onboarding";
}

export async function criarCustoFixo(formData: FormData) {
  const profile = await requireProfile();
  if (!requireFinanceiro(profile.role)) return { error: "Sem permissão." };
  const supabase = await createClient();
  const { error } = await supabase.from("custos_fixos").insert({
    nome: String(formData.get("nome") || ""),
    valor: parseFloat(String(formData.get("valor") || "0")) || 0,
    categoria: String(formData.get("categoria") || "") || null,
    data: String(formData.get("data") || "") || undefined,
    recorrencia: String(formData.get("recorrencia") || "mensal"),
  });
  if (error) return { error: error.message };
  revalidatePath("/financeiro");
  revalidatePath("/dre");
  return { success: true };
}

export async function atualizarCustoFixo(formData: FormData) {
  const profile = await requireProfile();
  if (!requireFinanceiro(profile.role)) return { error: "Sem permissão." };
  const supabase = await createClient();
  const id = String(formData.get("id") || "");
  const { error } = await supabase
    .from("custos_fixos")
    .update({
      nome: String(formData.get("nome") || ""),
      valor: parseFloat(String(formData.get("valor") || "0")) || 0,
      categoria: String(formData.get("categoria") || "") || null,
      data: String(formData.get("data") || ""),
      recorrencia: String(formData.get("recorrencia") || "mensal"),
    })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/financeiro");
  revalidatePath("/dre");
  return { success: true };
}

export async function removerCustoFixo(id: string) {
  const profile = await requireProfile();
  if (!requireFinanceiro(profile.role)) return { error: "Sem permissão." };
  const supabase = await createClient();
  const { data: custo } = await supabase.from("custos_fixos").select("nome, valor").eq("id", id).single();
  await supabase.from("custos_fixos").delete().eq("id", id);
  if (custo) {
    await logExclusao(supabase, profile, "custo_fixo", `Custo fixo: ${custo.nome} — ${brl(custo.valor)}`);
  }
  revalidatePath("/financeiro");
  revalidatePath("/dre");
}

// valor é opcional — só passa quando o usuário ajustou o preço antes de
// confirmar (ver ValorMoldavelCustoFixo). Sem isso, fica null e a tela
// cai de volta pro valor do modelo em custos_fixos.
export async function marcarCustoFixoPago(custoFixoId: string, data: string, valor?: number) {
  const profile = await requireProfile();
  if (!requireFinanceiro(profile.role)) return { error: "Sem permissão." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("custos_fixos_pagamentos")
    .insert({ custo_fixo_id: custoFixoId, data, pago_por: profile.id, valor: valor ?? null });
  if (error) return { error: error.message };
  revalidatePath("/financeiro");
  revalidatePath("/dre");
  return { success: true };
}

export async function desmarcarCustoFixoPago(custoFixoId: string, data: string) {
  const profile = await requireProfile();
  if (!requireFinanceiro(profile.role)) return { error: "Sem permissão." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("custos_fixos_pagamentos")
    .delete()
    .eq("custo_fixo_id", custoFixoId)
    .eq("data", data);
  if (error) return { error: error.message };
  revalidatePath("/financeiro");
  revalidatePath("/dre");
  return { success: true };
}

export async function confirmarRecebivelManual(recebivelId: string, data: string) {
  const profile = await requireProfile();
  if (!requireFinanceiro(profile.role)) return { error: "Sem permissão." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("recebiveis_manuais_confirmacoes")
    .insert({ recebivel_id: recebivelId, data, confirmado_por: profile.id });
  if (error) return { error: error.message };
  revalidatePath("/financeiro");
  revalidatePath("/dre");
  return { success: true };
}

export async function desconfirmarRecebivelManual(recebivelId: string, data: string) {
  const profile = await requireProfile();
  if (!requireFinanceiro(profile.role)) return { error: "Sem permissão." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("recebiveis_manuais_confirmacoes")
    .delete()
    .eq("recebivel_id", recebivelId)
    .eq("data", data);
  if (error) return { error: error.message };
  revalidatePath("/financeiro");
  revalidatePath("/dre");
  return { success: true };
}

export async function editarValorAvulsa(id: string, novoValor: number) {
  const profile = await requireProfile();
  if (!requireFinanceiro(profile.role)) return { error: "Sem permissão." };
  if (!(novoValor >= 0)) return { error: "Valor inválido." };
  const supabase = await createClient();
  const { error } = await supabase.from("contas_pagar_avulsas").update({ valor: novoValor }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/financeiro");
  revalidatePath("/dre");
  return { success: true };
}

export async function marcarAvulsaPaga(id: string) {
  const profile = await requireProfile();
  if (!requireFinanceiro(profile.role)) return { error: "Sem permissão." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("contas_pagar_avulsas")
    .update({ pago: true, pago_em: new Date().toISOString(), pago_por: profile.id })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/financeiro");
  revalidatePath("/dre");
  return { success: true };
}

export async function desmarcarAvulsaPaga(id: string) {
  const profile = await requireProfile();
  if (!requireFinanceiro(profile.role)) return { error: "Sem permissão." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("contas_pagar_avulsas")
    .update({ pago: false, pago_em: null, pago_por: null })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/financeiro");
  revalidatePath("/dre");
  return { success: true };
}

export async function criarCustoVariavel(formData: FormData) {
  const profile = await requireProfile();
  if (!requireFinanceiro(profile.role)) return { error: "Sem permissão." };
  const supabase = await createClient();
  const { error } = await supabase.from("custos_variaveis_extra").insert({
    nome: String(formData.get("nome") || ""),
    valor: parseFloat(String(formData.get("valor") || "0")) || 0,
    categoria: String(formData.get("categoria") || "") || null,
    cliente: String(formData.get("cliente") || "") || null,
    data: String(formData.get("data") || "") || hojeISOBR(),
  });
  if (error) return { error: error.message };
  revalidatePath("/financeiro");
  revalidatePath("/dre");
  return { success: true };
}

export async function removerCustoVariavel(id: string) {
  const profile = await requireProfile();
  if (!requireFinanceiro(profile.role)) return { error: "Sem permissão." };
  const supabase = await createClient();
  const { data: custo } = await supabase.from("custos_variaveis_extra").select("nome, valor, cliente").eq("id", id).single();
  await supabase.from("custos_variaveis_extra").delete().eq("id", id);
  if (custo) {
    await logExclusao(
      supabase,
      profile,
      "custo_variavel",
      `Custo variável: ${custo.nome} — ${brl(custo.valor)}${custo.cliente ? ` (${custo.cliente})` : ""}`
    );
  }
  revalidatePath("/financeiro");
  revalidatePath("/dre");
}

export async function lancarPagamento(formData: FormData) {
  const profile = await requireProfile();
  if (!requireFinanceiro(profile.role)) return { error: "Sem permissão." };
  const supabase = await createClient();

  const valor = parseFloat(String(formData.get("valor") || "0")) || 0;
  const tipo = String(formData.get("tipo") || "avulso") as "recorrencia" | "consultoria" | "avulso";
  const data = String(formData.get("data") || "") || null;
  const cliente = String(formData.get("cliente") || "") || null;

  const { error } = await supabase.from("pagamentos").insert({
    data,
    cliente,
    valor,
    canal: String(formData.get("canal") || "Asaas"),
    tipo,
    descricao: String(formData.get("descricao") || "") || null,
    pendente: false,
  });
  if (error) return { error: error.message };

  // pagamentos avulsos/consultoria contam pra "faturamento novo do mês"
  if (tipo !== "recorrencia") {
    await supabase.from("receita_eventos").insert({
      cliente_nome: cliente,
      tipo: "consultoria",
      valor,
      data: data || undefined,
      descricao: `Pagamento avulso: ${cliente || "sem cliente"}`,
      criado_por: profile.id,
    });
  }

  // toda entrada gera uma tarefa pro financeiro reservar 7% de imposto
  await supabase.from("tarefas").insert({
    titulo: `Reservar 7% de imposto — ${cliente || "sem cliente"}`,
    descricao: `Pagamento de ${brl(valor)} recebido (${tipo}). Reservar ${brl(valor * 0.07)} (7%) para impostos.`,
    urgencia: "media",
    cliente_nome: cliente,
    coluna: "a-fazer",
  });

  revalidatePath("/financeiro");
  revalidatePath("/dre");
  revalidatePath("/dashboard");
  revalidatePath("/tarefas");
  return { success: true };
}

export async function removerPagamento(id: string) {
  const profile = await requireProfile();
  if (!requireFinanceiro(profile.role)) return { error: "Sem permissão." };
  const supabase = await createClient();
  const { data: pagamento } = await supabase.from("pagamentos").select("cliente, valor, tipo, data").eq("id", id).single();
  await supabase.from("pagamentos").delete().eq("id", id);
  if (pagamento) {
    await logExclusao(
      supabase,
      profile,
      "pagamento",
      `Pagamento (${pagamento.tipo}): ${pagamento.cliente || "sem cliente"} — ${brl(pagamento.valor)}${pagamento.data ? ` em ${pagamento.data}` : ""}`
    );
  }
  revalidatePath("/financeiro");
  revalidatePath("/dre");
}

export async function definirMeta(formData: FormData) {
  const profile = await requireProfile();
  if (profile.role !== "master") return { error: "Só o master define a meta." };
  const supabase = await createClient();

  const ano = parseInt(String(formData.get("ano") || ""), 10);
  const mes = parseInt(String(formData.get("mes") || ""), 10);
  const valorMeta = parseFloat(String(formData.get("valorMeta") || "0")) || 0;
  const bonusValor = String(formData.get("bonusValor") || "");

  const { error } = await supabase.from("metas").upsert(
    {
      ano,
      mes,
      valor_meta: valorMeta,
      bonus_valor: bonusValor ? parseFloat(bonusValor) : null,
      criado_por: profile.id,
    },
    { onConflict: "ano,mes" }
  );
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  return { success: true };
}
