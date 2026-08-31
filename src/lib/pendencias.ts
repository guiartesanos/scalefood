import { createClient } from "@/lib/supabase/server";
import { ocorrenciasNoMes } from "./data";
import type { CustoFixo, Tarefa, Profile } from "./types";

export interface ContaPendente {
  custoFixoId: string;
  nome: string;
  valor: number;
  data: string; // yyyy-mm-dd
  hoje: boolean;
  amanha: boolean;
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Pendências financeiras = contas que vencem HOJE ou AMANHÃ e ainda não
// têm um registro em custos_fixos_pagamentos. Janela curta de propósito
// (não é uma lista de tudo que está em aberto no mês) — é um aviso do
// que precisa de atenção imediata. Cobre os dois meses quando hoje/amanhã
// cruza virada de mês (ex: 31/08 -> 01/09).
export async function getContasPendentes(): Promise<ContaPendente[]> {
  const supabase = await createClient();
  const hoje = new Date();
  const amanha = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 1);
  const hj = ymd(hoje);
  const am = ymd(amanha);

  const { data: custosRaw } = await supabase.from("custos_fixos").select("*");
  const custos = (custosRaw || []) as CustoFixo[];

  const { data: pagosRaw } = await supabase
    .from("custos_fixos_pagamentos")
    .select("custo_fixo_id, data")
    .in("data", [hj, am]);
  const pagosSet = new Set((pagosRaw || []).map((p) => `${p.custo_fixo_id}|${p.data}`));

  const mesesAlvo = new Set([
    `${hoje.getFullYear()}-${hoje.getMonth()}`,
    `${amanha.getFullYear()}-${amanha.getMonth()}`,
  ]);

  const pendentes: ContaPendente[] = [];
  const vistos = new Set<string>();
  mesesAlvo.forEach((chave) => {
    const [ano, mes] = chave.split("-").map(Number);
    custos.forEach((c) => {
      ocorrenciasNoMes(c, ano, mes).forEach((dia) => {
        const data = ymd(new Date(ano, mes, dia));
        if (data !== hj && data !== am) return;
        const key = `${c.id}|${data}`;
        if (vistos.has(key) || pagosSet.has(key)) return;
        vistos.add(key);
        pendentes.push({
          custoFixoId: c.id,
          nome: c.nome,
          valor: Number(c.valor),
          data,
          hoje: data === hj,
          amanha: data === am,
        });
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
