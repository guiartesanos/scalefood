import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { brl, brlInt, tenureLabel, pctOf } from "@/lib/data";
import { canEditClienteValores, canSeeFaturamentoTotalAgregado } from "@/lib/permissions";
import { StatusSelect } from "@/components/StatusSelect";
import { ClienteValoresForm } from "@/components/ClienteValoresForm";
import { ValorOcultavel } from "@/components/ValoresVisibilidade";
import type { Cliente, Pagamento, Tarefa } from "@/lib/types";

const URG_CLS: Record<string, string> = { alta: "critical", media: "warning", baixa: "muted" };
const COLUNA_LABEL: Record<string, string> = { "a-fazer": "A fazer", "em-andamento": "Em andamento", feito: "Feito" };

export default async function ClienteDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: cliente } = await supabase.from("clientes_view").select("*").eq("id", id).single();
  if (!cliente) notFound();
  const c = cliente as Cliente;

  const { data: pagamentos } = await supabase
    .from("pagamentos")
    .select("*")
    .eq("cliente", c.nome)
    .order("data", { ascending: false });

  const { data: tarefas } = await supabase
    .from("tarefas")
    .select("*")
    .eq("cliente_nome", c.nome)
    .order("created_at", { ascending: false });

  const podeEditarValores = canEditClienteValores(profile.role);
  const verLucro = canSeeFaturamentoTotalAgregado(profile.role);
  const tenure = tenureLabel(c.fechamento);
  const p = pctOf(c);

  const totalConsultoria = (pagamentos || [])
    .filter((pg) => pg.tipo !== "recorrencia")
    .reduce((s, pg) => s + Number(pg.valor), 0);

  return (
    <>
      <Link href="/clientes" className="btn text-xs self-start">
        ← voltar pra Clientes
      </Link>

      <section className="bg-paper border border-accent rounded-xl p-6 flex flex-col gap-3">
        <div className="flex justify-between items-start flex-wrap gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="font-display font-extrabold text-3xl">{c.nome}</h1>
            <span className="text-sm text-ink-2">
              {c.dono} · {c.nicho} · cliente há {tenure.text}
            </span>
          </div>
          <StatusSelect clienteId={c.id} status={c.status} />
        </div>

        {c.promo_primeiro_mes_gratis && (
          <div className="bg-accent-wash border border-accent/30 rounded-lg px-3 py-2 text-[13px]">
            🎁 1º mês de Aceleração grátis — recorrência de {brl(c.rec)}/mês começa a contar em{" "}
            <b>
              {c.inicio_cobranca_recorrente
                ? new Date(c.inicio_cobranca_recorrente + "T12:00:00").toLocaleDateString("pt-BR")
                : "data não definida"}
            </b>
            .
          </div>
        )}

        {c.asaas_customer_id && (
          <span className="text-xs text-muted">Cliente Asaas: {c.asaas_customer_id}</span>
        )}
      </section>

      <div className={`grid ${verLucro ? "grid-cols-3" : "grid-cols-2"} max-[640px]:grid-cols-1 gap-1 bg-line border border-line rounded-xl overflow-hidden`}>
        <Kpi label="Recorrência" value={brl(c.rec)} sub={`taxa ${c.taxa_fonte === "real" ? "real" : "estimada"}`} ocultavel />
        {verLucro && <Kpi label="Líquido" value={c.liq != null ? brl(c.liq) : "—"} sub={c.marg != null ? `${c.marg.toFixed(1).replace(".", ",")}% de margem` : ""} color="var(--good)" ocultavel />}
        <Kpi
          label="Evolução (entrada → hoje)"
          value={c.entrada != null && c.hoje != null ? `${brlInt(c.entrada)} → ${brlInt(c.hoje)}` : "sem dado"}
          sub={p !== null ? `${p >= 0 ? "+" : ""}${p.toFixed(1).replace(".", ",")}%` : c.growth_note || ""}
          ocultavel
        />
      </div>

      {podeEditarValores && (
        <div className="self-start">
          <ClienteValoresForm cliente={c} />
        </div>
      )}

      <section className="flex flex-col gap-3.5">
        <h2 className="font-display font-bold text-[21px]">Pagamentos avulsos e consultorias</h2>
        <div className="border border-line rounded-xl overflow-auto bg-paper">
          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr className="bg-paper-2">
                <Th>Data</Th>
                <Th>Canal</Th>
                <Th>Tipo</Th>
                <Th right>Valor</Th>
              </tr>
            </thead>
            <tbody>
              {(pagamentos || []).map((pg: Pagamento) => (
                <tr key={pg.id} className="border-t border-line/50">
                  <td className="px-3 py-2">{pg.data ? new Date(pg.data + "T00:00:00").toLocaleDateString("pt-BR") : "—"}</td>
                  <td className="px-3 py-2">{pg.canal}</td>
                  <td className="px-3 py-2">{pg.tipo}</td>
                  <td className="px-3 py-2 text-right num"><ValorOcultavel>{brl(pg.valor)}</ValorOcultavel></td>
                </tr>
              ))}
              {!pagamentos?.length && (
                <tr>
                  <td colSpan={4} className="text-center text-muted py-4">
                    Nenhum pagamento avulso registrado ainda.
                  </td>
                </tr>
              )}
            </tbody>
            {!!pagamentos?.length && (
              <tfoot>
                <tr className="border-t border-line font-semibold">
                  <td colSpan={3} className="px-3 py-2">Total</td>
                  <td className="px-3 py-2 text-right num"><ValorOcultavel>{brl(totalConsultoria)}</ValorOcultavel></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>

      <section className="flex flex-col gap-3.5">
        <h2 className="font-display font-bold text-[21px]">Tarefas relacionadas</h2>
        <div className="flex flex-col gap-2">
          {(tarefas || []).map((t: Tarefa) => (
            <div key={t.id} className="bg-paper border border-line rounded-lg p-3 flex flex-col gap-1">
              <div className="flex justify-between items-start gap-2">
                <span className="font-semibold text-[13px]">{t.titulo}</span>
                <span
                  className="text-[10.5px] font-semibold px-1.5 py-0.5 rounded-full shrink-0"
                  style={{ color: `var(--${URG_CLS[t.urgencia]})` }}
                >
                  {t.urgencia}
                </span>
              </div>
              {t.descricao && <span className="text-xs text-ink-2">{t.descricao}</span>}
              <span className="text-[11px] text-muted">{COLUNA_LABEL[t.coluna]}</span>
            </div>
          ))}
          {!tarefas?.length && <span className="text-sm text-muted">Nenhuma tarefa vinculada a esse cliente.</span>}
        </div>
      </section>
    </>
  );
}

function Kpi({ label, value, sub, color, ocultavel }: { label: string; value: string; sub?: string; color?: string; ocultavel?: boolean }) {
  return (
    <div className="bg-paper px-5 py-4 flex flex-col gap-1.5">
      <span className="text-[11.5px] uppercase tracking-wide text-muted font-semibold">{label}</span>
      <span className="font-display font-bold text-[20px] min-[400px]:text-[24px] num break-words" style={color ? { color } : undefined}>
        {ocultavel ? <ValorOcultavel>{value}</ValorOcultavel> : value}
      </span>
      {sub && <span className="text-xs text-ink-2">{sub}</span>}
    </div>
  );
}

function Th({ children, right }: { children?: React.ReactNode; right?: boolean }) {
  return <th className={`px-3 py-2 text-[10.5px] uppercase tracking-wide text-muted font-semibold ${right ? "text-right" : "text-left"}`}>{children}</th>;
}
