import Link from "next/link";
import { requireMaster } from "@/lib/auth";
import { listarUsuarios } from "@/actions/usuarios";
import { ConvidarUsuarioForm } from "@/components/ConvidarUsuarioForm";
import { UsuarioRow } from "@/components/UsuarioRow";
import type { Profile } from "@/lib/types";

export default async function UsuariosPage() {
  // requireMaster já redireciona pro /dashboard se o papel não for
  // master — checado no servidor, então nem essa query abaixo roda pra
  // quem não devia estar aqui.
  const me = await requireMaster();
  const usuarios = await listarUsuarios();

  return (
    <section className="flex flex-col gap-3.5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display font-bold text-[21px]">Configurações &gt; Usuários</h2>
          <p className="text-[13px] text-muted">
            Só quem tem papel &quot;master&quot; acessa essa tela — checado no servidor e no banco (RLS), não só escondido no menu.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link href="/configuracoes/integracoes" className="btn-ghost underline underline-offset-2 whitespace-nowrap">
            integrações →
          </Link>
          <Link href="/configuracoes/auditoria" className="btn-ghost underline underline-offset-2 whitespace-nowrap">
            histórico de exclusões →
          </Link>
        </div>
      </div>

      <ConvidarUsuarioForm />

      <div className="border border-line rounded-xl overflow-auto bg-paper">
        <table className="w-full text-[13px] border-collapse">
          <thead>
            <tr className="bg-paper-2">
              <th className="px-3 py-2.5 text-left text-[10.5px] uppercase tracking-wide text-muted font-semibold">Nome</th>
              <th className="px-3 py-2.5 text-left text-[10.5px] uppercase tracking-wide text-muted font-semibold">Email</th>
              <th className="px-3 py-2.5 text-left text-[10.5px] uppercase tracking-wide text-muted font-semibold">Papel</th>
              <th className="px-3 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {(usuarios as Profile[]).map((u) => (
              <UsuarioRow key={u.id} usuario={u} isSelf={u.id === me.id} meuEmail={me.email} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
