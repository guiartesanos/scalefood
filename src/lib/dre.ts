import { createClient } from "@/lib/supabase/server";
import { ocorrenciasNoMes } from "./data";
import { listarPagamentosRecebidosNoPeriodo, listarTarifasAsaas } from "./asaas";
import type { ContaPagarAvulsa, CustoFixo, CustoVariavelExtra, RecebivelManual } from "./types";

export const DRE_PRIMEIRO_ANO_MES = 202608; // agosto/2026 — antes disso não fecha (regra do usuário)

export interface DREItem {
  label: string;
  valor: number;
  data?: string;
}

export interface DRELinha {
  label: string;
  valor: number;
  itens: DREItem[];
  automatico: boolean;
}

export interface DREResultado {
  ano: number;
  mes: number; // 1-12
  ehMesAtual: boolean;
  periodoBuscado: { inicio: string; fim: string };
  receita: { linhas: DRELinha[]; total: number };
  custosVariaveis: { linhas: DRELinha[]; total: number };
  custosFixos: { linhas: DRELinha[]; total: number };
  resultado: number;
  erroAsaas: string | null;
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const CANAIS_NAO_ASAAS = (canal: string | null) => (canal || "").trim().toLowerCase() !== "asaas";

// Monta o DRE de um mês (ano, mes 1-12) inteiramente a partir do que já
// aconteceu de verdade: pagamentos recebidos no Asaas (ao vivo, via API),
// entradas fora do Asaas já lançadas em `pagamentos`, e custos só contam
// quando alguém confirmou o pagamento (`custos_fixos_pagamentos` /
// `contas_pagar_avulsas.pago` / `recebiveis_manuais_confirmacoes`) — a
// única ação manual que existe em todo o DRE é justamente essa confirmação.
export async function getDRE(ano: number, mes: number): Promise<DREResultado> {
  const supabase = await createClient();
  const hoje = new Date();
  const ehMesAtual = ano === hoje.getFullYear() && mes === hoje.getMonth() + 1;
  const inicio = `${ano}-${String(mes).padStart(2, "0")}-01`;
  const ultimoDiaDoMes = new Date(ano, mes, 0).getDate();
  const fim = ehMesAtual ? ymd(hoje) : `${ano}-${String(mes).padStart(2, "0")}-${ultimoDiaDoMes}`;
  const mes0 = mes - 1; // ocorrenciasNoMes/getRecebiveisManuaisDoMes usam mês 0-indexado

  let erroAsaas: string | null = null;
  let pagamentosAsaas: Awaited<ReturnType<typeof listarPagamentosRecebidosNoPeriodo>> = [];
  let tarifas: Awaited<ReturnType<typeof listarTarifasAsaas>> = {
    cobranca: 0, antecipacao: 0, sms: 0, notas: 0, transferencia: 0, estorno: 0, total: 0, processamento: 0,
  };
  try {
    [pagamentosAsaas, tarifas] = await Promise.all([
      listarPagamentosRecebidosNoPeriodo(inicio, fim),
      listarTarifasAsaas(inicio, fim),
    ]);
  } catch (e) {
    erroAsaas = e instanceof Error ? e.message : "Erro ao buscar dados do Asaas.";
  }

  const [
    { data: pagamentosRaw },
    { data: custosFixosRaw },
    { data: pagosFixosRaw },
    { data: avulsasRaw },
    { data: custosVarRaw },
    { data: recebiveisRaw },
    { data: confRaw },
  ] = await Promise.all([
    supabase.from("pagamentos").select("*").gte("data", inicio).lte("data", fim),
    supabase.from("custos_fixos").select("*"),
    supabase.from("custos_fixos_pagamentos").select("custo_fixo_id, data").gte("data", inicio).lte("data", fim),
    supabase.from("contas_pagar_avulsas").select("*").eq("pago", true).gte("data", inicio).lte("data", fim),
    supabase.from("custos_variaveis_extra").select("*").gte("data", inicio).lte("data", fim),
    supabase.from("recebiveis_manuais").select("*").eq("ativo", true),
    supabase.from("recebiveis_manuais_confirmacoes").select("recebivel_id, data").gte("data", inicio).lte("data", fim),
  ]);

  // ---------- RECEITA ----------
  const asaasRecorrencia = pagamentosAsaas.filter((p) => p.subscription);
  const asaasAvulso = pagamentosAsaas.filter((p) => !p.subscription);
  const pagamentosForaAsaas = (pagamentosRaw || []).filter((p) => CANAIS_NAO_ASAAS(p.canal));
  const foraAsaasRecorrencia = pagamentosForaAsaas.filter((p) => p.tipo === "recorrencia");
  const foraAsaasOutros = pagamentosForaAsaas.filter((p) => p.tipo !== "recorrencia");

  const recebiveis = (recebiveisRaw || []) as RecebivelManual[];
  const confSet = new Set((confRaw || []).map((c) => `${c.recebivel_id}|${c.data}`));
  const recebiveisConfirmados: DREItem[] = [];
  recebiveis.forEach((r) => {
    ocorrenciasNoMes(r, ano, mes0).forEach((dia) => {
      const data = `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
      if (confSet.has(`${r.id}|${data}`)) {
        recebiveisConfirmados.push({ label: `${r.nome}${r.cliente_nome ? ` (${r.cliente_nome})` : ""}`, valor: Number(r.valor), data });
      }
    });
  });

  const linhaRecorrencia: DRELinha = {
    label: "Recorrência",
    automatico: true,
    itens: [
      ...asaasRecorrencia.map((p) => ({ label: `${p.customerName} · Asaas`, valor: p.value, data: p.paymentDate })),
      ...foraAsaasRecorrencia.map((p) => ({ label: `${p.cliente || "—"} · ${p.canal}`, valor: Number(p.valor), data: p.data || undefined })),
    ],
    valor: 0,
  };
  linhaRecorrencia.valor = linhaRecorrencia.itens.reduce((s, i) => s + i.valor, 0);

  const linhaConsultoria: DRELinha = {
    label: "Consultoria / avulso",
    automatico: true,
    itens: [
      ...asaasAvulso.map((p) => ({ label: `${p.customerName} · Asaas${p.description ? ` — ${p.description}` : ""}`, valor: p.value, data: p.paymentDate })),
      ...foraAsaasOutros.map((p) => ({ label: `${p.cliente || "—"} · ${p.canal}`, valor: Number(p.valor), data: p.data || undefined })),
    ],
    valor: 0,
  };
  linhaConsultoria.valor = linhaConsultoria.itens.reduce((s, i) => s + i.valor, 0);

  const linhaOutrasReceitas: DRELinha = {
    label: "Outras receitas (recebíveis manuais)",
    automatico: false,
    itens: recebiveisConfirmados,
    valor: recebiveisConfirmados.reduce((s, i) => s + i.valor, 0),
  };

  const receitaLinhas = [linhaRecorrencia, linhaConsultoria, linhaOutrasReceitas].filter((l) => l.itens.length > 0);
  const receitaTotal = receitaLinhas.reduce((s, l) => s + l.valor, 0);

  // ---------- CUSTOS VARIÁVEIS ----------
  const avulsas = (avulsasRaw || []) as ContaPagarAvulsa[];
  const trafego = avulsas.filter((a) => a.categoria === "Tráfego");
  const comissao = avulsas.filter((a) => a.categoria === "Comissão");
  const trafegoJota = trafego.filter((a) => a.gestor === "Jota");
  const trafegoLorenzo = trafego.filter((a) => a.gestor === "Lorenzo");

  const toItem = (a: ContaPagarAvulsa): DREItem => ({ label: a.cliente_nome || a.nome, valor: Number(a.valor), data: a.data });

  const custosVarRawList = (custosVarRaw || []) as CustoVariavelExtra[];
  // Exclui qualquer linha de "Tarifas Asaas" (seja o backfill manual antigo
  // ou o total que o cron mantém) — o DRE calcula essa tarifa ao vivo direto
  // do extrato, incluir aqui contaria a mesma tarifa 2x.
  const manuaisFiltrados = custosVarRawList.filter((c) => !c.nome.startsWith("Tarifas Asaas"));

  const impostoValor = Math.round(receitaTotal * 0.07 * 100) / 100;

  const linhasCustosVariaveis: DRELinha[] = [
    { label: "Tráfego (repasse Jota)", automatico: true, itens: trafegoJota.map(toItem), valor: trafegoJota.reduce((s, a) => s + Number(a.valor), 0) },
    { label: "Tráfego (repasse Lorenzo)", automatico: true, itens: trafegoLorenzo.map(toItem), valor: trafegoLorenzo.reduce((s, a) => s + Number(a.valor), 0) },
    { label: "Comissão de vendas", automatico: true, itens: comissao.map(toItem), valor: comissao.reduce((s, a) => s + Number(a.valor), 0) },
    {
      label: "Imposto (7% da receita)",
      automatico: true,
      valor: impostoValor,
      itens: receitaTotal > 0 ? [{ label: "7% sobre a receita bruta do mês", valor: impostoValor }] : [],
    },
    {
      label: "Taxa de processamento Asaas",
      automatico: true,
      valor: tarifas.processamento,
      itens: tarifas.processamento > 0
        ? [{ label: "Boleto / PIX / cartão + mensageria (extrato Asaas)", valor: tarifas.processamento }]
        : [],
    },
    {
      label: "Tarifas de conta Asaas",
      automatico: true,
      valor: tarifas.total,
      itens: [
        tarifas.transferencia > 0 && { label: "Transferência", valor: tarifas.transferencia },
        tarifas.antecipacao > 0 && { label: "Antecipação", valor: tarifas.antecipacao },
        tarifas.cobranca > 0 && { label: "Cobrança / protesto", valor: tarifas.cobranca },
        tarifas.notas > 0 && { label: "Notas fiscais", valor: tarifas.notas },
        tarifas.sms > 0 && { label: "SMS", valor: tarifas.sms },
        tarifas.estorno > 0 && { label: "Estorno de tarifa", valor: -tarifas.estorno },
      ].filter((x): x is DREItem => !!x),
    },
    {
      label: "Outros custos variáveis (lançados manualmente)",
      automatico: false,
      itens: manuaisFiltrados.map((c) => ({ label: `${c.nome}${c.cliente ? ` (${c.cliente})` : ""}`, valor: Number(c.valor), data: c.data })),
      valor: manuaisFiltrados.reduce((s, c) => s + Number(c.valor), 0),
    },
  ].filter((l) => l.itens.length > 0);
  const custosVariaveisTotal = linhasCustosVariaveis.reduce((s, l) => s + l.valor, 0);

  // ---------- CUSTOS FIXOS ----------
  const custosFixos = (custosFixosRaw || []) as CustoFixo[];
  const pagosSet = new Set((pagosFixosRaw || []).map((p) => `${p.custo_fixo_id}|${p.data}`));
  const custosFixosPorCategoria = new Map<string, DREItem[]>();
  custosFixos.forEach((c) => {
    ocorrenciasNoMes(c, ano, mes0).forEach((dia) => {
      const data = `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
      if (!pagosSet.has(`${c.id}|${data}`)) return;
      const cat = c.categoria || "Outros";
      if (!custosFixosPorCategoria.has(cat)) custosFixosPorCategoria.set(cat, []);
      custosFixosPorCategoria.get(cat)!.push({ label: c.nome, valor: Number(c.valor), data });
    });
  });
  const linhasCustosFixos: DRELinha[] = Array.from(custosFixosPorCategoria.entries()).map(([categoria, itens]) => ({
    label: categoria,
    automatico: false,
    itens,
    valor: itens.reduce((s, i) => s + i.valor, 0),
  }));
  const custosFixosTotal = linhasCustosFixos.reduce((s, l) => s + l.valor, 0);

  return {
    ano,
    mes,
    ehMesAtual,
    periodoBuscado: { inicio, fim },
    receita: { linhas: receitaLinhas, total: receitaTotal },
    custosVariaveis: { linhas: linhasCustosVariaveis, total: custosVariaveisTotal },
    custosFixos: { linhas: linhasCustosFixos, total: custosFixosTotal },
    resultado: receitaTotal - custosVariaveisTotal - custosFixosTotal,
    erroAsaas,
  };
}
