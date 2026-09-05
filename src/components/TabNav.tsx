"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { canAccessTab } from "@/lib/permissions";
import { NavBadge } from "@/components/NavBadge";
import type { UserRole } from "@/lib/types";

const TABS = [
  { key: "dashboard", href: "/dashboard", label: "Dashboard" },
  { key: "financeiro", href: "/financeiro", label: "Financeiro" },
  { key: "tarefas", href: "/tarefas", label: "Tarefas" },
  { key: "icp", href: "/icp", label: "ICP" },
  { key: "marketing", href: "/marketing", label: "Marketing" },
];

// Clientes/Consultoria/Propostas agrupados num "Comercial ▾" — 8 abas no
// topo (9 com Configurações) tinha virado difícil de escanear, sobretudo
// no mobile. Cada uma tem seu próprio sub-nav no topo da página (ver
// ComercialSubNav.tsx) pra continuar trocando rápido entre as 3.
const GRUPO_COMERCIAL = [
  { key: "clientes", href: "/clientes", label: "Clientes" },
  { key: "consultoria", href: "/consultoria", label: "Consultoria" },
  { key: "propostas", href: "/propostas", label: "Propostas" },
];

function ComercialDropdown({ itens, ativo, pathname }: { itens: typeof GRUPO_COMERCIAL; ativo: boolean; pathname: string }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const detailsRef = useRef<HTMLDetailsElement>(null);

  // Fecha sozinho ao navegar — o <details> não desmonta na troca de rota
  // (TabNav mora no layout, persiste entre páginas), então sem isso o
  // menu ficaria aberto na página seguinte depois de clicar num item.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  function handleToggle(e: React.SyntheticEvent<HTMLDetailsElement>) {
    const isOpen = e.currentTarget.open;
    setOpen(isOpen);
    if (isOpen) {
      const rect = e.currentTarget.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.left });
    }
  }

  return (
    <details ref={detailsRef} open={open} onToggle={handleToggle}>
      <summary
        className="font-display font-bold text-[15px] px-3.5 pt-2.5 pb-2 whitespace-nowrap border-b-2 transition-colors cursor-pointer list-none select-none"
        style={{
          color: ativo ? "var(--accent-ink)" : "var(--muted)",
          borderColor: ativo ? "var(--accent)" : "transparent",
        }}
      >
        Comercial ▾
      </summary>
      {/* position:fixed (não absolute) de propósito — o <nav> pai tem
          overflow-x-auto, e por regra do CSS isso também força o eixo Y a
          cortar conteúdo que passa da altura da barra (um "absolute"
          normal ficava invisível, cortado pelo overflow do pai). Fixed
          escapa desse corte porque não usa o <nav> como containing block. */}
      {open && pos && (
        <div
          style={{ position: "fixed", top: pos.top, left: pos.left }}
          className="bg-paper border border-line rounded-md shadow-[var(--shadow)] flex flex-col py-1 min-w-[160px] z-50"
        >
          {itens.map((t) => (
            <Link
              key={t.key}
              href={t.href}
              className="font-display font-semibold text-[13px] px-3.5 py-2 whitespace-nowrap transition-colors hover:bg-paper-2"
              style={{ color: pathname.startsWith(t.href) ? "var(--accent-ink)" : "var(--ink)" }}
            >
              {t.label}
            </Link>
          ))}
        </div>
      )}
    </details>
  );
}

export function TabNav({
  role,
  pendenciasFinanceiro = 0,
  pendenciasTarefas = 0,
  integracoesComErro = 0,
}: {
  role: UserRole;
  pendenciasFinanceiro?: number;
  pendenciasTarefas?: number;
  integracoesComErro?: number;
}) {
  const pathname = usePathname();
  const BADGES: Record<string, number> = { financeiro: pendenciasFinanceiro, tarefas: pendenciasTarefas };

  const comercialVisivel = GRUPO_COMERCIAL.filter((t) => canAccessTab(role, t.key));
  const comercialAtivo = comercialVisivel.some((t) => pathname.startsWith(t.href));

  return (
    <nav className="max-[767px]:hidden flex gap-1 border-b border-line overflow-x-auto px-6 max-w-[1220px] mx-auto w-full">
      {TABS.filter((t) => canAccessTab(role, t.key)).map((t) => {
        const active = pathname.startsWith(t.href);
        return (
          <Fragment key={t.key}>
            <Link
              href={t.href}
              className="font-display font-bold text-[15px] px-3.5 pt-2.5 pb-2 whitespace-nowrap border-b-2 transition-colors"
              style={{
                color: active ? "var(--accent-ink)" : "var(--muted)",
                borderColor: active ? "var(--accent)" : "transparent",
              }}
            >
              {t.label}
              <NavBadge count={BADGES[t.key] || 0} />
            </Link>
            {/* Comercial entra logo depois de Dashboard — ancorado pela key
                (não pelo índice) porque Financeiro some do array filtrado
                pra quem não acessa, o que bagunçaria uma posição fixa. */}
            {t.key === "dashboard" && !!comercialVisivel.length && (
              <ComercialDropdown itens={comercialVisivel} ativo={comercialAtivo} pathname={pathname} />
            )}
          </Fragment>
        );
      })}
      {role === "master" && (
        <Link
          href="/configuracoes/usuarios"
          className="font-display font-bold text-[15px] px-3.5 pt-2.5 pb-2 whitespace-nowrap border-b-2 transition-colors ml-auto"
          style={{
            color: pathname.startsWith("/configuracoes") ? "var(--accent-ink)" : "var(--muted)",
            borderColor: pathname.startsWith("/configuracoes") ? "var(--accent)" : "transparent",
          }}
        >
          Configurações
          <NavBadge count={integracoesComErro} />
        </Link>
      )}
    </nav>
  );
}
