"use server";

import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { revalidatePath } from "next/cache";

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
  });
  if (error) return { error: error.message };
  revalidatePath("/financeiro");
  return { success: true };
}

export async function removerCustoFixo(id: string) {
  const profile = await requireProfile();
  if (!requireFinanceiro(profile.role)) return { error: "Sem permissão." };
  const supabase = await createClient();
  await supabase.from("custos_fixos").delete().eq("id", id);
  revalidatePath("/financeiro");
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
  });
  if (error) return { error: error.message };
  revalidatePath("/financeiro");
  return { success: true };
}

export async function removerCustoVariavel(id: string) {
  const profile = await requireProfile();
  if (!requireFinanceiro(profile.role)) return { error: "Sem permissão." };
  const supabase = await createClient();
  await supabase.from("custos_variaveis_extra").delete().eq("id", id);
  revalidatePath("/financeiro");
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
      tipo: "consultoria",
      valor,
      data: data || undefined,
      descricao: `Pagamento avulso: ${cliente || "sem cliente"}`,
      criado_por: profile.id,
    });
  }

  revalidatePath("/financeiro");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function removerPagamento(id: string) {
  const profile = await requireProfile();
  if (!requireFinanceiro(profile.role)) return { error: "Sem permissão." };
  const supabase = await createClient();
  await supabase.from("pagamentos").delete().eq("id", id);
  revalidatePath("/financeiro");
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
