import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "@/lib/types";

export async function logExclusao(
  supabase: SupabaseClient<any, any, any>,
  profile: Profile,
  tipo: string,
  descricao: string
) {
  await supabase.from("exclusoes_log").insert({
    tipo,
    descricao,
    removido_por: profile.id,
    removido_por_nome: profile.nome || profile.email,
  });
}
