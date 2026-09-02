-- =====================================================================
-- Conexão com a Connect API do Canva (OAuth) — usada pra preencher os
-- modelos de carrossel automaticamente (Autofill).
-- =====================================================================

create table if not exists canva_conexao (
  id int primary key default 1,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  conectado_por uuid references profiles(id) on delete set null,
  conectado_em timestamptz not null default now(),
  constraint canva_conexao_singleton check (id = 1)
);

alter table canva_conexao enable row level security;

create policy "master le conexao do canva"
  on canva_conexao for select
  using (auth_role() = 'master');

create policy "master gerencia conexao do canva"
  on canva_conexao for all
  using (auth_role() = 'master')
  with check (auth_role() = 'master');
