"use client";

import { useState } from "react";

const TABS = [
  { key: "geral", label: "Geral" },
  { key: "cancelados", label: "Cancelados" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function ClientesTabs({
  geral,
  cancelados,
  totalCancelados,
}: {
  geral: React.ReactNode;
  cancelados: React.ReactNode;
  totalCancelados: number;
}) {
  const [ativo, setAtivo] = useState<TabKey>("geral");
  const conteudo: Record<TabKey, React.ReactNode> = { geral, cancelados };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-1.5 border-b border-line">
        {TABS.map((t) => {
          const active = ativo === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setAtivo(t.key)}
              className="font-display font-bold text-[14px] px-3.5 pt-2 pb-2.5 border-b-2 transition-colors -mb-px"
              style={{
                color: active ? "var(--accent-ink)" : "var(--muted)",
                borderColor: active ? "var(--accent)" : "transparent",
              }}
            >
              {t.label}
              {t.key === "cancelados" && totalCancelados > 0 && (
                <span className="ml-1.5 text-[11px] text-critical font-semibold">{totalCancelados}</span>
              )}
            </button>
          );
        })}
      </div>
      <div className="flex flex-col gap-7">{conteudo[ativo]}</div>
    </div>
  );
}
