"use server";

import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { revalidatePath } from "next/cache";

function requireMarketing(role: string) {
  return role === "master" || role === "comercial";
}

export async function descartarNoticia(id: string) {
  const profile = await requireProfile();
  if (!requireMarketing(profile.role)) return { error: "Sem permissão." };
  const supabase = await createClient();
  const { error } = await supabase.from("radar_noticias").update({ status: "descartado" }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/marketing");
  return { success: true };
}

export async function moverParaGerador(id: string) {
  const profile = await requireProfile();
  if (!requireMarketing(profile.role)) return { error: "Sem permissão." };
  const supabase = await createClient();

  const { data: noticia } = await supabase.from("radar_noticias").select("titulo").eq("id", id).single();
  if (!noticia) return { error: "Notícia não encontrada." };

  const { error: e1 } = await supabase.from("radar_noticias").update({ status: "gerador" }).eq("id", id);
  if (e1) return { error: e1.message };

  const { error: e2 } = await supabase.from("geracoes_conteudo").insert({
    noticia_id: id,
    tema: noticia.titulo,
    status: "rascunho",
    criado_por: profile.id,
  });
  if (e2) return { error: e2.message };

  revalidatePath("/marketing");
  return { success: true };
}

export async function criarGeracaoAvulsa(tema: string) {
  const profile = await requireProfile();
  if (!requireMarketing(profile.role)) return { error: "Sem permissão." };
  if (!tema.trim()) return { error: "Descreva o tema do conteúdo." };
  const supabase = await createClient();
  const { error } = await supabase.from("geracoes_conteudo").insert({
    tema: tema.trim(),
    status: "rascunho",
    criado_por: profile.id,
  });
  if (error) return { error: error.message };
  revalidatePath("/marketing");
  return { success: true };
}

export async function salvarRespostas(geracaoId: string, respostas: Record<string, string>) {
  const profile = await requireProfile();
  if (!requireMarketing(profile.role)) return { error: "Sem permissão." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("geracoes_conteudo")
    .update({ respostas, status: "perguntas", updated_at: new Date().toISOString() })
    .eq("id", geracaoId);
  if (error) return { error: error.message };
  revalidatePath("/marketing");
  return { success: true };
}

export async function escolherTemplate(geracaoId: string, templateId: string) {
  const profile = await requireProfile();
  if (!requireMarketing(profile.role)) return { error: "Sem permissão." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("geracoes_conteudo")
    .update({ template_id: templateId, updated_at: new Date().toISOString() })
    .eq("id", geracaoId);
  if (error) return { error: error.message };
  revalidatePath("/marketing");
  return { success: true };
}

export async function salvarLinkCanva(geracaoId: string, url: string) {
  const profile = await requireProfile();
  if (!requireMarketing(profile.role)) return { error: "Sem permissão." };
  if (!url.trim()) return { error: "Cole o link do design no Canva." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("geracoes_conteudo")
    .update({ canva_design_url: url.trim(), status: "pronto", updated_at: new Date().toISOString() })
    .eq("id", geracaoId);
  if (error) return { error: error.message };
  revalidatePath("/marketing");
  return { success: true };
}

export async function removerGeracao(id: string) {
  const profile = await requireProfile();
  if (!requireMarketing(profile.role)) return { error: "Sem permissão." };
  const supabase = await createClient();
  await supabase.from("geracoes_conteudo").delete().eq("id", id);
  revalidatePath("/marketing");
  return { success: true };
}
