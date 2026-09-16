"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { canAccessTab } from "@/lib/permissions";
import { NavBadge } from "@/components/NavBadge";
import { IconHome, IconUsers, IconCheck, IconChart, IconTarget, IconMarketing, IconSettings } from "@/components/NavIcons";
import type { UserRole } from "@/lib/types";

type TabItem = {
  key: string;
  href: string;
  label: string;
  icon: () => React.JSX.Element;
  // pra "Comercial", que agrupa 3 rotas num ícone só — ver Sidebar.tsx pro
  // mesmo agrupamento no desktop (lá como subitens expansíveis).
  ativoEm?: string[];
};

const TABS: TabItem[] = [
  { key: "dashboard", href: "/dashboard", label: "Início", icon: IconHome },
  { key: "clientes", href: "/clientes", label: "Comercial", icon: IconUsers, ativoEm: ["/clientes", "/consultoria", "/propostas"] },
  { key: "tarefas", href: "/tarefas", label: "Tarefas", icon: IconCheck },
  { key: "financeiro", href: "/financeiro", label: "Financeiro", icon: IconChart },
  { key: "icp", href: "/icp", label: "ICP", icon: IconTarget },
  { key: "marketing", href: "/marketing", label: "Marketing", icon: IconMarketing },
];

export function MobileTabNav({
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
  const BADGES: Record<string, number> = {
    financeiro: pendenciasFinanceiro,
    tarefas: pendenciasTarefas,
    configuracoes: integracoesComErro,
  };
  const tabs: TabItem[] = TABS.filter((t) => canAccessTab(role, t.key));
  if (role === "master") {
    tabs.push({ key: "configuracoes", href: "/configuracoes/usuarios", label: "Config", icon: IconSettings });
  }

  return (
    <nav
      className="hidden max-[767px]:flex fixed left-3 right-3 z-40 border border-line bg-paper rounded-2xl shadow-[var(--shadow)]"
      style={{ bottom: "calc(10px + env(safe-area-inset-bottom))" }}
    >
      {tabs.map((t) => {
        const active = t.ativoEm
          ? t.ativoEm.some((p) => pathname.startsWith(p))
          : pathname.startsWith(t.href.split("/").slice(0, 2).join("/"));
        const Icon = t.icon;
        return (
          <Link
            key={t.key}
            href={t.href}
            className="flex-1 flex flex-col items-center gap-0.5 pt-2 pb-1.5 relative"
            style={{ color: active ? "var(--accent-ink)" : "var(--muted)" }}
          >
            <span className="relative">
              <Icon />
              {!!BADGES[t.key] && (
                <span
                  className="absolute -top-1 -right-2.5 text-[9px] font-bold text-white rounded-full min-w-[14px] h-[14px] px-[3px] flex items-center justify-center"
                  style={{ background: "var(--critical)" }}
                >
                  {BADGES[t.key] > 99 ? "99+" : BADGES[t.key]}
                </span>
              )}
            </span>
            <span className="text-[10.5px] font-semibold">{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
