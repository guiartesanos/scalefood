"use server";

import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function criarTarefa(formData: FormData) {
  await requireProfile();
  const supabase = await createClient();

  const { error } = await supabase.from("tarefas").insert({
    titulo: String(formData.get("titulo") || ""),
    descricao: String(formData.get("descricao") || "") || null,
    urgencia: String(formData.get("urgencia") || "media"),
    cliente_nome: String(formData.get("clienteNome") || "") || null,
    agenda_id: String(formData.get("agendaId") || "") || null,
    responsavel: String(formData.get("responsavel") || "") || null,
    coluna: "a-fazer",
  });

  if (error) return { error: error.message };
  revalidatePath("/tarefas");
  return { success: true };
}

export async function atualizarResponsavelTarefa(tarefaId: string, responsavel: string) {
  await requireProfile();
  const supabase = await createClient();
  const { error } = await supabase
    .from("tarefas")
    .update({ responsavel: responsavel || null })
    .eq("id", tarefaId);
  if (error) return { error: error.message };
  revalidatePath("/tarefas");
  return { success: true };
}

export async function moverTarefa(tarefaId: string, coluna: "a-fazer" | "em-andamento" | "feito") {
  await requireProfile();
  const supabase = await createClient();
  const { error } = await supabase.from("tarefas").update({ coluna }).eq("id", tarefaId);
  if (error) return { error: error.message };
  revalidatePath("/tarefas");
  return { success: true };
}

export async function removerTarefa(tarefaId: string) {
  await requireProfile();
  const supabase = await createClient();
  const { error } = await supabase.from("tarefas").delete().eq("id", tarefaId);
  if (error) return { error: error.message };
  revalidatePath("/tarefas");
  return { success: true };
}

export async function criarTarefaSugestao(clienteNome: string) {
  await requireProfile();
  const supabase = await createClient();
  const { error } = await supabase.from("tarefas").insert({
    titulo: `Dar atenção a ${clienteNome}`,
    descricao: "Sugestão automática gerada a partir do status do cliente.",
    urgencia: "alta",
    cliente_nome: clienteNome,
    coluna: "a-fazer",
  });
  if (error) return { error: error.message };
  revalidatePath("/tarefas");
  return { success: true };
}

export async function criarAgenda(formData: FormData) {
  await requireProfile();
  const supabase = await createClient();
  const { error } = await supabase.from("agendas").insert({
    nome: String(formData.get("nome") || ""),
    email: String(formData.get("email") || "") || null,
  });
  if (error) return { error: error.message };
  revalidatePath("/tarefas");
  return { success: true };
}
