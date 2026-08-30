import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { FaturamentoMesAtual, UserRole } from "@/lib/types";
import { DefinirMetaButton } from "./DefinirMetaButton";
import { NovaVendaButton } from "./NovaVendaButton";

function brl(v: number | null | undefined) {
  return "R$ " + Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export async function MetaBar({ role }: { role: UserRole }) {
  const supabase = await createClient();
  const { data } = await supabase.from("faturamento_mes_atual").select("*").single();
  const fat = data as FaturamentoMesAtual | null;

  const semMeta = !fat?.valor_meta;

  return (
    <div className="sticky top-0 z-40 bg-paper-2 border-b border-line">
      <div className="hidden max-[767px]:flex items-center gap-2 px-4 py-2">
        <details className="flex-1 min-w-0">
          <summary className="cursor-pointer list-none flex items-center gap-2">
            <span className="font-display font-bold text-[15px] num truncate">{brl(fat?.faturamento_novo_mes)}</span>
            {!semMeta && (
              <>
                <span className="text-[11px] text-muted truncate">de {brl(fat?.valor_meta)}</span>
                <span
                  className="text-xs font-bold ml-auto shrink-0"
                  style={{ color: (fat?.pct_meta || 0) >= 100 ? "var(--good)" : "var(--accent-ink)" }}
                >
                  {(fat?.pct_meta ?? 0).toFixed(0)}%
                </span>
              </>
            )}
            {semMeta && <span className="text-[11px] text-muted ml-auto">meta não definida</span>}
          </summary>
          <div className="pt-2 flex flex-col gap-1.5 text-[12px]">
            {!semMeta && (
              <span className="text-ink-2">
                Projeção (dia {fat?.dia_atual}/{fat?.dias_no_mes}): {brl(fat?.projecao_fechamento)} ·{" "}
                {(fat?.pct_projecao ?? 0).toFixed(0)}% da meta
              </span>
            )}
            {fat?.bonus_valor ? (
              <span className="text-good font-semibold">Bônus ao bater a meta: {brl(fat.bonus_valor)}</span>
            ) : null}
            <div className="flex items-center gap-3 pt-0.5">
              {role === "master" && <DefinirMetaButton compact={!semMeta} />}
              <Link href="/meta" target="_blank" className="text-accent-ink font-semibold underline underline-offset-2">
                abrir na TV ↗
              </Link>
            </div>
          </div>
        </details>
        <NovaVendaButton />
      </div>

      <div className="max-[767px]:hidden max-w-[1220px] mx-auto px-6 py-2.5 flex flex-wrap items-center gap-x-6 gap-y-2">
        <div className="flex flex-col leading-tight">
          <span className="text-[10px] uppercase tracking-wide text-muted font-semibold">
            Faturamento novo do mês
          </span>
          <span className="font-display font-bold text-lg num">{brl(fat?.faturamento_novo_mes)}</span>
        </div>

        {semMeta ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted">Meta do mês ainda não definida.</span>
            {role === "master" && <DefinirMetaButton />}
          </div>
        ) : (
          <>
            <div className="flex flex-col leading-tight">
              <span className="text-[10px] uppercase tracking-wide text-muted font-semibold">Meta do mês</span>
              <span className="font-display font-bold text-lg num">{brl(fat?.valor_meta)}</span>
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-[10px] uppercase tracking-wide text-muted font-semibold">% da meta</span>
              <span
                className="font-display font-bold text-lg num"
                style={{ color: (fat?.pct_meta || 0) >= 100 ? "var(--good)" : "var(--accent-ink)" }}
              >
                {(fat?.pct_meta ?? 0).toFixed(1).replace(".", ",")}%
              </span>
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-[10px] uppercase tracking-wide text-muted font-semibold">
                Projeção (dia {fat?.dia_atual}/{fat?.dias_no_mes})
              </span>
              <span className="text-sm num text-ink-2">
                {brl(fat?.projecao_fechamento)} · {(fat?.pct_projecao ?? 0).toFixed(0)}% da meta
              </span>
            </div>
            {fat?.bonus_valor ? (
              <span className="text-xs text-good font-semibold">
                Bônus ao bater a meta: {brl(fat.bonus_valor)}
              </span>
            ) : null}
            {role === "master" && <DefinirMetaButton compact />}
          </>
        )}

        <div className="ml-auto flex items-center gap-3">
          <Link href="/meta" target="_blank" className="text-xs text-accent-ink font-semibold underline underline-offset-2">
            abrir na TV ↗
          </Link>
          <NovaVendaButton />
        </div>
      </div>
    </div>
  );
}
