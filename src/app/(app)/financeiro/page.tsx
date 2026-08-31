import { requireProfile } from "@/lib/auth";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getClientes, brl, brlInt } from "@/lib/data";
import { canSeeLucro } from "@/lib/permissions";
import { CATEGORIAS_CUSTO } from "@/lib/types";
import {
  criarCustoFixo,
  removerCustoFixo,
  criarCustoVariavel,
  removerCustoVariavel,
  removerPagamento,
} from "@/actions/financeiro";
import { ConfirmarExclusao } from "@/components/ConfirmarExclusao";
import { FinanceiroTabs } from "@/components/FinanceiroTabs";
import { VisibilidadeProvider, BotaoOcultarValores, ValorOcultavel } from "@/components/ValoresVisibilidade";
import { CalendarioRecebiveis } from "@/components/CalendarioRecebiveis";
import { CalendarioContasPagar } from "@/components/CalendarioContasPagar";
import { EditarCustoFixoButton } from "@/components/EditarCustoFixoButton";
import { NovaVendaButton } from "@/components/NovaVendaButton";
import { GrowthChart } from "@/components/GrowthChart";
import { ContasPendentesList, type ContaPaga } from "@/components/ContasPendentesList";
import { getContasPendentes } from "@/lib/pendencias";
import type { CustoFixo } from "@/lib/types";

const MES_NOME = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export default async function FinanceiroPage() {
  const profile = await requireProfile();

  // Bloqueio no SERVIDOR — não é só o link escondido no menu. Alguém
  // digitando /financeiro direto na barra de endereço, sendo comercial,
  // é jogado de volta pro dashboard antes de qualquer dado ser buscado.
  if (profile.role === "comercial") redirect("/dashboard");

  const supabase = await createClient();
  const clientes = await getClientes();
  const { data: custosFixosRaw } = await supabase.from("custos_fixos").select("*").order("data");
  const custosFixos = custosFixosRaw as CustoFixo[] | null;
  const { data: custosVar } = await supabase.from("custos_variaveis_extra").select("*").order("created_at");
  const { data: pagamentos } = await supabase.from("pagamentos").select("*").order("data", { ascending: false });
  const { data: historicoMensal } = await supabase
    .from("faturamento_mensal_historico")
    .select("*")
    .order("ano")
    .order("mes");
  const { data: faturamentoAtual } = await supabase.from("faturamento_mes_atual").select("*").single();

  const contasPendentes = await getContasPendentes();
  const hoje = new Date();
  const inicioMesStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-01`;
  const { data: pagosRaw } = await supabase
    .from("custos_fixos_pagamentos")
    .select("custo_fixo_id, data")
    .gte("data", inicioMesStr)
    .order("data", { ascending: false });
  const custosFixosPorId = new Map((custosFixosRaw as CustoFixo[] | null || []).map((c) => [c.id, c]));
  const contasPagas: ContaPaga[] = (pagosRaw || [])
    .map((p) => {
      const c = custosFixosPorId.get(p.custo_fixo_id);
      return c ? { custoFixoId: p.custo_fixo_id, nome: c.nome, valor: Number(c.valor), data: p.data } : null;
    })
    .filter((x): x is ContaPaga => x !== null);

  const faturamentoRecorrente = clientes.reduce((s, c) => s + c.rec, 0);
  const faturamentoAvulso = (pagamentos || [])
    .filter((p) => p.tipo !== "recorrencia")
    .reduce((s, p) => s + Number(p.valor), 0);
  const faturamentoTotal = faturamentoRecorrente + faturamentoAvulso;

  const trafegoTotal = clientes.reduce((s, c) => s + c.traf, 0);
  const comissaoTotal = clientes.reduce((s, c) => s + c.com, 0);
  const impostoTotal = clientes.reduce((s, c) => s + c.imp, 0);
  const taxaTotal = clientes.reduce((s, c) => s + (c.taxa || 0), 0);
  const custosVarExtraTotal = (custosVar || []).reduce((s, c) => s + Number(c.valor), 0);
  const custosVariaveis = trafegoTotal + comissaoTotal + impostoTotal + taxaTotal + custosVarExtraTotal;
  const custosFixosTotal = (custosFixos || []).reduce((s, c) => s + Number(c.valor), 0);
  const lucro = faturamentoTotal - custosVariaveis - custosFixosTotal;
  const verLucro = canSeeLucro(profile.role);

  // custos variáveis históricos: reconstruídos a partir da data real de
  // entrada de cada cliente (só conta quem já tinha fechado naquele mês),
  // usando os valores atuais de tráfego/comissão/imposto/taxa de cada um —
  // não temos um histórico mês a mês desses valores, então isso é a melhor
  // aproximação real disponível (não é inventado, vem do fechamento real).
  function custosVariaveisAte(ano: number, mes: number): number {
    const fimDoMes = new Date(ano, mes, 0);
    return clientes
      .filter((c) => c.fechamento && new Date(c.fechamento + "T00:00:00") <= fimDoMes)
      .reduce((s, c) => s + c.traf + c.com + c.imp + (c.taxa || 0), 0);
  }

  const agoraChart = new Date();
  // se o mês atual já foi "fechado" em faturamento_mensal_historico
  // (ex: closamos agosto no dia 31), não duplica ele como "ao vivo" —
  // o valor congelado (Asaas + PIX/manual) é mais confiável que o
  // faturamento_novo_mes (que só conta evento novo de receita, não o
  // total recebido no mês).
  const mesAtualJaFechado = (historicoMensal || []).some(
    (h) => h.ano === agoraChart.getFullYear() && h.mes === agoraChart.getMonth() + 1
  );
  const pontosMensal = [
    ...(historicoMensal || []).map((h) => ({
      label: `${MES_NOME[h.mes - 1].slice(0, 3)}/${String(h.ano).slice(2)}`,
      faturamento: Number(h.faturamento),
      custosFixos: Number(h.custos_fixos),
      custosVariaveis: custosVariaveisAte(h.ano, h.mes),
      lucro: Number(h.faturamento) - Number(h.custos_fixos) - custosVariaveisAte(h.ano, h.mes),
    })),
    ...(mesAtualJaFechado
      ? []
      : [
          {
            label: `${MES_NOME[agoraChart.getMonth()].slice(0, 3)}/${String(agoraChart.getFullYear()).slice(2)}`,
            faturamento: Number(faturamentoAtual?.faturamento_novo_mes || 0),
            custosFixos: custosFixosTotal,
            custosVariaveis,
            lucro: Number(faturamentoAtual?.faturamento_novo_mes || 0) - custosFixosTotal - custosVariaveis,
          },
        ]),
  ];

  // Wrappers void — <form action> do React só aceita (fd) => void |
  // Promise<void>, e as Server Actions abaixo retornam {error}/{success}
  // pra quando são chamadas de componentes client (com feedback de
  // erro). Esses forms aqui são simples o bastante pra não precisar de
  // feedback inline.
  async function handleCriarCustoFixo(fd: FormData) {
    "use server";
    await criarCustoFixo(fd);
  }
  async function handleCriarCustoVariavel(fd: FormData) {
    "use server";
    await criarCustoVariavel(fd);
  }
  const TIPO_LABEL: Record<string, string> = { recorrencia: "Aceleração", consultoria: "Consultoria", avulso: "Avulso" };

  const geral = (
    <VisibilidadeProvider>
      <div className="bg-paper border border-accent rounded-xl p-5 flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11.5px] uppercase tracking-wide text-accent-ink font-semibold">
            Faturamento total
          </span>
          <BotaoOcultarValores />
        </div>
        <span className="font-display font-extrabold text-[40px] num">
          <ValorOcultavel>{brl(faturamentoTotal)}</ValorOcultavel>
        </span>
        <span className="text-[13px] text-ink-2">
          {brlInt(faturamentoRecorrente)} recorrência mensal de todos os clientes ativos ·{" "}
          {brlInt(faturamentoAvulso)} em consultorias já recebidas (histórico completo)
        </span>
        <span className="text-[11px] text-muted">
          Diferente do &quot;Faturamento novo do mês&quot; lá em cima, que conta só o que entrou de receita
          neste mês.
        </span>
      </div>

      <div className={`grid ${verLucro ? "grid-cols-3" : "grid-cols-2"} max-[640px]:grid-cols-1 gap-1 bg-line border border-line rounded-xl overflow-hidden`}>
        <Kpi label="Custos fixos" value={brlInt(custosFixosTotal)} sub={`${custosFixos?.length || 0} lançamento(s)`} color="var(--critical)" />
        <Kpi label="Custos variáveis" value={brlInt(custosVariaveis)} sub="tráfego + comissão + imposto + taxa + extras" color="var(--critical)" />
        {verLucro && <Kpi label="Lucro estimado" value={brl(lucro)} sub="faturamento − custos fixos − variáveis" color="var(--good)" />}
      </div>

      {verLucro && (
        <div className="flex flex-col gap-2">
          <h3 className="font-display font-bold text-base">Crescimento mês a mês</h3>
          <GrowthChart pontos={pontosMensal} />
        </div>
      )}
    </VisibilidadeProvider>
  );

  const RECORRENCIA_LABEL: Record<string, string> = { mensal: "Mensal", semanal: "Semanal", pontual: "Pontual" };

  const pagar = (
    <>
      <section className="flex flex-col gap-3.5">
        <div className="flex items-center gap-2">
          <h2 className="font-display font-bold text-[21px]">Contas vencendo (hoje / amanhã)</h2>
          {!!contasPendentes.length && (
            <span
              className="text-[11px] font-bold text-white rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center"
              style={{ background: "var(--critical)" }}
            >
              {contasPendentes.length}
            </span>
          )}
        </div>
        <ContasPendentesList pendentes={contasPendentes} pagas={contasPagas} />
      </section>

      <section className="grid grid-cols-[1fr_320px] gap-4 max-[900px]:grid-cols-1">
        <div className="flex flex-col gap-3.5">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold text-[21px]">Custos fixos (gerenciar)</h2>
          </div>
          <form action={handleCriarCustoFixo} className="bg-paper-2 border border-dashed border-line rounded-xl p-4 flex flex-wrap gap-3 items-end">
            <FieldSmall label="Nome"><input name="nome" required className="input" placeholder="Ex: aluguel, ferramenta" /></FieldSmall>
            <FieldSmall label="Valor mensal (R$)"><input name="valor" type="number" step="0.01" min="0" required className="input" /></FieldSmall>
            <FieldSmall label="Categoria">
              <select name="categoria" className="input">
                {CATEGORIAS_CUSTO.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </FieldSmall>
            <FieldSmall label="Data de vencimento"><input name="data" type="date" required className="input" /></FieldSmall>
            <FieldSmall label="Recorrência">
              <select name="recorrencia" className="input" defaultValue="mensal">
                <option value="mensal">Mensal (dia fixo do mês)</option>
                <option value="semanal">Semanal (dia fixo da semana)</option>
                <option value="pontual">Pontual (só essa data)</option>
              </select>
            </FieldSmall>
            <button type="submit" className="btn-primary">+ adicionar</button>
          </form>
          <div className="border border-line rounded-xl overflow-auto bg-paper">
            <table className="w-full text-[13px] border-collapse">
              <thead><tr className="bg-paper-2"><Th>Nome</Th><Th>Categoria</Th><Th>Vencimento</Th><Th right>Valor</Th><Th></Th></tr></thead>
              <tbody>
                {(custosFixos || []).map((c) => (
                  <tr key={c.id} className="border-t border-line/50">
                    <td className="px-3 py-2">{c.nome}</td>
                    <td className="px-3 py-2">{c.categoria || "—"}</td>
                    <td className="px-3 py-2 text-ink-2">
                      {RECORRENCIA_LABEL[c.recorrencia] || c.recorrencia}
                      {c.recorrencia === "mensal" && ` · dia ${new Date(c.data + "T12:00:00").getDate()}`}
                      {c.recorrencia === "semanal" && ` · ${new Date(c.data + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long" })}`}
                      {c.recorrencia === "pontual" && ` · ${new Date(c.data + "T12:00:00").toLocaleDateString("pt-BR")}`}
                    </td>
                    <td className="px-3 py-2 text-right num">{brl(c.valor)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <EditarCustoFixoButton custo={c} />{" "}
                      <ConfirmarExclusao
                        itemLabel={`o custo fixo "${c.nome}"`}
                        acao={removerCustoFixo.bind(null, c.id)}
                        senha
                        userEmail={profile.email}
                      />
                    </td>
                  </tr>
                ))}
                {!custosFixos?.length && (
                  <tr><td colSpan={5} className="text-center text-muted py-4">Nenhum custo fixo lançado ainda.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="flex flex-col gap-3.5">
          <h2 className="font-display font-bold text-[21px] opacity-0 select-none max-[900px]:hidden">.</h2>
          <CalendarioContasPagar custos={custosFixos || []} />
        </div>
      </section>

      <section className="flex flex-col gap-3.5">
        <h2 className="font-display font-bold text-[21px]">Custos variáveis</h2>
        <form action={handleCriarCustoVariavel} className="bg-paper-2 border border-dashed border-line rounded-xl p-4 flex flex-wrap gap-3 items-end">
          <FieldSmall label="Nome"><input name="nome" required className="input" placeholder="Ex: comissão avulsa" /></FieldSmall>
          <FieldSmall label="Valor (R$)"><input name="valor" type="number" step="0.01" min="0" required className="input" /></FieldSmall>
          <FieldSmall label="Categoria">
            <select name="categoria" className="input">
              {CATEGORIAS_CUSTO.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </FieldSmall>
          <FieldSmall label="Cliente (opcional)"><input name="cliente" className="input" /></FieldSmall>
          <button type="submit" className="btn-primary">+ adicionar</button>
        </form>
        <div className="grid grid-cols-2 gap-4 max-[900px]:grid-cols-1">
          <div className="bg-paper border border-line rounded-xl p-4 flex flex-col gap-2">
            <h3 className="text-xs uppercase tracking-wide text-muted font-semibold">Automáticos (da carteira)</h3>
            <Row label="Tráfego pago (repasse Jota)" value={brl(trafegoTotal)} />
            <Row label="Comissão / repasse" value={brl(comissaoTotal)} />
            <Row label="Imposto" value={brl(impostoTotal)} />
            <Row label="Taxa de plataforma (Asaas)" value={brl(taxaTotal)} />
          </div>
          <div className="bg-paper border border-line rounded-xl p-4 flex flex-col gap-2">
            <h3 className="text-xs uppercase tracking-wide text-muted font-semibold">Lançados manualmente</h3>
            {(custosVar || []).map((c) => (
              <div key={c.id} className="flex justify-between items-center text-[13px] border-b border-dashed border-line/50 pb-1">
                <span>
                  {c.nome} {c.categoria && <span className="text-muted text-xs">· {c.categoria}</span>}
                  {c.cliente && ` (${c.cliente})`}{" "}
                  <ConfirmarExclusao
                    itemLabel={`o custo variável "${c.nome}"`}
                    acao={removerCustoVariavel.bind(null, c.id)}
                    senha
                    userEmail={profile.email}
                    trigger="×"
                    className="btn-ghost inline"
                  />
                </span>
                <span className="num font-semibold">{brl(c.valor)}</span>
              </div>
            ))}
            {!custosVar?.length && <span className="text-sm text-muted">Nenhum lançamento manual ainda.</span>}
          </div>
        </div>
      </section>
    </>
  );

  const receber = (
    <>
      <section className="grid grid-cols-[1fr_320px] gap-4 max-[900px]:grid-cols-1">
        <div className="flex flex-col gap-3.5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="font-display font-bold text-[21px]">Fluxo de pagamentos</h2>
            <NovaVendaButton />
          </div>
          <p className="text-[13px] text-muted">
            Toda venda nova (recorrência e/ou consultoria) entra por aqui, com o canal — Asaas ou PIX C6 —
            escolhido em cada etapa da cobrança.
          </p>
          <div className="border border-line rounded-xl overflow-auto bg-paper">
            <table className="w-full text-[13px] border-collapse">
              <thead><tr className="bg-paper-2"><Th>Data</Th><Th>Cliente</Th><Th>Canal</Th><Th>Tipo</Th><Th right>Valor</Th><Th></Th></tr></thead>
              <tbody>
                {(pagamentos || []).map((p) => (
                  <tr key={p.id} className="border-t border-line/50">
                    <td className="px-3 py-2">{p.data ? new Date(p.data + "T00:00:00").toLocaleDateString("pt-BR") : "—"}</td>
                    <td className="px-3 py-2">{p.cliente || <span className="text-critical">sem cliente{p.pendente ? " ⚠" : ""}</span>}</td>
                    <td className="px-3 py-2">{p.canal}</td>
                    <td className="px-3 py-2">{TIPO_LABEL[p.tipo] || p.tipo}</td>
                    <td className="px-3 py-2 text-right num">{brl(p.valor)}</td>
                    <td className="px-3 py-2">
                      <ConfirmarExclusao
                        itemLabel={`o pagamento de ${p.cliente || "cliente não informado"}`}
                        acao={removerPagamento.bind(null, p.id)}
                        senha
                        userEmail={profile.email}
                      />
                    </td>
                  </tr>
                ))}
                {!pagamentos?.length && <tr><td colSpan={6} className="text-center text-muted py-4">Nenhum pagamento lançado ainda.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
        <div className="flex flex-col gap-3.5">
          <h2 className="font-display font-bold text-[21px] opacity-0 select-none max-[900px]:hidden">.</h2>
          <CalendarioRecebiveis pagamentos={pagamentos || []} />
        </div>
      </section>
    </>
  );

  const linhasMensal = [
    ...(historicoMensal || []).map((h) => ({
      label: `${MES_NOME[h.mes - 1]} de ${h.ano}`,
      faturamento: Number(h.faturamento),
      custos: Number(h.custos_fixos),
      atual: false,
    })),
    ...(mesAtualJaFechado
      ? []
      : [
          {
            label: `${MES_NOME[agoraChart.getMonth()]} de ${agoraChart.getFullYear()} (em andamento)`,
            faturamento: Number(faturamentoAtual?.faturamento_novo_mes || 0),
            custos: custosFixosTotal,
            atual: true,
          },
        ]),
  ];
  const maxFaturamentoMensal = Math.max(...linhasMensal.map((l) => l.faturamento), 1);

  const mensal = (
    <section className="flex flex-col gap-3.5">
      <div>
        <h2 className="font-display font-bold text-[21px]">Faturamento e custos por mês</h2>
        <p className="text-[13px] text-muted">
          Faturamento novo recebido por mês (puxado do Asaas) e o total de custos fixos vigente naquele mês.
        </p>
      </div>

      <GrowthChart pontos={pontosMensal} />
      <div className="border border-line rounded-xl overflow-auto bg-paper">
        <table className="w-full text-[13px] border-collapse">
          <thead>
            <tr className="bg-paper-2">
              <Th>Mês</Th>
              <Th right>Faturamento</Th>
              <Th right>Custos fixos</Th>
              <Th right>Lucro (sem variáveis)</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {linhasMensal.map((l) => (
              <tr key={l.label} className="border-t border-line/50" style={l.atual ? { background: "var(--accent-wash)" } : undefined}>
                <td className="px-3 py-2 font-semibold">{l.label}</td>
                <td className="px-3 py-2 text-right num">{brl(l.faturamento)}</td>
                <td className="px-3 py-2 text-right num text-critical">{brl(l.custos)}</td>
                <td className="px-3 py-2 text-right num" style={{ color: l.faturamento - l.custos >= 0 ? "var(--good)" : "var(--critical)" }}>
                  {brl(l.faturamento - l.custos)}
                </td>
                <td className="px-3 py-2 w-[160px]">
                  <div className="h-[8px] rounded bg-paper-2 border border-line/50 overflow-hidden">
                    <div
                      className="h-full rounded"
                      style={{
                        width: `${(l.faturamento / maxFaturamentoMensal) * 100}%`,
                        background: "linear-gradient(90deg, var(--accent), var(--accent-ink))",
                      }}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-muted">
        Janeiro e fevereiro de 2026 corrigidos manualmente (Urla R$5.000 em janeiro; Perto da chapa +
        Urla, R$10.000, em fevereiro). Todo mês fechado conta o total realmente recebido (Asaas + PIX/
        manual), não só receita nova — foi isso que estava errado em agosto (mostrava R$14.500, só a
        receita nova, quando o total recebido no mês já era R$50.414,71). Custos fixos de cada mês já
        contam só o que estava vigente naquela época (Mentoria comercial, Comercial e Claude só entram a
        partir de agosto). No gráfico de crescimento, custos variáveis de meses passados são uma estimativa
        — reconstruída a partir da data real de entrada de cada cliente ainda ativo, não é um valor gravado
        mês a mês.
      </p>
    </section>
  );

  return <FinanceiroTabs geral={geral} pagar={pagar} receber={receber} mensal={mensal} />;
}

function Kpi({ label, value, sub, color }: { label: string; value: string; sub: string; color?: string }) {
  return (
    <div className="bg-paper px-5 py-4 flex flex-col gap-1.5">
      <span className="text-[11.5px] uppercase tracking-wide text-muted font-semibold">{label}</span>
      <span className="font-display font-bold text-[22px] min-[400px]:text-[26px] num break-words" style={{ color }}>
        <ValorOcultavel>{value}</ValorOcultavel>
      </span>
      <span className="text-xs text-ink-2">{sub}</span>
    </div>
  );
}
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-[13px] border-b border-dashed border-line/50 pb-1">
      <span>{label}</span><span className="num font-semibold">{value}</span>
    </div>
  );
}
function Th({ children, right }: { children?: React.ReactNode; right?: boolean }) {
  return <th className={`px-3 py-2 text-[10.5px] uppercase tracking-wide text-muted font-semibold ${right ? "text-right" : "text-left"}`}>{children}</th>;
}
function FieldSmall({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 min-w-[140px]">
      <label className="text-[11px] uppercase tracking-wide text-muted font-semibold">{label}</label>
      {children}
    </div>
  );
}
