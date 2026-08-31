"use server";

import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function atualizarMotivoCancelamento(id: string, motivo: string) {
  await requireProfile();
  const supabase = await createClient();
  const { error } = await supabase.from("clientes_cancelados").update({ motivo }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/clientes");
  return { success: true };
}
