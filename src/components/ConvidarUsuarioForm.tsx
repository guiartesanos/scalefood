"use client";

import { useState, useTransition } from "react";
import { convidarUsuario, criarUsuarioComSenha } from "@/actions/usuarios";

export function ConvidarUsuarioForm() {
  const [modo, setModo] = useState<"convite" | "senha">("convite");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const acao = modo === "convite" ? convidarUsuario : criarUsuarioComSenha;
      const result = await acao(formData);
      if (result?.error) {
        setError(result.error);
        setOk(null);
      } else {
        setError(null);
        setOk(modo === "convite" ? "Convite enviado por email." : "Conta criada — já pode passar o email e a senha pra pessoa.");
      }
    });
  }

  return (
    <div className="bg-paper-2 border border-dashed border-line rounded-xl p-4 flex flex-col gap-3">
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={() => {
            setModo("convite");
            setError(null);
            setOk(null);
          }}
          className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
            modo === "convite" ? "border-accent text-accent-ink bg-accent-wash" : "border-line text-muted"
          }`}
        >
          convidar por e-mail
        </button>
        <button
          type="button"
          onClick={() => {
            setModo("senha");
            setError(null);
            setOk(null);
          }}
          className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
            modo === "senha" ? "border-accent text-accent-ink bg-accent-wash" : "border-line text-muted"
          }`}
        >
          criar com senha direto
        </button>
      </div>

      <form action={handleSubmit} className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1 min-w-[160px]">
          <label className="text-[11px] uppercase tracking-wide text-muted font-semibold">Nome</label>
          <input name="nome" className="input" />
        </div>
        <div className="flex flex-col gap-1 min-w-[220px]">
          <label className="text-[11px] uppercase tracking-wide text-muted font-semibold">Email</label>
          <input name="email" type="email" required className="input" />
        </div>
        {modo === "senha" && (
          <div className="flex flex-col gap-1 min-w-[160px]">
            <label className="text-[11px] uppercase tracking-wide text-muted font-semibold">Senha (mín. 8 caracteres)</label>
            <input name="senha" type="text" required minLength={8} className="input" placeholder="defina a senha de acesso" />
          </div>
        )}
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
          {pending ? "salvando..." : modo === "convite" ? "+ convidar usuário" : "+ criar conta"}
        </button>
        {error && <p className="text-critical text-sm w-full">{error}</p>}
        {ok && <p className="text-good text-sm w-full">{ok}</p>}
      </form>
    </div>
  );
}
