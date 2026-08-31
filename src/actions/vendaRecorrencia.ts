"use server";

import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { criarClienteComRecorrencia } from "@/lib/clienteAsaas";
import type { ClienteStatus } from "@/lib/types";

// Mesmo papel de quem cria cliente hoje (master/comercial/onboarding,
// RLS de "clientes" já restringe assim).
function podeCriarCliente(role: string) {
  return role === "master" || role === "comercial" || role === "onboarding";
}

export async function criarVendaRecorrencia(formData: FormData) {
  const profile = await requireProfile();
  if (!podeCriarCliente(profile.role)) return { error: "Sem permissão." };

  const supabase = await createClient();

  const nome = String(formData.get("nome") || "").trim();
  const dono = String(formData.get("dono") || "").trim();
  const nicho = String(formData.get("nicho") || "").trim();
  const status = String(formData.get("status") || "Onboarding urgente") as ClienteStatus;
  const valorRecorrencia = parseFloat(String(formData.get("valorRecorrencia") || "0")) || 0;
  const entradaRaw = String(formData.get("entrada") || "");
  const entrada = entradaRaw ? parseFloat(entradaRaw) : null;
  const fechamento = String(formData.get("fechamento") || "");
  const primeiroMesGratis = formData.get("primeiroMesGratis") === "on";
  const dataPrimeiroPagamento = String(formData.get("dataPrimeiroPagamento") || "") || null;
  const integrarAsaas = String(formData.get("canal") || "") === "Asaas";

  if (!nome || !nicho || !valorRecorrencia || !fechamento) {
    return { error: "Preencha nome, nicho, valor da recorrência e data de fechamento." };
  }
  if (primeiroMesGratis && !dataPrimeiroPagamento) {
    return { error: "Marcou 1º mês grátis — informe a data do 1º pagamento da recorrência." };
  }

  const resultado = await criarClienteComRecorrencia(supabase, profile.id, {
    nome,
    dono,
    nicho,
    status,
    fechamento,
    valorRecorrencia,
    entrada,
    primeiroMesGratis,
    dataPrimeiroPagamento,
    integrarAsaas,
    cpfCnpj: String(formData.get("cpfCnpj") || "").trim(),
    email: String(formData.get("email") || "").trim(),
    telefone: String(formData.get("telefone") || "").trim(),
    cep: String(formData.get("cep") || "").trim(),
    endereco: String(formData.get("endereco") || "").trim(),
    numero: String(formData.get("numero") || "").trim(),
    complemento: String(formData.get("complemento") || "").trim(),
    bairro: String(formData.get("bairro") || "").trim(),
    juros: parseFloat(String(formData.get("juros") || "1")) || 1,
    multa: parseFloat(String(formData.get("multa") || "2")) || 2,
  });

  if ("error" in resultado) return resultado;

  revalidatePath("/dashboard");
  revalidatePath("/clientes");
  revalidatePath("/icp");

  return {
    success: true,
    asaasCustomerId: resultado.asaasCustomerId,
    asaasSubscriptionId: resultado.asaasSubscriptionId,
  };
}
