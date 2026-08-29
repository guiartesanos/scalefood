"use server";

import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import type { ClienteStatus } from "@/lib/types";

function calcTraf(rec: number): number {
  return rec >= 2500 ? Math.round(rec * 0.34 * 100) / 100 : 850;
}

export async function criarCliente(formData: FormData) {
  await requireProfile();
  const supabase = await createClient();

  const nome = String(formData.get("nome") || "").trim();
  const dono = String(formData.get("dono") || "").trim();
  const nicho = String(formData.get("nicho") || "").trim();
  const status = String(formData.get("status") || "Onboarding urgente") as ClienteStatus;
  const rec = parseFloat(String(formData.get("rec") || "0")) || 0;
  const entradaRaw = String(formData.get("entrada") || "");
  const entrada = entradaRaw ? parseFloat(entradaRaw) : null;
  const fechamento = String(formData.get("fechamento") || "") || null;
  const promoPrimeiroMesGratis = formData.get("promo") === "on";
  const inicioCobrancaRaw = String(formData.get("inicio_cobranca") || "");
  const inicioCobranca = inicioCobrancaRaw || null;

  if (!nome || !dono || !nicho) {
    return { error: "Preencha nome, dono e nicho." };
  }

  const traf = calcTraf(rec);
  const taxa = 2.98;
  const liq = rec - traf - taxa;
  const marg = rec ? (liq / rec) * 100 : 0;

  const { count } = await supabase
    .from("clientes")
    .select("*", { count: "exact", head: true });

  const { error } = await supabase.from("clientes").insert({
    n: (count || 0) + 1,
    nome,
    dono,
    nicho,
    status,
    rec,
    traf,
    com: 0,
    imp: 0,
    taxa,
    taxa_fonte: "estimado",
    liq,
    marg,
    entrada,
    hoje: entrada,
    growth_note: entrada == null ? "sem_dado" : status === "Onboarding urgente" ? "nao_iniciado" : "estagnado",
    band: entrada == null ? null : entrada <= 25000 ? "≤25k" : entrada <= 35000 ? "26-35k" : "≥40k",
    fechamento,
    promo_primeiro_mes_gratis: promoPrimeiroMesGratis,
    inicio_cobranca_recorrente: promoPrimeiroMesGratis ? inicioCobranca : null,
  });

  if (error) {
    return { error: "Não deu pra salvar o cliente: " + error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/clientes");
  return { success: true };
}

export async function atualizarStatusCliente(clienteId: string, status: ClienteStatus) {
  await requireProfile();
  const supabase = await createClient();
  const { error } = await supabase.from("clientes").update({ status }).eq("id", clienteId);
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  revalidatePath("/clientes");
  return { success: true };
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

  const { data: cliente } = await supabase
    .from("clientes")
    .select("rec, taxa")
    .eq("id", clienteId)
    .single();

  if (!cliente) return { error: "Cliente não encontrado." };

  const taxa = cliente.taxa || 0;
  const liq = rec - traf - com - imp - taxa;
  const marg = rec ? (liq / rec) * 100 : 0;
  const recAntigo = cliente.rec;

  const { error } = await supabase
    .from("clientes")
    .update({ rec, traf, com, imp, liq, marg })
    .eq("id", clienteId);

  if (error) return { error: error.message };

  // registra o delta como evento de receita (upsell/downsell), se mudou
  const delta = rec - recAntigo;
  if (Math.abs(delta) > 0.01) {
    await supabase.from("receita_eventos").insert({
      cliente_id: clienteId,
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
