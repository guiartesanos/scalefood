import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { FaturamentoMesAtual, UserRole } from "@/lib/types";
import { DefinirMetaButton } from "./DefinirMetaButton";
import { NovaVendaButton } from "./NovaVendaButton";
import { VisibilidadeProvider, BotaoOcultarValores, ValorOcultavel } from "./ValoresVisibilidade";

function brl(v: number | null | undefined) {
  return "R$ " + Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export async function MetaBar({ role }: { role: UserRole }) {
  const supabase = await createClient();
  const { data } = await supabase.from("faturamento_mes_atual").select("*").single();
  const fat = data as FaturamentoMesAtual | null;

  const semMeta = !fat?.valor_meta;

  return (
    <VisibilidadeProvider>
    <div className="sticky top-0 z-40 bg-paper-2 border-b border-line" style={{ boxShadow: "0 2px 10px -4px rgba(30, 27, 20, 0.18)" }}>
      <div className="hidden max-[767px]:flex items-center gap-2 px-4 py-2">
        <details className="flex-1 min-w-0">
          <summary className="cursor-pointer list-none flex items-center gap-2">
            <span className="font-display font-bold text-[15px] num truncate">
              <ValorOcultavel>{brl(fat?.faturamento_novo_mes)}</ValorOcultavel>
            </span>
            {!semMeta && (
              <>
                <span className="text-[11px] text-muted truncate">de <ValorOcultavel>{brl(fat?.valor_meta)}</ValorOcultavel></span>
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
                Projeção (dia {fat?.dia_atual}/{fat?.dias_no_mes}): <ValorOcultavel>{brl(fat?.projecao_fechamento)}</ValorOcultavel> ·{" "}
                {(fat?.pct_projecao ?? 0).toFixed(0)}% da meta
              </span>
            )}
            {!semMeta && fat?.numero_vendas != null && (
              <span className="text-ink-2">
                {fat.numero_vendas} venda{fat.numero_vendas === 1 ? "" : "s"} feita{fat.numero_vendas === 1 ? "" : "s"}
                {fat?.vendas_faltantes != null && fat.vendas_faltantes > 0 && (
                  <> · faltam ~{fat.vendas_faltantes} pro ticket médio atual</>
                )}
              </span>
            )}
            {fat?.bonus_valor ? (
              <span className="text-good font-semibold">
                Bônus ao bater a meta: <ValorOcultavel>{brl(fat.bonus_valor)}</ValorOcultavel>
              </span>
            ) : null}
            <div className="flex items-center gap-3 pt-0.5">
              <BotaoOcultarValores />
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
          <span className="font-display font-bold text-lg num">
            <ValorOcultavel>{brl(fat?.faturamento_novo_mes)}</ValorOcultavel>
          </span>
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
              <span className="font-display font-bold text-lg num">
                <ValorOcultavel>{brl(fat?.valor_meta)}</ValorOcultavel>
              </span>
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
                <ValorOcultavel>{brl(fat?.projecao_fechamento)}</ValorOcultavel> · {(fat?.pct_projecao ?? 0).toFixed(0)}% da meta
              </span>
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-[10px] uppercase tracking-wide text-muted font-semibold">Vendas</span>
              <span className="text-sm num text-ink-2">
                {fat?.numero_vendas ?? 0} feita{fat?.numero_vendas === 1 ? "" : "s"}
                {fat?.vendas_faltantes != null && fat.vendas_faltantes > 0 && <> · faltam ~{fat.vendas_faltantes}</>}
              </span>
            </div>
            {fat?.bonus_valor ? (
              <span className="text-xs text-good font-semibold">
                Bônus ao bater a meta: <ValorOcultavel>{brl(fat.bonus_valor)}</ValorOcultavel>
              </span>
            ) : null}
            {role === "master" && <DefinirMetaButton compact />}
          </>
        )}

        <div className="ml-auto flex items-center gap-3">
          <BotaoOcultarValores />
          <Link href="/meta" target="_blank" className="text-xs text-accent-ink font-semibold underline underline-offset-2">
            abrir na TV ↗
          </Link>
          <NovaVendaButton />
        </div>
      </div>
    </div>
    </VisibilidadeProvider>
  );
}
