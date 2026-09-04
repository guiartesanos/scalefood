"use client";

import { useState } from "react";
import Link from "next/link";
import { StatusSelect } from "@/components/StatusSelect";
import { brl } from "@/lib/format";
import type { Cliente } from "@/lib/types";

const COLS = [
  { key: "onboarding", label: "Onboarding", status: "Onboarding urgente" },
  { key: "rodando-sem", label: "Rodando · sem resultado", status: "Rodando - sem resultado ainda" },
  { key: "rodando-com", label: "Rodando · com resultado", status: "Rodando - com resultado" },
  { key: "cancelando", label: "Cancelando", status: "Pediu pra cancelar" },
] as const;

const STRIPE: Record<string, string> = {
  onboarding: "var(--serious)",
  "rodando-sem": "var(--warning)",
  "rodando-com": "var(--good)",
  cancelando: "var(--critical)",
};

function tenureLabel(fechamento: string | null): { text: string; days: number } {
  if (!fechamento) return { text: "—", days: 99999 };
  const d = new Date(fechamento + "T00:00:00");
  const days = Math.round((Date.now() - d.getTime()) / 86400000);
  if (days <= 0) return { text: "hoje", days };
  if (days < 30) return { text: `${days} dia${days > 1 ? "s" : ""}`, days };
  const months = Math.round((days / 30.44) * 10) / 10;
  const numStr = Number.isInteger(months) ? months.toFixed(0) : months.toFixed(1).replace(".", ",");
  return { text: `${numStr} ${months < 2 ? "mês" : "meses"}`, days };
}
function pctOf(c: Cliente): number | null {
  return c.entrada && c.entrada > 0 && c.hoje != null ? ((c.hoje - c.entrada) / c.entrada) * 100 : null;
}

export function ClientesKanban({ clientes }: { clientes: Cliente[] }) {
  const [ativo, setAtivo] = useState<(typeof COLS)[number]["key"]>("onboarding");

  return (
    <div className="flex flex-col gap-3">
      <div className="hidden max-[767px]:flex gap-2 overflow-x-auto pb-1">
        {COLS.map((col) => {
          const count = clientes.filter((c) => c.status === col.status).length;
          const selecionado = ativo === col.key;
          return (
            <button
              key={col.key}
              onClick={() => setAtivo(col.key)}
              className="shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-semibold border"
              style={{
                borderColor: selecionado ? STRIPE[col.key] : "var(--line)",
                background: selecionado ? "var(--paper)" : "var(--paper-2)",
                color: selecionado ? STRIPE[col.key] : "var(--muted)",
              }}
            >
              {col.label} · {count}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-4 gap-3 max-[900px]:grid-cols-2 max-[560px]:grid-cols-1">
        {COLS.map((col) => {
          const list = clientes.filter((c) => c.status === col.status);
          return (
            <div
              key={col.key}
              className={`bg-paper-2 border border-line rounded-xl p-2.5 flex-col gap-2 flex ${ativo === col.key ? "" : "max-[767px]:hidden"}`}
            >
              <div className="flex justify-between items-center px-1 pb-1 max-[767px]:hidden" style={{ borderBottom: `2px solid ${STRIPE[col.key]}` }}>
                <h4 className="font-display font-bold text-[13.5px]" style={{ color: STRIPE[col.key] }}>{col.label}</h4>
                <span className="text-[11px] text-muted num">{list.length}</span>
              </div>
              {list.map((c) => {
                const tenure = tenureLabel(c.fechamento);
                const p = pctOf(c);
                let attn = false, attnNote = "";
                if (c.growth_note === "estagnado" && tenure.days > 60) { attn = true; attnNote = `estagnado há ${tenure.text}`; }
                if (c.status === "Pediu pra cancelar") { attn = true; attnNote = "cancelamento em andamento"; }
                if (c.status === "Onboarding urgente" && tenure.days > 7) { attn = true; attnNote = `onboarding parado há ${tenure.text}`; }
                const growthTxt = p !== null ? `${p >= 0 ? "+" : ""}${p.toFixed(0)}%` : c.growth_note === "zero_base" ? "do zero" : "—";
                return (
                  <div key={c.id} className="bg-paper border border-line rounded-lg p-2.5 flex flex-col gap-1" style={{ borderLeft: `3px solid ${attn ? "var(--critical)" : STRIPE[col.key]}` }}>
                    <Link href={`/clientes/${c.id}`} className="font-semibold text-[12.5px] hover:text-accent-ink hover:underline self-start">
                      {c.nome}
                    </Link>
                    <span className="text-[11px] text-muted">{c.dono} · {c.nicho} · cliente há {tenure.text}</span>
                    <span className="text-[11px] text-ink-2 num">{brl(c.rec)}/mês · crescimento {growthTxt}</span>
                    {attn && <span className="text-[10.5px] text-critical font-semibold">⚠ {attnNote}</span>}
                    <StatusSelect clienteId={c.id} status={c.status} />
                  </div>
                );
              })}
              {!list.length && <span className="text-xs text-muted p-1.5">vazio</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
