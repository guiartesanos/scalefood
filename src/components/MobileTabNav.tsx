"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { canAccessTab } from "@/lib/permissions";
import type { UserRole } from "@/lib/types";

type TabItem = { key: string; href: string; label: string; icon: () => React.JSX.Element };

const TABS: TabItem[] = [
  { key: "dashboard", href: "/dashboard", label: "Início", icon: IconHome },
  { key: "clientes", href: "/clientes", label: "Clientes", icon: IconUsers },
  { key: "tarefas", href: "/tarefas", label: "Tarefas", icon: IconCheck },
  { key: "financeiro", href: "/financeiro", label: "Financeiro", icon: IconChart },
  { key: "icp", href: "/icp", label: "ICP", icon: IconTarget },
];

export function MobileTabNav({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const tabs: TabItem[] = TABS.filter((t) => canAccessTab(role, t.key));
  if (role === "master") {
    tabs.push({ key: "configuracoes", href: "/configuracoes/usuarios", label: "Config", icon: IconSettings });
  }

  return (
    <nav
      className="hidden max-[767px]:flex fixed bottom-0 left-0 right-0 z-40 border-t border-line bg-paper"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {tabs.map((t) => {
        const active = pathname.startsWith(t.href.split("/").slice(0, 2).join("/"));
        const Icon = t.icon;
        return (
          <Link
            key={t.key}
            href={t.href}
            className="flex-1 flex flex-col items-center gap-0.5 pt-2 pb-1.5"
            style={{ color: active ? "var(--accent-ink)" : "var(--muted)" }}
          >
            <Icon />
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
