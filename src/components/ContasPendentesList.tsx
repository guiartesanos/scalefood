import { MarcarPagoButton, DesmarcarPagoButton } from "@/components/MarcarPagoButton";
import type { ContaPendente } from "@/lib/pendencias";

function brl(v: number) {
  return "R$ " + v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtData(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("pt-BR");
}

export interface ContaPaga {
  custoFixoId: string;
  nome: string;
  valor: number;
  data: string;
}

export function ContasPendentesList({ pendentes, pagas }: { pendentes: ContaPendente[]; pagas: ContaPaga[] }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        {pendentes.map((c) => (
          <div
            key={`${c.custoFixoId}-${c.data}`}
            className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 border"
            style={
              c.hoje
                ? { borderColor: "var(--critical)", background: "color-mix(in srgb, var(--critical) 8%, var(--paper))" }
                : c.atrasada
                  ? { borderColor: "var(--warning)", background: "var(--paper-2)" }
                  : { borderColor: "var(--line)", background: "var(--paper)" }
            }
          >
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="font-semibold text-[13px] truncate">{c.nome}</span>
              <span className="text-[11.5px] text-muted">
                vence {fmtData(c.data)}
                {c.hoje && <b className="text-critical"> · vence hoje</b>}
                {c.atrasada && <b style={{ color: "var(--warning)" }}> · atrasada</b>}
              </span>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <span className="num font-semibold text-[13px]">{brl(c.valor)}</span>
              <MarcarPagoButton custoFixoId={c.custoFixoId} data={c.data} />
            </div>
          </div>
        ))}
        {!pendentes.length && (
          <p className="text-sm text-muted py-2">Nenhuma conta pendente esse mês — tudo pago 🎉</p>
        )}
      </div>

      {!!pagas.length && (
        <details className="text-[12.5px]">
          <summary className="cursor-pointer text-muted font-semibold select-none">
            pagas esse mês ({pagas.length})
          </summary>
          <div className="flex flex-col gap-1.5 pt-2">
            {pagas.map((c) => (
              <div key={`${c.custoFixoId}-${c.data}`} className="flex items-center justify-between gap-3 px-3 py-1.5 rounded-md bg-paper-2">
                <span className="text-ink-2">
                  {c.nome} <span className="text-muted">· paga em {fmtData(c.data)}</span>
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="num text-ink-2">{brl(c.valor)}</span>
                  <DesmarcarPagoButton custoFixoId={c.custoFixoId} data={c.data} />
                </div>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
