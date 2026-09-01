"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { FaturamentoMesAtual } from "@/lib/types";

const REFRESH_MS = 60_000;

function brl(v: number | null | undefined) {
  return "R$ " + Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function MetaTV({ fat }: { fat: FaturamentoMesAtual | null }) {
  const router = useRouter();
  const [agora, setAgora] = useState<Date | null>(null);

  useEffect(() => {
    setAgora(new Date());
    const clock = setInterval(() => setAgora(new Date()), 1000);
    const refresh = setInterval(() => router.refresh(), REFRESH_MS);
    return () => {
      clearInterval(clock);
      clearInterval(refresh);
    };
  }, [router]);

  const semMeta = !fat?.valor_meta;
  const pct = Math.max(0, Math.min(100, fat?.pct_meta ?? 0));
  const bateu = pct >= 100;

  return (
    <div
      className="fixed inset-0 flex flex-col overflow-hidden"
      style={{ background: "#100e09", color: "#f1ead9", fontFamily: "var(--font-sans)" }}
    >
      <header className="flex items-center justify-between px-[4vw] pt-[3vh]">
        <span
          className="font-display font-bold tracking-wide"
          style={{ fontSize: "clamp(20px, 2.6vw, 40px)", color: "#e0a23d" }}
        >
          FOOD SCALE
        </span>
        <div className="text-right leading-tight">
          <div className="font-mono" style={{ fontSize: "clamp(18px, 2.2vw, 34px)", color: "#f1ead9" }}>
            {agora
              ? agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
              : "--:--"}
          </div>
          <div style={{ fontSize: "clamp(11px, 1vw, 16px)", color: "#8c8676" }}>
            {agora
              ? agora.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })
              : ""}
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center gap-[2vh] px-[4vw]">
        <span
          className="uppercase tracking-[0.25em] font-semibold"
          style={{ fontSize: "clamp(14px, 1.6vw, 24px)", color: "#c9c0ac" }}
        >
          Faturamento novo do mês
        </span>
        <span
          className="font-display font-bold num leading-none"
          style={{ fontSize: "clamp(56px, 12vw, 190px)", color: "#f1ead9" }}
        >
          {agora ? brl(fat?.faturamento_novo_mes) : " "}
        </span>

        {semMeta ? (
          <span style={{ fontSize: "clamp(16px, 1.6vw, 26px)", color: "#8c8676" }}>
            Meta do mês ainda não definida.
          </span>
        ) : (
          <div className="w-full flex flex-col items-center gap-[2vh]" style={{ maxWidth: "min(1400px, 80vw)" }}>
            <div
              className="w-full rounded-full overflow-hidden"
              style={{ height: "clamp(18px, 2.4vh, 36px)", background: "rgba(241,234,217,0.1)" }}
            >
              <div
                className="h-full rounded-full transition-[width] duration-700 ease-out"
                style={{
                  width: `${pct}%`,
                  background: bateu ? "#3fc23f" : "#e0a23d",
                }}
              />
            </div>

            <div
              className="w-full flex flex-wrap items-center justify-between gap-x-6 gap-y-3"
              style={{ fontSize: "clamp(15px, 1.5vw, 24px)" }}
            >
              <span style={{ color: "#c9c0ac" }}>
                Meta: <b className="num" style={{ color: "#f1ead9" }}>{brl(fat?.valor_meta)}</b>
              </span>
              <span
                className="font-display font-bold num"
                style={{ fontSize: "clamp(28px, 3.4vw, 56px)", color: bateu ? "#3fc23f" : "#e0a23d" }}
              >
                {pct.toFixed(1).replace(".", ",")}%
              </span>
              <span style={{ color: "#c9c0ac" }}>
                Projeção:{" "}
                <b className="num" style={{ color: "#f1ead9" }}>
                  {brl(fat?.projecao_fechamento)}
                </b>
              </span>
            </div>

            <div
              className="w-full flex flex-wrap items-center justify-center gap-x-8 gap-y-1"
              style={{ fontSize: "clamp(13px, 1.2vw, 20px)", color: "#c9c0ac" }}
            >
              <span>
                {fat?.numero_vendas ?? 0} venda{fat?.numero_vendas === 1 ? "" : "s"} feita{fat?.numero_vendas === 1 ? "" : "s"}
              </span>
              {!!fat?.vendas_faltantes && fat.vendas_faltantes > 0 && (
                <span>
                  faltam <b className="num" style={{ color: "#e0a23d" }}>{fat.vendas_faltantes}</b> pro ticket médio atual
                </span>
              )}
            </div>

            {fat?.bonus_valor ? (
              <span
                className="font-semibold"
                style={{ fontSize: "clamp(14px, 1.4vw, 22px)", color: "#3fc23f" }}
              >
                {bateu ? "🎉 Meta batida — bônus de " : "Bônus ao bater a meta: "}
                {brl(fat.bonus_valor)}
              </span>
            ) : null}
          </div>
        )}
      </main>

      <footer className="flex items-center justify-center pb-[3vh]">
        <span style={{ fontSize: "clamp(10px, 0.9vw, 14px)", color: "#5b564a" }}>
          dia {fat?.dia_atual ?? "—"}/{fat?.dias_no_mes ?? "—"} · atualiza a cada minuto
        </span>
      </footer>
    </div>
  );
}
