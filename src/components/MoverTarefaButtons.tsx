"use client";

import { useTransition } from "react";
import { moverTarefa } from "@/actions/tarefas";

const COLS = [
  { key: "a-fazer", label: "A fazer" },
  { key: "em-andamento", label: "Em andamento" },
  { key: "feito", label: "Feito" },
] as const;

export function MoverTarefaButtons({ tarefaId, colunaAtual }: { tarefaId: string; colunaAtual: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <select
      className="input text-[11px] py-1 px-1.5 w-auto"
      value={colunaAtual}
      disabled={pending}
      onChange={(e) =>
        startTransition(() => {
          moverTarefa(tarefaId, e.target.value as "a-fazer" | "em-andamento" | "feito");
        })
      }
    >
      {COLS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
    </select>
  );
}
