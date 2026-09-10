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
        startTransition(async () => {
          // Sem isso, um erro (ex: RLS barrando quem não pode cancelar
          // cliente) passava batido — o select ficava na mesma opção sem
          // nenhum aviso, parecendo que "não mudou de lista" por nenhum
          // motivo aparente.
          const resultado = await atualizarStatusCliente(clienteId, novo);
          if (resultado && "error" in resultado) alert(resultado.error);
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
