"use client";

import { useTransition } from "react";
import { criarTarefaSugestao } from "@/actions/tarefas";

export function SugestaoTarefaButton({ clienteNome }: { clienteNome: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => startTransition(() => { criarTarefaSugestao(clienteNome); })}
      className="btn text-xs"
    >
      + criar tarefa
    </button>
  );
}
