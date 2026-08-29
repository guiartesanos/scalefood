import { createClient } from "@/lib/supabase/server";
import type { Cliente } from "./types";

// SEMPRE via clientes_view (não a tabela clientes crua) — é a view que
// esconde liq/marg de financeiro/onboarding no nível do banco.
export async function getClientes(): Promise<Cliente[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("clientes_view").select("*").order("n");
  return (data as Cliente[]) || [];
}

export function brl(v: number | null | undefined) {
  return "R$ " + Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function brlInt(v: number | null | undefined) {
  return "R$ " + Math.round(v || 0).toLocaleString("pt-BR");
}

export function tenureLabel(fechamento: string | null): { text: string; days: number } {
  if (!fechamento) return { text: "—", days: 99999 };
  const d = new Date(fechamento + "T00:00:00");
  const days = Math.round((Date.now() - d.getTime()) / 86400000);
  if (days <= 0) return { text: "hoje", days };
  if (days < 30) return { text: `${days} dia${days > 1 ? "s" : ""}`, days };
  const months = Math.round((days / 30.44) * 10) / 10;
  const numStr = Number.isInteger(months) ? months.toFixed(0) : months.toFixed(1).replace(".", ",");
  return { text: `${numStr} ${months < 2 ? "mês" : "meses"}`, days };
}

export function pctOf(c: Cliente): number | null {
  return c.entrada && c.entrada > 0 && c.hoje != null ? ((c.hoje - c.entrada) / c.entrada) * 100 : null;
}
