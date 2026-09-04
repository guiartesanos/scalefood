"use client";

import { useState, useTransition } from "react";
import {
  salvarRespostas,
  escolherTemplate,
  salvarLinkCanva,
  removerGeracao,
  buscarImagensDriveAction,
  salvarImagemDrive,
  gerarNoCanva,
} from "@/actions/marketing";
import type { GeracaoConteudo, CanvaTemplate } from "@/lib/types";
import type { ImagemDrive } from "@/lib/googleDrive";

// 10 perguntas fixas — não são geradas por IA (isso exigiria uma chave
// paga da Anthropic, decisão consciente de não usar por ora). São
// genéricas de propósito, pra servir qualquer tema, mas desenhadas pra
// puxar a SUA visão pessoal, a linha editorial principal, e já vir
// estruturado em abertura/meio/fechamento — o esqueleto de um carrossel.
export const GRUPOS_PERGUNTAS: { titulo: string; perguntas: string[] }[] = [
  {
    titulo: "Abertura (gancho)",
    perguntas: [
      "Qual frase, dita em voz alta pra um dono de restaurante/delivery, faria ele parar de rolar o feed?",
      "Que dado ou fato desse tema mais te incomodou ou te surpreendeu?",
    ],
  },
  {
    titulo: "Meio (sua visão)",
    perguntas: [
      "Qual é a SUA opinião sobre isso — mesmo que seja polêmica ou vá contra o senso comum do mercado?",
      "Por que a maioria dos donos de delivery/restaurante erra ao lidar com esse assunto?",
      "Que exemplo real (um cliente seu, um caso que você viu de perto) prova o que você está dizendo?",
      "Se alguém discordasse de você nos comentários, qual seria o contra-argumento — e como você rebateria?",
    ],
  },
  {
    titulo: "Fechamento (virada e chamada)",
    perguntas: [
      "Qual é a lição prática que a pessoa precisa tirar disso pro negócio dela?",
      "O que você quer que a pessoa faça depois de ler (comentar, chamar no direct, agendar diagnóstico)?",
      "Qual frase resume sua visão nisso, pra fechar o carrossel com impacto?",
      "Por que é a Food Scale quem deveria estar dizendo isso — e não qualquer outra agência?",
    ],
  },
];
export const PERGUNTAS_PROVOCATIVAS = GRUPOS_PERGUNTAS.flatMap((g) => g.perguntas);

const STATUS_LABEL: Record<GeracaoConteudo["status"], string> = {
  rascunho: "aguardando respostas",
  perguntas: "escolhendo estilo",
  pronto: "pronto",
};

export function GeracaoCard({
  geracao,
  noticiaLink,
  templates,
  driveConectado,
  canvaConectado,
}: {
  geracao: GeracaoConteudo;
  noticiaLink?: string | null;
  templates: CanvaTemplate[];
  driveConectado: boolean;
  canvaConectado: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [respostas, setRespostas] = useState<Record<string, string>>(geracao.respostas || {});
  const [link, setLink] = useState(geracao.canva_design_url || "");
  const [buscandoImagens, setBuscandoImagens] = useState(false);
  const [imagens, setImagens] = useState<ImagemDrive[] | null>(null);
  const [erroImagens, setErroImagens] = useState<string | null>(null);
  const [gerandoCanva, setGerandoCanva] = useState(false);
  const [erroCanva, setErroCanva] = useState<string | null>(null);

  async function handleGerarNoCanva() {
    setGerandoCanva(true);
    setErroCanva(null);
    const res = await gerarNoCanva(geracao.id);
    setGerandoCanva(false);
    if (res.error) setErroCanva(res.error);
  }

  const templateAtual = templates.find((t) => t.id === geracao.template_id);
  const temRespostas = !!geracao.respostas;

  async function buscarImagens() {
    setBuscandoImagens(true);
    setErroImagens(null);
    const res = await buscarImagensDriveAction(geracao.tema);
    setBuscandoImagens(false);
    if (res.error) setErroImagens(res.error);
    else setImagens(res.imagens || []);
  }

  return (
    <div className="flex flex-col gap-3.5 rounded-xl border border-line bg-paper p-4">
      <div className="flex items-start justify-between gap-3">
        {noticiaLink ? (
          <a
            href={noticiaLink}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-[14px] leading-snug hover:underline"
          >
            {geracao.tema}
          </a>
        ) : (
          <span className="font-semibold text-[14px] leading-snug">{geracao.tema}</span>
        )}
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
        <details open className="flex flex-col gap-3">
          <summary className="text-[12.5px] font-semibold cursor-pointer select-none">
            10 perguntas provocativas
          </summary>
          <p className="text-[11px] text-muted -mt-1">
            Roteiro fixo pensado pra puxar sua visão pessoal e já vir estruturado como um carrossel — gancho,
            argumento e fechamento com chamada.
          </p>
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              startTransition(() => { salvarRespostas(geracao.id, respostas); });
            }}
          >
            {(() => {
              let indice = -1;
              return GRUPOS_PERGUNTAS.map((grupo) => (
                <div key={grupo.titulo} className="flex flex-col gap-2.5">
                  <span className="text-[11px] uppercase tracking-wide text-accent-ink font-semibold">{grupo.titulo}</span>
                  {grupo.perguntas.map((p) => {
                    indice += 1;
                    const i = indice;
                    return (
                      <div key={i} className="flex flex-col gap-1">
                        <label className="text-[12px] text-ink-2">{p}</label>
                        <textarea
                          className="input min-h-[44px] text-[12.5px]"
                          value={respostas[String(i)] || ""}
                          onChange={(e) => setRespostas((r) => ({ ...r, [String(i)]: e.target.value }))}
                        />
                      </div>
                    );
                  })}
                </div>
              ));
            })()}
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
          {templateAtual?.usa_imagem && !driveConectado && (
            <p className="text-[11px] text-muted">
              Esse modelo usa imagem — conecte o Google Drive na aba News pra buscar automaticamente, ou
              escolha a imagem direto no Canva ao montar o design.
            </p>
          )}
          {templateAtual?.usa_imagem && driveConectado && (
            <div className="flex flex-col gap-2 pt-1">
              {geracao.imagem_drive_url ? (
                <div className="flex items-center gap-2 text-[12px]">
                  <span className="text-ink-2">Imagem escolhida: {geracao.imagem_drive_nome}</span>
                  <button type="button" onClick={buscarImagens} className="btn-ghost text-[11px]">trocar</button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={buscandoImagens}
                  onClick={buscarImagens}
                  className="btn text-[12px] py-1.5 px-3 self-start"
                >
                  {buscandoImagens ? "buscando..." : "buscar imagens no Drive"}
                </button>
              )}
              {erroImagens && <p className="text-[11px] text-critical">{erroImagens}</p>}
              {imagens && (
                <div className="grid grid-cols-4 gap-2">
                  {imagens.map((img) => (
                    <button
                      key={img.id}
                      type="button"
                      title={img.nome}
                      disabled={pending}
                      onClick={() => startTransition(async () => {
                        await salvarImagemDrive(geracao.id, img.webViewLink || "", img.nome);
                        setImagens(null);
                      })}
                      className="aspect-square rounded-lg overflow-hidden border border-line hover:border-accent transition-colors bg-paper-2"
                    >
                      {img.thumbnailLink ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={img.thumbnailLink} alt={img.nome} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[10px] text-muted p-1">{img.nome}</span>
                      )}
                    </button>
                  ))}
                  {!imagens.length && <p className="text-[11px] text-muted col-span-4">Nenhuma imagem encontrada com esse tema.</p>}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {geracao.template_id && geracao.status !== "pronto" && canvaConectado && (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={gerandoCanva}
            onClick={handleGerarNoCanva}
            className="btn-primary text-[12px] py-1.5 px-3 self-start"
          >
            {gerandoCanva ? "gerando no Canva..." : "gerar automaticamente no Canva"}
          </button>
          {erroCanva && <p className="text-[11px] text-critical">{erroCanva}</p>}
        </div>
      )}

      {geracao.template_id && geracao.status !== "pronto" && (
        <details className="text-[12px]">
          <summary className="text-muted cursor-pointer select-none">
            {canvaConectado ? "ou cole o link manualmente" : "cole o link do Canva quando terminar"}
          </summary>
          <form
            className="flex items-center gap-2 pt-2"
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
        </details>
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
