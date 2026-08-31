"use client";

import { useTransition } from "react";
import { atualizarMotivoCancelamento } from "@/actions/clientesCancelados";
import { MOTIVOS_CANCELAMENTO } from "@/lib/types";

export function MotivoCancelamentoSelect({ id, motivo }: { id: string; motivo: string | null }) {
  const [pending, startTransition] = useTransition();

  return (
    <select
      className="input py-1 text-[12.5px]"
      value={motivo || ""}
      disabled={pending}
      onChange={(e) => {
        const novo = e.target.value;
        startTransition(() => {
          atualizarMotivoCancelamento(id, novo);
        });
      }}
    >
      <option value="">sem motivo definido</option>
      {MOTIVOS_CANCELAMENTO.map((m) => (
        <option key={m} value={m}>
          {m}
        </option>
      ))}
    </select>
  );
}
