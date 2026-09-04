"use server";

import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import type { PropostaStatus, PropostaTipo } from "@/lib/types";

export async function criarProposta(formData: FormData) {
  const profile = await requireProfile();
  const supabase = await createClient();

  const nomeProspect = String(formData.get("nomeProspect") || "").trim();
  const dataEnvio = String(formData.get("dataEnvio") || "");
  if (!nomeProspect || !dataEnvio) return { error: "Preencha o nome do prospect e a data de envio." };

  const { error } = await supabase.from("propostas").insert({
    nome_prospect: nomeProspect,
    tipo: String(formData.get("tipo") || "consultoria") as PropostaTipo,
    valor: parseFloat(String(formData.get("valor") || "0")) || null,
    data_envio: dataEnvio,
    proximo_followup: String(formData.get("proximoFollowup") || "") || null,
    observacao: String(formData.get("observacao") || "").trim() || null,
    criado_por: profile.id,
  });
  if (error) return { error: error.message };
  revalidatePath("/propostas");
  return { success: true };
}

export async function atualizarStatusProposta(propostaId: string, status: PropostaStatus) {
  await requireProfile();
  const supabase = await createClient();
  const { error } = await supabase.from("propostas").update({ status }).eq("id", propostaId);
  if (error) return { error: error.message };
  revalidatePath("/propostas");
  return { success: true };
}

export async function atualizarFollowupProposta(propostaId: string, proximoFollowup: string) {
  await requireProfile();
  const supabase = await createClient();
  const { error } = await supabase
    .from("propostas")
    .update({ proximo_followup: proximoFollowup || null })
    .eq("id", propostaId);
  if (error) return { error: error.message };
  revalidatePath("/propostas");
  return { success: true };
}

export async function atualizarObservacaoProposta(propostaId: string, observacao: string) {
  await requireProfile();
  const supabase = await createClient();
  const { error } = await supabase
    .from("propostas")
    .update({ observacao: observacao || null })
    .eq("id", propostaId);
  if (error) return { error: error.message };
  revalidatePath("/propostas");
  return { success: true };
}

export async function removerProposta(propostaId: string) {
  await requireProfile();
  const supabase = await createClient();
  const { error } = await supabase.from("propostas").delete().eq("id", propostaId);
  if (error) return { error: error.message };
  revalidatePath("/propostas");
  return { success: true };
}
