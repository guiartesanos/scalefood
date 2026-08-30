-- =====================================================================
-- Historico de exclusoes: item 5 da rodada de UX (confirmacao + senha
-- antes de apagar registros financeiros/usuarios, com log de quem fez).
-- Tabela append-only -- ninguem tem policy de update/delete, nem master
-- (RLS nega por padrao o que nao tem policy explicita).
-- =====================================================================

create table if not exists exclusoes_log (
  id uuid primary key default gen_random_uuid(),
  tipo text not null,
  descricao text not null,
  removido_por uuid references profiles(id) on delete set null,
  removido_por_nome text not null,
  created_at timestamptz not null default now()
);

alter table exclusoes_log enable row level security;

create policy "usuario com papel registra exclusao"
  on exclusoes_log for insert
  with check (auth_role() is not null);

create policy "master le o historico de exclusoes"
  on exclusoes_log for select
  using (auth_role() = 'master');
