import Link from "next/link";
import { requireMaster } from "@/lib/auth";
import { driveStatus } from "@/lib/googleDrive";
import { calendarStatus } from "@/lib/googleCalendar";
import { canvaStatus } from "@/lib/canva";
import type { StatusConexao } from "@/lib/googleDrive";

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

  const [drive, calendar, canva] = await Promise.all([driveStatus(), calendarStatus(), canvaStatus()]);
  const status: Record<string, StatusConexao> = { drive, calendar, canva };

  return (
    <section className="flex flex-col gap-3.5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display font-bold text-[21px]">Configurações &gt; Integrações</h2>
          <p className="text-[13px] text-muted">
            Cada uma dessas é uma conexão única, compartilhada por todo mundo que usa o sistema — se o token for
            revogado do lado do Google/Canva (troca de senha, desconexão manual, 6 meses sem uso), quebra pra todo
            mundo de uma vez. Esta tela existe pra isso não passar em silêncio.
          </p>
        </div>
        <Link href="/configuracoes/usuarios" className="btn-ghost underline underline-offset-2 whitespace-nowrap">
          ← usuários
        </Link>
      </div>

      <div className="flex flex-col gap-3">
        {INTEGRACOES.map((i) => {
          const s = status[i.chave];
          const quebrada = s.conectado && !!s.erro;
          return (
            <div
              key={i.chave}
              className="border rounded-xl p-4 flex items-center justify-between gap-3 flex-wrap bg-paper"
              style={{ borderColor: quebrada ? "var(--critical)" : "var(--line)" }}
            >
              <div className="flex flex-col gap-0.5">
                <span className="font-display font-bold text-[15px]">{i.nome}</span>
                <span className="text-[12px] text-ink-2">{i.descricao}</span>
                {quebrada && (
                  <span className="text-[12px] text-critical mt-1">
                    ⚠ falhou ao renovar {s.erroEm ? `em ${new Date(s.erroEm).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}` : ""}:{" "}
                    {s.erro}
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
    </section>
  );
}
