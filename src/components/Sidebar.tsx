"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { canAccessTab } from "@/lib/permissions";
import { NavBadge } from "@/components/NavBadge";
import { IconHome, IconUsers, IconCheck, IconChart, IconTarget, IconMarketing, IconSettings, IconMenu } from "@/components/NavIcons";
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

const COLLAPSE_KEY = "sidebarCollapsed";

function itemAtivo(pathname: string, href: string) {
  return pathname.startsWith(href);
}

// "min-[768px]:hidden" só entra em vigor a partir de 768px — no celular
// (onde a sidebar vira gaveta, sempre cheia) o rótulo continua aparecendo
// mesmo com `collapsed` true, porque esse estado é só do modo ícone do
// desktop.
function LinkPrincipal({
  href,
  label,
  icon: Icon,
  ativo,
  badge,
  collapsed,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: () => React.JSX.Element;
  ativo: boolean;
  badge?: number;
  collapsed: boolean;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      title={collapsed ? label : undefined}
      className="flex items-center gap-2.5 px-3 py-2 rounded-md font-display font-bold text-[14px] transition-colors"
      style={{
        color: ativo ? "var(--accent-ink)" : "var(--ink-2)",
        background: ativo ? "var(--accent-wash)" : "transparent",
      }}
    >
      <Icon />
      <span className={`flex-1 min-w-0 truncate ${collapsed ? "min-[768px]:hidden" : ""}`}>{label}</span>
      <span className={collapsed ? "min-[768px]:hidden" : ""}>
        <NavBadge count={badge || 0} />
      </span>
    </Link>
  );
}

function GrupoExpansivel({
  label,
  icon: Icon,
  itens,
  pathname,
  badge,
  collapsed,
  onExpandSidebar,
  onNavigate,
}: {
  label: string;
  icon: () => React.JSX.Element;
  itens: Item[];
  pathname: string;
  badge?: number;
  collapsed: boolean;
  onExpandSidebar: () => void;
  onNavigate: () => void;
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
        title={collapsed ? label : undefined}
        onClick={() => {
          if (collapsed) {
            // Colapsada (só ícones, desktop): 1º clique já expande a
            // sidebar inteira de volta, em vez de só abrir o grupo sem
            // ninguém ver o resultado.
            onExpandSidebar();
            setAberto(true);
          } else {
            setAberto((v) => !v);
          }
        }}
        className="flex items-center gap-2.5 px-3 py-2 rounded-md font-display font-bold text-[14px] transition-colors"
        style={{ color: ativoNoGrupo ? "var(--accent-ink)" : "var(--ink-2)", background: ativoNoGrupo && !aberto ? "var(--accent-wash)" : "transparent" }}
      >
        <Icon />
        <span className={`flex-1 min-w-0 truncate text-left ${collapsed ? "min-[768px]:hidden" : ""}`}>{label}</span>
        <span className={collapsed ? "min-[768px]:hidden" : ""}>
          <NavBadge count={badge || 0} />
        </span>
        <span
          className={`text-[10px] transition-transform ${collapsed ? "min-[768px]:hidden" : ""}`}
          style={{ transform: aberto ? "rotate(90deg)" : "rotate(0deg)" }}
        >
          ▶
        </span>
      </button>
      {aberto && (
        <div className={`flex flex-col ml-[34px] mt-0.5 gap-0.5 ${collapsed ? "min-[768px]:hidden" : ""}`}>
          {itens.map((i) => {
            const ativo = itemAtivo(pathname, i.href);
            return (
              <Link
                key={i.href}
                href={i.href}
                onClick={onNavigate}
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
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const BADGES: Record<string, number> = { financeiro: pendenciasFinanceiro, tarefas: pendenciasTarefas };
  const nav = NAV.filter((e) => canAccessTab(role, e.key));

  // Lido só depois de montar (não no primeiro render) pra não gerar
  // mismatch de hidratação entre servidor e cliente — o flash de um
  // frame em largura cheia é aceitável.
  useEffect(() => {
    const salvo = localStorage.getItem(COLLAPSE_KEY);
    if (salvo === "1") setCollapsed(true);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  function alternarColapso() {
    setCollapsed((v) => {
      localStorage.setItem(COLLAPSE_KEY, v ? "0" : "1");
      return !v;
    });
    // No celular esse mesmo botão fica dentro da gaveta aberta — clicar
    // nele também fecha a gaveta (no desktop mobileOpen já é sempre
    // false, então isso não faz diferença nenhuma lá).
    setMobileOpen(false);
  }

  return (
    <>
      {/* Botão flutuante que abre a gaveta no celular — só existe quando
          ela está fechada; uma vez aberta, o botão de dentro da própria
          sidebar assume o fechamento. */}
      {!mobileOpen && (
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir menu"
          className="hidden max-[767px]:flex fixed top-3 left-3 z-40 items-center justify-center w-10 h-10 rounded-full bg-paper border border-line shadow-[var(--shadow)]"
        >
          <IconMenu />
        </button>
      )}

      {/* Fundo escurecido atrás da gaveta aberta no celular — clicar nele
          fecha, igual qualquer drawer. */}
      {mobileOpen && (
        <div className="hidden max-[767px]:block fixed inset-0 bg-black/40 z-40" onClick={() => setMobileOpen(false)} />
      )}

      <aside
        className={`shrink-0 border-r border-line bg-paper overflow-y-auto flex flex-col
          max-[767px]:fixed max-[767px]:inset-y-0 max-[767px]:left-0 max-[767px]:z-50 max-[767px]:w-[248px] max-[767px]:transition-transform max-[767px]:duration-200
          ${mobileOpen ? "max-[767px]:translate-x-0" : "max-[767px]:-translate-x-full"}
          min-[768px]:sticky min-[768px]:top-0 min-[768px]:h-screen
          ${collapsed ? "min-[768px]:w-16" : "min-[768px]:w-[248px]"}`}
      >
        <div className="flex items-center gap-2 px-3 pt-6 pb-5">
          <button
            type="button"
            onClick={alternarColapso}
            aria-label="Minimizar menu"
            className="shrink-0 flex items-center justify-center w-8 h-8 rounded-md hover:bg-paper-2 text-ink-2"
          >
            <IconMenu />
          </button>
          <Link href="/dashboard" className={`brandmark text-[17px] truncate ${collapsed ? "min-[768px]:hidden" : ""}`}>
            Food Scale
          </Link>
        </div>

        <nav className="flex flex-col gap-0.5 px-3 flex-1">
          {nav.map((e) =>
            e.tipo === "link" ? (
              <LinkPrincipal
                key={e.key}
                href={e.href}
                label={e.label}
                icon={e.icon}
                ativo={itemAtivo(pathname, e.href)}
                badge={BADGES[e.key]}
                collapsed={collapsed}
                onNavigate={() => setMobileOpen(false)}
              />
            ) : (
              <GrupoExpansivel
                key={e.key}
                label={e.label}
                icon={e.icon}
                itens={e.itens}
                pathname={pathname}
                collapsed={collapsed}
                onExpandSidebar={() => {
                  setCollapsed(false);
                  localStorage.setItem(COLLAPSE_KEY, "0");
                }}
                onNavigate={() => setMobileOpen(false)}
              />
            )
          )}
        </nav>

        {/* Configurações fica ancorada perto do rodapé, separada do resto —
            convenção comum de "config" ficar à parte da navegação de
            trabalho do dia a dia, e só master enxerga essa seção. */}
        {role === "master" && (
          <div className="px-3 pb-5 pt-2 border-t border-line mt-2">
            <GrupoExpansivel
              label="Configurações"
              icon={IconSettings}
              itens={GRUPO_CONFIGURACOES}
              pathname={pathname}
              badge={integracoesComErro}
              collapsed={collapsed}
              onExpandSidebar={() => {
                setCollapsed(false);
                localStorage.setItem(COLLAPSE_KEY, "0");
              }}
              onNavigate={() => setMobileOpen(false)}
            />
          </div>
        )}
      </aside>
    </>
  );
}
