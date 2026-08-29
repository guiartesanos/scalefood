"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  if (!email || !password) {
    redirect(`/login?error=${encodeURIComponent("Preencha email e senha.")}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent("Email ou senha incorretos.")}`);
  }

  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  if (!email) {
    redirect(`/esqueci-senha?error=${encodeURIComponent("Informe seu email.")}`);
  }

  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/redefinir-senha`,
  });

  // Sempre redireciona pro mesmo "sucesso" (não revela se o email existe
  // ou não na base — evita enumerar quem tem conta no sistema).
  redirect("/esqueci-senha?enviado=1");
}

export async function updatePassword(formData: FormData) {
  const password = String(formData.get("password") || "");
  const confirm = String(formData.get("confirm") || "");

  if (password.length < 8) {
    redirect(
      `/redefinir-senha?error=${encodeURIComponent("A senha precisa ter pelo menos 8 caracteres.")}`
    );
  }
  if (password !== confirm) {
    redirect(`/redefinir-senha?error=${encodeURIComponent("As senhas não coincidem.")}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    redirect(
      `/redefinir-senha?error=${encodeURIComponent(
        "Não deu pra atualizar a senha. Peça um novo link de redefinição."
      )}`
    );
  }

  redirect("/dashboard");
}
