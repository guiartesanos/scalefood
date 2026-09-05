import Link from "next/link";
import { brl, fmtData } from "@/lib/data";
import { DRE_PRIMEIRO_ANO_MES, type DREResultado, type DRELinha } from "@/lib/dre";
import { ValorOcultavel } from "@/components/ValoresVisibilidade";
import { hojeBR } from "@/lib/tz";

const MES_NOME = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export function DREView({ dre, verLucro, baseHref }: { dre: DREResultado; verLucro: boolean; baseHref: string }) {
  const { ano, mes } = dre;
  const atualAnoMes = (() => {
    const { ano: anoBR, mes: mesBR } = hojeBR();
    return anoBR * 100 + mesBR;
  })();
  const mesAnterior = mes === 1 ? { ano: ano - 1, mes: 12 } : { ano, mes: mes - 1 };
  const mesSeguinte = mes === 12 ? { ano: ano + 1, mes: 1 } : { ano, mes: mes + 1 };
  const podeVoltar = mesAnterior.ano * 100 + mesAnterior.mes >= DRE_PRIMEIRO_ANO_MES;
  const podeAvancar = mesSeguinte.ano * 100 + mesSeguinte.mes <= atualAnoMes;

  return (
    <div className="flex flex-col gap-5">
      <p className="text-[13px] text-muted">
        Resultado real do mês — só conta o que já foi de fato recebido e pago.
        {dre.ehMesAtual && " Em andamento, atualizado até hoje."}
      </p>

      <div className="flex items-center justify-center gap-4 bg-paper border border-line rounded-lg py-3">
        {podeVoltar ? (
          <Link href={`${baseHref}?tab=dre&ano=${mesAnterior.ano}&mes=${mesAnterior.mes}`} className="btn-ghost px-3">←</Link>
        ) : (
          <span className="px-3 text-muted opacity-40">←</span>
        )}
        <span className="font-display font-bold text-lg min-w-[180px] text-center">
          {MES_NOME[mes - 1]} de {ano}
        </span>
        {podeAvancar ? (
          <Link href={`${baseHref}?tab=dre&ano=${mesSeguinte.ano}&mes=${mesSeguinte.mes}`} className="btn-ghost px-3">→</Link>
        ) : (
          <span className="px-3 text-muted opacity-40">→</span>
        )}
      </div>

      {dre.erroAsaas && (
        <p className="text-critical text-sm bg-paper border border-critical/30 rounded-lg p-3">
          Não consegui buscar os dados do Asaas agora ({dre.erroAsaas}) — os valores abaixo podem estar
          incompletos (falta recorrência/consultoria recebida via Asaas e as tarifas de conta).
        </p>
      )}

      <Secao titulo="Receita" total={dre.receita.total} linhas={dre.receita.linhas} cor="var(--good)" sinal="+" ocultavel />
      <Secao titulo="Custos variáveis" total={dre.custosVariaveis.total} linhas={dre.custosVariaveis.linhas} cor="var(--critical)" sinal="−" />
      <Secao titulo="Custos fixos" total={dre.custosFixos.total} linhas={dre.custosFixos.linhas} cor="var(--critical)" sinal="−" />

      <div
        className="rounded-lg p-5 flex items-center justify-between border"
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
        imposto contam na competência (o mês que gerou o valor, não o mês em que foi de fato pago); contas
        fixas usam a data de competência da confirmação; taxa de processamento e tarifas de conta Asaas vêm
        direto do extrato. Imposto é gerado automaticamente todo dia 20 (ou próximo dia útil) como previsão
        — 7% sobre as notas fiscais emitidas no mês anterior — mas o valor pode ser editado antes de
        confirmar o pagamento. A única ação manual em todo o DRE é essa confirmação — o resto atualiza
        sozinho.
      </p>
    </div>
  );
}

function Secao({ titulo, total, linhas, cor, sinal, ocultavel }: { titulo: string; total: number; linhas: DRELinha[]; cor: string; sinal: string; ocultavel?: boolean }) {
  const valor = (children: React.ReactNode) => (ocultavel ? <ValorOcultavel>{children}</ValorOcultavel> : children);
  return (
    <section className="bg-paper border border-line rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-paper-2 border-b border-line">
        <h2 className="font-display font-bold text-[16px]">{titulo}</h2>
        <span className="font-display font-bold num" style={{ color: cor }}>
          {valor(<>{sinal} {brl(total)}</>)}
        </span>
      </div>
      {!linhas.length && <p className="px-4 py-4 text-sm text-muted">Nada realizado ainda neste mês.</p>}
      {linhas.map((l) => (
        <details key={l.label} className="border-b border-line/50 last:border-b-0 group">
          <summary className="flex items-center justify-between px-4 py-2.5 cursor-pointer list-none hover:bg-paper-2/60 transition-colors">
            <span className="text-[13px] flex items-center gap-2">
              <span className="text-muted text-[10.5px] group-open:rotate-90 transition-transform inline-block">▶</span>
              {l.label}
              {!l.automatico && (
                <span className="text-[10.5px] uppercase tracking-wide text-muted border border-line rounded px-1.5 py-0.5">manual</span>
              )}
            </span>
            <span className="num font-semibold text-[13px]" style={{ color: cor }}>
              {valor(brl(l.valor))}
            </span>
          </summary>
          <div className="px-4 pb-3 flex flex-col gap-1 bg-paper-2/40">
            {l.itens.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-[12px] pl-5 text-ink-2">
                <span>
                  {item.label} {item.data && <span className="text-muted">· {fmtData(item.data)}</span>}
                </span>
                <span className="num">{valor(brl(item.valor))}</span>
              </div>
            ))}
          </div>
        </details>
      ))}
    </section>
  );
}
