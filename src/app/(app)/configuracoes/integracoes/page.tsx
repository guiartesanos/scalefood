import Link from "next/link";
import { requireMaster } from "@/lib/auth";
import { driveStatus } from "@/lib/googleDrive";
import { calendarStatus } from "@/lib/googleCalendar";
import { canvaStatus } from "@/lib/canva";
import { listarSaudeCrons } from "@/lib/cronHealth";
import type { StatusConexao } from "@/lib/googleDrive";

function fmtQuando(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

const INTEGRACOES = [
  {
    chave: "drive",
    nome: "Google Drive",
    descricao: "Busca de imagens pro Gerador de Conteúdo.",
    conectar: "/api/google-drive/authorize",
  },
  {
    chave: "calendar",
    nome: "Google Calendar",
    descricao: "Cria/move os eventos das reuniões de Consultoria.",
    conectar: "/api/google-calendar/authorize",
  },
  {
    chave: "canva",
    nome: "Canva",
    descricao: "Autofill dos modelos no Gerador de Conteúdo.",
    conectar: "/api/canva/authorize",
  },
] as const;

export default async function IntegracoesPage() {
  // requireMaster já redireciona quem não é master pro /dashboard — e a
  // RLS das tabelas de conexão (select só pra auth_role() = 'master')
  // barra o mesmo acesso direto pelo banco.
  await requireMaster();

  const [drive, calendar, canva, crons] = await Promise.all([
    driveStatus(),
    calendarStatus(),
    canvaStatus(),
    listarSaudeCrons(),
  ]);
  const status: Record<string, StatusConexao> = { drive, calendar, canva };

  return (
    <section className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display font-bold text-[21px]">Configurações &gt; Integrações</h2>
          <p className="text-[13px] text-muted">
            Conexões e rotinas automáticas que costumavam quebrar em silêncio — se o Google/Canva revoga o token, ou
            se um cron falha (token do Asaas expirado, por exemplo), o único jeito de saber era abrir os logs de
            função da Vercel. Esta tela existe pra isso aparecer aqui em vez de lá.
          </p>
        </div>
        <Link href="/configuracoes/usuarios" className="btn-ghost underline underline-offset-2 whitespace-nowrap">
          ← usuários
        </Link>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="font-display font-bold text-[15px]">Conexões</h3>
        {INTEGRACOES.map((i) => {
          const s = status[i.chave];
          const quebrada = s.conectado && !!s.erro;
          return (
            <div
              key={i.chave}
              className="border rounded-lg p-4 flex items-center justify-between gap-3 flex-wrap bg-paper"
              style={{ borderColor: quebrada ? "var(--critical)" : "var(--line)" }}
            >
              <div className="flex flex-col gap-0.5">
                <span className="font-display font-bold text-[15px]">{i.nome}</span>
                <span className="text-[12px] text-ink-2">{i.descricao}</span>
                {quebrada && (
                  <span className="text-[12px] text-critical mt-1">
                    ⚠ falhou ao renovar {s.erroEm ? `em ${fmtQuando(s.erroEm)}` : ""}: {s.erro}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {s.conectado && !quebrada && <span className="text-xs text-good font-semibold">✓ conectado</span>}
                {!s.conectado && <span className="text-xs text-muted">não conectado</span>}
                {(!s.conectado || quebrada) && (
                  <a href={i.conectar} className="btn text-xs">
                    {quebrada ? "reconectar" : "conectar"}
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="font-display font-bold text-[15px]">Saúde dos crons</h3>
        {crons.map((c) => {
          const quebrado = !c.nuncaRodou && !c.ultimoSucesso;
          return (
            <div
              key={c.chave}
              className="border rounded-lg p-4 flex items-center justify-between gap-3 flex-wrap bg-paper"
              style={{ borderColor: quebrado ? "var(--critical)" : "var(--line)" }}
            >
              <div className="flex flex-col gap-0.5">
                <span className="font-display font-bold text-[15px]">{c.label}</span>
                {c.nuncaRodou && <span className="text-[12px] text-muted">ainda não rodou nenhuma vez.</span>}
                {!c.nuncaRodou && (
                  <span className="text-[12px] text-ink-2">
                    última execução: {fmtQuando(c.ultimaExecucaoEm)}
                    {c.ultimoSucesso && c.ultimoDetalhe ? ` — ${c.ultimoDetalhe}` : ""}
                  </span>
                )}
                {quebrado && (
                  <span className="text-[12px] text-critical mt-1">
                    ⚠ falhou: {c.ultimoErro}
                    {c.ultimoOkEm ? ` (última vez que funcionou: ${fmtQuando(c.ultimoOkEm)})` : " (nunca funcionou)"}
                  </span>
                )}
              </div>
              <div className="shrink-0">
                {c.nuncaRodou && <span className="text-xs text-muted">sem dado</span>}
                {!c.nuncaRodou && !quebrado && <span className="text-xs text-good font-semibold">✓ ok</span>}
                {quebrado && <span className="text-xs text-critical font-semibold">⚠ com erro</span>}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
