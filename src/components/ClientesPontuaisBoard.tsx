"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { atualizarStatusConsultoria } from "@/actions/consultoria";
import { fmtData } from "@/lib/format";
import { brl } from "@/lib/format";
import { CONSULTORIA_STATUS_META, type ConsultoriaCliente, type ConsultoriaStatus } from "@/lib/types";

const COLS: { status: ConsultoriaStatus; label: string }[] = [
  { status: "aguardando_inicio", label: CONSULTORIA_STATUS_META.aguardando_inicio.label },
  { status: "entrega", label: CONSULTORIA_STATUS_META.entrega.label },
  { status: "curso_comprado", label: CONSULTORIA_STATUS_META.curso_comprado.label },
];

const PRODUTO_LABEL: Record<string, string> = { consultoria: "Consultoria", curso: "Curso" };

export function ClientesPontuaisBoard({ clientes }: { clientes: ConsultoriaCliente[] }) {
  const [mostrarConcluidos, setMostrarConcluidos] = useState(false);
  const ativos = clientes.filter((c) => c.status !== "concluido");
  const concluidos = clientes.filter((c) => c.status === "concluido");

  return (
    <section className="flex flex-col gap-3.5">
      <div>
        <h2 className="font-display font-bold text-[21px]">Clientes Pontuais</h2>
        <p className="text-[13px] text-muted">
          Quem comprou Consultoria e/ou Curso sem Recorrência junto — o checklist de reuniões de cada um fica
          em <Link href="/consultoria" className="text-accent-ink underline">Consultoria</Link>.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3.5 max-[900px]:grid-cols-1">
        {COLS.map((col) => (
          <div key={col.status} className="flex flex-col gap-2.5">
            <span className="text-[11px] uppercase tracking-wide font-semibold" style={{ color: `var(--${CONSULTORIA_STATUS_META[col.status].cls})` }}>
              {col.label} · {ativos.filter((c) => c.status === col.status).length}
            </span>
            <div className="flex flex-col gap-2.5">
              {ativos
                .filter((c) => c.status === col.status)
                .map((c) => (
                  <ClientePontualCard key={c.id} cliente={c} />
                ))}
              {!ativos.some((c) => c.status === col.status) && (
                <p className="text-xs text-muted">Nenhum cliente aqui.</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {!!concluidos.length && (
        <div className="flex flex-col gap-2.5">
          <button type="button" onClick={() => setMostrarConcluidos((v) => !v)} className="text-xs text-accent-ink hover:underline self-start">
            {mostrarConcluidos ? "ocultar concluídos" : `ver concluídos (${concluidos.length})`}
          </button>
          {mostrarConcluidos && (
            <div className="grid grid-cols-3 gap-3.5 max-[900px]:grid-cols-1">
              {concluidos.map((c) => (
                <ClientePontualCard key={c.id} cliente={c} readonly />
              ))}
            </div>
          )}
        </div>
      )}

      {!clientes.length && <p className="text-sm text-muted">Nenhum cliente pontual ainda.</p>}
    </section>
  );
}

function ClientePontualCard({ cliente, readonly = false }: { cliente: ConsultoriaCliente; readonly?: boolean }) {
  const [pending, startTransition] = useTransition();
  const meta = CONSULTORIA_STATUS_META[cliente.status];

  return (
    <div className="bg-paper border border-line/70 rounded-lg p-3 flex flex-col gap-1.5">
      <div className="flex items-start justify-between gap-2">
        <span className="font-display font-bold text-[14px] truncate">{cliente.nome}</span>
        {!readonly && (
          <select
            className={`status-select pill-${meta.cls} shrink-0`}
            value={cliente.status}
            disabled={pending}
            onChange={(e) =>
              startTransition(() => {
                atualizarStatusConsultoria(cliente.id, e.target.value as ConsultoriaStatus);
              })
            }
            style={{ color: `var(--${meta.cls})`, background: `var(--${meta.cls}-wash)` }}
          >
            {(Object.keys(CONSULTORIA_STATUS_META) as ConsultoriaStatus[]).map((s) => (
              <option key={s} value={s}>
                {CONSULTORIA_STATUS_META[s].label}
              </option>
            ))}
          </select>
        )}
      </div>
      <span className="text-[10.5px] text-muted">
        fechou em {fmtData(cliente.data_fechamento)} · {cliente.produtos.map((p) => PRODUTO_LABEL[p] || p).join(" + ")}
        {cliente.valor ? ` · ${brl(cliente.valor)}` : ""}
      </span>
      {cliente.emails.length > 0 && <span className="text-[10.5px] text-muted truncate">{cliente.emails.join(" · ")}</span>}
    </div>
  );
}
