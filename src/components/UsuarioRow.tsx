"use client";

import { useTransition } from "react";
import { alterarPapelUsuario, removerUsuario } from "@/actions/usuarios";
import { ConfirmarExclusao } from "@/components/ConfirmarExclusao";
import type { Profile, UserRole } from "@/lib/types";

export function UsuarioRow({ usuario, isSelf, meuEmail }: { usuario: Profile; isSelf: boolean; meuEmail: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <tr className="border-t border-line/50">
      <td className="px-3 py-2">{usuario.nome || "—"} {isSelf && <span className="text-muted text-xs">(você)</span>}</td>
      <td className="px-3 py-2">{usuario.email}</td>
      <td className="px-3 py-2">
        <select
          className="input py-1"
          defaultValue={usuario.role}
          disabled={pending}
          onChange={(e) =>
            startTransition(() => {
              alterarPapelUsuario(usuario.id, e.target.value as UserRole);
            })
          }
        >
          <option value="master">Master</option>
          <option value="comercial">Comercial</option>
          <option value="financeiro">Financeiro</option>
          <option value="onboarding">Onboarding</option>
        </select>
      </td>
      <td className="px-3 py-2">
        {!isSelf && (
          <ConfirmarExclusao
            itemLabel={`o usuário ${usuario.email}`}
            acao={() => removerUsuario(usuario.id)}
            senha
            userEmail={meuEmail}
          />
        )}
      </td>
    </tr>
  );
}
