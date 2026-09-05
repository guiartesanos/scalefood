"use client";

import { useState, useTransition } from "react";
import { definirMeta } from "@/actions/financeiro";

export function DefinirMetaButton({ compact }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const now = new Date();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await definirMeta(formData);
      if (result?.error) setError(result.error);
      else {
        setOpen(false);
        setError(null);
      }
    });
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className={compact ? "btn-ghost" : "btn text-xs"}>
        {compact ? "editar meta" : "definir meta"}
      </button>
      {open && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-[500] flex items-start justify-center p-6 overflow-y-auto"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-paper border border-line rounded-lg p-6 max-w-sm w-full flex flex-col gap-3 shadow-[var(--shadow)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display font-bold text-lg">Meta do mês</h3>
            <form action={handleSubmit} className="flex flex-col gap-3">
              <input type="hidden" name="ano" value={now.getFullYear()} />
              <input type="hidden" name="mes" value={now.getMonth() + 1} />
              <div className="flex flex-col gap-1">
                <label className="text-[11px] uppercase tracking-wide text-muted font-semibold">
                  Valor da meta (R$)
                </label>
                <input name="valorMeta" type="number" step="0.01" min="0" required className="input" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] uppercase tracking-wide text-muted font-semibold">
                  Bônus se bater a meta (opcional)
                </label>
                <input name="bonusValor" type="number" step="0.01" min="0" className="input" />
              </div>
              {error && <p className="text-critical text-sm">{error}</p>}
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setOpen(false)} className="btn">
                  cancelar
                </button>
                <button type="submit" disabled={pending} className="btn-primary">
                  {pending ? "salvando..." : "Salvar meta"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
