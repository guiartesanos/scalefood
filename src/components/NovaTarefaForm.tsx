"use client";

import { useState, useTransition } from "react";
import { criarTarefa } from "@/actions/tarefas";
import type { Agenda } from "@/lib/types";

export function NovaTarefaForm({ agendas, responsaveis }: { agendas: Agenda[]; responsaveis: string[] }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn self-start text-xs">
        + nova tarefa
      </button>
    );
  }

  return (
    <form
      action={(fd) => startTransition(async () => { await criarTarefa(fd); setOpen(false); })}
      className="bg-paper-2 border border-dashed border-line rounded-lg p-4 flex flex-wrap gap-3 items-end"
    >
      <div className="flex flex-col gap-1 min-w-[180px]">
        <label className="text-[11px] uppercase tracking-wide text-muted font-semibold">Título</label>
        <input name="titulo" required className="input" />
      </div>
      <div className="flex flex-col gap-1 min-w-[110px]">
        <label className="text-[11px] uppercase tracking-wide text-muted font-semibold">Urgência</label>
        <select name="urgencia" className="input" defaultValue="media">
          <option value="alta">alta</option><option value="media">média</option><option value="baixa">baixa</option>
        </select>
      </div>
      <div className="flex flex-col gap-1 min-w-[140px]">
        <label className="text-[11px] uppercase tracking-wide text-muted font-semibold">Cliente (opcional)</label>
        <input name="clienteNome" className="input" />
      </div>
      <div className="flex flex-col gap-1 min-w-[150px]">
        <label className="text-[11px] uppercase tracking-wide text-muted font-semibold">Responsável (opcional)</label>
        <input name="responsavel" className="input" list="responsaveis-lista" placeholder="quem vai fazer" />
        <datalist id="responsaveis-lista">
          {responsaveis.map((r) => <option key={r} value={r} />)}
        </datalist>
      </div>
      <div className="flex flex-col gap-1 min-w-[160px]">
        <label className="text-[11px] uppercase tracking-wide text-muted font-semibold">Agenda</label>
        <select name="agendaId" className="input" defaultValue="">
          <option value="">sem agenda definida</option>
          {agendas.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
        </select>
      </div>
      <button type="submit" disabled={pending} className="btn-primary">{pending ? "criando..." : "Criar tarefa"}</button>
      <button type="button" onClick={() => setOpen(false)} className="btn">cancelar</button>
    </form>
  );
}
