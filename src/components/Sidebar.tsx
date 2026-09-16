"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { canAccessTab } from "@/lib/permissions";
import { NavBadge } from "@/components/NavBadge";
import { IconHome, IconUsers, IconCheck, IconChart, IconTarget, IconMarketing, IconSettings } from "@/components/NavIcons";
import type { UserRole } from "@/lib/types";

type Item = { href: string; label: string };

type Entrada =
  | { tipo: "link"; key: string; href: string; label: string; icon: () => React.JSX.Element }
  | { tipo: "grupo"; key: string; label: string; icon: () => React.JSX.Element; itens: Item[] };

// Mesmos agrupamentos que já existiam no dropdown "Comercial ▾" (extinto
// aqui — vira um grupo expansível fixo na sidebar) e nas 3 páginas de
// Configurações, que hoje se linkavam ad hoc umas às outras.
const NAV: Entrada[] = [
  { tipo: "link", key: "dashboard", href: "/dashboard", label: "Dashboard", icon: IconHome },
  {
    tipo: "grupo",
    key: "clientes",
    label: "Comercial",
    icon: IconUsers,
    itens: [
      { href: "/clientes", label: "Clientes" },
      { href: "/consultoria", label: "Consultoria" },
      { href: "/propostas", label: "Propostas" },
    ],
  },
  { tipo: "link", key: "financeiro", href: "/financeiro", label: "Financeiro", icon: IconChart },
  { tipo: "link", key: "tarefas", href: "/tarefas", label: "Tarefas", icon: IconCheck },
  { tipo: "link", key: "icp", href: "/icp", label: "ICP", icon: IconTarget },
  { tipo: "link", key: "marketing", href: "/marketing", label: "Marketing", icon: IconMarketing },
];

const GRUPO_CONFIGURACOES: Item[] = [
  { href: "/configuracoes/usuarios", label: "Usuários" },
  { href: "/configuracoes/integracoes", label: "Integrações" },
  { href: "/configuracoes/auditoria", label: "Histórico de exclusões" },
];

function itemAtivo(pathname: string, href: string) {
  return pathname.startsWith(href);
}

function LinkPrincipal({ href, label, icon: Icon, ativo, badge }: { href: string; label: string; icon: () => React.JSX.Element; ativo: boolean; badge?: number }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 px-3 py-2 rounded-md font-display font-bold text-[14px] transition-colors"
      style={{
        color: ativo ? "var(--accent-ink)" : "var(--ink-2)",
        background: ativo ? "var(--accent-wash)" : "transparent",
      }}
    >
      <Icon />
      <span className="flex-1 min-w-0 truncate">{label}</span>
      <NavBadge count={badge || 0} />
    </Link>
  );
}

function GrupoExpansivel({
  label,
  icon: Icon,
  itens,
  pathname,
  badge,
}: {
  label: string;
  icon: () => React.JSX.Element;
  itens: Item[];
  pathname: string;
  badge?: number;
}) {
  const ativoNoGrupo = itens.some((i) => itemAtivo(pathname, i.href));
  const [aberto, setAberto] = useState(ativoNoGrupo);

  // Reabre sozinho se a navegação (link direto, botão "voltar" etc.) cair
  // dentro do grupo enquanto ele estava fechado.
  useEffect(() => {
    if (ativoNoGrupo) setAberto(true);
  }, [ativoNoGrupo]);

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="flex items-center gap-2.5 px-3 py-2 rounded-md font-display font-bold text-[14px] transition-colors"
        style={{ color: ativoNoGrupo ? "var(--accent-ink)" : "var(--ink-2)", background: ativoNoGrupo && !aberto ? "var(--accent-wash)" : "transparent" }}
      >
        <Icon />
        <span className="flex-1 min-w-0 truncate text-left">{label}</span>
        <NavBadge count={badge || 0} />
        <span
          className="text-[10px] transition-transform"
          style={{ transform: aberto ? "rotate(90deg)" : "rotate(0deg)" }}
        >
          ▶
        </span>
      </button>
      {aberto && (
        <div className="flex flex-col ml-[34px] mt-0.5 gap-0.5">
          {itens.map((i) => {
            const ativo = itemAtivo(pathname, i.href);
            return (
              <Link
                key={i.href}
                href={i.href}
                className="px-3 py-1.5 rounded-md font-display font-semibold text-[13px] transition-colors truncate"
                style={{
                  color: ativo ? "var(--accent-ink)" : "var(--muted)",
                  background: ativo ? "var(--accent-wash)" : "transparent",
                }}
              >
                {i.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Sidebar({
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
  const nav = NAV.filter((e) => canAccessTab(role, e.key));

  return (
    <aside className="max-[767px]:hidden shrink-0 w-[248px] border-r border-line bg-paper sticky top-0 h-screen overflow-y-auto flex flex-col">
      <Link href="/dashboard" className="brandmark text-[17px] px-5 pt-6 pb-5 block">
        Food Scale
      </Link>

      <nav className="flex flex-col gap-0.5 px-3 flex-1">
        {nav.map((e) =>
          e.tipo === "link" ? (
            <LinkPrincipal key={e.key} href={e.href} label={e.label} icon={e.icon} ativo={itemAtivo(pathname, e.href)} badge={BADGES[e.key]} />
          ) : (
            <GrupoExpansivel key={e.key} label={e.label} icon={e.icon} itens={e.itens} pathname={pathname} />
          )
        )}
      </nav>

      {/* Configurações fica ancorada perto do rodapé, separada do resto —
          convenção comum de "config" ficar à parte da navegação de
          trabalho do dia a dia, e só master enxerga essa seção. */}
      {role === "master" && (
        <div className="px-3 pb-5 pt-2 border-t border-line mt-2">
          <GrupoExpansivel label="Configurações" icon={IconSettings} itens={GRUPO_CONFIGURACOES} pathname={pathname} badge={integracoesComErro} />
        </div>
      )}
    </aside>
  );
}
