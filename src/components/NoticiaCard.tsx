"use client";

import { useTransition } from "react";
import { descartarNoticia, moverParaGerador } from "@/actions/marketing";
import { fmtDataHora } from "@/lib/format";
import type { RadarNoticia } from "@/lib/types";

export function NoticiaCard({ noticia }: { noticia: RadarNoticia }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-2.5 rounded-lg border border-line bg-paper p-4">
      <div className="flex items-start justify-between gap-3">
        <a href={noticia.link} target="_blank" rel="noopener noreferrer" className="font-semibold text-[14px] leading-snug hover:underline">
          {noticia.titulo}
        </a>
      </div>
      <span className="text-[11px] text-muted">
        {noticia.fonte || "fonte desconhecida"}
        {noticia.publicado_em && <> · {fmtDataHora(noticia.publicado_em)}</>}
      </span>
      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => { moverParaGerador(noticia.id); })}
          className="btn-primary text-[12px] py-1.5 px-3"
        >
          gerar conteúdo
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => { descartarNoticia(noticia.id); })}
          className="btn text-[12px] py-1.5 px-3"
        >
          descartar
        </button>
      </div>
    </div>
  );
}
