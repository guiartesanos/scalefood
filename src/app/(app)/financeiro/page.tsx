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
  lancarPagamento,
  removerPagamento,
} from "@/actions/financeiro";

export default async function FinanceiroPage() {
  const profile = await requireProfile();

  // Bloqueio no SERVIDOR — não é só o link escondido no menu. Alguém
  // digitando /financeiro direto na barra de endereço, sendo comercial,
  // é jogado de volta pro dashboard antes de qualquer dado ser buscado.
  if (profile.role === "comercial") redirect("/dashboard");

  const supabase = await createClient();
  const clientes = await getClientes();
  const { data: custosFixos } = await supabase.from("custos_fixos").select("*").order("created_at");
  const { data: custosVar } = await supabase.from("custos_variaveis_extra").select("*").order("created_at");
  const { data: pagamentos } = await supabase.from("pagamentos").select("*").order("data", { ascending: false });

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
  async function handleLancarPagamento(fd: FormData) {
    "use server";
    await lancarPagamento(fd);
  }
  async function handleRemoverCustoFixo(id: string) {
    "use server";
    await removerCustoFixo(id);
  }
  async function handleRemoverCustoVariavel(id: string) {
    "use server";
    await removerCustoVariavel(id);
  }
  async function handleRemoverPagamento(id: string) {
    "use server";
    await removerPagamento(id);
  }

  const TIPO_LABEL: Record<string, string> = { recorrencia: "Aceleração", consultoria: "Consultoria", avulso: "Avulso" };

  return (
    <>
      <div className="bg-paper border border-accent rounded-xl p-5 flex flex-col gap-1.5">
        <span className="text-[11.5px] uppercase tracking-wide text-accent-ink font-semibold">Faturamento total</span>
        <span className="font-display font-extrabold text-[40px] num">{brl(faturamentoTotal)}</span>
        <span className="text-[13px] text-ink-2">
          {brlInt(faturamentoRecorrente)} recorrente (Aceleração) · {brlInt(faturamentoAvulso)} consultoria
        </span>
      </div>

      <div className={`grid ${verLucro ? "grid-cols-3" : "grid-cols-2"} gap-1 bg-line border border-line rounded-xl overflow-hidden`}>
        <Kpi label="Custos fixos" value={brlInt(custosFixosTotal)} sub={`${custosFixos?.length || 0} lançamento(s)`} color="var(--critical)" />
        <Kpi label="Custos variáveis" value={brlInt(custosVariaveis)} sub="tráfego + comissão + imposto + taxa + extras" color="var(--critical)" />
        {verLucro && <Kpi label="Lucro estimado" value={brl(lucro)} sub="faturamento − custos fixos − variáveis" color="var(--good)" />}
      </div>

      <section className="flex flex-col gap-3.5">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold text-[21px]">Custos fixos</h2>
        </div>
        <form action={handleCriarCustoFixo} className="bg-paper-2 border border-dashed border-line rounded-xl p-4 flex flex-wrap gap-3 items-end">
          <FieldSmall label="Nome"><input name="nome" required className="input" placeholder="Ex: aluguel, ferramenta" /></FieldSmall>
          <FieldSmall label="Valor mensal (R$)"><input name="valor" type="number" step="0.01" min="0" required className="input" /></FieldSmall>
          <FieldSmall label="Categoria">
            <select name="categoria" className="input">
              {CATEGORIAS_CUSTO.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </FieldSmall>
          <button type="submit" className="btn-primary">+ adicionar</button>
        </form>
        <div className="border border-line rounded-xl overflow-auto bg-paper">
          <table className="w-full text-[13px] border-collapse">
            <thead><tr className="bg-paper-2"><Th>Nome</Th><Th>Categoria</Th><Th right>Valor</Th><Th></Th></tr></thead>
            <tbody>
              {(custosFixos || []).map((c) => (
                <tr key={c.id} className="border-t border-line/50">
                  <td className="px-3 py-2">{c.nome}</td>
                  <td className="px-3 py-2">{c.categoria || "—"}</td>
                  <td className="px-3 py-2 text-right num">{brl(c.valor)}</td>
                  <td className="px-3 py-2">
                    <form action={handleRemoverCustoFixo.bind(null, c.id)}>
                      <button className="btn-ghost">remover</button>
                    </form>
                  </td>
                </tr>
              ))}
              {!custosFixos?.length && (
                <tr><td colSpan={4} className="text-center text-muted py-4">Nenhum custo fixo lançado ainda.</td></tr>
              )}
            </tbody>
          </table>
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
                  <form action={handleRemoverCustoVariavel.bind(null, c.id)} className="inline"><button className="btn-ghost">×</button></form>
                </span>
                <span className="num font-semibold">{brl(c.valor)}</span>
              </div>
            ))}
            {!custosVar?.length && <span className="text-sm text-muted">Nenhum lançamento manual ainda.</span>}
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3.5">
        <h2 className="font-display font-bold text-[21px]">Fluxo de pagamentos</h2>
        <p className="text-[13px] text-muted">
          Nem tudo entra pelo Asaas — lance aqui também o que cair direto por PIX ou outro canal.{" "}
          <b className="text-ink-2">Aceleração</b> = recorrente. <b className="text-ink-2">Consultoria</b> = pontual.
        </p>
        <form action={handleLancarPagamento} className="bg-paper-2 border border-dashed border-line rounded-xl p-4 flex flex-wrap gap-3 items-end">
          <FieldSmall label="Data"><input name="data" type="date" className="input" /></FieldSmall>
          <FieldSmall label="Cliente"><input name="cliente" className="input" /></FieldSmall>
          <FieldSmall label="Canal">
            <select name="canal" className="input">
              <option>Asaas</option><option>PIX C6</option><option>PIX outro</option><option>Boleto direto</option><option>Outro</option>
            </select>
          </FieldSmall>
          <FieldSmall label="Tipo">
            <select name="tipo" className="input">
              <option value="recorrencia">Aceleração (recorrente)</option>
              <option value="consultoria">Consultoria (pontual)</option>
              <option value="avulso">Avulso / outro</option>
            </select>
          </FieldSmall>
          <FieldSmall label="Valor (R$)"><input name="valor" type="number" step="0.01" min="0" required className="input" /></FieldSmall>
          <button type="submit" className="btn-primary">Lançar</button>
        </form>
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
                    <form action={handleRemoverPagamento.bind(null, p.id)}><button className="btn-ghost">remover</button></form>
                  </td>
                </tr>
              ))}
              {!pagamentos?.length && <tr><td colSpan={6} className="text-center text-muted py-4">Nenhum pagamento lançado ainda.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function Kpi({ label, value, sub, color }: { label: string; value: string; sub: string; color?: string }) {
  return (
    <div className="bg-paper px-5 py-4 flex flex-col gap-1.5">
      <span className="text-[11.5px] uppercase tracking-wide text-muted font-semibold">{label}</span>
      <span className="font-display font-bold text-[26px] num" style={{ color }}>{value}</span>
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
