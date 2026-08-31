"use client";

import { useState, useTransition } from "react";
import { atualizarClienteCancelado } from "@/actions/clientesCancelados";
import type { ClienteCancelado } from "@/lib/types";

export function ClienteCanceladoEditForm({ cliente }: { cliente: ClienteCancelado }) {
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setSaved(false);
    startTransition(async () => {
      const result = await atualizarClienteCancelado(cliente.id, formData);
      if (result?.error) setError(result.error ?? "Erro desconhecido.");
      else {
        setError(null);
        setSaved(true);
      }
    });
  }

  return (
    <form action={handleSubmit} className="bg-paper border border-line rounded-xl p-5 flex flex-col gap-3">
      <h3 className="font-display font-bold text-base">Nicho, dono e observações</h3>
      <p className="text-xs text-muted">
        Não vem do Asaas — preenche manualmente (nicho e dono não existem no cadastro Asaas).
      </p>
      <div className="grid grid-cols-2 max-[480px]:grid-cols-1 gap-3">
        <Field label="Nicho">
          <input name="nicho" defaultValue={cliente.nicho ?? ""} className="input" placeholder="ex: Hambúrguer" />
        </Field>
        <Field label="Dono (responsável interno)">
          <input name="dono" defaultValue={cliente.dono ?? ""} className="input" placeholder="ex: Gabriel" />
        </Field>
      </div>
      <Field label="Observação">
        <textarea
          name="observacao"
          defaultValue={cliente.observacao ?? ""}
          className="input min-h-[70px] resize-y"
          placeholder="anotações sobre o cancelamento ou tentativa de reativação"
        />
      </Field>
      {error && <p className="text-critical text-sm">{error}</p>}
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="btn-primary self-start">
          {pending ? "salvando..." : "Salvar"}
        </button>
        {saved && !pending && <span className="text-good text-xs font-semibold">salvo ✓</span>}
      </div>
    </form>
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
