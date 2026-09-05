import { ValorOcultavel } from "./ValoresVisibilidade";

// Cartão de KPI (label + número grande + linha de apoio) — reimplementado
// à mão em 5 arquivos antes disso (dashboard, financeiro, clientes,
// clientes/[id], clientes/cancelados/[id]) e já tinha divergido: as
// páginas de detalhe mostravam o número menor (20→24px) que as páginas de
// lista (22→26px), sem nenhum motivo. Fonte única agora — ver a escala de
// texto documentada em globals.css.
export function Kpi({
  label,
  value,
  sub,
  color,
  ocultavel,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
  ocultavel?: boolean;
}) {
  return (
    <div className="bg-paper px-5 py-4 flex flex-col gap-1.5">
      <span className="text-[11px] uppercase tracking-wide text-muted font-semibold">{label}</span>
      <span className="font-display font-bold text-[22px] min-[400px]:text-[26px] num break-words" style={color ? { color } : undefined}>
        {ocultavel ? <ValorOcultavel>{value}</ValorOcultavel> : value}
      </span>
      {sub && <span className="text-xs text-ink-2">{sub}</span>}
    </div>
  );
}
