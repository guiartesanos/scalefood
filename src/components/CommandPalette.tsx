"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { canAccessTab } from "@/lib/permissions";
import type { UserRole } from "@/lib/types";

const NAV_ITEMS = [
  { key: "dashboard", href: "/dashboard", label: "Dashboard" },
  { key: "financeiro", href: "/financeiro", label: "Financeiro" },
  { key: "clientes", href: "/clientes", label: "Clientes" },
  { key: "tarefas", href: "/tarefas", label: "Tarefas" },
  { key: "icp", href: "/icp", label: "ICP" },
];

interface Resultado {
  href: string;
  label: string;
  sub?: string;
  grupo: "Ir para" | "Clientes";
}

export function CommandPalette({ role, clientes }: { role: UserRole; clientes: { id: string; nome: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [ativo, setAtivo] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setAtivo(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const resultados: Resultado[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    const navs = NAV_ITEMS.filter((n) => canAccessTab(role, n.key)).filter((n) => !q || n.label.toLowerCase().includes(q));
    const config: Resultado[] =
      role === "master" && (!q || "configurações".includes(q) || "usuarios".includes(q))
        ? [{ href: "/configuracoes/usuarios", label: "Configurações", grupo: "Ir para" }]
        : [];
    const navResultados: Resultado[] = navs.map((n) => ({ href: n.href, label: n.label, grupo: "Ir para" }));
    const clienteResultados: Resultado[] = q
      ? clientes
          .filter((c) => c.nome.toLowerCase().includes(q))
          .slice(0, 8)
          .map((c) => ({ href: `/clientes/${c.id}`, label: c.nome, sub: "cliente", grupo: "Clientes" }))
      : [];
    return [...navResultados, ...config, ...clienteResultados];
  }, [query, role, clientes]);

  function ir(r: Resultado) {
    router.push(r.href);
    setOpen(false);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs text-muted border border-line rounded-full px-2.5 py-1 hover:border-accent"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        buscar <span className="hidden min-[600px]:inline text-[10px] opacity-70">⌘K</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-[600] flex items-start justify-center p-4 pt-[12vh]"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-paper border border-line rounded-xl w-full max-w-md shadow-[var(--shadow)] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setAtivo(0);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setAtivo((i) => Math.min(i + 1, resultados.length - 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setAtivo((i) => Math.max(i - 1, 0));
                } else if (e.key === "Enter" && resultados[ativo]) {
                  ir(resultados[ativo]);
                }
              }}
              placeholder="Buscar cliente ou ir para uma página..."
              className="w-full px-4 py-3.5 text-[15px] border-b border-line bg-transparent outline-none"
            />
            <div className="max-h-[50vh] overflow-y-auto py-1.5">
              {!resultados.length && <p className="text-sm text-muted px-4 py-3">Nada encontrado.</p>}
              {(["Ir para", "Clientes"] as const).map((grupo) => {
                const itens = resultados.filter((r) => r.grupo === grupo);
                if (!itens.length) return null;
                return (
                  <div key={grupo} className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-wide text-muted font-semibold px-4 pt-1.5 pb-1">{grupo}</span>
                    {itens.map((r) => {
                      const idx = resultados.indexOf(r);
                      return (
                        <button
                          key={r.href + r.label}
                          onClick={() => ir(r)}
                          onMouseEnter={() => setAtivo(idx)}
                          className="text-left px-4 py-2 text-[13.5px] flex items-center justify-between"
                          style={{ background: ativo === idx ? "var(--accent-wash)" : "transparent" }}
                        >
                          <span>{r.label}</span>
                          {r.sub && <span className="text-[11px] text-muted">{r.sub}</span>}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
