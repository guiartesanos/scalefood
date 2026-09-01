import Link from "next/link";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { canSeeLucro } from "@/lib/permissions";
import { brl } from "@/lib/data";
import { getDRE, DRE_PRIMEIRO_ANO_MES, type DRELinha } from "@/lib/dre";
import { VisibilidadeProvider, BotaoOcultarValores, ValorOcultavel } from "@/components/ValoresVisibilidade";

const MES_NOME = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function fmtData(d?: string) {
  if (!d) return null;
  return new Date(d + "T12:00:00").toLocaleDateString("pt-BR");
}

export default async function DREPage({
  searchParams,
}: {
  searchParams: Promise<{ ano?: string; mes?: string }>;
}) {
  const profile = await requireProfile();
  if (profile.role === "comercial") redirect("/dashboard");

  const hoje = new Date();
  const params = await searchParams;
  let ano = Number(params.ano) || hoje.getFullYear();
  let mes = Number(params.mes) || hoje.getMonth() + 1;
  const anoMes = ano * 100 + mes;
  const atualAnoMes = hoje.getFullYear() * 100 + (hoje.getMonth() + 1);
  if (anoMes < DRE_PRIMEIRO_ANO_MES) { ano = 2026; mes = 8; }
  if (anoMes > atualAnoMes) { ano = hoje.getFullYear(); mes = hoje.getMonth() + 1; }

  const dre = await getDRE(ano, mes);
  const verLucro = canSeeLucro(profile.role);

  const mesAnterior = mes === 1 ? { ano: ano - 1, mes: 12 } : { ano, mes: mes - 1 };
  const mesSeguinte = mes === 12 ? { ano: ano + 1, mes: 1 } : { ano, mes: mes + 1 };
  const podeVoltar = mesAnterior.ano * 100 + mesAnterior.mes >= DRE_PRIMEIRO_ANO_MES;
  const podeAvancar = mesSeguinte.ano * 100 + mesSeguinte.mes <= atualAnoMes;

  return (
    <VisibilidadeProvider>
      <div className="max-w-[900px] mx-auto w-full flex flex-col gap-5 px-4 py-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-display font-extrabold text-[26px]">DRE do mês</h1>
            <p className="text-[13px] text-muted">
              Resultado real do mês — só conta o que já foi de fato recebido e pago.
              {dre.ehMesAtual && " Em andamento, atualizado até hoje."}
            </p>
          </div>
          <BotaoOcultarValores />
        </div>

        <div className="flex items-center justify-center gap-4 bg-paper border border-line rounded-xl py-3">
          {podeVoltar ? (
            <Link href={`/dre?ano=${mesAnterior.ano}&mes=${mesAnterior.mes}`} className="btn-ghost px-3">←</Link>
          ) : (
            <span className="px-3 text-muted opacity-40">←</span>
          )}
          <span className="font-display font-bold text-lg min-w-[180px] text-center">
            {MES_NOME[mes - 1]} de {ano}
          </span>
          {podeAvancar ? (
            <Link href={`/dre?ano=${mesSeguinte.ano}&mes=${mesSeguinte.mes}`} className="btn-ghost px-3">→</Link>
          ) : (
            <span className="px-3 text-muted opacity-40">→</span>
          )}
        </div>

        {dre.erroAsaas && (
          <p className="text-critical text-sm bg-paper border border-critical/30 rounded-xl p-3">
            Não consegui buscar os dados do Asaas agora ({dre.erroAsaas}) — os valores abaixo podem estar
            incompletos (falta recorrência/consultoria recebida via Asaas e as tarifas de conta).
          </p>
        )}

        <Secao titulo="Receita" total={dre.receita.total} linhas={dre.receita.linhas} cor="var(--good)" sinal="+" />
        <Secao titulo="Custos variáveis" total={dre.custosVariaveis.total} linhas={dre.custosVariaveis.linhas} cor="var(--critical)" sinal="−" />
        <Secao titulo="Custos fixos" total={dre.custosFixos.total} linhas={dre.custosFixos.linhas} cor="var(--critical)" sinal="−" />

        <div
          className="rounded-xl p-5 flex items-center justify-between border"
          style={{ background: "var(--accent-wash)", borderColor: "var(--accent)" }}
        >
          <span className="font-display font-bold text-lg">Resultado do mês</span>
          {verLucro ? (
            <span
              className="font-display font-extrabold text-[28px] num"
              style={{ color: dre.resultado >= 0 ? "var(--good)" : "var(--critical)" }}
            >
              <ValorOcultavel>{brl(dre.resultado)}</ValorOcultavel>
            </span>
          ) : (
            <span className="text-muted text-sm">Sem permissão para ver</span>
          )}
        </div>

        <p className="text-[11px] text-muted">
          Receita: pagamentos recebidos no Asaas (ao vivo) + entradas fora do Asaas já lançadas + recebíveis
          manuais confirmados. Custos: só entram quando alguém confirma o pagamento — tráfego, comissão e
          contas fixas usam a data de competência da confirmação; taxa de processamento e tarifas de conta
          Asaas vêm direto do extrato; imposto é 7% da receita do mês. A única ação manual em todo o DRE é
          essa confirmação de pagamento — o resto atualiza sozinho.
        </p>
      </div>
    </VisibilidadeProvider>
  );
}

function Secao({ titulo, total, linhas, cor, sinal }: { titulo: string; total: number; linhas: DRELinha[]; cor: string; sinal: string }) {
  return (
    <section className="bg-paper border border-line rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-paper-2 border-b border-line">
        <h2 className="font-display font-bold text-[16px]">{titulo}</h2>
        <span className="font-display font-bold num" style={{ color: cor }}>
          <ValorOcultavel>{sinal} {brl(total)}</ValorOcultavel>
        </span>
      </div>
      {!linhas.length && <p className="px-4 py-4 text-sm text-muted">Nada realizado ainda neste mês.</p>}
      {linhas.map((l) => (
        <details key={l.label} className="border-b border-line/50 last:border-b-0 group">
          <summary className="flex items-center justify-between px-4 py-2.5 cursor-pointer list-none hover:bg-paper-2/60 transition-colors">
            <span className="text-[13.5px] flex items-center gap-2">
              <span className="text-muted text-[10px] group-open:rotate-90 transition-transform inline-block">▶</span>
              {l.label}
              {!l.automatico && (
                <span className="text-[10px] uppercase tracking-wide text-muted border border-line rounded px-1.5 py-0.5">manual</span>
              )}
            </span>
            <span className="num font-semibold text-[13.5px]" style={{ color: cor }}>
              <ValorOcultavel>{brl(l.valor)}</ValorOcultavel>
            </span>
          </summary>
          <div className="px-4 pb-3 flex flex-col gap-1 bg-paper-2/40">
            {l.itens.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-[12.5px] pl-5 text-ink-2">
                <span>
                  {item.label} {item.data && <span className="text-muted">· {fmtData(item.data)}</span>}
                </span>
                <span className="num"><ValorOcultavel>{brl(item.valor)}</ValorOcultavel></span>
              </div>
            ))}
          </div>
        </details>
      ))}
    </section>
  );
}
