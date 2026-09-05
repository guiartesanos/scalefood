"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";

export function ConfirmarExclusao({
  itemLabel,
  acao,
  senha = false,
  userEmail,
  trigger = "remover",
  className = "btn-ghost",
}: {
  itemLabel: string;
  acao: () => Promise<unknown>;
  senha?: boolean;
  userEmail?: string;
  trigger?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [senhaValor, setSenhaValor] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function fechar() {
    setOpen(false);
    setSenhaValor("");
    setError(null);
  }

  function confirmar() {
    setError(null);
    if (senha && !senhaValor) {
      setError("Digite sua senha pra confirmar.");
      return;
    }
    startTransition(async () => {
      if (senha) {
        const supabase = createClient();
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: userEmail || "",
          password: senhaValor,
        });
        if (authError) {
          setError("Senha incorreta.");
          return;
        }
      }
      await acao();
      fechar();
    });
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {trigger}
      </button>
      {open && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-[500] flex items-start justify-center p-6 overflow-y-auto"
          onClick={fechar}
        >
          <div
            className="bg-paper border border-line rounded-lg p-6 max-w-sm w-full flex flex-col gap-3 shadow-[var(--shadow)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display font-bold text-lg" style={{ color: "var(--critical)" }}>
              Confirmar exclusão
            </h3>
            <p className="text-sm text-ink-2">
              Tem certeza que quer excluir <b className="text-ink">{itemLabel}</b>? Essa ação não pode ser
              desfeita.
            </p>
            {senha && (
              <div className="flex flex-col gap-1">
                <label className="text-[11px] uppercase tracking-wide text-muted font-semibold">
                  Digite sua senha pra confirmar
                </label>
                <input
                  type="password"
                  value={senhaValor}
                  onChange={(e) => setSenhaValor(e.target.value)}
                  className="input"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") confirmar();
                  }}
                />
              </div>
            )}
            {error && <p className="text-critical text-sm">{error}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={fechar} className="btn">
                cancelar
              </button>
              <button type="button" disabled={pending} onClick={confirmar} className="btn-critical">
                {pending ? "excluindo..." : "excluir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
