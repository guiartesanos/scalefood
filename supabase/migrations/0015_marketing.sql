-- =====================================================================
-- Marketing: radar de notícias (food service/delivery) + gerador de
-- conteúdo (carrosséis) integrado ao Canva.
-- =====================================================================

create table if not exists radar_noticias (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  resumo text,
  link text not null unique,
  fonte text,
  publicado_em timestamptz,
  status text not null default 'novo' check (status in ('novo', 'descartado', 'gerador')),
  created_at timestamptz not null default now()
);

alter table radar_noticias enable row level security;

create policy "todo usuario com papel le noticias"
  on radar_noticias for select
  using (auth_role() is not null);

create policy "master/comercial gerenciam noticias"
  on radar_noticias for all
  using (auth_role() in ('master', 'comercial'))
  with check (auth_role() in ('master', 'comercial'));

-- ---------------------------------------------------------------------
-- Modelos de carrossel publicados no Canva (Brand Templates) —
-- referenciados pelo id do template lá na API do Canva.
-- ---------------------------------------------------------------------
create table if not exists canva_templates (
  id text primary key,
  nome text not null,
  brand_template_id text not null,
  usa_imagem boolean not null default false,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

alter table canva_templates enable row level security;

create policy "todo usuario com papel le templates canva"
  on canva_templates for select
  using (auth_role() is not null);

create policy "master gerencia templates canva"
  on canva_templates for all
  using (auth_role() = 'master')
  with check (auth_role() = 'master');

insert into canva_templates (id, nome, brand_template_id, usa_imagem) values
  ('moderno-1', 'Moderno 1', 'EAHT_Rqcyls', true),
  ('moderno-2', 'Moderno 2', 'EAHT_WACzmI', true),
  ('tweet-padrao', 'Tweet padrão', 'EAHT_dnnYZk', false),
  ('tweet-foto', 'Tweet com foto', 'EAHT_RUrjiI', true),
  ('carrossel-noticia-1', 'Carrossel notícia 1', 'EAHT_Yv6VeY', true),
  ('carrossel-noticia-2', 'Carrossel notícia 2', 'EAHT_Z7huQU', true)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- Geração de conteúdo: uma "ficha" por carrossel em produção — nasce
-- de uma notícia (ou avulsa), passa pelas perguntas provocativas,
-- escolhe o modelo, e termina com o link do design pronto no Canva.
-- ---------------------------------------------------------------------
create table if not exists geracoes_conteudo (
  id uuid primary key default gen_random_uuid(),
  noticia_id uuid references radar_noticias(id) on delete set null,
  tema text not null,
  status text not null default 'rascunho' check (status in ('rascunho', 'perguntas', 'pronto')),
  template_id text references canva_templates(id),
  respostas jsonb,
  conteudo_gerado jsonb,
  canva_design_url text,
  criado_por uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table geracoes_conteudo enable row level security;

create policy "todo usuario com papel le geracoes de conteudo"
  on geracoes_conteudo for select
  using (auth_role() is not null);

create policy "master/comercial gerenciam geracoes de conteudo"
  on geracoes_conteudo for all
  using (auth_role() in ('master', 'comercial'))
  with check (auth_role() in ('master', 'comercial'));
