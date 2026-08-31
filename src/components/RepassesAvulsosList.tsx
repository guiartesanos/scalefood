"use client";

import { useTransition } from "react";
import { marcarAvulsaPaga, desmarcarAvulsaPaga } from "@/actions/financeiro";
import type { ContaPagarAvulsa } from "@/lib/types";

function brl(v: number) {
  return "R$ " + v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtData(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("pt-BR");
}

export function RepassesAvulsosList({ pendentes, pagas }: { pendentes: ContaPagarAvulsa[]; pagas: ContaPagarAvulsa[] }) {
  const [pending, startTransition] = useTransition();
  if (!pendentes.length && !pagas.length) return null;

  return (
    <div className="flex flex-col gap-3">
      <h3 className="font-display font-bold text-base">Repasses de tráfego gerados por pagamento (Asaas)</h3>
      <p className="text-[12px] text-muted">
        Toda vez que um cliente paga, gera aqui a conta a pagar do repasse de tráfego pro gestor dele — só
        se paga tráfego de quem já pagou a gente.
      </p>
      <div className="flex flex-col gap-2">
        {pendentes.map((c) => (
          <div key={c.id} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 border border-line bg-paper">
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="font-semibold text-[13px] truncate">{c.nome}</span>
              <span className="text-[11.5px] text-muted">
                gerado em {fmtData(c.data)} · pro <b>{c.gestor}</b>
              </span>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <span className="num font-semibold text-[13px]">{brl(c.valor)}</span>
              <button
                type="button"
                disabled={pending}
                onClick={() => startTransition(() => { marcarAvulsaPaga(c.id); })}
                className="btn-primary text-[11.5px] py-1 px-2.5 shrink-0"
              >
                marcar como pago
              </button>
            </div>
          </div>
        ))}
        {!pendentes.length && <p className="text-sm text-muted py-1">Nenhum repasse pendente no momento.</p>}
      </div>

      {!!pagas.length && (
        <details className="text-[12.5px]">
          <summary className="cursor-pointer text-muted font-semibold select-none">
            pagos recentemente ({pagas.length})
          </summary>
          <div className="flex flex-col gap-1.5 pt-2">
            {pagas.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3 px-3 py-1.5 rounded-md bg-paper-2">
                <span className="text-ink-2">
                  {c.nome} · <b>{c.gestor}</b>{" "}
                  <span className="text-muted">· pago em {c.pago_em ? fmtData(c.pago_em.slice(0, 10)) : "—"}</span>
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="num text-ink-2">{brl(c.valor)}</span>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => startTransition(() => { desmarcarAvulsaPaga(c.id); })}
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
