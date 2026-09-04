"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { canAccessTab } from "@/lib/permissions";
import { NavBadge } from "@/components/NavBadge";
import type { UserRole } from "@/lib/types";

type TabItem = { key: string; href: string; label: string; icon: () => React.JSX.Element };

const TABS: TabItem[] = [
  { key: "dashboard", href: "/dashboard", label: "Início", icon: IconHome },
  { key: "clientes", href: "/clientes", label: "Clientes", icon: IconUsers },
  { key: "consultoria", href: "/consultoria", label: "Consultoria", icon: IconClipboard },
  { key: "propostas", href: "/propostas", label: "Propostas", icon: IconSend },
  { key: "tarefas", href: "/tarefas", label: "Tarefas", icon: IconCheck },
  { key: "financeiro", href: "/financeiro", label: "Financeiro", icon: IconChart },
  { key: "icp", href: "/icp", label: "ICP", icon: IconTarget },
];

export function MobileTabNav({
  role,
  pendenciasFinanceiro = 0,
  pendenciasTarefas = 0,
}: {
  role: UserRole;
  pendenciasFinanceiro?: number;
  pendenciasTarefas?: number;
}) {
  const pathname = usePathname();
  const BADGES: Record<string, number> = { financeiro: pendenciasFinanceiro, tarefas: pendenciasTarefas };
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
        const active = pathname.startsWith(t.href.split("/").slice(0, 2).join("/"));
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
            <span className="text-[10px] font-semibold">{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

const ICON_PROPS = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function IconHome() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}
function IconUsers() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function IconClipboard() {
  return (
    <svg {...ICON_PROPS}>
      <rect x="4" y="4" width="16" height="18" rx="2" />
      <path d="M9 3h6a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
      <line x1="8" y1="11" x2="16" y2="11" />
      <line x1="8" y1="15" x2="13" y2="15" />
    </svg>
  );
}
function IconSend() {
  return (
    <svg {...ICON_PROPS}>
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}
function IconCheck() {
  return (
    <svg {...ICON_PROPS}>
      <polyline points="9 11 12 14 22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}
function IconChart() {
  return (
    <svg {...ICON_PROPS}>
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}
function IconTarget() {
  return (
    <svg {...ICON_PROPS}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" />
    </svg>
  );
}
function IconSettings() {
  return (
    <svg {...ICON_PROPS}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  );
}
