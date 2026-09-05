"use client";

import { useMemo, useState } from "react";
import { brl, fmtData } from "@/lib/format";
import type { ContaReceberAsaas } from "@/lib/asaas";

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MES_NOME = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
function diasAtraso(dueDate: string): number {
  const hoje = new Date();
  const h = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const d = new Date(dueDate + "T00:00:00");
  return Math.round((h.getTime() - d.getTime()) / 86400000);
}

export function ContasReceberAsaas({ contas }: { contas: ContaReceberAsaas[] }) {
  const hoje = new Date();
  const [mesOffset, setMesOffset] = useState(0);
  const [verVencidas, setVerVencidas] = useState(false);

  const mesRef = new Date(hoje.getFullYear(), hoje.getMonth() + mesOffset, 1);
  const ano = mesRef.getFullYear();
  const mes = mesRef.getMonth();

  const totalAReceber = useMemo(() => contas.reduce((s, c) => s + c.value, 0), [contas]);
  const vencidas = useMemo(() => contas.filter((c) => c.status === "OVERDUE"), [contas]);
  const totalVencido = useMemo(() => vencidas.reduce((s, c) => s + c.value, 0), [vencidas]);

  const contasDoMes = useMemo(
    () =>
      contas
        .filter((c) => {
          const d = new Date(c.dueDate + "T00:00:00");
          return d.getFullYear() === ano && d.getMonth() === mes;
        })
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    [contas, ano, mes]
  );

  const porDia: Record<number, { total: number; qtd: number; temVencida: boolean }> = {};
  contasDoMes.forEach((c) => {
    const dia = new Date(c.dueDate + "T00:00:00").getDate();
    if (!porDia[dia]) porDia[dia] = { total: 0, qtd: 0, temVencida: false };
    porDia[dia].total += c.value;
    porDia[dia].qtd += 1;
    if (c.status === "OVERDUE") porDia[dia].temVencida = true;
  });

  const primeiroDiaSemana = new Date(ano, mes, 1).getDay();
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();
  const celulas: (number | null)[] = [];
  for (let i = 0; i < primeiroDiaSemana; i++) celulas.push(null);
  for (let d = 1; d <= diasNoMes; d++) celulas.push(d);

  return (
    <div className="flex flex-col gap-3.5">
      <div className="grid grid-cols-2 max-[520px]:grid-cols-1 gap-1 bg-line border border-line rounded-lg overflow-hidden">
        <div className="bg-paper px-5 py-4 flex flex-col gap-1.5">
          <span className="text-[11px] uppercase tracking-wide text-muted font-semibold">Total a receber (Asaas)</span>
          <span className="font-display font-bold text-[22px] min-[400px]:text-[26px] num">{brl(totalAReceber)}</span>
          <span className="text-xs text-ink-2">{contas.length} cobrança(s) em aberto, todos os clientes</span>
        </div>
        <button
          type="button"
          onClick={() => setVerVencidas((v) => !v)}
          className="bg-paper px-5 py-4 flex flex-col gap-1.5 text-left transition-colors hover:bg-paper-2"
        >
          <span className="text-[11px] uppercase tracking-wide text-muted font-semibold">
            Total vencido {vencidas.length > 0 && "· clique pra ver quem"}
          </span>
          <span className="font-display font-bold text-[22px] min-[400px]:text-[26px] num" style={{ color: vencidas.length ? "var(--critical)" : undefined }}>
            {brl(totalVencido)}
          </span>
          <span className="text-xs text-ink-2">{vencidas.length} cobrança(s) vencida(s) {verVencidas ? "▲" : "▼"}</span>
        </button>
      </div>

      {verVencidas && (
        <div className="border border-critical/40 rounded-lg overflow-auto bg-paper">
          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr className="bg-paper-2">
                <Th>Cliente</Th><Th>Venceu em</Th><Th right>Dias em atraso</Th><Th right>Valor</Th><Th></Th>
              </tr>
            </thead>
            <tbody>
              {vencidas.map((c) => (
                <tr key={c.id} className="border-t border-line/50">
                  <td className="px-3 py-2 font-semibold">{c.customerName}</td>
                  <td className="px-3 py-2">{fmtData(c.dueDate)}</td>
                  <td className="px-3 py-2 text-right num text-critical font-semibold">{diasAtraso(c.dueDate)}</td>
                  <td className="px-3 py-2 text-right num">{brl(c.value)}</td>
                  <td className="px-3 py-2">
                    {c.invoiceUrl && (
                      <a href={c.invoiceUrl} target="_blank" rel="noopener noreferrer" className="btn text-[11px] py-1 px-2">
                        ver no Asaas ↗
                      </a>
                    )}
                  </td>
                </tr>
              ))}
              {!vencidas.length && (
                <tr><td colSpan={5} className="text-center text-muted py-4">Nenhuma cobrança vencida — tudo em dia 🎉</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="grid grid-cols-[1fr_320px] gap-4 max-[900px]:grid-cols-1">
        <div className="border border-line rounded-lg overflow-auto bg-paper">
          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr className="bg-paper-2">
                <Th>Cliente</Th><Th>Vencimento</Th><Th>Status</Th><Th right>Valor</Th><Th></Th>
              </tr>
            </thead>
            <tbody>
              {contasDoMes.map((c) => (
                <tr key={c.id} className="border-t border-line/50">
                  <td className="px-3 py-2 font-semibold">{c.customerName}</td>
                  <td className="px-3 py-2">{fmtData(c.dueDate)}</td>
                  <td className="px-3 py-2">
                    <span
                      className="text-[10.5px] font-semibold px-1.5 py-0.5 rounded-full"
                      style={{
                        color: c.status === "OVERDUE" ? "var(--critical)" : "var(--accent-ink)",
                        background: c.status === "OVERDUE" ? "color-mix(in srgb, var(--critical) 12%, var(--paper))" : "var(--accent-wash)",
                      }}
                    >
                      {c.status === "OVERDUE" ? "vencida" : "pendente"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right num">{brl(c.value)}</td>
                  <td className="px-3 py-2">
                    {c.invoiceUrl && (
                      <a href={c.invoiceUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] text-accent-ink hover:underline">
                        ver ↗
                      </a>
                    )}
                  </td>
                </tr>
              ))}
              {!contasDoMes.length && (
                <tr><td colSpan={5} className="text-center text-muted py-4">Nenhuma cobrança prevista pra {MES_NOME[mes].toLowerCase()}.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="bg-paper border border-line rounded-lg p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <button type="button" onClick={() => setMesOffset((m) => m - 1)} className="btn-ghost px-2 py-1 text-sm">
              ←
            </button>
            <h3 className="font-display font-bold text-sm capitalize">
              {MES_NOME[mes].slice(0, 3)}/{ano}
            </h3>
            <button type="button" onClick={() => setMesOffset((m) => m + 1)} className="btn-ghost px-2 py-1 text-sm">
              →
            </button>
          </div>
          {mesOffset !== 0 && (
            <button type="button" onClick={() => setMesOffset(0)} className="text-[11px] text-accent-ink hover:underline self-center -mt-1.5">
              voltar pro mês atual
            </button>
          )}
          <div className="grid grid-cols-7 gap-1 text-center text-[10.5px] text-muted font-semibold uppercase tracking-wide">
            {DIAS_SEMANA.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {celulas.map((d, i) => {
              const info = d ? porDia[d] : undefined;
              const ehHoje = mesOffset === 0 && d === hoje.getDate();
              return (
                <div
                  key={i}
                  className="aspect-square flex flex-col items-center justify-center gap-0.5 rounded text-[11px]"
                  style={{ background: ehHoje ? "var(--accent-wash)" : undefined }}
                  title={info ? `${info.qtd} cobrança(s) — ${brl(info.total)}` : undefined}
                >
                  {d && (
                    <>
                      <span className={ehHoje ? "font-bold text-accent-ink" : "text-ink-2"}>{d}</span>
                      {info ? (
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: info.temVencida ? "var(--critical)" : "var(--good)" }}
                        />
                      ) : null}
                    </>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex flex-col gap-1 text-[11px] text-muted pt-1 border-t border-line/50">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: "var(--good)" }} /> a receber
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: "var(--critical)" }} /> com cobrança vencida
            </span>
          </div>
        </div>
      </div>
      <p className="text-[11px] text-muted">
        Puxado 100% do Asaas (cobranças com status pendente ou vencida) — não depende de lançamento manual.
      </p>
    </div>
  );
}

function Th({ children, right }: { children?: React.ReactNode; right?: boolean }) {
  return <th className={`px-3 py-2 text-[10.5px] uppercase tracking-wide text-muted font-semibold ${right ? "text-right" : "text-left"}`}>{children}</th>;
}
