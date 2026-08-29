import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Profile } from "./types";

// Chame isso no topo de todo Server Component/Server Action que precisa
// de dados protegidos. Se não tiver sessão válida ou perfil, redireciona
// pro login ANTES de qualquer query rodar — nenhum dado sai do servidor
// sem isso passar.
export async function requireProfile(): Promise<Profile> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error || !profile) redirect("/login");

  return profile as Profile;
}

export async function requireMaster(): Promise<Profile> {
  const profile = await requireProfile();
  if (profile.role !== "master") redirect("/dashboard");
  return profile;
}
