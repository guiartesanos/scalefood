import { requireProfile } from "@/lib/auth";
import { getClientes, brl, brlInt } from "@/lib/data";
import { canSeeFaturamentoTotalAgregado } from "@/lib/permissions";
import { DashboardFilterable } from "@/components/DashboardFilterable";

export default async function DashboardPage() {
  const profile = await requireProfile();
  const clientes = await getClientes();

  const totalRec = clientes.reduce((s, c) => s + c.rec, 0);
  const totalLiq = clientes.reduce((s, c) => s + (c.liq || 0), 0);
  const margPond = totalRec ? (totalLiq / totalRec) * 100 : 0;

  const byStatus: Record<string, typeof clientes> = {};
  clientes.forEach((c) => {
    (byStatus[c.status] = byStatus[c.status] || []).push(c);
  });

  const riskRec =
    (byStatus["Pediu pra cancelar"] || []).reduce((s, c) => s + c.rec, 0) +
    (byStatus["Onboarding urgente"] || []).reduce((s, c) => s + c.rec, 0);

  const verLucro = canSeeFaturamentoTotalAgregado(profile.role);

  return (
    <>
      {verLucro && (
        <div className="grid grid-cols-3 gap-1 bg-line border border-line rounded-xl overflow-hidden">
          <Kpi label="Clientes ativos" value={String(clientes.length)} sub={`${(byStatus["Rodando - com resultado"] || []).length} rodando com resultado`} />
          <Kpi label="Líquido mensal" value={brl(totalLiq)} sub={`${margPond.toFixed(1).replace(".", ",")}% de margem ponderada`} />
          <Kpi label="Receita em risco" value={brlInt(riskRec)} sub="cancelamento + onboarding parado" color="var(--critical)" />
        </div>
      )}

      <DashboardFilterable clientes={clientes} verLucro={verLucro} />
    </>
  );
}

function Kpi({ label, value, sub, color }: { label: string; value: string; sub: string; color?: string }) {
  return (
    <div className="bg-paper px-5 py-4 flex flex-col gap-1.5">
      <span className="text-[11.5px] uppercase tracking-wide text-muted font-semibold">{label}</span>
      <span className="font-display font-bold text-[26px] num" style={color ? { color } : undefined}>
        {value}
      </span>
      <span className="text-xs text-ink-2">{sub}</span>
    </div>
  );
}
