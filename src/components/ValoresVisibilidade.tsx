"use client";

import { createContext, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "fs_valores_ocultos";

const Ctx = createContext<{ visivel: boolean; toggle: () => void }>({ visivel: true, toggle: () => {} });

// Provider único, montado no layout do app (não em cada página) — assim o
// estado sobrevive a troca de aba/página. localStorage + evento "storage"
// garantem que também sobrevive a um reload e fica em sincronia entre abas.
export function VisibilidadeProvider({ children }: { children: React.ReactNode }) {
  const [visivel, setVisivel] = useState(true);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY) === "1") setVisivel(false);
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY) setVisivel(e.newValue !== "1");
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  function toggle() {
    setVisivel((v) => {
      const novo = !v;
      localStorage.setItem(STORAGE_KEY, novo ? "0" : "1");
      return novo;
    });
  }

  return <Ctx.Provider value={{ visivel, toggle }}>{children}</Ctx.Provider>;
}

export function BotaoOcultarValores() {
  const { visivel, toggle } = useContext(Ctx);
  return (
    <button
      type="button"
      onClick={toggle}
      className="text-muted hover:text-ink-2 shrink-0"
      aria-label={visivel ? "ocultar valores" : "mostrar valores"}
      title={visivel ? "ocultar faturamento, lucro e bônus" : "mostrar valores"}
    >
      {visivel ? (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      ) : (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.5 18.5 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </svg>
      )}
    </button>
  );
}

export function ValorOcultavel({ children }: { children: React.ReactNode }) {
  const { visivel } = useContext(Ctx);
  return <>{visivel ? children : "••••••"}</>;
}
