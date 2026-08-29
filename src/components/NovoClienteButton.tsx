"use client";

import { useState, useTransition } from "react";
import { criarCliente } from "@/actions/clientes";
import { STATUS_LIST } from "@/lib/types";

export function NovoClienteButton() {
  const [open, setOpen] = useState(false);
  const [promo, setPromo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await criarCliente(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setOpen(false);
        setError(null);
      }
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="bg-accent hover:bg-accent-ink text-white text-xs font-semibold px-3 py-1.5 rounded-md whitespace-nowrap transition-colors"
      >
        + novo cliente
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-[500] flex items-start justify-center p-6 overflow-y-auto"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-paper border border-line rounded-xl p-6 max-w-lg w-full flex flex-col gap-4 shadow-[var(--shadow)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start">
              <h3 className="font-display font-bold text-xl">Novo cliente</h3>
              <button onClick={() => setOpen(false)} className="text-muted hover:text-critical text-xl leading-none">
                ×
              </button>
            </div>
            <form action={handleSubmit} className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Nome"><input name="nome" required className="input" /></Field>
                <Field label="Dono(s)"><input name="dono" required className="input" /></Field>
                <Field label="Nicho"><input name="nicho" required className="input" /></Field>
                <Field label="Status">
                  <select name="status" className="input">
                    {STATUS_LIST.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Recorrência mensal (R$)">
                  <input name="rec" type="number" step="0.01" min="0" required className="input" />
                </Field>
                <Field label="Faturamento do cliente na entrada (opcional)">
                  <input name="entrada" type="number" step="0.01" min="0" className="input" />
                </Field>
                <Field label="Data de fechamento">
                  <input name="fechamento" type="date" className="input" />
                </Field>
              </div>
              <label className="flex items-center gap-2 text-xs text-ink-2">
                <input
                  type="checkbox"
                  name="promo"
                  checked={promo}
                  onChange={(e) => setPromo(e.target.checked)}
                />
                Consultoria com 1º mês de Aceleração grátis (não cobra recorrência agora)
              </label>
              {promo && (
                <Field label="Início real da cobrança recorrente">
                  <input name="inicio_cobranca" type="date" required className="input" />
                </Field>
              )}
              {error && <p className="text-critical text-sm">{error}</p>}
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setOpen(false)} className="btn">
                  cancelar
                </button>
                <button type="submit" disabled={pending} className="btn-primary">
                  {pending ? "salvando..." : "Adicionar cliente"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
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
