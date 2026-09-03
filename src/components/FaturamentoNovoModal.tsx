"use client";

import { useState } from "react";
import type { ReceitaEvento } from "@/lib/types";
import { ValorOcultavel } from "./ValoresVisibilidade";

function brl(v: number) {
  return "R$ " + v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtData(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("pt-BR");
}

const TIPO_LABEL: Record<ReceitaEvento["tipo"], string> = {
  novo_cliente: "Novo cliente",
  upsell: "Upsell",
  downsell: "Downsell",
  consultoria: "Consultoria",
};

// Gatilho compartilhado pelo valor de "faturamento novo do mês" e pelo
// "X vendas feitas" na MetaBar — os dois vêm da mesma query de
// receita_eventos do mês, então abrem a mesma listinha por baixo.
export function FaturamentoNovoModal({
  eventos,
  children,
}: {
  eventos: ReceitaEvento[];
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const total = eventos.reduce((s, e) => s + Number(e.valor), 0);

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        className="text-left cursor-pointer hover:opacity-70 transition-opacity p-0 m-0 border-0 bg-transparent [font:inherit] [color:inherit]"
      >
        {children}
      </button>
      {open && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-[600] flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-paper border border-line rounded-xl p-6 max-w-md w-full flex flex-col gap-4 shadow-[var(--shadow)] max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col gap-1">
              <h2 className="font-display font-bold text-xl">Faturamento novo do mês</h2>
              <p className="text-xs text-muted">
                {eventos.length} {eventos.length === 1 ? "lançamento" : "lançamentos"} · total{" "}
                <ValorOcultavel>{brl(total)}</ValorOcultavel>
              </p>
            </div>

            <div className="flex flex-col gap-2">
              {eventos.map((ev) => (
                <div
                  key={ev.id}
                  className="flex justify-between items-start gap-3 text-[13px] border-b border-dashed border-line/50 pb-1.5"
                >
                  <div className="flex flex-col min-w-0">
                    <span className="truncate">{ev.descricao || TIPO_LABEL[ev.tipo]}</span>
                    <span className="text-[11px] text-muted">
                      {TIPO_LABEL[ev.tipo]} · {fmtData(ev.data)}
                    </span>
                  </div>
                  <span
                    className={`num font-semibold shrink-0 ${Number(ev.valor) < 0 ? "text-critical" : ""}`}
                  >
                    <ValorOcultavel>{brl(Number(ev.valor))}</ValorOcultavel>
                  </span>
                </div>
              ))}
              {!eventos.length && (
                <span className="text-sm text-muted">Nenhum lançamento este mês ainda.</span>
              )}
            </div>

            <button onClick={() => setOpen(false)} className="btn-primary self-end">
              Fechar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
