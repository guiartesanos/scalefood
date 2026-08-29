import { requireProfile } from "@/lib/auth";
import { getClientes, brl, brlInt } from "@/lib/data";
import { StatusSelect } from "@/components/StatusSelect";
import { canSeeFaturamentoTotalAgregado } from "@/lib/permissions";
import type { ClienteStatus } from "@/lib/types";
import Link from "next/link";

const STATUS_ORDER: ClienteStatus[] = [
  "Rodando - com resultado",
  "Rodando - sem resultado ainda",
  "Onboarding urgente",
  "Pediu pra cancelar",
];

const STATUS_DESC: Record<ClienteStatus, string> = {
  "Rodando - com resultado": "Tráfego rodando, cardápio implementado, já dando resultado.",
  "Rodando - sem resultado ainda": "No ar, mas ainda sem resultado consolidado — acompanhar de perto.",
  "Onboarding urgente": "Não começamos — pendência urgente de onboarding.",
  "Pediu pra cancelar": "Cliente pediu cancelamento — este é o último mês de cobrança.",
};

const STATUS_CLS: Record<ClienteStatus, string> = {
  "Rodando - com resultado": "good",
  "Rodando - sem resultado ainda": "warning",
  "Onboarding urgente": "serious",
  "Pediu pra cancelar": "critical",
};

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

  const niches: Record<string, { rec: number; n: number }> = {};
  clientes.forEach((c) => {
    niches[c.nicho] = niches[c.nicho] || { rec: 0, n: 0 };
    niches[c.nicho].rec += c.rec;
    niches[c.nicho].n += 1;
  });
  const maxRec = Math.max(...Object.values(niches).map((v) => v.rec), 1);

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

      <section className="flex flex-col gap-3.5">
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <h2 className="font-display font-bold text-[21px]">Status da operação</h2>
          <span className="text-[13px] text-muted">troque o status direto na tabela abaixo</span>
        </div>
        <div className="grid grid-cols-4 gap-3 max-[900px]:grid-cols-2 max-[560px]:grid-cols-1">
          {STATUS_ORDER.filter((s) => byStatus[s]?.length).map((s) => {
            const list = byStatus[s];
            const rec = list.reduce((sum, c) => sum + c.rec, 0);
            const liq = list.reduce((sum, c) => sum + (c.liq || 0), 0);
            return (
              <div
                key={s}
                className="bg-paper border border-line rounded-xl p-4 flex flex-col gap-2"
                style={{ borderLeft: `4px solid var(--${STATUS_CLS[s]})` }}
              >
                <div className="flex items-baseline justify-between">
                  <span className="font-display font-extrabold text-[28px] num" style={{ color: `var(--${STATUS_CLS[s]})` }}>
                    {list.length}
                  </span>
                  <span className="text-[11.5px] text-muted num">
                    {Math.round((list.length / clientes.length) * 100)}% da carteira
                  </span>
                </div>
                <span className="font-semibold text-[13.5px]">{s}</span>
                {verLucro && (
                  <span className="text-[11.5px] text-muted num">
                    {brlInt(rec)} recorrência · {brlInt(liq)} líquido
                  </span>
                )}
                <span className="text-xs text-ink-2 leading-snug">{STATUS_DESC[s]}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="flex flex-col gap-3.5">
        <h2 className="font-display font-bold text-[21px]">Clientes ativos</h2>
        <div className="border border-line rounded-xl overflow-auto bg-paper">
          <table className="w-full min-w-[720px] text-[13px] border-collapse">
            <thead>
              <tr className="bg-paper-2">
                <Th>#</Th>
                <Th>Cliente</Th>
                <Th>Status</Th>
                <Th>Nicho</Th>
                <Th right>Recorrência</Th>
                {verLucro && <Th right>Líquido</Th>}
              </tr>
            </thead>
            <tbody>
              {clientes.map((c) => (
                <tr key={c.id} className="border-t border-line/50 hover:bg-paper-2">
                  <td className="px-3 py-2.5 num">{c.n}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-col">
                      <b className="text-[13px]">{c.nome}</b>
                      <span className="text-[11px] text-muted">{c.dono}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <StatusSelect clienteId={c.id} status={c.status} />
                  </td>
                  <td className="px-3 py-2.5">{c.nicho}</td>
                  <td className="px-3 py-2.5 text-right num">{brl(c.rec)}</td>
                  {verLucro && <td className="px-3 py-2.5 text-right num">{c.liq != null ? brl(c.liq) : "—"}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Link href="/clientes" className="text-sm text-accent-ink hover:underline self-start">
          ver detalhes e evolução de cada cliente →
        </Link>
      </section>

      <section className="flex flex-col gap-3.5">
        <h2 className="font-display font-bold text-[21px]">Recorrência por nicho</h2>
        <div className="flex flex-col gap-2.5 bg-paper border border-line rounded-xl p-4">
          {Object.entries(niches)
            .sort((a, b) => b[1].rec - a[1].rec)
            .map(([name, v]) => (
              <div key={name} className="grid grid-cols-[140px_1fr_92px] items-center gap-3">
                <span className="text-[13px] font-medium">
                  {name}
                  <span className="block text-[11px] text-muted">{v.n} cliente{v.n > 1 ? "s" : ""}</span>
                </span>
                <div className="h-[15px] rounded bg-paper-2 border border-line/50 overflow-hidden">
                  <div
                    className="h-full rounded"
                    style={{ width: `${(v.rec / maxRec) * 100}%`, background: "linear-gradient(90deg, var(--accent), var(--accent-ink))" }}
                  />
                </div>
                <span className="text-right text-xs num text-ink-2">{brlInt(v.rec)}</span>
              </div>
            ))}
        </div>
      </section>
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

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th className={`px-3 py-2.5 text-[10.5px] uppercase tracking-wide text-muted font-semibold ${right ? "text-right" : "text-left"}`}>
      {children}
    </th>
  );
}
