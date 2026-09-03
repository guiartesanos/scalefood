import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getClientes, brl, brlInt } from "@/lib/data";
import { canSeeFaturamentoTotalAgregado } from "@/lib/permissions";
import { DashboardFilterable } from "@/components/DashboardFilterable";
import { ValorOcultavel } from "@/components/ValoresVisibilidade";

export default async function DashboardPage() {
  const profile = await requireProfile();
  const clientes = await getClientes();

  const totalRec = clientes.reduce((s, c) => s + c.rec, 0);
  const ticketMedio = clientes.length ? totalRec / clientes.length : 0;

  // mesma conta da aba Financeiro: recorrência de todos os clientes +
  // consultorias/avulsos já recebidos (histórico completo)
  const supabase = await createClient();
  const { data: pagamentos } = await supabase.from("pagamentos").select("valor, tipo");
  const faturamentoAvulso = (pagamentos || [])
    .filter((p) => p.tipo !== "recorrencia")
    .reduce((s, p) => s + Number(p.valor), 0);
  const faturamentoTotal = totalRec + faturamentoAvulso;

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
        <div className="grid grid-cols-4 max-[900px]:grid-cols-2 max-[640px]:grid-cols-1 gap-1 bg-line border border-line rounded-xl overflow-hidden">
          <Kpi label="Faturamento total" value={brl(faturamentoTotal)} sub="recorrência mensal + consultorias já recebidas" ocultavel />
          <Kpi label="Ticket médio" value={brl(ticketMedio)} sub="recorrência média por cliente ativo" />
          <Kpi label="Clientes ativos" value={String(clientes.length)} sub={`${(byStatus["Rodando - com resultado"] || []).length} rodando com resultado`} />
          <Kpi label="Receita em risco" value={brlInt(riskRec)} sub="cancelamento + onboarding parado" color="var(--critical)" ocultavel />
        </div>
      )}

      <DashboardFilterable clientes={clientes} verLucro={verLucro} />
    </>
  );
}

function Kpi({ label, value, sub, color, ocultavel }: { label: string; value: string; sub: string; color?: string; ocultavel?: boolean }) {
  return (
    <div className="bg-paper px-5 py-4 flex flex-col gap-1.5">
      <span className="text-[11.5px] uppercase tracking-wide text-muted font-semibold">{label}</span>
      <span className="font-display font-bold text-[22px] min-[400px]:text-[26px] num break-words" style={color ? { color } : undefined}>
        {ocultavel ? <ValorOcultavel>{value}</ValorOcultavel> : value}
      </span>
      <span className="text-xs text-ink-2">{sub}</span>
    </div>
  );
}
