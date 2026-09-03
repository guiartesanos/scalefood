"use client";

import { useState } from "react";
import Link from "next/link";
import { StatusSelect } from "./StatusSelect";
import { ValorOcultavel } from "./ValoresVisibilidade";
import type { Cliente, ClienteStatus } from "@/lib/types";

function brl(v: number | null | undefined) {
  return "R$ " + Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function brlInt(v: number | null | undefined) {
  return "R$ " + Math.round(Number(v || 0)).toLocaleString("pt-BR");
}

const STATUS_ORDER: ClienteStatus[] = [
  "Rodando - com resultado",
  "Rodando - sem resultado ainda",
  "Onboarding urgente",
  "Pediu pra cancelar",
];

const STATUS_DESC: Record<ClienteStatus, string> = {
  "Rodando - com resultado": "Tráfego rodando, cardápio implementado, já dando resultado.",
  "Rodando - sem resultado ainda": "No ar, mas ainda sem resultado consolidado — acompanhar de perto.",
  "Onboarding urgente": "Não começamos — pendência urgente de onboarding.",
  "Pediu pra cancelar": "Cliente pediu cancelamento — este é o último mês de cobrança.",
  // nunca aparece aqui de fato: selecionar esse status já move o
  // cliente pra clientes_cancelados (ver atualizarStatusCliente), então
  // ele some da lista de ativos antes desse card renderizar de novo.
  Cancelado: "Cliente cancelado — já saiu da lista de ativos.",
};

const STATUS_CLS: Record<ClienteStatus, string> = {
  "Rodando - com resultado": "good",
  "Rodando - sem resultado ainda": "warning",
  "Onboarding urgente": "serious",
  "Pediu pra cancelar": "critical",
  Cancelado: "critical",
};

export function DashboardFilterable({ clientes, verLucro }: { clientes: Cliente[]; verLucro: boolean }) {
  const [filtroStatus, setFiltroStatus] = useState<ClienteStatus | null>(null);
  const [filtroNicho, setFiltroNicho] = useState<string | null>(null);

  function irParaTabela(status: ClienteStatus) {
    setFiltroStatus(filtroStatus === status ? null : status);
    document.getElementById("clientes-ativos-tabela")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const byStatus: Record<string, Cliente[]> = {};
  clientes.forEach((c) => {
    (byStatus[c.status] = byStatus[c.status] || []).push(c);
  });

  const niches: Record<string, { rec: number; n: number }> = {};
  clientes.forEach((c) => {
    niches[c.nicho] = niches[c.nicho] || { rec: 0, n: 0 };
    niches[c.nicho].rec += c.rec;
    niches[c.nicho].n += 1;
  });
  const maxRec = Math.max(...Object.values(niches).map((v) => v.rec), 1);

  const filtrados = clientes.filter(
    (c) => (!filtroStatus || c.status === filtroStatus) && (!filtroNicho || c.nicho === filtroNicho)
  );

  return (
    <>
      <section className="flex flex-col gap-3.5">
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <h2 className="font-display font-bold text-[21px]">Status da operação</h2>
          <span className="text-[13px] text-muted">clique num status ou nicho pra filtrar a tabela</span>
        </div>
        <div className="grid grid-cols-4 gap-3 max-[900px]:grid-cols-2 max-[560px]:grid-cols-1">
          {STATUS_ORDER.filter((s) => byStatus[s]?.length).map((s) => {
            const list = byStatus[s];
            const rec = list.reduce((sum, c) => sum + c.rec, 0);
            const liq = list.reduce((sum, c) => sum + (c.liq || 0), 0);
            const active = filtroStatus === s;
            const pct = Math.round((list.length / clientes.length) * 100);
            return (
              <button
                key={s}
                type="button"
                onClick={() => irParaTabela(s)}
                className="bg-paper border border-line rounded-xl p-4 flex flex-col gap-2 text-left transition-shadow"
                style={{
                  borderLeft: `4px solid var(--${STATUS_CLS[s]})`,
                  boxShadow: active ? "0 0 0 2px var(--accent)" : undefined,
                }}
              >
                <div className="flex items-baseline justify-between">
                  <span className="font-display font-extrabold text-[28px] num" style={{ color: `var(--${STATUS_CLS[s]})` }}>
                    {list.length}
                  </span>
                  <span className="text-[11.5px] text-muted num">{pct}% da carteira</span>
                </div>
                <div className="h-[6px] rounded-full overflow-hidden" style={{ background: `var(--${STATUS_CLS[s]}-wash)` }}>
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: `var(--${STATUS_CLS[s]})` }} />
                </div>
                <span className="font-semibold text-[13.5px]">{s}</span>
                {verLucro && (
                  <span className="text-[11.5px] text-muted num">
                    <ValorOcultavel>{brlInt(rec)}</ValorOcultavel> recorrência ·{" "}
                    <ValorOcultavel>{brlInt(liq)}</ValorOcultavel> líquido
                  </span>
                )}
                <span className="text-xs text-ink-2 leading-snug">{STATUS_DESC[s]}</span>
                <span className="text-[11.5px] font-semibold mt-1" style={{ color: `var(--${STATUS_CLS[s]})` }}>
                  ver {list.length} cliente{list.length > 1 ? "s" : ""} ›
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section id="clientes-ativos-tabela" className="flex flex-col gap-3.5 scroll-mt-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="font-display font-bold text-[21px]">Clientes ativos</h2>
          {(filtroStatus || filtroNicho) && (
            <div className="flex items-center gap-1.5">
              {filtroStatus && (
                <span className="pill">
                  {filtroStatus}{" "}
                  <button type="button" onClick={() => setFiltroStatus(null)} className="ml-1">
                    ×
                  </button>
                </span>
              )}
              {filtroNicho && (
                <span className="pill">
                  {filtroNicho}{" "}
                  <button type="button" onClick={() => setFiltroNicho(null)} className="ml-1">
                    ×
                  </button>
                </span>
              )}
            </div>
          )}
        </div>
        <div className="border border-line rounded-xl overflow-auto bg-paper">
          <table className="w-full min-w-[720px] text-[13px] border-collapse">
            <thead>
              <tr className="bg-paper-2">
                <Th>#</Th>
                <Th>Cliente</Th>
                <Th>Status</Th>
                <Th>Nicho</Th>
                <Th right>Recorrência</Th>
                {verLucro && <Th right>Líquido</Th>}
              </tr>
            </thead>
            <tbody>
              {filtrados.map((c) => (
                <tr key={c.id} className="border-t border-line/50 hover:bg-paper-2">
                  <td className="px-3 py-2.5 num">{c.n}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-col">
                      <Link href={`/clientes/${c.id}`} className="text-[13px] font-bold hover:text-accent-ink hover:underline">
                        {c.nome}
                      </Link>
                      <span className="text-[11px] text-muted">{c.dono}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <StatusSelect clienteId={c.id} status={c.status} />
                  </td>
                  <td className="px-3 py-2.5">{c.nicho}</td>
                  <td className="px-3 py-2.5 text-right num"><ValorOcultavel>{brl(c.rec)}</ValorOcultavel></td>
                  {verLucro && (
                    <td className="px-3 py-2.5 text-right num">
                      {c.liq != null ? <ValorOcultavel>{brl(c.liq)}</ValorOcultavel> : "—"}
                    </td>
                  )}
                </tr>
              ))}
              {!filtrados.length && (
                <tr>
                  <td colSpan={verLucro ? 6 : 5} className="text-center text-muted py-4">
                    Nenhum cliente com esse filtro.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Link href="/clientes" className="text-sm text-accent-ink hover:underline self-start">
          ver detalhes e evolução de cada cliente →
        </Link>
      </section>

      <section className="flex flex-col gap-3.5">
        <h2 className="font-display font-bold text-[21px]">Recorrência por nicho</h2>
        <div className="flex flex-col gap-2.5 bg-paper border border-line rounded-xl p-4">
          {Object.entries(niches)
            .sort((a, b) => b[1].rec - a[1].rec)
            .map(([name, v]) => {
              const active = filtroNicho === name;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => setFiltroNicho(active ? null : name)}
                  className="grid grid-cols-[140px_1fr_92px] items-center gap-3 text-left rounded-md -mx-1.5 px-1.5 py-1 transition-colors"
                  style={{ background: active ? "var(--accent-wash)" : undefined }}
                >
                  <span className="text-[13px] font-medium">
                    {name}
                    <span className="block text-[11px] text-muted">{v.n} cliente{v.n > 1 ? "s" : ""}</span>
                  </span>
                  <div className="h-[15px] rounded bg-paper-2 border border-line/50 overflow-hidden">
                    <div
                      className="h-full rounded"
                      style={{ width: `${(v.rec / maxRec) * 100}%`, background: "linear-gradient(90deg, var(--accent), var(--accent-ink))" }}
                    />
                  </div>
                  <span className="text-right text-xs num text-ink-2"><ValorOcultavel>{brlInt(v.rec)}</ValorOcultavel></span>
                </button>
              );
            })}
        </div>
      </section>
    </>
  );
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th className={`px-3 py-2.5 text-[10.5px] uppercase tracking-wide text-muted font-semibold ${right ? "text-right" : "text-left"}`}>
      {children}
    </th>
  );
}
