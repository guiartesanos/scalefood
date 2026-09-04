"use client";

import { useState, useTransition } from "react";
import { marcarCustoFixoPago, desmarcarCustoFixoPago } from "@/actions/financeiro";
import { brl } from "@/lib/format";

// Preço da ocorrência é moldável na hora de confirmar — mesma ideia das
// contas avulsas (tráfego/comissão/imposto), útil pra contas "fixas" que
// na prática variam um pouco todo mês (luz, água...). O valor só é
// gravado (em custos_fixos_pagamentos.valor) quando confirma o pagamento;
// até lá é só um rascunho local, não muda o valor do modelo.
export function MarcarPagoButton({ custoFixoId, data, valor }: { custoFixoId: string; data: string; valor: number }) {
  const [editando, setEditando] = useState(false);
  const [rascunho, setRascunho] = useState(String(valor));
  const [pending, startTransition] = useTransition();

  function confirmar(valorFinal: number) {
    startTransition(() => {
      marcarCustoFixoPago(custoFixoId, data, valorFinal);
    });
  }

  if (editando) {
    return (
      <form
        className="flex items-center gap-1.5"
        onSubmit={(e) => {
          e.preventDefault();
          const novo = parseFloat(rascunho.replace(",", "."));
          confirmar(!isNaN(novo) && novo >= 0 ? novo : valor);
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
          onKeyDown={(e) => e.key === "Escape" && setEditando(false)}
          disabled={pending}
          className="input w-[100px] text-right py-0.5 px-1.5 text-[13px]"
        />
        <button type="submit" disabled={pending} className="btn-primary text-[11.5px] py-1 px-2.5 shrink-0">
          {pending ? "..." : "confirmar"}
        </button>
        <button type="button" onClick={() => setEditando(false)} className="btn-ghost text-[11px]">
          cancelar
        </button>
      </form>
    );
  }

  return (
    <div className="flex items-center gap-2.5 shrink-0">
      <button
        type="button"
        onClick={() => {
          setRascunho(String(valor));
          setEditando(true);
        }}
        className="num font-semibold text-[13px] underline decoration-dotted underline-offset-2"
        title="clique para ajustar o valor antes de confirmar"
      >
        {brl(valor)}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => confirmar(valor)}
        className="btn-primary text-[11.5px] py-1 px-2.5 shrink-0"
      >
        {pending ? "..." : "marcar como pago"}
      </button>
    </div>
  );
}

export function DesmarcarPagoButton({ custoFixoId, data }: { custoFixoId: string; data: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => { desmarcarCustoFixoPago(custoFixoId, data); })}
      className="btn text-[11px] py-1 px-2 shrink-0"
    >
      {pending ? "..." : "desfazer"}
    </button>
  );
}
