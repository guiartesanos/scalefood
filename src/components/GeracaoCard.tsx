"use client";

import { useState, useTransition } from "react";
import {
  salvarRespostas,
  escolherTemplate,
  salvarLinkCanva,
  removerGeracao,
} from "@/actions/marketing";
import type { GeracaoConteudo, CanvaTemplate } from "@/lib/types";

export const PERGUNTAS_PROVOCATIVAS = [
  "Qual é o \"gancho\" emocional dessa notícia pro seu público (dono de restaurante/negócio de delivery)?",
  "Que mito ou crença comum essa notícia derruba?",
  "Se seu concorrente lesse isso, o que ele mudaria amanhã?",
  "Qual número ou dado dessa notícia mais assusta ou surpreende?",
  "Como isso afeta diretamente o bolso de quem vende comida?",
  "Qual pergunta um cliente seu faria depois de ler essa notícia?",
  "Que ação prática seu público pode tomar HOJE por causa disso?",
  "Qual é o \"vilão\" dessa história (app, taxa, comportamento, concorrência)?",
  "Se você tivesse 1 frase pra resumir isso pro Instagram, qual seria?",
  "O que a Food Scale pensa diferente de todo mundo sobre esse assunto?",
];

const STATUS_LABEL: Record<GeracaoConteudo["status"], string> = {
  rascunho: "aguardando respostas",
  perguntas: "escolhendo estilo",
  pronto: "pronto",
};

export function GeracaoCard({ geracao, templates }: { geracao: GeracaoConteudo; templates: CanvaTemplate[] }) {
  const [pending, startTransition] = useTransition();
  const [respostas, setRespostas] = useState<Record<string, string>>(geracao.respostas || {});
  const [link, setLink] = useState(geracao.canva_design_url || "");

  const templateAtual = templates.find((t) => t.id === geracao.template_id);
  const temRespostas = !!geracao.respostas;

  return (
    <div className="flex flex-col gap-3.5 rounded-xl border border-line bg-paper p-4">
      <div className="flex items-start justify-between gap-3">
        <span className="font-semibold text-[14px] leading-snug">{geracao.tema}</span>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] uppercase tracking-wide text-muted border border-line rounded px-1.5 py-0.5 whitespace-nowrap">
            {STATUS_LABEL[geracao.status]}
          </span>
          <button
            type="button"
            disabled={pending}
            onClick={() => startTransition(() => { removerGeracao(geracao.id); })}
            className="btn-ghost text-[11px]"
          >
            remover
          </button>
        </div>
      </div>

      {!temRespostas && (
        <details open className="flex flex-col gap-2.5">
          <summary className="text-[12.5px] font-semibold cursor-pointer select-none">
            10 perguntas provocativas
          </summary>
          <p className="text-[11px] text-muted -mt-1">
            Roteiro padrão pra direcionar o conteúdo — ainda não temos a chave de IA configurada pra gerar
            perguntas sob medida pra cada notícia, mas essas cobrem os ângulos mais comuns.
          </p>
          <form
            className="flex flex-col gap-2.5"
            onSubmit={(e) => {
              e.preventDefault();
              startTransition(() => { salvarRespostas(geracao.id, respostas); });
            }}
          >
            {PERGUNTAS_PROVOCATIVAS.map((p, i) => (
              <div key={i} className="flex flex-col gap-1">
                <label className="text-[12px] text-ink-2">{i + 1}. {p}</label>
                <textarea
                  className="input min-h-[44px] text-[12.5px]"
                  value={respostas[String(i)] || ""}
                  onChange={(e) => setRespostas((r) => ({ ...r, [String(i)]: e.target.value }))}
                />
              </div>
            ))}
            <button type="submit" disabled={pending} className="btn-primary text-[12px] py-1.5 px-3 self-start">
              salvar respostas
            </button>
          </form>
        </details>
      )}

      {temRespostas && (
        <details className="flex flex-col gap-2">
          <summary className="text-[12px] text-muted cursor-pointer select-none">ver respostas das perguntas</summary>
          <div className="flex flex-col gap-2 pt-1">
            {PERGUNTAS_PROVOCATIVAS.map((p, i) =>
              geracao.respostas?.[String(i)] ? (
                <div key={i} className="text-[12px]">
                  <span className="text-muted">{p}</span>
                  <p className="text-ink-2">{geracao.respostas![String(i)]}</p>
                </div>
              ) : null
            )}
          </div>
        </details>
      )}

      {temRespostas && (
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] uppercase tracking-wide text-muted font-semibold">Estilo do carrossel</label>
          <select
            className="input"
            value={geracao.template_id || ""}
            disabled={pending}
            onChange={(e) => startTransition(() => { escolherTemplate(geracao.id, e.target.value); })}
          >
            <option value="">selecione um modelo</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome}{t.usa_imagem ? " · com imagem" : " · só texto"}
              </option>
            ))}
          </select>
          {templateAtual?.usa_imagem && (
            <p className="text-[11px] text-muted">
              Esse modelo usa imagem — a busca automática no seu Google Drive ainda não está configurada;
              por enquanto, escolha a imagem direto no Canva ao montar o design.
            </p>
          )}
        </div>
      )}

      {geracao.template_id && (
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            startTransition(() => { salvarLinkCanva(geracao.id, link); });
          }}
        >
          <input
            className="input flex-1"
            placeholder="Cole aqui o link do design pronto no Canva"
            value={link}
            onChange={(e) => setLink(e.target.value)}
          />
          <button type="submit" disabled={pending} className="btn-primary text-[12px] py-1.5 px-3 shrink-0">
            salvar link
          </button>
        </form>
      )}

      {geracao.status === "pronto" && geracao.canva_design_url && (
        <a
          href={geracao.canva_design_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[12.5px] font-semibold text-accent-ink underline underline-offset-2 self-start"
        >
          abrir no Canva →
        </a>
      )}
    </div>
  );
}
