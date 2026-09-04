"use client";

import { useState, useTransition } from "react";
import {
  criarProposta,
  atualizarStatusProposta,
  atualizarFollowupProposta,
  removerProposta,
} from "@/actions/propostas";
import { ConfirmarExclusao } from "./ConfirmarExclusao";
import { brl as brlValor } from "@/lib/format";
import {
  PROPOSTA_STATUS_LIST,
  PROPOSTA_STATUS_META,
  PROPOSTA_TIPO_LABEL,
  type Proposta,
  type PropostaStatus,
} from "@/lib/types";

function brl(v: number | null) {
  return v == null ? "—" : brlValor(v);
}
function fmtData(d: string | null) {
  if (!d) return "—";
  return new Date(d + "T12:00:00").toLocaleDateString("pt-BR");
}
function hoje() {
  return new Date().toISOString().slice(0, 10);
}
function atrasado(d: string | null) {
  return !!d && d < hoje();
}
const ENCERRADOS: PropostaStatus[] = ["aceita", "recusada"];

export function PropostasList({ propostas }: { propostas: Proposta[] }) {
  const [mostrarForm, setMostrarForm] = useState(false);
  const [mostrarEncerradas, setMostrarEncerradas] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleCriar(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await criarProposta(formData);
      if ("error" in result) setError(result.error ?? "Erro ao salvar proposta.");
      else setMostrarForm(false);
    });
  }

  const ativas = propostas.filter((p) => !ENCERRADOS.includes(p.status));
  const encerradas = propostas.filter((p) => ENCERRADOS.includes(p.status));

  const ordenadas = [...ativas].sort((a, b) => {
    if (!a.proximo_followup && !b.proximo_followup) return 0;
    if (!a.proximo_followup) return 1;
    if (!b.proximo_followup) return -1;
    return a.proximo_followup.localeCompare(b.proximo_followup);
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex flex-col gap-1">
          <h1 className="font-display font-bold text-2xl">Propostas</h1>
          <p className="text-sm text-ink-2">
            Propostas enviadas, não só vendas fechadas — ordenadas pelo próximo follow-up.
          </p>
        </div>
        <button type="button" onClick={() => setMostrarForm((v) => !v)} className="btn-primary">
          {mostrarForm ? "cancelar" : "+ nova proposta"}
        </button>
      </div>

      {mostrarForm && (
        <form action={handleCriar} className="bg-paper-2 border border-dashed border-line rounded-lg p-4 flex flex-wrap gap-3 items-end">
          <Field label="Nome do prospect">
            <input name="nomeProspect" required className="input" />
          </Field>
          <Field label="Tipo">
            <select name="tipo" className="input" defaultValue="consultoria">
              {Object.entries(PROPOSTA_TIPO_LABEL).map(([v, label]) => (
                <option key={v} value={v}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Valor (R$)">
            <input name="valor" type="number" step="0.01" min="0" className="input" />
          </Field>
          <Field label="Data de envio">
            <input name="dataEnvio" type="date" required defaultValue={hoje()} className="input" />
          </Field>
          <Field label="Próximo follow-up">
            <input name="proximoFollowup" type="date" className="input" />
          </Field>
          <Field label="Observação">
            <input name="observacao" className="input" placeholder="opcional" />
          </Field>
          <button type="submit" disabled={pending} className="btn-primary">
            {pending ? "salvando..." : "salvar"}
          </button>
          {error && <p className="text-critical text-sm w-full">{error}</p>}
        </form>
      )}

      <div className="border border-line rounded-xl overflow-auto bg-paper">
        <table className="w-full min-w-[820px] text-[13px] border-collapse">
          <thead>
            <tr className="bg-paper-2">
              <Th>Prospect</Th>
              <Th>Tipo</Th>
              <Th right>Valor</Th>
              <Th>Enviada em</Th>
              <Th>Follow-up</Th>
              <Th>Status</Th>
              <Th>Observação</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {ordenadas.map((p) => (
              <PropostaRow key={p.id} p={p} />
            ))}
            {!ordenadas.length && (
              <tr>
                <td colSpan={8} className="text-center text-muted py-6">
                  Nenhuma proposta ativa — clique em &quot;+ nova proposta&quot; pra começar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {!!encerradas.length && (
        <div className="flex flex-col gap-3">
          <button type="button" onClick={() => setMostrarEncerradas((v) => !v)} className="text-xs text-accent-ink hover:underline self-start">
            {mostrarEncerradas ? "ocultar encerradas" : `ver encerradas (${encerradas.length})`}
          </button>
          {mostrarEncerradas && (
            <div className="border border-line rounded-xl overflow-auto bg-paper opacity-80">
              <table className="w-full min-w-[820px] text-[13px] border-collapse">
                <tbody>
                  {encerradas.map((p) => (
                    <PropostaRow key={p.id} p={p} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PropostaRow({ p }: { p: Proposta }) {
  const [, startTransition] = useTransition();
  const meta = PROPOSTA_STATUS_META[p.status];

  return (
    <tr className="border-t border-line/50 hover:bg-paper-2">
      <td className="px-3 py-2.5 font-semibold">{p.nome_prospect}</td>
      <td className="px-3 py-2.5 text-ink-2">{PROPOSTA_TIPO_LABEL[p.tipo]}</td>
      <td className="px-3 py-2.5 text-right num">{brl(p.valor)}</td>
      <td className="px-3 py-2.5 text-ink-2">{fmtData(p.data_envio)}</td>
      <td className="px-3 py-2.5">
        <input
          type="date"
          defaultValue={p.proximo_followup || ""}
          onChange={(e) =>
            startTransition(() => {
              atualizarFollowupProposta(p.id, e.target.value);
            })
          }
          className={`input text-xs py-1 ${atrasado(p.proximo_followup) ? "border-critical text-critical" : ""}`}
        />
      </td>
      <td className="px-3 py-2.5">
        <select
          className="status-select"
          value={p.status}
          style={{ color: `var(--${meta.cls})`, background: `var(--${meta.cls}-wash)` }}
          onChange={(e) => {
            const novo = e.target.value as PropostaStatus;
            startTransition(() => {
              atualizarStatusProposta(p.id, novo);
            });
          }}
        >
          {PROPOSTA_STATUS_LIST.map((s) => (
            <option key={s} value={s}>
              {PROPOSTA_STATUS_META[s].label}
            </option>
          ))}
        </select>
      </td>
      <td className="px-3 py-2.5 text-ink-2 max-w-[220px] truncate" title={p.observacao || ""}>
        {p.observacao || "—"}
      </td>
      <td className="px-3 py-2.5">
        <ConfirmarExclusao itemLabel={`a proposta de "${p.nome_prospect}"`} acao={() => removerProposta(p.id)} />
      </td>
    </tr>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 min-w-[140px]">
      <label className="text-[11px] uppercase tracking-wide text-muted font-semibold">{label}</label>
      {children}
    </div>
  );
}
function Th({ children, right }: { children?: React.ReactNode; right?: boolean }) {
  return (
    <th className={`px-3 py-2.5 text-[10.5px] uppercase tracking-wide text-muted font-semibold ${right ? "text-right" : "text-left"}`}>
      {children}
    </th>
  );
}
