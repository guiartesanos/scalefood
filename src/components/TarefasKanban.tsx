"use client";

import { useState, useTransition } from "react";
import { moverTarefa, removerTarefa } from "@/actions/tarefas";
import { ConfirmarExclusao } from "@/components/ConfirmarExclusao";
import { AtribuirResponsavelChip } from "@/components/AtribuirResponsavelChip";
import { URG_CLS, type Tarefa, type Agenda } from "@/lib/types";
type Coluna = "a-fazer" | "em-andamento" | "feito";

const COLS = [
  { key: "a-fazer" as const, titulo: "A fazer" },
  { key: "em-andamento" as const, titulo: "Em andamento" },
];

export function TarefasKanban({ tarefas, agendas, responsaveis }: { tarefas: Tarefa[]; agendas: Agenda[]; responsaveis: string[] }) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<Coluna | null>(null);
  const [feitoAberto, setFeitoAberto] = useState(false);
  const [ativo, setAtivo] = useState<Coluna>("a-fazer");
  const [, startTransition] = useTransition();

  const porColuna = (c: Coluna) => tarefas.filter((t) => t.coluna === c);
  const aFazer = porColuna("a-fazer");
  const emAndamento = porColuna("em-andamento");
  const feito = porColuna("feito");
  const listas: Record<"a-fazer" | "em-andamento", Tarefa[]> = { "a-fazer": aFazer, "em-andamento": emAndamento };

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

  function mover(tarefaId: string, coluna: Coluna) {
    startTransition(() => {
      moverTarefa(tarefaId, coluna);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="hidden max-[767px]:flex gap-2">
        {COLS.map((col) => {
          const selecionado = ativo === col.key;
          return (
            <button
              key={col.key}
              onClick={() => setAtivo(col.key)}
              className="flex-1 rounded-full px-3 py-1.5 text-[12px] font-semibold border"
              style={{
                borderColor: selecionado ? "var(--accent)" : "var(--line)",
                background: selecionado ? "var(--paper)" : "var(--paper-2)",
                color: selecionado ? "var(--accent-ink)" : "var(--muted)",
              }}
            >
              {col.titulo} · {listas[col.key].length}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-3.5 max-[700px]:grid-cols-1">
        <Coluna
          titulo="A fazer"
          coluna="a-fazer"
          lista={aFazer}
          agendas={agendas}
          responsaveis={responsaveis}
          dragOver={dragOver === "a-fazer"}
          onDragEnter={() => setDragOver("a-fazer")}
          onDragLeave={() => setDragOver(null)}
          onDrop={() => soltar("a-fazer")}
          onDragStartCard={setDragId}
          onMover={mover}
          visivelNoMobile={ativo === "a-fazer"}
        />
        <Coluna
          titulo="Em andamento"
          coluna="em-andamento"
          lista={emAndamento}
          agendas={agendas}
          responsaveis={responsaveis}
          dragOver={dragOver === "em-andamento"}
          onDragEnter={() => setDragOver("em-andamento")}
          onDragLeave={() => setDragOver(null)}
          onDrop={() => soltar("em-andamento")}
          onDragStartCard={setDragId}
          onMover={mover}
          visivelNoMobile={ativo === "em-andamento"}
        />
      </div>

      <div
        onDragOver={(e) => e.preventDefault()}
        onDragEnter={() => setDragOver("feito")}
        onDragLeave={() => setDragOver(null)}
        onDrop={() => soltar("feito")}
        className="border border-line rounded-md transition-colors"
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
              <div key={t.id} className="flex items-center justify-between gap-2 text-[12px] bg-paper border border-line/50 rounded px-2.5 py-1.5">
                <span className="line-through text-muted">{t.titulo}</span>
                <ConfirmarExclusao
                  itemLabel={`a tarefa "${t.titulo}"`}
                  acao={() => removerTarefa(t.id)}
                  className="text-[10.5px] text-muted hover:text-critical"
                />
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
  coluna,
  lista,
  agendas,
  responsaveis,
  dragOver,
  onDragEnter,
  onDragLeave,
  onDrop,
  onDragStartCard,
  onMover,
  visivelNoMobile,
}: {
  titulo: string;
  coluna: Coluna;
  lista: Tarefa[];
  agendas: Agenda[];
  responsaveis: string[];
  dragOver: boolean;
  onDragEnter: () => void;
  onDragLeave: () => void;
  onDrop: () => void;
  onDragStartCard: (id: string) => void;
  onMover: (id: string, coluna: Coluna) => void;
  visivelNoMobile: boolean;
}) {
  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`border border-line rounded-lg p-2.5 flex-col gap-2.5 min-h-[140px] transition-colors flex ${visivelNoMobile ? "" : "max-[767px]:hidden"}`}
      style={{ background: dragOver ? "var(--accent-wash)" : "var(--paper-2)" }}
    >
      <div className="flex justify-between items-center px-1 max-[767px]:hidden">
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
            className="bg-paper border border-line rounded-md p-2.5 flex flex-col gap-1.5 shadow-sm cursor-grab active:cursor-grabbing"
            style={{ borderLeft: `3px solid var(--${URG_CLS[t.urgencia]})` }}
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
              <AtribuirResponsavelChip tarefaId={t.id} responsavel={t.responsavel} responsaveis={responsaveis} />
            </div>
            <span className="text-[10.5px] text-muted num">📅 {agenda ? agenda.nome : "sem agenda definida"}</span>
            <div className="hidden max-[767px]:flex gap-1.5 pt-1 border-t border-line/50 mt-0.5">
              {coluna === "em-andamento" && (
                <button onClick={() => onMover(t.id, "a-fazer")} className="btn text-[11px] py-1 px-2 flex-1">
                  ← a fazer
                </button>
              )}
              {coluna === "a-fazer" && (
                <button onClick={() => onMover(t.id, "em-andamento")} className="btn text-[11px] py-1 px-2 flex-1">
                  em andamento →
                </button>
              )}
              <button onClick={() => onMover(t.id, "feito")} className="btn text-[11px] py-1 px-2 flex-1" style={{ color: "var(--good)" }}>
                ✓ concluir
              </button>
            </div>
          </div>
        );
      })}
      {!lista.length && <span className="text-xs text-muted p-1.5 text-center">arraste um card aqui</span>}
    </div>
  );
}
