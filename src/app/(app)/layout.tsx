import { requireProfile } from "@/lib/auth";
import { getClientes } from "@/lib/data";
import { getContasPendentes, getRepassesAvulsosPendentes, getTarefasPendentes } from "@/lib/pendencias";
import { driveStatus } from "@/lib/googleDrive";
import { calendarStatus } from "@/lib/googleCalendar";
import { canvaStatus } from "@/lib/canva";
import { MetaBar } from "@/components/MetaBar";
import { TabNav } from "@/components/TabNav";
import { MobileTabNav } from "@/components/MobileTabNav";
import { CommandPalette } from "@/components/CommandPalette";
import { IdleLogout } from "@/components/IdleLogout";
import { PendenciasModal } from "@/components/PendenciasModal";
import { RouteProgress } from "@/components/RouteProgress";
import { VisibilidadeProvider, BotaoOcultarValores } from "@/components/ValoresVisibilidade";
import { signOut } from "@/actions/auth";
import { roleLabel, canAccessTab } from "@/lib/permissions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Verificação de sessão no servidor — roda ANTES de qualquer dado ser
  // buscado ou renderizado. Sem sessão válida, requireProfile já
  // redireciona pro /login.
  const profile = await requireProfile();
  const clientes = await getClientes();

  const podeVerFinanceiro = canAccessTab(profile.role, "financeiro");
  const [contasPendentes, avulsasPendentes, tarefasPendentes, statusIntegracoes] = await Promise.all([
    podeVerFinanceiro ? getContasPendentes() : Promise.resolve([]),
    podeVerFinanceiro ? getRepassesAvulsosPendentes() : Promise.resolve([]),
    getTarefasPendentes(profile),
    // Só master vê a aba Configurações, então só master precisa pagar o
    // custo dessas 3 leituras (conexões OAuth compartilhadas — ver
    // /configuracoes/integracoes).
    profile.role === "master"
      ? Promise.all([driveStatus(), calendarStatus(), canvaStatus()])
      : Promise.resolve([]),
  ]);
  const pendenciasFinanceiro = contasPendentes.length + avulsasPendentes.length;
  const integracoesComErro = statusIntegracoes.filter((s) => s.conectado && s.erro).length;

  return (
    <VisibilidadeProvider>
      <RouteProgress />
      <div className="min-h-screen flex flex-col bg-page">
        <header className="max-w-[1220px] mx-auto w-full px-6 pt-6 pb-2 flex items-center justify-between">
          <span className="brandmark text-xl">Food Scale</span>
          <div className="flex items-center gap-3 text-xs text-ink-2">
            <CommandPalette role={profile.role} clientes={clientes.map((c) => ({ id: c.id, nome: c.nome }))} />
            <BotaoOcultarValores />
            <span className="max-[500px]:hidden">
              {profile.nome || profile.email} · <span className="text-accent-ink font-semibold">{roleLabel(profile.role)}</span>
            </span>
            <form action={signOut}>
              <button type="submit" className="btn-ghost">sair</button>
            </form>
          </div>
        </header>

        <TabNav
          role={profile.role}
          pendenciasFinanceiro={pendenciasFinanceiro}
          pendenciasTarefas={tarefasPendentes.length}
          integracoesComErro={integracoesComErro}
        />
        <MetaBar role={profile.role} />

        <main className="max-w-[1220px] mx-auto w-full px-6 py-7 max-[767px]:pb-20 flex flex-col gap-7 flex-1">
          {children}
        </main>

        <MobileTabNav
          role={profile.role}
          pendenciasFinanceiro={pendenciasFinanceiro}
          pendenciasTarefas={tarefasPendentes.length}
          integracoesComErro={integracoesComErro}
        />
        <IdleLogout />
        <PendenciasModal contas={contasPendentes} avulsas={avulsasPendentes} tarefas={tarefasPendentes} />
      </div>
    </VisibilidadeProvider>
  );
}
