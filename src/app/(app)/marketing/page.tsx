import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MarketingTabs } from "@/components/MarketingTabs";
import { NoticiaCard } from "@/components/NoticiaCard";
import { GeracaoCard } from "@/components/GeracaoCard";
import { criarGeracaoAvulsa } from "@/actions/marketing";
import { driveConectado as checarDriveConectado } from "@/lib/googleDrive";
import { canvaConectado as checarCanvaConectado } from "@/lib/canva";
import type { RadarNoticia, CanvaTemplate, GeracaoConteudo } from "@/lib/types";

const MENSAGEM_DRIVE: Record<string, string> = {
  conectado: "Google Drive conectado com sucesso.",
  erro: "Não consegui conectar com o Google Drive — tenta de novo.",
  "sem-permissao": "Só o master pode conectar o Google Drive.",
};

const MENSAGEM_CANVA: Record<string, string> = {
  conectado: "Canva conectado com sucesso.",
  erro: "Não consegui conectar com o Canva — tenta de novo.",
  "sem-permissao": "Só o master pode conectar o Canva.",
};

export default async function MarketingPage({
  searchParams,
}: {
  searchParams: Promise<{ drive?: string; canva?: string }>;
}) {
  const profile = await requireProfile();
  if (profile.role !== "master" && profile.role !== "comercial") redirect("/dashboard");

  const params = await searchParams;
  const supabase = await createClient();
  const [{ data: noticiasRaw }, { data: templatesRaw }, { data: geracoesRaw }, drive, canva] = await Promise.all([
    supabase.from("radar_noticias").select("*").eq("status", "novo").order("publicado_em", { ascending: false }),
    supabase.from("canva_templates").select("*").eq("ativo", true).order("nome"),
    supabase.from("geracoes_conteudo").select("*, radar_noticias(link)").order("created_at", { ascending: false }),
    checarDriveConectado(),
    checarCanvaConectado(),
  ]);

  const noticias = (noticiasRaw || []) as RadarNoticia[];
  const templates = (templatesRaw || []) as CanvaTemplate[];
  // link vem via embed da notícia original (null pra geração avulsa, que
  // não nasceu de uma notícia do radar) — é o que deixa o tema clicável
  // de novo depois que a notícia "sai" da lista pro gerador.
  const geracoes = (geracoesRaw || []).map((g) => {
    const { radar_noticias, ...resto } = g as GeracaoConteudo & { radar_noticias: { link: string } | null };
    return { ...resto, link: radar_noticias?.link || null };
  });
  const emAndamento = geracoes.filter((g) => g.status !== "pronto");
  const prontos = geracoes.filter((g) => g.status === "pronto");

  async function handleCriarAvulsa(fd: FormData) {
    "use server";
    await criarGeracaoAvulsa(String(fd.get("tema") || ""));
  }

  const news = (
    <section className="flex flex-col gap-3.5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-display font-bold text-[21px]">Radar de notícias</h2>
          <p className="text-[13px] text-muted">
            Food service, delivery, marketplaces e comportamento do consumidor — atualizado todo dia.
          </p>
        </div>
        {profile.role === "master" && (
          <div className="flex items-center gap-2">
            <a
              href={drive ? undefined : "/api/google-drive/authorize"}
              className={drive ? "text-[12px] text-good font-semibold" : "btn text-[12px] py-1.5 px-3"}
            >
              {drive ? "✓ Google Drive conectado" : "conectar Google Drive"}
            </a>
            <a
              href={canva ? undefined : "/api/canva/authorize"}
              className={canva ? "text-[12px] text-good font-semibold" : "btn text-[12px] py-1.5 px-3"}
            >
              {canva ? "✓ Canva conectado" : "conectar Canva"}
            </a>
          </div>
        )}
      </div>
      {params.drive && (
        <p className={`text-[12px] ${params.drive === "conectado" ? "text-good" : "text-critical"}`}>
          {MENSAGEM_DRIVE[params.drive] || ""}
        </p>
      )}
      {params.canva && (
        <p className={`text-[12px] ${params.canva === "conectado" ? "text-good" : "text-critical"}`}>
          {MENSAGEM_CANVA[params.canva] || ""}
        </p>
      )}
      <div className="grid grid-cols-2 gap-3 max-[900px]:grid-cols-1">
        {noticias.map((n) => (
          <NoticiaCard key={n.id} noticia={n} />
        ))}
        {!noticias.length && (
          <p className="text-sm text-muted py-4 col-span-2">
            Nenhuma notícia nova no radar agora — a busca roda automaticamente uma vez por dia.
          </p>
        )}
      </div>
    </section>
  );

  const gerador = (
    <>
      <section className="flex flex-col gap-3.5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="font-display font-bold text-[21px]">Em produção</h2>
            <p className="text-[13px] text-muted">Responda as perguntas, escolha o estilo e gere no Canva quando terminar.</p>
          </div>
        </div>
        <form action={handleCriarAvulsa} className="bg-paper-2 border border-dashed border-line rounded-lg p-4 flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1 flex-1 min-w-[220px]">
            <label className="text-[11px] uppercase tracking-wide text-muted font-semibold">Novo conteúdo (sem notícia)</label>
            <input name="tema" required className="input" placeholder="Ex: bastidores de um cliente, dica rápida, promoção..." />
          </div>
          <button type="submit" className="btn-primary">+ novo conteúdo</button>
        </form>
        <div className="flex flex-col gap-3">
          {emAndamento.map((g) => (
            <GeracaoCard key={g.id} geracao={g} noticiaLink={g.link} templates={templates} driveConectado={drive} canvaConectado={canva} />
          ))}
          {!emAndamento.length && <p className="text-sm text-muted py-2">Nada em produção agora.</p>}
        </div>
      </section>

      {!!prontos.length && (
        <section className="flex flex-col gap-3.5">
          <h2 className="font-display font-bold text-[21px]">Prontos</h2>
          <div className="flex flex-col gap-3">
            {prontos.map((g) => (
              <GeracaoCard key={g.id} geracao={g} noticiaLink={g.link} templates={templates} driveConectado={drive} canvaConectado={canva} />
            ))}
          </div>
        </section>
      )}
    </>
  );

  return <MarketingTabs news={news} gerador={gerador} badgeGerador={emAndamento.length} />;
}
