"use client";

import { useState, useTransition } from "react";
import { criarAgenda } from "@/actions/tarefas";

export function NovaAgendaForm() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return <button onClick={() => setOpen(true)} className="btn self-start text-xs">+ adicionar agenda</button>;
  }

  return (
    <form
      action={(fd) => startTransition(async () => { await criarAgenda(fd); setOpen(false); })}
      className="bg-paper-2 border border-dashed border-line rounded-lg p-4 flex flex-wrap gap-3 items-end"
    >
      <div className="flex flex-col gap-1 min-w-[160px]">
        <label className="text-[11px] uppercase tracking-wide text-muted font-semibold">Nome</label>
        <input name="nome" required className="input" />
      </div>
      <div className="flex flex-col gap-1 min-w-[200px]">
        <label className="text-[11px] uppercase tracking-wide text-muted font-semibold">Email</label>
        <input name="email" type="email" className="input" />
      </div>
      <button type="submit" disabled={pending} className="btn-primary">{pending ? "salvando..." : "Adicionar"}</button>
      <button type="button" onClick={() => setOpen(false)} className="btn">cancelar</button>
    </form>
  );
}
