"use client";

import { useTransition } from "react";
import { atualizarStatusCliente } from "@/actions/clientes";
import { STATUS_LIST, STATUS_META, type ClienteStatus } from "@/lib/types";

export function StatusSelect({ clienteId, status }: { clienteId: string; status: ClienteStatus }) {
  const [pending, startTransition] = useTransition();
  const meta = STATUS_META[status];

  return (
    <select
      className={`status-select pill-${meta.cls}`}
      value={status}
      disabled={pending}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => {
        const novo = e.target.value as ClienteStatus;
        startTransition(() => {
          atualizarStatusCliente(clienteId, novo);
        });
      }}
      style={{
        color: `var(--${meta.cls})`,
        background: `var(--${meta.cls}-wash)`,
      }}
    >
      {STATUS_LIST.map((s) => (
        <option key={s} value={s}>
          {STATUS_META[s].short}
        </option>
      ))}
    </select>
  );
}
