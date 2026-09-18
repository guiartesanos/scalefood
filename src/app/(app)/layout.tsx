import { requireProfile } from "@/lib/auth";
import { getClientes } from "@/lib/data";
import { getContasPendentes, getRepassesAvulsosPendentes, getTarefasPendentes } from "@/lib/pendencias";
import { driveStatus } from "@/lib/googleDrive";
import { calendarStatus } from "@/lib/googleCalendar";
import { canvaStatus } from "@/lib/canva";
import { listarSaudeCrons } from "@/lib/cronHealth";
import { MetaBar } from "@/components/MetaBar";
import { Sidebar } from "@/components/Sidebar";
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
  const [contasPendentes, avulsasPendentes, tarefasPendentes, statusIntegracoes, saudeCrons] = await Promise.all([
    podeVerFinanceiro ? getContasPendentes() : Promise.resolve([]),
    podeVerFinanceiro ? getRepassesAvulsosPendentes() : Promise.resolve([]),
    getTarefasPendentes(profile),
    // Só master vê a aba Configurações, então só master precisa pagar o
    // custo dessas leituras (conexões OAuth + saúde dos crons — ver
    // /configuracoes/integracoes).
    profile.role === "master"
      ? Promise.all([driveStatus(), calendarStatus(), canvaStatus()])
      : Promise.resolve([]),
    profile.role === "master" ? listarSaudeCrons() : Promise.resolve([]),
  ]);
  const pendenciasFinanceiro = contasPendentes.length + avulsasPendentes.length;
  const integracoesComErro =
    statusIntegracoes.filter((s) => s.conectado && s.erro).length +
    saudeCrons.filter((c) => !c.nuncaRodou && !c.ultimoSucesso).length;

  return (
    <VisibilidadeProvider>
      <RouteProgress />
      <div className="min-h-screen flex bg-page">
        <Sidebar
          role={profile.role}
          pendenciasFinanceiro={pendenciasFinanceiro}
          pendenciasTarefas={tarefasPendentes.length}
          integracoesComErro={integracoesComErro}
        />

        <div className="flex-1 min-w-0 flex flex-col">
          <header className="max-w-[1220px] mx-auto w-full px-6 pt-6 pb-2 flex items-center justify-between max-[767px]:pl-14">
            {/* No desktop a marca já mora na Sidebar — aqui só reaparece no
                mobile, deslocada pra não ficar embaixo do botão de menu
                flutuante (fixed top-3 left-3 na Sidebar). */}
            <span className="brandmark text-xl hidden max-[767px]:block">Food Scale</span>
            <div className="flex items-center gap-3 text-xs text-ink-2 ml-auto">
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

          <MetaBar role={profile.role} />

          <main className="max-w-[1220px] mx-auto w-full px-6 py-7 flex flex-col gap-7 flex-1">
            {children}
          </main>
        </div>

        <IdleLogout />
        <PendenciasModal contas={contasPendentes} avulsas={avulsasPendentes} tarefas={tarefasPendentes} />
      </div>
    </VisibilidadeProvider>
  );
}
