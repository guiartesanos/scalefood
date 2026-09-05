import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { brl, periodoLabel, fmtData as fmtDataBase } from "@/lib/data";
import { listarPagamentosAsaas } from "@/lib/asaas";
import { MotivoCancelamentoSelect } from "@/components/MotivoCancelamentoSelect";
import { ClienteCanceladoEditForm } from "@/components/ClienteCanceladoEditForm";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { Kpi } from "@/components/Kpi";
import type { ClienteCancelado } from "@/lib/types";

function fmtData(d: string | null) {
  return fmtDataBase(d) ?? "—";
}

const STATUS_LABEL: Record<string, string> = {
  RECEIVED: "Recebido",
  RECEIVED_IN_CASH: "Recebido (dinheiro)",
  CONFIRMED: "Confirmado",
  PENDING: "Pendente",
  OVERDUE: "Vencido",
  REFUNDED: "Estornado",
};

export default async function ClienteCanceladoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireProfile();
  const supabase = await createClient();

  const { data: cliente } = await supabase.from("clientes_cancelados").select("*").eq("id", id).single();
  if (!cliente) notFound();
  const c = cliente as ClienteCancelado;

  let pagamentos: Awaited<ReturnType<typeof listarPagamentosAsaas>> = [];
  let erroAsaas: string | null = null;
  if (c.asaas_customer_id) {
    try {
      pagamentos = await listarPagamentosAsaas(c.asaas_customer_id);
      pagamentos.sort((a, b) => (b.paymentDate || b.dueDate).localeCompare(a.paymentDate || a.dueDate));
    } catch (e) {
      erroAsaas = e instanceof Error ? e.message : "Erro ao buscar pagamentos no Asaas.";
    }
  }

  return (
    <>
      <Link href="/clientes" className="btn text-xs self-start">
        ← voltar pra Clientes
      </Link>

      <section className="bg-paper border border-critical/40 rounded-lg p-6 flex flex-col gap-3">
        <div className="flex justify-between items-start flex-wrap gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="font-display font-extrabold text-3xl">{c.nome}</h1>
            <span className="text-sm text-ink-2">
              {c.dono || "sem dono definido"} · {c.nicho || "sem nicho definido"} · ficou ativo{" "}
              {periodoLabel(c.primeiro_pagamento, c.ultimo_pagamento)}
            </span>
          </div>
          <WhatsAppButton telefone={c.telefone} nome={c.nome} />
        </div>
        {c.asaas_customer_id && <span className="text-xs text-muted">Cliente Asaas: {c.asaas_customer_id}</span>}
      </section>

      <div className="grid grid-cols-4 max-[760px]:grid-cols-2 gap-1 bg-line border border-line rounded-lg overflow-hidden">
        <Kpi label="Total recebido" value={brl(c.total_recebido)} />
        <Kpi label="Tempo ativo" value={periodoLabel(c.primeiro_pagamento, c.ultimo_pagamento)} sub="1º até último pagamento" />
        <Kpi label="1º pagamento" value={fmtData(c.primeiro_pagamento)} />
        <Kpi label="Último pagamento" value={fmtData(c.ultimo_pagamento)} />
      </div>

      <section className="flex flex-col gap-3.5">
        <h2 className="font-display font-bold text-[21px]">Motivo do cancelamento</h2>
        <div className="self-start">
          <MotivoCancelamentoSelect id={c.id} motivo={c.motivo} />
        </div>
      </section>

      <ClienteCanceladoEditForm cliente={c} />

      <section className="flex flex-col gap-3.5">
        <h2 className="font-display font-bold text-[21px]">Histórico de pagamentos (Asaas)</h2>
        {erroAsaas && <p className="text-critical text-sm">{erroAsaas}</p>}
        <div className="border border-line rounded-lg overflow-auto bg-paper">
          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr className="bg-paper-2">
                <Th>Data</Th>
                <Th>Descrição</Th>
                <Th>Forma</Th>
                <Th>Status</Th>
                <Th right>Valor</Th>
              </tr>
            </thead>
            <tbody>
              {pagamentos.map((pg) => (
                <tr key={pg.id} className="border-t border-line/50">
                  <td className="px-3 py-2">{fmtData(pg.paymentDate || pg.dueDate)}</td>
                  <td className="px-3 py-2">{pg.description || "—"}</td>
                  <td className="px-3 py-2">{pg.billingType}</td>
                  <td className="px-3 py-2">{STATUS_LABEL[pg.status] || pg.status}</td>
                  <td className="px-3 py-2 text-right num">{brl(pg.value)}</td>
                </tr>
              ))}
              {!pagamentos.length && !erroAsaas && (
                <tr>
                  <td colSpan={5} className="text-center text-muted py-4">
                    Nenhum pagamento encontrado no Asaas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function Th({ children, right }: { children?: React.ReactNode; right?: boolean }) {
  return <th className={`px-3 py-2 text-[10.5px] uppercase tracking-wide text-muted font-semibold ${right ? "text-right" : "text-left"}`}>{children}</th>;
}
