"use client";

import { useState, useTransition } from "react";
import { moverTarefa, removerTarefa } from "@/actions/tarefas";
import type { Tarefa, Agenda } from "@/lib/types";

const URG_CLS: Record<string, string> = { alta: "critical", media: "warning", baixa: "muted" };
type Coluna = "a-fazer" | "em-andamento" | "feito";

export function TarefasKanban({ tarefas, agendas }: { tarefas: Tarefa[]; agendas: Agenda[] }) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<Coluna | null>(null);
  const [feitoAberto, setFeitoAberto] = useState(false);
  const [, startTransition] = useTransition();

  const porColuna = (c: Coluna) => tarefas.filter((t) => t.coluna === c);
  const aFazer = porColuna("a-fazer");
  const emAndamento = porColuna("em-andamento");
  const feito = porColuna("feito");

  function soltar(coluna: Coluna) {
    setDragOver(null);
    if (!dragId) return;
    const tarefa = tarefas.find((t) => t.id === dragId);
    setDragId(null);
    if (!tarefa || tarefa.coluna === coluna) return;
    startTransition(() => {
      moverTarefa(dragId, coluna);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3.5 max-[700px]:grid-cols-1">
        <Coluna
          titulo="A fazer"
          lista={aFazer}
          coluna="a-fazer"
          agendas={agendas}
          dragOver={dragOver === "a-fazer"}
          onDragEnter={() => setDragOver("a-fazer")}
          onDragLeave={() => setDragOver(null)}
          onDrop={() => soltar("a-fazer")}
          onDragStartCard={setDragId}
        />
        <Coluna
          titulo="Em andamento"
          lista={emAndamento}
          coluna="em-andamento"
          agendas={agendas}
          dragOver={dragOver === "em-andamento"}
          onDragEnter={() => setDragOver("em-andamento")}
          onDragLeave={() => setDragOver(null)}
          onDrop={() => soltar("em-andamento")}
          onDragStartCard={setDragId}
        />
      </div>

      <div
        onDragOver={(e) => e.preventDefault()}
        onDragEnter={() => setDragOver("feito")}
        onDragLeave={() => setDragOver(null)}
        onDrop={() => soltar("feito")}
        className="border border-line rounded-lg transition-colors"
        style={{ background: dragOver === "feito" ? "var(--accent-wash)" : "var(--paper-2)" }}
      >
        <button
          onClick={() => setFeitoAberto((v) => !v)}
          className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-ink-2"
        >
          <span>✓ Feito · {feito.length} {feito.length === 1 ? "tarefa" : "tarefas"} — arraste um card aqui pra concluir</span>
          <span>{feitoAberto ? "recolher ▲" : "ver histórico ▼"}</span>
        </button>
        {feitoAberto && (
          <div className="flex flex-col gap-1.5 px-3 pb-3">
            {feito.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-2 text-[12px] bg-paper border border-line/50 rounded-md px-2.5 py-1.5">
                <span className="line-through text-muted">{t.titulo}</span>
                <button onClick={() => startTransition(() => { removerTarefa(t.id); })} className="text-[10.5px] text-muted hover:text-critical">
                  remover
                </button>
              </div>
            ))}
            {!feito.length && <span className="text-xs text-muted">Nada concluído ainda.</span>}
          </div>
        )}
      </div>
    </div>
  );
}

function Coluna({
  titulo,
  lista,
  agendas,
  dragOver,
  onDragEnter,
  onDragLeave,
  onDrop,
  onDragStartCard,
}: {
  titulo: string;
  lista: Tarefa[];
  coluna: Coluna;
  agendas: Agenda[];
  dragOver: boolean;
  onDragEnter: () => void;
  onDragLeave: () => void;
  onDrop: () => void;
  onDragStartCard: (id: string) => void;
}) {
  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className="border border-line rounded-xl p-2.5 flex flex-col gap-2.5 min-h-[140px] transition-colors"
      style={{ background: dragOver ? "var(--accent-wash)" : "var(--paper-2)" }}
    >
      <div className="flex justify-between items-center px-1">
        <h4 className="font-display font-bold text-sm uppercase tracking-wide text-ink-2">{titulo}</h4>
        <span className="text-[11px] text-muted num">{lista.length}</span>
      </div>
      {lista.map((t) => {
        const agenda = agendas.find((a) => a.id === t.agenda_id);
        return (
          <div
            key={t.id}
            draggable
            onDragStart={(e) => {
              onDragStartCard(t.id);
              e.dataTransfer.effectAllowed = "move";
            }}
            className="bg-paper border border-line rounded-lg p-2.5 flex flex-col gap-1.5 shadow-sm cursor-grab active:cursor-grabbing"
          >
            <span className="font-semibold text-[13px]">{t.titulo}</span>
            {t.descricao && <span className="text-xs text-ink-2">{t.descricao}</span>}
            <div className="flex flex-wrap gap-1.5 items-center">
              <span
                className="text-[10.5px] font-semibold px-1.5 py-0.5 rounded-full"
                style={{ color: `var(--${URG_CLS[t.urgencia]})`, background: `var(--${URG_CLS[t.urgencia]}-wash, var(--paper-2))` }}
              >
                {t.urgencia}
              </span>
              {t.cliente_nome && <span className="text-[10.5px] bg-paper-2 border border-line rounded-full px-1.5 py-0.5">{t.cliente_nome}</span>}
            </div>
            <span className="text-[10.5px] text-muted num">📅 {agenda ? agenda.nome : "sem agenda definida"}</span>
          </div>
        );
      })}
      {!lista.length && <span className="text-xs text-muted p-1.5 text-center">arraste um card aqui</span>}
    </div>
  );
}
