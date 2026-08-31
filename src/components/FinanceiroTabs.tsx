"use client";

import { useState } from "react";

const TABS = [
  { key: "geral", label: "Geral" },
  { key: "pagar", label: "Contas a pagar" },
  { key: "receber", label: "Contas a receber" },
  { key: "mensal", label: "Mensal" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function FinanceiroTabs({
  geral,
  pagar,
  receber,
  mensal,
}: {
  geral: React.ReactNode;
  pagar: React.ReactNode;
  receber: React.ReactNode;
  mensal: React.ReactNode;
}) {
  const [ativo, setAtivo] = useState<TabKey>("geral");
  const conteudo: Record<TabKey, React.ReactNode> = { geral, pagar, receber, mensal };

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
            </button>
          );
        })}
      </div>
      <div className="flex flex-col gap-7">{conteudo[ativo]}</div>
    </div>
  );
}
