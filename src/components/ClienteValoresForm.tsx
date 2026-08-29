"use client";

import { useState, useTransition } from "react";
import { atualizarValoresCliente } from "@/actions/clientes";
import type { Cliente } from "@/lib/types";

export function ClienteValoresForm({ cliente }: { cliente: Cliente }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await atualizarValoresCliente(formData);
      if (result?.error) setError(result.error);
      else {
        setOpen(false);
        setError(null);
      }
    });
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-ghost">
        editar valores
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-[500] flex items-start justify-center p-6 overflow-y-auto"
      onClick={() => setOpen(false)}
    >
      <div
        className="bg-paper border border-line rounded-xl p-6 max-w-sm w-full flex flex-col gap-3 shadow-[var(--shadow)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display font-bold text-lg">{cliente.nome} — editar valores</h3>
        <p className="text-xs text-muted">
          Bateu meta e vai subir o valor, ou renegociou pra baixo? Ajusta aqui.
        </p>
        <form action={handleSubmit} className="flex flex-col gap-3">
          <input type="hidden" name="clienteId" value={cliente.id} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Recorrência (R$)"><input name="rec" type="number" step="0.01" min="0" defaultValue={cliente.rec} required className="input" /></Field>
            <Field label="Tráfego / repasse (R$)"><input name="traf" type="number" step="0.01" min="0" defaultValue={cliente.traf} className="input" /></Field>
            <Field label="Comissão (R$)"><input name="com" type="number" step="0.01" min="0" defaultValue={cliente.com} className="input" /></Field>
            <Field label="Imposto (R$)"><input name="imp" type="number" step="0.01" min="0" defaultValue={cliente.imp} className="input" /></Field>
          </div>
          {error && <p className="text-critical text-sm">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="btn">cancelar</button>
            <button type="submit" disabled={pending} className="btn-primary">
              {pending ? "salvando..." : "Salvar novo valor"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] uppercase tracking-wide text-muted font-semibold">{label}</label>
      {children}
    </div>
  );
}
