import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PropostasList } from "@/components/PropostasList";
import type { Proposta } from "@/lib/types";

export default async function PropostasPage() {
  await requireProfile();
  const supabase = await createClient();
  const { data } = await supabase.from("propostas").select("*").order("data_envio", { ascending: false });

  return <PropostasList propostas={(data || []) as Proposta[]} />;
}
