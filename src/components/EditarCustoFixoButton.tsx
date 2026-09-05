"use client";

import { useState, useTransition } from "react";
import { atualizarCustoFixo } from "@/actions/financeiro";
import { CATEGORIAS_CUSTO } from "@/lib/types";
import type { CustoFixo } from "@/lib/types";

export function EditarCustoFixoButton({ custo }: { custo: CustoFixo }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await atualizarCustoFixo(formData);
      if (result?.error) setError(result.error);
      else setOpen(false);
    });
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-ghost">
        editar
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-[500] flex items-start justify-center p-6 overflow-y-auto"
      onClick={() => setOpen(false)}
    >
      <div
        className="bg-paper border border-line rounded-lg p-6 max-w-sm w-full flex flex-col gap-3 shadow-[var(--shadow)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display font-bold text-lg">{custo.nome} — editar</h3>
        <form action={handleSubmit} className="flex flex-col gap-3">
          <input type="hidden" name="id" value={custo.id} />
          <Field label="Nome"><input name="nome" defaultValue={custo.nome} required className="input" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Valor mensal (R$)">
              <input name="valor" type="number" step="0.01" min="0" defaultValue={custo.valor} required className="input" />
            </Field>
            <Field label="Categoria">
              <select name="categoria" defaultValue={custo.categoria || ""} className="input">
                {CATEGORIAS_CUSTO.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Data de vencimento">
              <input name="data" type="date" defaultValue={custo.data} required className="input" />
            </Field>
            <Field label="Recorrência">
              <select name="recorrencia" defaultValue={custo.recorrencia} className="input">
                <option value="mensal">Mensal (dia fixo do mês)</option>
                <option value="semanal">Semanal (dia fixo da semana)</option>
                <option value="pontual">Pontual (só essa data)</option>
              </select>
            </Field>
          </div>
          {error && <p className="text-critical text-sm">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="btn">cancelar</button>
            <button type="submit" disabled={pending} className="btn-primary">
              {pending ? "salvando..." : "Salvar"}
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
