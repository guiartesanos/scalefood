"use client";

import { useState, useTransition } from "react";
import { convidarUsuario } from "@/actions/usuarios";

export function ConvidarUsuarioForm() {
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await convidarUsuario(formData);
      if (result?.error) {
        setError(result.error);
        setOk(false);
      } else {
        setError(null);
        setOk(true);
      }
    });
  }

  return (
    <form action={handleSubmit} className="bg-paper-2 border border-dashed border-line rounded-xl p-4 flex flex-wrap gap-3 items-end">
      <div className="flex flex-col gap-1 min-w-[160px]">
        <label className="text-[11px] uppercase tracking-wide text-muted font-semibold">Nome</label>
        <input name="nome" className="input" />
      </div>
      <div className="flex flex-col gap-1 min-w-[220px]">
        <label className="text-[11px] uppercase tracking-wide text-muted font-semibold">Email</label>
        <input name="email" type="email" required className="input" />
      </div>
      <div className="flex flex-col gap-1 min-w-[140px]">
        <label className="text-[11px] uppercase tracking-wide text-muted font-semibold">Papel</label>
        <select name="role" className="input" defaultValue="comercial">
          <option value="master">Master</option>
          <option value="comercial">Comercial</option>
          <option value="financeiro">Financeiro</option>
          <option value="onboarding">Onboarding</option>
        </select>
      </div>
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "convidando..." : "+ convidar usuário"}
      </button>
      {error && <p className="text-critical text-sm w-full">{error}</p>}
      {ok && <p className="text-good text-sm w-full">Convite enviado por email.</p>}
    </form>
  );
}
