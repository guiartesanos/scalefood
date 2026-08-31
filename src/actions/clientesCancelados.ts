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

export async function atualizarClienteCancelado(id: string, formData: FormData) {
  await requireProfile();
  const supabase = await createClient();
  const nicho = String(formData.get("nicho") || "").trim() || null;
  const dono = String(formData.get("dono") || "").trim() || null;
  const observacao = String(formData.get("observacao") || "").trim() || null;
  const { error } = await supabase
    .from("clientes_cancelados")
    .update({ nicho, dono, observacao })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/clientes");
  revalidatePath(`/clientes/cancelados/${id}`);
  return { success: true };
}
