"use client";

import { useState, useTransition } from "react";
import { marcarAvulsaPaga, desmarcarAvulsaPaga, editarValorAvulsa } from "@/actions/financeiro";
import { brl } from "@/lib/format";
import type { ContaPagarAvulsa } from "@/lib/types";

function fmtData(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("pt-BR");
}

function ValorEditavel({ id, valor, disabled }: { id: string; valor: number; disabled: boolean }) {
  const [editando, setEditando] = useState(false);
  const [rascunho, setRascunho] = useState(String(valor));
  const [pending, startTransition] = useTransition();

  if (!editando) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => { setRascunho(String(valor)); setEditando(true); }}
        className="num font-semibold text-[13px] underline decoration-dotted underline-offset-2 disabled:no-underline"
        title="clique para alterar o valor"
      >
        {brl(valor)}
      </button>
    );
  }
  return (
    <form
      className="flex items-center gap-1"
      onSubmit={(e) => {
        e.preventDefault();
        const novo = parseFloat(rascunho.replace(",", "."));
        if (!isNaN(novo) && novo >= 0) {
          startTransition(() => { editarValorAvulsa(id, novo); });
        }
        setEditando(false);
      }}
    >
      <input
        autoFocus
        type="number"
        step="0.01"
        min="0"
        value={rascunho}
        onChange={(e) => setRascunho(e.target.value)}
        onBlur={(e) => e.currentTarget.form?.requestSubmit()}
        onKeyDown={(e) => e.key === "Escape" && setEditando(false)}
        disabled={pending}
        className="input w-[110px] text-right py-0.5 px-1.5 text-[13px]"
      />
    </form>
  );
}

export function RepassesAvulsosList({ pendentes, pagas }: { pendentes: ContaPagarAvulsa[]; pagas: ContaPagarAvulsa[] }) {
  const [pending, startTransition] = useTransition();
  if (!pendentes.length && !pagas.length) return null;

  return (
    <div className="flex flex-col gap-3">
      <h3 className="font-display font-bold text-base">Contas avulsas (tráfego, comissão, imposto)</h3>
      <p className="text-[12px] text-muted">
        Geradas automaticamente — tráfego e comissão a cada pagamento de cliente, imposto todo dia 20 (7%
        sobre as notas fiscais do mês anterior). O valor é uma previsão: clique nele para ajustar antes de
        confirmar como pago.
      </p>
      <div className="flex flex-col gap-2">
        {pendentes.map((c) => (
          <div key={c.id} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 border border-line bg-paper">
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="font-semibold text-[13px] truncate">{c.nome}</span>
              <span className="text-[11.5px] text-muted">
                {c.categoria === "Imposto" ? "vence" : "gerado"} em {fmtData(c.data)}
                {c.gestor && <> · pro <b>{c.gestor}</b></>}
              </span>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <ValorEditavel id={c.id} valor={Number(c.valor)} disabled={pending} />
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
        {!pendentes.length && <p className="text-sm text-muted py-1">Nenhuma conta avulsa pendente no momento.</p>}
      </div>

      {!!pagas.length && (
        <details className="text-[12.5px]">
          <summary className="cursor-pointer text-muted font-semibold select-none">
            pagas recentemente ({pagas.length})
          </summary>
          <div className="flex flex-col gap-1.5 pt-2">
            {pagas.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3 px-3 py-1.5 rounded-md bg-paper-2">
                <span className="text-ink-2">
                  {c.nome} {c.gestor && <>· <b>{c.gestor}</b></>}{" "}
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
