"use client";

import { useTransition } from "react";
import { confirmarRecebivelManual, desconfirmarRecebivelManual } from "@/actions/financeiro";
import { brl, fmtData } from "@/lib/format";
import type { RecebivelOcorrencia } from "@/lib/pendencias";

export function RecebiveisManuaisList({ ocorrencias }: { ocorrencias: RecebivelOcorrencia[] }) {
  const [pending, startTransition] = useTransition();
  if (!ocorrencias.length) return null;

  const pendentes = ocorrencias.filter((o) => !o.confirmado);
  const confirmados = ocorrencias.filter((o) => o.confirmado);

  return (
    <div className="flex flex-col gap-3">
      <h3 className="font-display font-bold text-base">Recebíveis manuais (fora do Asaas)</h3>
      <div className="flex flex-col gap-2">
        {pendentes.map((o) => (
          <div
            key={`${o.recebivelId}-${o.data}`}
            className="flex items-center justify-between gap-3 rounded-md px-3 py-2.5 border"
            style={{ borderColor: "var(--warning)", background: "var(--paper-2)" }}
          >
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="font-semibold text-[13px] truncate">
                {o.nome} {o.clienteNome && <span className="text-muted font-normal">· {o.clienteNome}</span>}
              </span>
              <span className="text-[11px] text-muted">esperado em {fmtData(o.data)} — a confirmar</span>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <span className="num font-semibold text-[13px]">{brl(o.valor)}</span>
              <button
                type="button"
                disabled={pending}
                onClick={() => startTransition(() => { confirmarRecebivelManual(o.recebivelId, o.data); })}
                className="btn-primary text-[11px] py-1 px-2.5 shrink-0"
              >
                confirmar recebimento
              </button>
            </div>
          </div>
        ))}
        {!pendentes.length && <p className="text-sm text-muted py-1">Nenhum recebível manual pendente esse mês.</p>}
      </div>

      {!!confirmados.length && (
        <details className="text-[12px]">
          <summary className="cursor-pointer text-muted font-semibold select-none">
            confirmados esse mês ({confirmados.length})
          </summary>
          <div className="flex flex-col gap-1.5 pt-2">
            {confirmados.map((o) => (
              <div key={`${o.recebivelId}-${o.data}`} className="flex items-center justify-between gap-3 px-3 py-1.5 rounded bg-paper-2">
                <span className="text-ink-2">
                  {o.nome} {o.clienteNome && `· ${o.clienteNome}`} <span className="text-muted">· confirmado em {fmtData(o.data)}</span>
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="num text-ink-2">{brl(o.valor)}</span>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => startTransition(() => { desconfirmarRecebivelManual(o.recebivelId, o.data); })}
                    className="btn text-[11px] py-1 px-2"
                  >
                    desfazer
                  </button>
                </div>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
