import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MetaTV } from "@/components/MetaTV";
import type { FaturamentoMesAtual } from "@/lib/types";

export const metadata = {
  title: "Meta ao vivo — Food Scale",
};

export default async function MetaTVPage() {
  await requireProfile();
  const supabase = await createClient();
  const { data } = await supabase.from("faturamento_mes_atual").select("*").single();
  return <MetaTV fat={data as FaturamentoMesAtual | null} />;
}
