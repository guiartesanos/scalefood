-- Quadro de Consultoria: um card por cliente de consultoria, com as 8 tarefas
-- fixas de onboarding e a cadência de reuniões (ver src/lib/reunioes.ts e
-- src/actions/consultoria.ts). Substitui o fluxo antigo de "temas" livres
-- lançados direto na tabela genérica `tarefas`.

create table consultoria_clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  email text,
  cliente_id uuid references clientes(id) on delete set null,
  data_fechamento date not null,
  valor numeric,
  -- cadência das reuniões 2-8: "toda [dia_semana_recorrente] às [hora_recorrente]".
  -- 1=segunda, 2=terça, 3=quarta. Editável a qualquer momento pelo card — mudar
  -- isso realinha de uma vez todas as reuniões futuras (ver
  -- redefinirCadenciaConsultoria em src/actions/consultoria.ts).
  dia_semana_recorrente int not null default 1 check (dia_semana_recorrente in (1, 2, 3)),
  hora_recorrente time not null default '09:00',
  concluido boolean not null default false,
  concluido_em timestamptz,
  criado_por uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table consultoria_tarefas (
  id uuid primary key default gen_random_uuid(),
  consultoria_cliente_id uuid not null references consultoria_clientes(id) on delete cascade,
  titulo text not null,
  ordem int not null,
  feito boolean not null default false,
  feito_em timestamptz,
  -- ordem=1 (1ª reunião) nasce com data_reuniao/hora_reuniao nulos — é
  -- agendamento manual, feito depois direto no card. ordem 2-8 recebem
  -- data/hora calculadas a partir da cadência do cliente.
  data_reuniao date,
  hora_reuniao time,
  google_event_id text,
  google_event_url text,
  created_at timestamptz not null default now()
);

create index consultoria_tarefas_cliente_idx on consultoria_tarefas(consultoria_cliente_id);

alter table consultoria_clientes enable row level security;
alter table consultoria_tarefas enable row level security;

-- Mesmo padrão de tarefas/agendas (0001_init.sql): ferramenta operacional,
-- qualquer profile autenticado lê e escreve — não é dado financeiro.
create policy "todo mundo le e escreve consultoria_clientes"
  on consultoria_clientes for all
  using (auth_role() is not null)
  with check (auth_role() is not null);

create policy "todo mundo le e escreve consultoria_tarefas"
  on consultoria_tarefas for all
  using (auth_role() is not null)
  with check (auth_role() is not null);

-- Conexão com o Google Calendar (OAuth) — mesmo molde de google_drive_conexao
-- (0016_google_drive.sql) e canva_conexao (0017_canva_conexao.sql): um único
-- registro guarda o token da conta conectada, reaproveitando o mesmo app
-- OAuth do Google Drive (GOOGLE_DRIVE_CLIENT_ID/SECRET), só com escopo extra.
create table google_calendar_conexao (
  id int primary key default 1,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  conectado_por uuid references profiles(id) on delete set null,
  conectado_em timestamptz not null default now(),
  constraint google_calendar_conexao_singleton check (id = 1)
);

alter table google_calendar_conexao enable row level security;

create policy "master le conexao do calendar"
  on google_calendar_conexao for select
  using (auth_role() = 'master');

create policy "master gerencia conexao do calendar"
  on google_calendar_conexao for all
  using (auth_role() = 'master')
  with check (auth_role() = 'master');
