"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ContaPendente } from "@/lib/pendencias";
import type { Tarefa } from "@/lib/types";

const URG_CLS: Record<string, string> = { alta: "critical", media: "warning", baixa: "muted" };

function brl(v: number) {
  return "R$ " + v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtData(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("pt-BR");
}

export function PendenciasModal({ contas, tarefas }: { contas: ContaPendente[]; tarefas: Tarefa[] }) {
  const [open, setOpen] = useState(false);
  const total = contas.length + tarefas.length;

  useEffect(() => {
    if (!total) return;
    try {
      const key = "pendencias_modal_shown";
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
      setOpen(true);
    } catch {
      // sessionStorage indisponível (ex: modo privado) — só não mostra o pop-up
    }
  }, [total]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-[600] flex items-center justify-center p-4"
      onClick={() => setOpen(false)}
    >
      <div
        className="bg-paper border border-line rounded-xl p-6 max-w-md w-full flex flex-col gap-4 shadow-[var(--shadow)] max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col gap-1">
          <h2 className="font-display font-bold text-xl">Suas pendências de hoje</h2>
          <p className="text-xs text-muted">
            {total} {total === 1 ? "item pendente" : "itens pendentes"} — resolvidas ou não, isso não aparece de novo até você abrir o sistema outra vez.
          </p>
        </div>

        {!!contas.length && (
          <div className="flex flex-col gap-2">
            <h3 className="text-xs uppercase tracking-wide text-muted font-semibold">
              Contas vencendo hoje/amanhã ({contas.length})
            </h3>
            {contas.slice(0, 6).map((c) => (
              <div key={`${c.custoFixoId}-${c.data}`} className="flex justify-between items-center text-[13px] border-b border-dashed border-line/50 pb-1.5">
                <span>
                  {c.nome}{" "}
                  {c.hoje && <b className="text-critical">· vence hoje</b>}
                  {c.amanha && <b style={{ color: "var(--warning)" }}>· vence amanhã ({fmtData(c.data)})</b>}
                </span>
                <span className="num font-semibold shrink-0 ml-2">{brl(c.valor)}</span>
              </div>
            ))}
            {contas.length > 6 && <span className="text-xs text-muted">+ {contas.length - 6} outra(s)</span>}
            <Link href="/financeiro" className="btn text-xs self-start" onClick={() => setOpen(false)}>
              ver em Financeiro →
            </Link>
          </div>
        )}

        {!!tarefas.length && (
          <div className="flex flex-col gap-2">
            <h3 className="text-xs uppercase tracking-wide text-muted font-semibold">
              Tarefas atribuídas a você ({tarefas.length})
            </h3>
            {tarefas.slice(0, 6).map((t) => (
              <div key={t.id} className="flex items-center gap-2 text-[13px] border-b border-dashed border-line/50 pb-1.5">
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: `var(--${URG_CLS[t.urgencia]})` }}
                />
                <span className="truncate">{t.titulo}</span>
              </div>
            ))}
            {tarefas.length > 6 && <span className="text-xs text-muted">+ {tarefas.length - 6} outra(s)</span>}
            <Link href="/tarefas" className="btn text-xs self-start" onClick={() => setOpen(false)}>
              ver em Tarefas →
            </Link>
          </div>
        )}

        <button onClick={() => setOpen(false)} className="btn-primary self-end">
          Entendi
        </button>
      </div>
    </div>
  );
}
