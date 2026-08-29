import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getClientes, pctOf } from "@/lib/data";

export default async function IcpPage() {
  await requireProfile();

  const supabase = await createClient();
  const clientes = await getClientes();
  const { data: log } = await supabase.from("icp_log").select("*").order("data", { ascending: false });

  const bandOrder = ["≤25k", "26-35k", "≥40k"];
  const bandMeta: Record<string, { title: string; cls: string }> = {
    "≤25k": { title: "Entrada até R$25k/mês", cls: "good" },
    "26-35k": { title: "Entrada R$26k–35k/mês", cls: "warning" },
    "≥40k": { title: "Entrada R$40k+/mês", cls: "critical" },
  };
  const bandStats: Record<string, { n: number; hits: number; pctSum: number; names: string[] }> = {};
  clientes.filter((c) => c.band).forEach((c) => {
    const band = c.band as string;
    bandStats[band] = bandStats[band] || { n: 0, hits: 0, pctSum: 0, names: [] };
    const p = pctOf(c) ?? 0;
    bandStats[band].n++;
    if (p > 0) bandStats[band].hits++;
    bandStats[band].pctSum += p;
    bandStats[band].names.push(`${c.nome} (${p >= 0 ? "+" : ""}${p.toFixed(0)}%)`);
  });

  return (
    <>
      <div className="bg-paper border border-accent rounded-xl p-6 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wide text-good bg-good/10 w-fit px-2 py-0.5 rounded" style={{ background: "var(--good-wash)" }}>
            ICP prioritário
          </span>
          <h3 className="font-display font-extrabold text-2xl">Hamburgueria artesanal/gourmet, até 2 lojas, R$80–150k por loja/mês</h3>
          <p className="text-[13px] text-ink-2 max-w-[74ch]">
            Mesmo padrão funciona pra açaí, hot dog e nichos similares. Substitui o público de R$20–30k/mês
            como prioridade de aquisição — esse continua existindo, mas como entrada de funil.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-1 bg-line border border-line rounded-lg overflow-hidden">
          <Stat v="R$ 15.000" l="Implementação · 4 reuniões" />
          <Stat v="R$ 3.000/mês" l="Recorrente · gestão de tráfego" />
          <Stat v="< 1 semana" l="Ciclo de venda · 1 call" />
        </div>
      </div>

      <section className="flex flex-col gap-3.5">
        <h2 className="font-display font-bold text-[21px]">Como isso aparece na carteira hoje</h2>
        <div className="grid grid-cols-3 gap-3 max-[900px]:grid-cols-1">
          {bandOrder.filter((b) => bandStats[b]).map((band) => {
            const s = bandStats[band];
            const meta = bandMeta[band];
            const hitRate = Math.round((s.hits / s.n) * 100);
            const avgPct = s.pctSum / s.n;
            return (
              <div key={band} className="bg-paper border border-line rounded-xl p-4 flex flex-col gap-2" style={{ borderLeft: `4px solid var(--${meta.cls})` }}>
                <span className="font-display font-extrabold text-2xl num" style={{ color: `var(--${meta.cls})` }}>{hitRate}%</span>
                <span className="text-[11.5px] text-muted">dos clientes cresceram · média {avgPct >= 0 ? "+" : ""}{avgPct.toFixed(1).replace(".", ",")}%</span>
                <span className="font-semibold text-[13.5px]">{meta.title}</span>
                <span className="text-xs text-ink-2">{s.names.join(" · ")}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="flex flex-col gap-3.5">
        <h2 className="font-display font-bold text-[21px]">Histórico de aprendizado</h2>
        <div className="flex flex-col gap-0 border-l-2 border-line pl-4 ml-1">
          {(log || []).map((l) => (
            <div key={l.id} className="relative pb-4">
              <div className="absolute -left-[21px] top-1 w-2 h-2 rounded-full bg-accent border-2 border-paper" />
              <div className="text-[11px] text-muted num">{new Date(l.data + "T00:00:00").toLocaleDateString("pt-BR")}</div>
              <div className="font-semibold text-[13.5px]">{l.titulo}</div>
              <div className="text-xs text-ink-2 leading-relaxed">{l.detalhe}</div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function Stat({ v, l }: { v: string; l: string }) {
  return (
    <div className="bg-paper-2 px-4 py-3 flex flex-col gap-1">
      <span className="font-display font-bold text-lg num">{v}</span>
      <span className="text-[10.5px] uppercase tracking-wide text-muted font-semibold">{l}</span>
    </div>
  );
}
