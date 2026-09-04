import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getClientes, brl, brlInt, tenureLabel, pctOf, periodoLabel } from "@/lib/data";
import { StatusSelect } from "@/components/StatusSelect";
import { ClienteValoresForm } from "@/components/ClienteValoresForm";
import { ClientesKanban } from "@/components/ClientesKanban";
import { ClientesTabs } from "@/components/ClientesTabs";
import { ComercialSubNav } from "@/components/ComercialSubNav";
import { MotivoCancelamentoSelect } from "@/components/MotivoCancelamentoSelect";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { canEditClienteValores } from "@/lib/permissions";
import type { ClienteCancelado } from "@/lib/types";

export default async function ClientesPage() {
  const profile = await requireProfile();
  const clientes = await getClientes();
  const podeEditarValores = canEditClienteValores(profile.role);

  const supabase = await createClient();
  const { data: canceladosRaw } = await supabase
    .from("clientes_cancelados")
    .select("*")
    .order("ultimo_pagamento", { ascending: false });
  const cancelados = (canceladosRaw || []) as ClienteCancelado[];

  const growthSorted = [...clientes].sort((a, b) => {
    const pa = pctOf(a), pb = pctOf(b);
    if (pa === null && pb === null) return 0;
    if (pa === null) return 1;
    if (pb === null) return -1;
    return pb - pa;
  });

  const geral = (
    <>
      <section className="flex flex-col gap-3.5">
        <h2 className="font-display font-bold text-[21px]">Fluxo do projeto</h2>
        <ClientesKanban clientes={clientes} />
      </section>

      <section className="flex flex-col gap-3.5">
        <h2 className="font-display font-bold text-[21px]">Faturamento do cliente: entrada vs. hoje</h2>
        <div className="border border-line rounded-xl overflow-auto bg-paper">
          <table className="w-full min-w-[760px] text-[13px] border-collapse">
            <thead>
              <tr className="bg-paper-2">
                <Th>Cliente</Th><Th>Status</Th><Th>Nicho</Th><Th>Cliente desde</Th><Th right>Entrada</Th><Th right>Hoje</Th><Th>Evolução</Th>
                {podeEditarValores && <Th>Valores</Th>}
              </tr>
            </thead>
            <tbody>
              {growthSorted.map((c) => {
                const tenure = tenureLabel(c.fechamento);
                const p = pctOf(c);
                let badge: string;
                if (c.growth_note === "zero_base") badge = `do zero → ${brlInt(c.hoje)}`;
                else if (c.growth_note === "nao_iniciado") badge = "parado — onboarding não iniciado";
                else if (c.growth_note === "estagnado") badge = "0% — estagnado";
                else if (c.growth_note === "sem_dado" || c.entrada == null) badge = "sem dado";
                else badge = `${(p ?? 0) >= 0 ? "+" : ""}${(p ?? 0).toFixed(1).replace(".", ",")}%`;
                return (
                  <tr key={c.id} className="border-t border-line/50">
                    <td className="px-3 py-2">
                      <div className="flex flex-col">
                        <Link href={`/clientes/${c.id}`} className="font-bold hover:text-accent-ink hover:underline self-start">
                          {c.nome}
                        </Link>
                        <span className="text-[11px] text-muted">{c.dono}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2"><StatusSelect clienteId={c.id} status={c.status} /></td>
                    <td className="px-3 py-2">{c.nicho}</td>
                    <td className="px-3 py-2 num">{tenure.text}</td>
                    <td className="px-3 py-2 text-right num">{c.entrada != null ? brlInt(c.entrada) : "—"}</td>
                    <td className="px-3 py-2 text-right num">{c.hoje != null ? brlInt(c.hoje) : "—"}</td>
                    <td className="px-3 py-2">{badge}</td>
                    {podeEditarValores && (
                      <td className="px-3 py-2">
                        <ClienteValoresForm cliente={c} />
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );

  const totalRecebidoCancelados = cancelados.reduce((s, c) => s + Number(c.total_recebido), 0);
  const semMotivo = cancelados.filter((c) => !c.motivo).length;

  const canceladosView = (
    <section className="flex flex-col gap-3.5">
      <div>
        <h2 className="font-display font-bold text-[21px]">Clientes cancelados</h2>
        <p className="text-[13px] text-muted">
          Puxado do Asaas: quem já pagou algo mas não tem mais nenhuma recorrência ativa. Não inclui
          cancelamentos de antes do Asaas (ex: pagamentos recebidos direto por PIX/transferência).
        </p>
      </div>
      <div className="grid grid-cols-3 max-[640px]:grid-cols-1 gap-1 bg-line border border-line rounded-xl overflow-hidden">
        <Kpi label="Clientes cancelados" value={String(cancelados.length)} sub="com pagamento confirmado no Asaas" />
        <Kpi label="Total recebido (histórico)" value={brl(totalRecebidoCancelados)} sub="soma de tudo que pagaram antes de cancelar" />
        <Kpi label="Sem motivo definido" value={String(semMotivo)} sub="ainda precisa classificar" color={semMotivo ? "var(--critical)" : undefined} />
      </div>
      <div className="border border-line rounded-xl overflow-auto bg-paper">
        <table className="w-full min-w-[900px] text-[13px] border-collapse">
          <thead>
            <tr className="bg-paper-2">
              <Th>Cliente</Th><Th>Nicho</Th><Th>Dono</Th><Th>Tempo ativo</Th><Th right>Total recebido</Th><Th>Último pagamento</Th><Th>Motivo do cancelamento</Th><Th>Reativar</Th>
            </tr>
          </thead>
          <tbody>
            {cancelados.map((c) => (
              <tr key={c.id} className="border-t border-line/50 hover:bg-paper-2/60">
                <td className="px-3 py-2 font-semibold">
                  <Link href={`/clientes/cancelados/${c.id}`} className="hover:text-accent-ink hover:underline">
                    {c.nome}
                  </Link>
                </td>
                <td className="px-3 py-2">{c.nicho || "—"}</td>
                <td className="px-3 py-2">{c.dono || "—"}</td>
                <td className="px-3 py-2 num">{periodoLabel(c.primeiro_pagamento, c.ultimo_pagamento)}</td>
                <td className="px-3 py-2 text-right num">{brl(c.total_recebido)}</td>
                <td className="px-3 py-2 num">
                  {c.ultimo_pagamento ? new Date(c.ultimo_pagamento + "T12:00:00").toLocaleDateString("pt-BR") : "—"}
                </td>
                <td className="px-3 py-2">
                  <MotivoCancelamentoSelect id={c.id} motivo={c.motivo} />
                </td>
                <td className="px-3 py-2">
                  <WhatsAppButton telefone={c.telefone} nome={c.nome} compact />
                </td>
              </tr>
            ))}
            {!cancelados.length && (
              <tr><td colSpan={8} className="text-center text-muted py-4">Nenhum cliente cancelado encontrado no Asaas.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );

  return (
    <>
      <ComercialSubNav />
      <ClientesTabs geral={geral} cancelados={canceladosView} totalCancelados={cancelados.length} />
    </>
  );
}

function Kpi({ label, value, sub, color }: { label: string; value: string; sub: string; color?: string }) {
  return (
    <div className="bg-paper px-5 py-4 flex flex-col gap-1.5">
      <span className="text-[11.5px] uppercase tracking-wide text-muted font-semibold">{label}</span>
      <span className="font-display font-bold text-[22px] min-[400px]:text-[26px] num break-words" style={{ color }}>{value}</span>
      <span className="text-xs text-ink-2">{sub}</span>
    </div>
  );
}
function Th({ children, right }: { children?: React.ReactNode; right?: boolean }) {
  return <th className={`px-3 py-2 text-[10.5px] uppercase tracking-wide text-muted font-semibold ${right ? "text-right" : "text-left"}`}>{children}</th>;
}
