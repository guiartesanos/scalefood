"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { requireMaster } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { logExclusao } from "@/lib/auditoria";
import type { UserRole } from "@/lib/types";

// Todas as funções aqui exigem role='master' — checado no servidor
// ANTES de tocar na service role key. A service role key nunca sai do
// servidor (não existe em nenhum componente client, não é passada pro
// navegador em nenhum momento).

export async function convidarUsuario(formData: FormData) {
  await requireMaster(); // redireciona se não for master

  const email = String(formData.get("email") || "").trim();
  const nome = String(formData.get("nome") || "").trim();
  const role = String(formData.get("role") || "comercial") as UserRole;

  if (!email) return { error: "Informe o email." };

  const admin = createAdminClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";

  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { nome, role },
    redirectTo: `${siteUrl}/redefinir-senha`,
  });

  if (error) return { error: "Não deu pra convidar: " + error.message };

  revalidatePath("/configuracoes/usuarios");
  return { success: true };
}

export async function alterarPapelUsuario(userId: string, role: UserRole) {
  await requireMaster();
  const admin = createAdminClient();

  const { error } = await admin.from("profiles").update({ role }).eq("id", userId);
  if (error) return { error: error.message };

  revalidatePath("/configuracoes/usuarios");
  return { success: true };
}

export async function removerUsuario(userId: string) {
  const profile = await requireMaster();
  if (userId === profile.id) {
    return { error: "Você não pode remover a própria conta por aqui." };
  }

  const admin = createAdminClient();
  const { data: alvo } = await admin.from("profiles").select("email, nome, role").eq("id", userId).single();
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return { error: error.message };

  if (alvo) {
    await logExclusao(
      admin,
      profile,
      "usuario",
      `Usuário removido: ${alvo.nome || alvo.email} (${alvo.email}, papel: ${alvo.role})`
    );
  }

  revalidatePath("/configuracoes/usuarios");
  return { success: true };
}

export async function listarUsuarios() {
  await requireMaster();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) return [];
  return data;
}
