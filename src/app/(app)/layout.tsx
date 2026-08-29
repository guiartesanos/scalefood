import { requireProfile } from "@/lib/auth";
import { MetaBar } from "@/components/MetaBar";
import { TabNav } from "@/components/TabNav";
import { IdleLogout } from "@/components/IdleLogout";
import { signOut } from "@/actions/auth";
import { roleLabel } from "@/lib/permissions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Verificação de sessão no servidor — roda ANTES de qualquer dado ser
  // buscado ou renderizado. Sem sessão válida, requireProfile já
  // redireciona pro /login.
  const profile = await requireProfile();

  return (
    <div className="min-h-screen flex flex-col bg-page">
      <header className="max-w-[1220px] mx-auto w-full px-6 pt-6 pb-2 flex items-center justify-between">
        <span className="brandmark text-xl">Food Scale</span>
        <div className="flex items-center gap-3 text-xs text-ink-2">
          <span>
            {profile.nome || profile.email} · <span className="text-accent-ink font-semibold">{roleLabel(profile.role)}</span>
          </span>
          <form action={signOut}>
            <button type="submit" className="btn-ghost">sair</button>
          </form>
        </div>
      </header>

      <TabNav role={profile.role} />
      <MetaBar role={profile.role} />

      <main className="max-w-[1220px] mx-auto w-full px-6 py-7 flex flex-col gap-7 flex-1">
        {children}
      </main>

      <IdleLogout />
    </div>
  );
}
