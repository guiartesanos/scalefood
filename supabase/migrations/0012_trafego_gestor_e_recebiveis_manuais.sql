-- =====================================================================
-- Tráfego passa a ter um gestor por cliente (hoje: Jota ou Lorenzo) —
-- permite separar quanto repassar pra cada um, em vez de tudo cair
-- num "repasse Jota" único.
-- =====================================================================

alter table clientes add column if not exists trafego_gestor text not null default 'Jota';

-- create or replace view não deixa inserir coluna no meio da lista
-- (só no fim) — dropa e recria pra poder manter a ordem lógica das
-- colunas nas outras views/telas que já existiam.
drop view if exists clientes_view;

create view clientes_view
  with (security_invoker = false) as
select
  id, n, nome, dono, status, pgto, nicho, rec, traf, com, imp, taxa, taxa_fonte,
  case when auth_role() in ('financeiro','onboarding') then null else liq end as liq,
  case when auth_role() in ('financeiro','onboarding') then null else marg end as marg,
  entrada, hoje, growth_note, band, extra, fechamento,
  promo_primeiro_mes_gratis, inicio_cobranca_recorrente,
  created_at, updated_at, asaas_customer_id, trafego_gestor
from clientes;

grant select on clientes_view to authenticated;

-- =====================================================================
-- Recebíveis manuais: dinheiro que entra fora do Asaas (ex: comissão
-- que um parceiro paga pra gente) — mesma lógica de ocorrência +
-- confirmação já usada em custos_fixos / custos_fixos_pagamentos, só
-- que do lado da receita.
-- =====================================================================

create table if not exists recebiveis_manuais (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  valor numeric(12,2) not null,
  cliente_nome text,
  data date not null,
  recorrencia text not null default 'mensal',
  vigente_desde date not null default current_date,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

alter table recebiveis_manuais enable row level security;

create policy "todo usuario com papel le recebiveis manuais"
  on recebiveis_manuais for select
  using (auth_role() is not null);

create policy "financeiro gerencia recebiveis manuais"
  on recebiveis_manuais for all
  using (auth_role() in ('master','financeiro','onboarding'))
  with check (auth_role() in ('master','financeiro','onboarding'));

create table if not exists recebiveis_manuais_confirmacoes (
  id uuid primary key default gen_random_uuid(),
  recebivel_id uuid not null references recebiveis_manuais(id) on delete cascade,
  data date not null,
  confirmado_em timestamptz not null default now(),
  confirmado_por uuid references profiles(id) on delete set null,
  unique (recebivel_id, data)
);

alter table recebiveis_manuais_confirmacoes enable row level security;

create policy "todo usuario com papel le confirmacoes de recebivel"
  on recebiveis_manuais_confirmacoes for select
  using (auth_role() is not null);

create policy "todo usuario com papel confirma recebivel"
  on recebiveis_manuais_confirmacoes for insert
  with check (auth_role() is not null);

create policy "todo usuario com papel desconfirma recebivel"
  on recebiveis_manuais_confirmacoes for delete
  using (auth_role() is not null);
