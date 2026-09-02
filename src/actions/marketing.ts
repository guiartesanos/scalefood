"use server";

import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { buscarImagensDrive, type ImagemDrive } from "@/lib/googleDrive";
import { lerDatasetTemplate, iniciarAutofill, checarAutofill, subirAssetCanva } from "@/lib/canva";

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

export async function buscarImagensDriveAction(termo: string): Promise<{ imagens?: ImagemDrive[]; error?: string }> {
  const profile = await requireProfile();
  if (!requireMarketing(profile.role)) return { error: "Sem permissão." };
  try {
    const imagens = await buscarImagensDrive(termo);
    return { imagens };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao buscar imagens." };
  }
}

export async function salvarImagemDrive(geracaoId: string, url: string, nome: string) {
  const profile = await requireProfile();
  if (!requireMarketing(profile.role)) return { error: "Sem permissão." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("geracoes_conteudo")
    .update({ imagem_drive_url: url, imagem_drive_nome: nome, updated_at: new Date().toISOString() })
    .eq("id", geracaoId);
  if (error) return { error: error.message };
  revalidatePath("/marketing");
  return { success: true };
}

// Preenche o modelo escolhido automaticamente via Autofill do Canva —
// cada campo de texto do modelo recebe, em ordem, uma resposta das
// perguntas provocativas; um campo de imagem recebe a foto do Drive
// (se tiver sido escolhida). Se o modelo não tiver campo nenhum
// configurado no Canva ainda, avisa em vez de falhar silenciosamente.
export async function gerarNoCanva(geracaoId: string): Promise<{ error?: string; editUrl?: string }> {
  const profile = await requireProfile();
  if (!requireMarketing(profile.role)) return { error: "Sem permissão." };
  const supabase = await createClient();

  const { data: geracao } = await supabase.from("geracoes_conteudo").select("*").eq("id", geracaoId).single();
  if (!geracao || !geracao.template_id) return { error: "Escolha um modelo antes." };

  const { data: template } = await supabase.from("canva_templates").select("*").eq("id", geracao.template_id).single();
  if (!template) return { error: "Modelo não encontrado." };

  let dataset: Record<string, { tipo: string }>;
  try {
    dataset = await lerDatasetTemplate(template.brand_template_id);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao ler o modelo no Canva." };
  }
  const campos = Object.entries(dataset);
  if (!campos.length) {
    return {
      error:
        "Esse modelo ainda não tem campos de dados configurados no Canva. Abra o modelo lá, marque os textos (e a imagem, se tiver) como campos de dados, e tenta de novo.",
    };
  }

  const respostas = Object.values(geracao.respostas || {}) as string[];
  let indiceResposta = 0;
  const dadosAutofill: Record<string, { type: "text"; text: string } | { type: "image"; asset_id: string }> = {};

  let assetId: string | null = null;
  for (const [nomeCampo, campo] of campos) {
    if (campo.tipo === "image") {
      if (!geracao.imagem_drive_url) continue;
      if (!assetId) {
        try {
          const imgRes = await fetch(geracao.imagem_drive_url);
          const buffer = Buffer.from(await imgRes.arrayBuffer());
          assetId = await subirAssetCanva(buffer, geracao.imagem_drive_nome || "imagem.jpg");
        } catch (e) {
          return { error: e instanceof Error ? e.message : "Erro ao subir a imagem pro Canva." };
        }
      }
      dadosAutofill[nomeCampo] = { type: "image", asset_id: assetId };
    } else {
      dadosAutofill[nomeCampo] = { type: "text", text: respostas[indiceResposta] || geracao.tema };
      indiceResposta += 1;
    }
  }

  let jobId: string;
  try {
    jobId = await iniciarAutofill(template.brand_template_id, dadosAutofill);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao iniciar o autofill no Canva." };
  }

  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 1500));
    const resultado = await checarAutofill(jobId);
    if (resultado.status === "success" && resultado.editUrl) {
      await supabase
        .from("geracoes_conteudo")
        .update({ canva_design_url: resultado.editUrl, status: "pronto", updated_at: new Date().toISOString() })
        .eq("id", geracaoId);
      revalidatePath("/marketing");
      return { editUrl: resultado.editUrl };
    }
    if (resultado.status === "failed") return { error: resultado.erro || "Falha ao gerar o design no Canva." };
  }
  return { error: "O Canva demorou demais pra gerar o design — tenta de novo em instantes." };
}

export async function removerGeracao(id: string) {
  const profile = await requireProfile();
  if (!requireMarketing(profile.role)) return { error: "Sem permissão." };
  const supabase = await createClient();
  await supabase.from("geracoes_conteudo").delete().eq("id", id);
  revalidatePath("/marketing");
  return { success: true };
}
