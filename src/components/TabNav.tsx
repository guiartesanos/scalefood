"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { canAccessTab } from "@/lib/permissions";
import { NavBadge } from "@/components/NavBadge";
import type { UserRole } from "@/lib/types";

const TABS = [
  { key: "dashboard", href: "/dashboard", label: "Dashboard" },
  { key: "financeiro", href: "/financeiro", label: "Financeiro" },
  { key: "clientes", href: "/clientes", label: "Clientes" },
  { key: "consultoria", href: "/consultoria", label: "Consultoria" },
  { key: "propostas", href: "/propostas", label: "Propostas" },
  { key: "tarefas", href: "/tarefas", label: "Tarefas" },
  { key: "icp", href: "/icp", label: "ICP" },
  { key: "marketing", href: "/marketing", label: "Marketing" },
];

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

  return (
    <nav className="max-[767px]:hidden flex gap-1 border-b border-line overflow-x-auto px-6 max-w-[1220px] mx-auto w-full">
      {TABS.filter((t) => canAccessTab(role, t.key)).map((t) => {
        const active = pathname.startsWith(t.href);
        return (
          <Link
            key={t.key}
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
