import type { CustoFixo } from "@/lib/types";
import { ocorrenciasNoMes } from "@/lib/data";

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function brl(v: number) {
  return "R$ " + v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function CalendarioContasPagar({ custos }: { custos: CustoFixo[] }) {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = hoje.getMonth();
  const primeiroDiaSemana = new Date(ano, mes, 1).getDay();
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();

  const porDia: Record<number, { total: number; nomes: string[] }> = {};
  custos.forEach((c) => {
    ocorrenciasNoMes(c, ano, mes).forEach((dia) => {
      if (!porDia[dia]) porDia[dia] = { total: 0, nomes: [] };
      porDia[dia].total += Number(c.valor);
      porDia[dia].nomes.push(c.nome);
    });
  });

  const celulas: (number | null)[] = [];
  for (let i = 0; i < primeiroDiaSemana; i++) celulas.push(null);
  for (let d = 1; d <= diasNoMes; d++) celulas.push(d);

  return (
    <div className="bg-paper border border-line rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-bold text-sm capitalize">
          {hoje.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
        </h3>
        <span className="text-[11px] text-muted">contas a pagar</span>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-muted font-semibold uppercase tracking-wide">
        {DIAS_SEMANA.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {celulas.map((d, i) => {
          const info = d ? porDia[d] : undefined;
          const ehHoje = d === hoje.getDate();
          return (
            <div
              key={i}
              className="aspect-square flex flex-col items-center justify-center gap-0.5 rounded-md text-[11.5px]"
              style={{ background: ehHoje ? "var(--accent-wash)" : undefined }}
              title={info ? `${info.nomes.join(", ")} — ${brl(info.total)}` : undefined}
            >
              {d && (
                <>
                  <span className={ehHoje ? "font-bold text-accent-ink" : "text-ink-2"}>{d}</span>
                  {info ? <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--critical)" }} /> : null}
                </>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-1.5 text-[11px] text-muted pt-1 border-t border-line/50">
        <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: "var(--critical)" }} />
        dia com conta a pagar
      </div>
      <div className="flex flex-col gap-1 max-h-[220px] overflow-y-auto">
        {Object.entries(porDia)
          .sort((a, b) => Number(a[0]) - Number(b[0]))
          .map(([dia, info]) => (
            <div key={dia} className="flex justify-between items-baseline text-[12px] border-b border-dashed border-line/50 pb-1">
              <span>
                <b className="num">dia {dia}</b> — {info.nomes.join(", ")}
              </span>
              <span className="num font-semibold shrink-0 ml-2">{brl(info.total)}</span>
            </div>
          ))}
        {!Object.keys(porDia).length && <span className="text-xs text-muted">Nenhuma conta com vencimento definido ainda.</span>}
      </div>
    </div>
  );
}
