"use client";

import { useState, useTransition } from "react";
import {
  marcarTarefaConsultoria,
  agendarPrimeiraReuniao,
  redefinirCadenciaConsultoria,
  concluirClienteConsultoria,
  cadastrarConsultoriaManual,
} from "@/actions/consultoria";
import { prazoSugeridoPrimeiraReuniao } from "@/lib/reunioes";
import { fmtData } from "@/lib/format";
import type { ConsultoriaCliente, ConsultoriaTarefa } from "@/lib/types";

const DIA_LABEL: Record<number, string> = { 1: "segunda", 2: "terça", 3: "quarta" };

function fmtHora(h: string | null) {
  return h ? h.slice(0, 5) : "";
}

export function ConsultoriaBoard({
  ativos,
  concluidos,
  tarefas,
  calendarConectado,
  mostrarConexaoCalendar,
  mensagemCalendar,
  calendarErro,
}: {
  ativos: ConsultoriaCliente[];
  concluidos: ConsultoriaCliente[];
  tarefas: ConsultoriaTarefa[];
  calendarConectado: boolean;
  mostrarConexaoCalendar: boolean;
  mensagemCalendar: string | null;
  calendarErro: boolean;
}) {
  const [mostrarConcluidos, setMostrarConcluidos] = useState(false);
  const [mostrarCadastro, setMostrarCadastro] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const tarefasPorCliente = (clienteId: string) =>
    tarefas.filter((t) => t.consultoria_cliente_id === clienteId).sort((a, b) => a.ordem - b.ordem);

  function handleCadastro(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await cadastrarConsultoriaManual(formData);
      if ("error" in result) setError(result.error ?? "Erro ao cadastrar.");
      else setMostrarCadastro(false);
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex flex-col gap-1">
          <h2 className="font-display font-bold text-[21px]">Consultoria</h2>
          <p className="text-[13px] text-muted">
            Um quadro por cliente — clique pra abrir o checklist de onboarding e as reuniões.
          </p>
        </div>
        {mostrarConexaoCalendar && (
          <div className="flex flex-col items-end gap-1">
            {calendarConectado ? (
              <span className="text-xs text-good font-semibold">✓ Google Calendar conectado</span>
            ) : (
              <a href="/api/google-calendar/authorize" className="btn text-xs">
                Conectar Google Calendar
              </a>
            )}
            {mensagemCalendar && (
              <span className={`text-xs ${calendarErro ? "text-critical" : "text-good"}`}>{mensagemCalendar}</span>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3.5 max-[1100px]:grid-cols-2 max-[640px]:grid-cols-1">
        {ativos.map((c) => (
          <ConsultoriaCard key={c.id} cliente={c} tarefas={tarefasPorCliente(c.id)} />
        ))}
        {!ativos.length && (
          <p className="text-sm text-muted col-span-3 max-[1100px]:col-span-2 max-[640px]:col-span-1">
            Nenhuma consultoria ativa no momento.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setMostrarCadastro((v) => !v)} className="text-xs text-accent-ink hover:underline">
            {mostrarCadastro ? "cancelar" : "+ cadastrar cliente manualmente"}
          </button>
          {!!concluidos.length && (
            <button type="button" onClick={() => setMostrarConcluidos((v) => !v)} className="text-xs text-accent-ink hover:underline">
              {mostrarConcluidos ? "ocultar concluídos" : `ver concluídos (${concluidos.length})`}
            </button>
          )}
        </div>

        {mostrarCadastro && (
          <form action={handleCadastro} className="bg-paper-2 border border-dashed border-line rounded-md p-4 flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] uppercase tracking-wide text-muted font-semibold">Nome</label>
              <input name="nome" required className="input" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] uppercase tracking-wide text-muted font-semibold">Email</label>
              <input name="email" type="email" className="input" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] uppercase tracking-wide text-muted font-semibold">Data de fechamento</label>
              <input name="dataFechamento" type="date" required className="input" />
            </div>
            <button type="submit" disabled={pending} className="btn-primary">
              {pending ? "salvando..." : "cadastrar"}
            </button>
            {error && <p className="text-critical text-sm w-full">{error}</p>}
          </form>
        )}

        {mostrarConcluidos && (
          <div className="grid grid-cols-3 gap-3.5 max-[1100px]:grid-cols-2 max-[640px]:grid-cols-1">
            {concluidos.map((c) => (
              <ConsultoriaCard key={c.id} cliente={c} tarefas={tarefasPorCliente(c.id)} readonly />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ConsultoriaCard({
  cliente,
  tarefas,
  readonly = false,
}: {
  cliente: ConsultoriaCliente;
  tarefas: ConsultoriaTarefa[];
  readonly?: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [, startTransition] = useTransition();

  const feitas = tarefas.filter((t) => t.feito).length;
  const primeira = tarefas.find((t) => t.ordem === 1);
  const demais = tarefas.filter((t) => t.ordem > 1);

  function toggleTarefa(t: ConsultoriaTarefa) {
    startTransition(() => {
      marcarTarefaConsultoria(t.id, !t.feito);
    });
  }

  return (
    <div
      className="bg-paper border border-line/70 rounded-lg overflow-hidden transition-all duration-200 hover:-translate-y-[3px]"
      style={{ boxShadow: aberto ? "var(--shadow)" : "0 1px 3px -1px rgba(30, 27, 20, 0.12)" }}
    >
      {/* div, não button — o botão "concluído" fica aninhado aqui dentro,
          e <button> dentro de <button> é HTML inválido (quebra a hidratação) */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setAberto((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setAberto((v) => !v);
          }
        }}
        className="w-full flex items-center justify-between gap-2.5 p-3 text-left cursor-pointer"
      >
        <div className="flex flex-col gap-1 min-w-0">
          <span className="font-display font-bold text-[14px] truncate">{cliente.nome}</span>
          <span className="text-[10.5px] text-muted">
            fechou em {fmtData(cliente.data_fechamento)} · {feitas}/{tarefas.length} concluídas
          </span>
          <div className="h-[4px] w-24 rounded-full bg-paper-2 border border-line/50 overflow-hidden">
            <div
              className="h-full rounded-full transition-[width] duration-300"
              style={{ width: `${tarefas.length ? (feitas / tarefas.length) * 100 : 0}%`, background: "var(--good)" }}
            />
          </div>
        </div>
        {!readonly && (
          <div onClick={(e) => e.stopPropagation()} className="shrink-0">
            {confirmando ? (
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-muted">confirma?</span>
                <button
                  type="button"
                  onClick={() =>
                    startTransition(() => {
                      concluirClienteConsultoria(cliente.id);
                    })
                  }
                  className="btn-critical text-xs"
                >
                  sim
                </button>
                <button type="button" onClick={() => setConfirmando(false)} className="btn text-xs">
                  não
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirmando(true)} className="btn text-[11px] whitespace-nowrap">
                concluído ✓
              </button>
            )}
          </div>
        )}
      </div>

      {aberto && (
        <div className="border-t border-line/70 p-3.5 flex flex-col gap-3.5">
          {primeira && (
            <PrimeiraReuniaoRow tarefa={primeira} dataFechamento={cliente.data_fechamento} readonly={readonly} onToggle={toggleTarefa} />
          )}

          {!readonly && <CadenciaForm cliente={cliente} />}

          <div className="flex flex-col gap-2">
            {demais.map((t) => (
              <TarefaRow key={t.id} tarefa={t} readonly={readonly} onToggle={toggleTarefa} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TarefaRow({ tarefa, readonly, onToggle }: { tarefa: ConsultoriaTarefa; readonly: boolean; onToggle: (t: ConsultoriaTarefa) => void }) {
  return (
    <label className="flex items-start gap-2.5 text-[13px]">
      <input type="checkbox" checked={tarefa.feito} disabled={readonly} onChange={() => onToggle(tarefa)} className="mt-0.5" />
      <div className="flex flex-col min-w-0">
        <span className={tarefa.feito ? "line-through text-muted" : ""}>{tarefa.titulo}</span>
        <span className="text-[11px] text-muted flex items-center gap-2">
          {tarefa.data_reuniao ? `${fmtData(tarefa.data_reuniao)} · ${fmtHora(tarefa.hora_reuniao)}` : "sem data"}
          {tarefa.google_event_url && (
            <a href={tarefa.google_event_url} target="_blank" rel="noopener noreferrer" className="text-accent-ink underline">
              ver no Google Calendar
            </a>
          )}
        </span>
      </div>
    </label>
  );
}

function PrimeiraReuniaoRow({
  tarefa,
  dataFechamento,
  readonly,
  onToggle,
}: {
  tarefa: ConsultoriaTarefa;
  dataFechamento: string;
  readonly: boolean;
  onToggle: (t: ConsultoriaTarefa) => void;
}) {
  const [data, setData] = useState("");
  const [hora, setHora] = useState("09:00");
  const [pending, startTransition] = useTransition();

  if (tarefa.data_reuniao || readonly) {
    return <TarefaRow tarefa={tarefa} readonly={readonly} onToggle={onToggle} />;
  }

  return (
    <div className="bg-accent-wash border border-accent/30 rounded-md p-3 flex flex-col gap-2">
      <span className="font-semibold text-[13px]">{tarefa.titulo} — agendamento manual</span>
      <span className="text-[11px] text-ink-2">
        sugestão: até {fmtData(prazoSugeridoPrimeiraReuniao(dataFechamento))} (alinhe direto com o cliente)
      </span>
      <div className="flex flex-wrap items-end gap-2">
        <input type="date" value={data} onChange={(e) => setData(e.target.value)} className="input" />
        <input type="time" min="08:00" max="10:45" step={900} value={hora} onChange={(e) => setHora(e.target.value)} className="input" />
        <button
          type="button"
          disabled={!data || pending}
          onClick={() =>
            startTransition(() => {
              agendarPrimeiraReuniao(tarefa.id, data, hora);
            })
          }
          className="btn-primary text-xs"
        >
          {pending ? "agendando..." : "agendar"}
        </button>
      </div>
    </div>
  );
}

function CadenciaForm({ cliente }: { cliente: ConsultoriaCliente }) {
  const [dia, setDia] = useState(cliente.dia_semana_recorrente);
  const [hora, setHora] = useState(cliente.hora_recorrente.slice(0, 5));
  const [pending, startTransition] = useTransition();
  const [salvo, setSalvo] = useState(false);

  return (
    <div className="flex flex-wrap items-end gap-2 text-[13px] bg-paper-2 border border-dashed border-line rounded-md p-3">
      <span className="text-[11px] uppercase tracking-wide text-muted font-semibold w-full">
        Cadência das próximas reuniões
      </span>
      <span>toda</span>
      <select value={dia} onChange={(e) => setDia(Number(e.target.value))} className="input">
        {Object.entries(DIA_LABEL).map(([v, label]) => (
          <option key={v} value={v}>
            {label}
          </option>
        ))}
      </select>
      <span>às</span>
      <input type="time" min="08:00" max="10:45" step={900} value={hora} onChange={(e) => setHora(e.target.value)} className="input" />
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await redefinirCadenciaConsultoria(cliente.id, dia, hora);
            setSalvo(true);
            setTimeout(() => setSalvo(false), 2000);
          })
        }
        className="btn text-xs"
      >
        {pending ? "salvando..." : "salvar"}
      </button>
      {salvo && <span className="text-good text-xs">realinhado ✓</span>}
    </div>
  );
}
