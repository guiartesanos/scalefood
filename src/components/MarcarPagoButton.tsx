"use client";

import { useTransition } from "react";
import { marcarCustoFixoPago, desmarcarCustoFixoPago } from "@/actions/financeiro";

export function MarcarPagoButton({ custoFixoId, data }: { custoFixoId: string; data: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => { marcarCustoFixoPago(custoFixoId, data); })}
      className="btn-primary text-[11.5px] py-1 px-2.5 shrink-0"
    >
      {pending ? "..." : "marcar como pago"}
    </button>
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
