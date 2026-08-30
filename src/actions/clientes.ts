"use server";

import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import type { ClienteStatus } from "@/lib/types";

export async function atualizarStatusCliente(clienteId: string, status: ClienteStatus) {
  await requireProfile();
  const supabase = await createClient();
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
    .select("rec, taxa, entrada, hoje")
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
