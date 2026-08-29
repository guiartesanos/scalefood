"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Os links de recuperação/convite do Supabase entregam a sessão via
// fragmento de URL (#access_token=...), não via query string — o
// fragmento nunca chega ao servidor. Sem isso, a Server Action de
// redefinir senha não encontra sessão nenhuma (cookie vazio) e falha.
export function SessionFromHash({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<"checking" | "ready" | "error">("checking");

  useEffect(() => {
    const supabase = createClient();

    async function run() {
      const hash = window.location.hash;
      if (hash.includes("access_token")) {
        const params = new URLSearchParams(hash.substring(1));
        const access_token = params.get("access_token");
        const refresh_token = params.get("refresh_token");
        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          window.history.replaceState(null, "", window.location.pathname);
          setState(error ? "error" : "ready");
          return;
        }
      }
      const { data } = await supabase.auth.getSession();
      setState(data.session ? "ready" : "error");
    }

    run();
  }, []);

  if (state === "checking") {
    return <p className="text-ink-2 text-sm">Verificando link...</p>;
  }
  if (state === "error") {
    return (
      <p className="text-critical text-sm">
        Este link de recuperação é inválido ou expirou. Solicite um novo em
        &quot;Esqueci minha senha&quot;.
      </p>
    );
  }
  return <>{children}</>;
}
