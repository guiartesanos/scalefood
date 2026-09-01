import type { UserRole } from "./types";

// ATENÇÃO: isto controla só o que aparece na tela (UX). A permissão de
// verdade está no RLS do Postgres (supabase/migrations/0001_init.sql) —
// mesmo que alguém edite este arquivo ou chame a API direto, o banco
// barra. Ver enforce_cliente_field_perms(), a view clientes_view, e as
// policies de cada tabela.

export function canAccessTab(role: UserRole, tab: string): boolean {
  if (role === "master") return true;
  if (tab === "financeiro" || tab === "dre") return role === "financeiro" || role === "onboarding";
  if (tab === "configuracoes") return false;
  // dashboard, clientes, tarefas, icp: todo mundo acessa (com dados
  // diferentes dentro, conforme o papel)
  return true;
}

export function canEditClienteValores(role: UserRole): boolean {
  return role === "master" || role === "financeiro" || role === "onboarding";
}

export function canSeeLucro(role: UserRole): boolean {
  return role === "master" || role === "comercial";
}

export function canSeeFaturamentoTotalAgregado(role: UserRole): boolean {
  // "faturamento total" da empresa (KPI agregado) — só master e
  // financeiro/onboarding (que já lidam com o financeiro completo).
  // Comercial vê só a MetaBar (faturamento novo do mês + meta).
  return role !== "comercial";
}

export function canManageMetas(role: UserRole): boolean {
  return role === "master";
}

export function canManageUsuarios(role: UserRole): boolean {
  return role === "master";
}

export function roleLabel(role: UserRole): string {
  return { master: "Master", comercial: "Comercial", financeiro: "Financeiro", onboarding: "Onboarding" }[role];
}
