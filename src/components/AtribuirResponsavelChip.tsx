"use client";

import { useState, useTransition } from "react";
import { atualizarResponsavelTarefa } from "@/actions/tarefas";

export function AtribuirResponsavelChip({
  tarefaId,
  responsavel,
  responsaveis,
}: {
  tarefaId: string;
  responsavel: string | null;
  responsaveis: string[];
}) {
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(responsavel || "");
  const [, startTransition] = useTransition();

  function salvar() {
    setEditando(false);
    if (valor !== (responsavel || "")) {
      startTransition(() => { atualizarResponsavelTarefa(tarefaId, valor); });
    }
  }

  if (editando) {
    return (
      <>
        <input
          autoFocus
          list={`responsaveis-${tarefaId}`}
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          onBlur={salvar}
          onKeyDown={(e) => e.key === "Enter" && salvar()}
          onClick={(e) => e.stopPropagation()}
          placeholder="quem vai fazer"
          className="input py-0.5 px-1.5 text-[10.5px] w-[110px]"
        />
        <datalist id={`responsaveis-${tarefaId}`}>
          {responsaveis.map((r) => <option key={r} value={r} />)}
        </datalist>
      </>
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        setEditando(true);
      }}
      className="text-[10.5px] rounded-full px-1.5 py-0.5 border border-dashed border-line text-muted hover:text-ink-2 hover:border-accent"
    >
      {responsavel ? `👤 ${responsavel}` : "+ atribuir"}
    </button>
  );
}
