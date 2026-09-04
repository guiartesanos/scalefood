"use client";

import { useState } from "react";
// Sem centavos de propósito — eixo de gráfico, não conferência de valores
// (ver @/lib/format pra fonte única de formatação).
import { brlInt as brl } from "@/lib/format";

export interface PontoMensal {
  label: string;
  faturamento: number;
  custosFixos: number;
  custosVariaveis: number;
  lucro: number;
}

const SERIES = [
  { key: "faturamento", label: "Faturamento", color: "var(--accent)" },
  { key: "lucro", label: "Lucro", color: "var(--good)" },
  { key: "custosVariaveis", label: "Custos variáveis", color: "var(--warning)" },
  { key: "custosFixos", label: "Custos fixos", color: "var(--critical)" },
] as const;

type SerieKey = (typeof SERIES)[number]["key"];

function brlEixo(v: number) {
  if (Math.abs(v) >= 1000) return (v / 1000).toFixed(0) + "k";
  return v.toFixed(0);
}

export function GrowthChart({ pontos }: { pontos: PontoMensal[] }) {
  const [ativos, setAtivos] = useState<Record<SerieKey, boolean>>({
    faturamento: true,
    lucro: true,
    custosVariaveis: true,
    custosFixos: true,
  });
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const seriesAtivas = SERIES.filter((s) => ativos[s.key]);
  const W = 720, H = 260, PAD_L = 52, PAD_B = 26, PAD_T = 14, PAD_R = 12;
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;

  const valores = pontos.flatMap((p) => seriesAtivas.map((s) => p[s.key]));
  const maxV = Math.max(...valores, 1);
  const minV = Math.min(...valores, 0);

  const x = (i: number) => PAD_L + (i / Math.max(pontos.length - 1, 1)) * plotW;
  const y = (v: number) => PAD_T + plotH - ((v - minV) / (maxV - minV || 1)) * plotH;

  return (
    <div className="bg-paper border border-line rounded-xl p-4 flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {SERIES.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setAtivos((a) => ({ ...a, [s.key]: !a[s.key] }))}
            className="flex items-center gap-1.5 text-[12px] font-semibold px-2.5 py-1 rounded-full border transition-colors"
            style={{
              borderColor: ativos[s.key] ? s.color : "var(--line)",
              color: ativos[s.key] ? s.color : "var(--muted)",
              background: ativos[s.key] ? "var(--paper-2)" : "transparent",
            }}
          >
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: ativos[s.key] ? s.color : "var(--line)" }} />
            {s.label}
          </button>
        ))}
      </div>

      {seriesAtivas.length === 0 ? (
        <p className="text-sm text-muted py-8 text-center">Selecione ao menos uma linha pra ver o gráfico.</p>
      ) : (
        <>
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ overflow: "visible" }}>
            {[0, 0.25, 0.5, 0.75, 1].map((t) => {
              const v = minV + t * (maxV - minV);
              return (
                <g key={t}>
                  <line x1={PAD_L} x2={W - PAD_R} y1={y(v)} y2={y(v)} stroke="var(--line)" strokeWidth={1} />
                  <text x={PAD_L - 8} y={y(v)} textAnchor="end" dominantBaseline="middle" fontSize={10} fill="var(--muted)">
                    {brlEixo(v)}
                  </text>
                </g>
              );
            })}
            {pontos.map((p, i) => (
              <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize={9} fill="var(--muted)">
                {p.label.slice(0, 3)}
              </text>
            ))}
            {hoverIdx !== null && (
              <line x1={x(hoverIdx)} x2={x(hoverIdx)} y1={PAD_T} y2={H - PAD_B} stroke="var(--line)" strokeDasharray="3,3" />
            )}
            {seriesAtivas.map((s) => {
              const d = pontos.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(p[s.key])}`).join(" ");
              return <path key={s.key} d={d} fill="none" stroke={s.color} strokeWidth={2} />;
            })}
            {seriesAtivas.map((s) =>
              pontos.map((p, i) => (
                <circle
                  key={s.key + i}
                  cx={x(i)}
                  cy={y(p[s.key])}
                  r={hoverIdx === i ? 4.5 : 3}
                  fill={s.color}
                  onMouseEnter={() => setHoverIdx(i)}
                  onMouseLeave={() => setHoverIdx(null)}
                  style={{ cursor: "pointer" }}
                />
              ))
            )}
          </svg>
          <div className="text-[12px] flex flex-wrap gap-x-4 gap-y-1 bg-paper-2 rounded-lg p-2.5 min-h-[32px]">
            {hoverIdx !== null ? (
              <>
                <b>{pontos[hoverIdx].label}</b>
                {seriesAtivas.map((s) => (
                  <span key={s.key} style={{ color: s.color }} className="font-semibold">
                    {s.label}: {brl(pontos[hoverIdx][s.key])}
                  </span>
                ))}
              </>
            ) : (
              <span className="text-muted">passe o mouse nos pontos pra ver os valores exatos</span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
