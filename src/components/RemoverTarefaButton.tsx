"use client";

import { useTransition } from "react";
import { removerTarefa } from "@/actions/tarefas";

export function RemoverTarefaButton({ tarefaId }: { tarefaId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => startTransition(() => { removerTarefa(tarefaId); })}
      className="btn-ghost"
    >
      remover
    </button>
  );
}
