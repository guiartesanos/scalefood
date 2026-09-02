"use client";

import { useState } from "react";

const TABS = [
  { key: "news", label: "News" },
  { key: "gerador", label: "Gerador de conteúdo" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function MarketingTabs({
  news,
  gerador,
  badgeGerador,
}: {
  news: React.ReactNode;
  gerador: React.ReactNode;
  badgeGerador?: number;
}) {
  const [ativo, setAtivo] = useState<TabKey>("news");
  const conteudo: Record<TabKey, React.ReactNode> = { news, gerador };

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
              className="font-display font-bold text-[14px] px-3.5 pt-2 pb-2.5 border-b-2 transition-colors -mb-px flex items-center gap-1.5"
              style={{
                color: active ? "var(--accent-ink)" : "var(--muted)",
                borderColor: active ? "var(--accent)" : "transparent",
              }}
            >
              {t.label}
              {t.key === "gerador" && !!badgeGerador && (
                <span
                  className="text-[10px] font-bold text-white rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center"
                  style={{ background: "var(--accent)" }}
                >
                  {badgeGerador}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="flex flex-col gap-5">{conteudo[ativo]}</div>
    </div>
  );
}
