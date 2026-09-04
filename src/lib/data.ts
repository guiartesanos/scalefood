import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Cliente, CustoFixo } from "./types";

// SEMPRE via clientes_view (não a tabela clientes crua) — é a view que
// esconde liq/marg de financeiro/onboarding no nível do banco.
// cache() dedupe chamadas repetidas (layout + page) dentro do mesmo request.
export const getClientes = cache(async function getClientes(): Promise<Cliente[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("clientes_view").select("*").order("n");
  return (data as Cliente[]) || [];
});

// brl/brlInt moraram aqui antes — reexportados de @/lib/format (que não
// importa nada do Supabase) pra quem já importava daqui não quebrar, e
// pra código client-side poder importar a mesma formatação sem puxar
// junto o createClient de servidor deste arquivo.
export { brl, brlInt } from "./format";

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

export function ocorrenciasNoMes(
  custo: Pick<CustoFixo, "data" | "recorrencia" | "vigente_desde">,
  ano: number,
  mes: number
): number[] {
  const vigenteDesde = new Date(custo.vigente_desde + "T00:00:00");
  if (vigenteDesde.getFullYear() > ano || (vigenteDesde.getFullYear() === ano && vigenteDesde.getMonth() > mes)) {
    return [];
  }
  const ref = new Date(custo.data + "T00:00:00");
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();

  if (custo.recorrencia === "pontual") {
    return ref.getFullYear() === ano && ref.getMonth() === mes ? [ref.getDate()] : [];
  }
  if (custo.recorrencia === "mensal") {
    return [Math.min(ref.getDate(), diasNoMes)];
  }
  // semanal: todo dia com o mesmo dia-da-semana da data de referência
  const diaSemana = ref.getDay();
  const dias: number[] = [];
  for (let d = 1; d <= diasNoMes; d++) {
    if (new Date(ano, mes, d).getDay() === diaSemana) dias.push(d);
  }
  return dias;
}

export function periodoLabel(inicio: string | null, fim: string | null): string {
  if (!inicio || !fim) return "—";
  const d1 = new Date(inicio + "T00:00:00");
  const d2 = new Date(fim + "T00:00:00");
  const days = Math.round((d2.getTime() - d1.getTime()) / 86400000);
  if (days <= 0) return "1 dia";
  if (days < 30) return `${days} dia${days > 1 ? "s" : ""}`;
  const months = Math.round((days / 30.44) * 10) / 10;
  const numStr = Number.isInteger(months) ? months.toFixed(0) : months.toFixed(1).replace(".", ",");
  return `${numStr} ${months < 2 ? "mês" : "meses"}`;
}
