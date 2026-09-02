-- =====================================================================
-- Conexão com o Google Drive (OAuth) — usada pelo Gerador de Conteúdo
-- pra buscar imagens do usuário relacionadas ao tema do carrossel.
-- Guarda um único registro (conta pessoal do dono do negócio).
-- =====================================================================

create table if not exists google_drive_conexao (
  id int primary key default 1,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  conectado_por uuid references profiles(id) on delete set null,
  conectado_em timestamptz not null default now(),
  constraint google_drive_conexao_singleton check (id = 1)
);

alter table google_drive_conexao enable row level security;

create policy "master le conexao do drive"
  on google_drive_conexao for select
  using (auth_role() = 'master');

create policy "master gerencia conexao do drive"
  on google_drive_conexao for all
  using (auth_role() = 'master')
  with check (auth_role() = 'master');

-- imagem escolhida pro carrossel, quando o modelo usa imagem
alter table geracoes_conteudo add column if not exists imagem_drive_url text;
alter table geracoes_conteudo add column if not exists imagem_drive_nome text;
