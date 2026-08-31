import { createClient } from "@/lib/supabase/server";
import { ocorrenciasNoMes } from "./data";
import type { CustoFixo, Tarefa, Profile } from "./types";

export interface ContaPendente {
  custoFixoId: string;
  nome: string;
  valor: number;
  data: string; // yyyy-mm-dd
  hoje: boolean;
  atrasada: boolean;
}

function hojeStr(): string {
  const h = new Date();
  return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, "0")}-${String(h.getDate()).padStart(2, "0")}`;
}

// Pendências financeiras = ocorrências de custo fixo DESTE mês que ainda
// não têm um registro em custos_fixos_pagamentos. Não olha meses
// passados (não temos histórico de pagamento anterior a essa feature) nem
// futuros (só vira pendência quando o mês em questão começa).
export async function getContasPendentes(): Promise<ContaPendente[]> {
  const supabase = await createClient();
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = hoje.getMonth();
  const hj = hojeStr();

  const { data: custosRaw } = await supabase.from("custos_fixos").select("*");
  const custos = (custosRaw || []) as CustoFixo[];

  const inicioMes = `${ano}-${String(mes + 1).padStart(2, "0")}-01`;
  const { data: pagosRaw } = await supabase
    .from("custos_fixos_pagamentos")
    .select("custo_fixo_id, data")
    .gte("data", inicioMes);
  const pagosSet = new Set((pagosRaw || []).map((p) => `${p.custo_fixo_id}|${p.data}`));

  const pendentes: ContaPendente[] = [];
  custos.forEach((c) => {
    ocorrenciasNoMes(c, ano, mes).forEach((dia) => {
      const data = `${ano}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
      if (pagosSet.has(`${c.id}|${data}`)) return;
      pendentes.push({
        custoFixoId: c.id,
        nome: c.nome,
        valor: Number(c.valor),
        data,
        hoje: data === hj,
        atrasada: data < hj,
      });
    });
  });

  return pendentes.sort((a, b) => a.data.localeCompare(b.data));
}

// Tarefas atribuídas a essa pessoa (por nome) que ainda não estão feitas.
// Time que ainda não tem "responsavel" preenchido não aparece aqui —
// preparado pra quando as tarefas forem distribuídas por pessoa.
export async function getTarefasPendentes(profile: Profile): Promise<Tarefa[]> {
  const supabase = await createClient();
  if (!profile.nome) return [];
  const { data } = await supabase
    .from("tarefas")
    .select("*")
    .eq("responsavel", profile.nome)
    .neq("coluna", "feito")
    .order("urgencia");
  return (data as Tarefa[]) || [];
}
