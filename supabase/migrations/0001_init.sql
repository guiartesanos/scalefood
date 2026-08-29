-- =====================================================================
-- Sistema Aceleração — schema inicial
-- RBAC é aplicado em duas camadas:
--   1) Row Level Security (RLS) em toda tabela — controla LINHAS.
--   2) Views + GRANT em nível de COLUNA — controla quais CAMPOS cada
--      papel enxerga (usado só pra "liq"/"marg" de clientes, o "lucro").
-- Nada disso depende do frontend: uma chamada direta à API REST do
-- Supabase com o JWT de um usuário "financeiro" já é barrada aqui.
-- =====================================================================

-- ---------------------------------------------------------------------
-- ENUM de papéis
-- ---------------------------------------------------------------------
create type user_role as enum ('master', 'comercial', 'financeiro', 'onboarding');

-- ---------------------------------------------------------------------
-- profiles — espelha auth.users, guarda o papel de cada pessoa
-- ---------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  nome text not null default '',
  role user_role not null default 'comercial',
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

-- Função auxiliar: papel do usuário autenticado atual.
-- security definer pra poder ler "profiles" mesmo sob RLS.
create function auth_role() returns user_role
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid();
$$;

create function is_master() returns boolean
language sql stable security definer set search_path = public as $$
  select auth_role() = 'master';
$$;

create policy "usuario ve o proprio perfil, master ve todos"
  on profiles for select
  using (id = auth.uid() or is_master());

create policy "so master atualiza perfil (papel) de qualquer um"
  on profiles for update
  using (is_master())
  with check (is_master());

-- Trigger: quando um usuário é criado no Auth (convite aceito ou criação
-- direta), cria a linha correspondente em profiles. O papel vem de
-- raw_user_meta_data (definido no momento do convite, ver actions/usuarios.ts).
create function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, nome, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'nome', ''),
    coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'comercial')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------
-- clientes
-- ---------------------------------------------------------------------
create table clientes (
  id uuid primary key default gen_random_uuid(),
  n integer not null,
  nome text not null,
  dono text not null default '',
  status text not null default 'Onboarding urgente'
    check (status in ('Rodando - com resultado','Rodando - sem resultado ainda','Onboarding urgente','Pediu pra cancelar')),
  pgto text not null default 'asaas · mensal',
  nicho text not null default '',
  rec numeric(12,2) not null default 0,
  traf numeric(12,2) not null default 0,
  com numeric(12,2) not null default 0,
  imp numeric(12,2) not null default 0,
  taxa numeric(12,2) not null default 0,
  taxa_fonte text default 'estimado' check (taxa_fonte in ('real','estimado')),
  liq numeric(12,2) not null default 0,
  marg numeric(6,2) not null default 0,
  entrada numeric(12,2),
  hoje numeric(12,2),
  growth_note text,
  band text,
  extra text,
  fechamento date,
  -- caso "consultoria com 1o mes de aceleracao gratis":
  promo_primeiro_mes_gratis boolean not null default false,
  inicio_cobranca_recorrente date, -- quando a recorrencia realmente comeca a ser cobrada
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table clientes enable row level security;

create policy "qualquer usuario com papel le clientes"
  on clientes for select
  using (auth_role() is not null);

create policy "master/comercial/onboarding criam cliente"
  on clientes for insert
  with check (auth_role() in ('master','comercial','onboarding'));

create policy "qualquer usuario com papel atualiza cliente (colunas restritas por trigger)"
  on clientes for update
  using (auth_role() is not null)
  with check (auth_role() is not null);

create policy "so master apaga cliente"
  on clientes for delete
  using (is_master());

-- Trigger: comercial não pode alterar valores financeiros de um cliente
-- já existente (isso é definido por quem fecha o negócio/renegocia).
create function enforce_cliente_field_perms() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth_role() = 'comercial' then
    if new.rec is distinct from old.rec
       or new.traf is distinct from old.traf
       or new.com is distinct from old.com
       or new.imp is distinct from old.imp
       or new.taxa is distinct from old.taxa then
      raise exception 'Papel comercial não pode alterar valores financeiros do cliente.';
    end if;
  end if;
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_enforce_cliente_field_perms
  before update on clientes
  for each row execute function enforce_cliente_field_perms();

-- View de leitura: some com liq/marg (o "lucro" por cliente) pra
-- financeiro/onboarding. O app SEMPRE lê clientes por essa view, nunca
-- pela tabela crua.
create view clientes_view
  with (security_invoker = false) as
select
  id, n, nome, dono, status, pgto, nicho, rec, traf, com, imp, taxa, taxa_fonte,
  case when auth_role() in ('financeiro','onboarding') then null else liq end as liq,
  case when auth_role() in ('financeiro','onboarding') then null else marg end as marg,
  entrada, hoje, growth_note, band, extra, fechamento,
  promo_primeiro_mes_gratis, inicio_cobranca_recorrente, created_at, updated_at
from clientes;

-- Defesa extra: mesmo uma query direta na tabela crua (fora da view) não
-- retorna liq/marg pra ninguém — só a view (que roda com privilégio do
-- dono) consegue ler essas duas colunas.
revoke select on clientes from authenticated;
grant select (
  id, n, nome, dono, status, pgto, nicho, rec, traf, com, imp, taxa, taxa_fonte,
  entrada, hoje, growth_note, band, extra, fechamento,
  promo_primeiro_mes_gratis, inicio_cobranca_recorrente, created_at, updated_at
) on clientes to authenticated;
grant insert, update, delete on clientes to authenticated;
grant select on clientes_view to authenticated;

-- ---------------------------------------------------------------------
-- receita_eventos — log append-only, fonte do "faturamento novo do mês"
-- ---------------------------------------------------------------------
create table receita_eventos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references clientes (id) on delete set null,
  tipo text not null check (tipo in ('novo_cliente','upsell','downsell','consultoria','avulso')),
  valor numeric(12,2) not null,
  data date not null default current_date,
  descricao text,
  criado_por uuid references profiles (id),
  created_at timestamptz not null default now()
);

alter table receita_eventos enable row level security;

create policy "todo usuario com papel le receita_eventos"
  on receita_eventos for select using (auth_role() is not null);

create policy "master/comercial/onboarding lancam evento de receita"
  on receita_eventos for insert
  with check (auth_role() in ('master','comercial','onboarding'));

-- ---------------------------------------------------------------------
-- metas — só master escreve
-- ---------------------------------------------------------------------
create table metas (
  id uuid primary key default gen_random_uuid(),
  ano integer not null,
  mes integer not null check (mes between 1 and 12),
  valor_meta numeric(12,2) not null,
  bonus_valor numeric(12,2),
  criado_por uuid references profiles (id),
  criado_em timestamptz not null default now(),
  unique (ano, mes)
);

alter table metas enable row level security;

create policy "todo usuario com papel le metas"
  on metas for select using (auth_role() is not null);

create policy "so master cria/edita meta"
  on metas for insert with check (is_master());

create policy "so master atualiza meta"
  on metas for update using (is_master()) with check (is_master());

-- View: faturamento do mês corrente + projeção, pronta pra consumir na MetaBar.
create view faturamento_mes_atual
  with (security_invoker = true) as
with base as (
  select
    date_trunc('month', current_date)::date as inicio_mes,
    (date_trunc('month', current_date) + interval '1 month' - interval '1 day')::date as fim_mes,
    extract(day from current_date)::int as dia_atual,
    extract(day from (date_trunc('month', current_date) + interval '1 month' - interval '1 day'))::int as dias_no_mes
),
receita as (
  select coalesce(sum(re.valor), 0) as faturamento_novo_mes
  from receita_eventos re, base
  where re.data between base.inicio_mes and base.fim_mes
)
select
  b.dia_atual,
  b.dias_no_mes,
  r.faturamento_novo_mes,
  round(r.faturamento_novo_mes / greatest(b.dia_atual, 1) * b.dias_no_mes, 2) as projecao_fechamento,
  m.valor_meta,
  m.bonus_valor,
  case when m.valor_meta > 0
    then round(r.faturamento_novo_mes / m.valor_meta * 100, 1)
    else null end as pct_meta,
  case when m.valor_meta > 0
    then round((r.faturamento_novo_mes / greatest(b.dia_atual, 1) * b.dias_no_mes) / m.valor_meta * 100, 1)
    else null end as pct_projecao
from base b, receita r
left join metas m
  on m.ano = extract(year from current_date) and m.mes = extract(month from current_date);

grant select on faturamento_mes_atual to authenticated;

-- ---------------------------------------------------------------------
-- custos_fixos / custos_variaveis_extra / pagamentos / tarefas / rotinas
-- / agendas / icp_log — mesma estrutura do sistema atual.
-- Todas: financeiro/onboarding têm acesso total (sem restrição de
-- coluna — a única coisa oculta pra eles é liq/marg de clientes e o
-- KPI de lucro, que é calculado no frontend, não guardado em tabela).
-- ---------------------------------------------------------------------
create table custos_fixos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  valor numeric(12,2) not null,
  categoria text,
  created_at timestamptz not null default now()
);
alter table custos_fixos enable row level security;
create policy "master/financeiro leem e escrevem custos fixos"
  on custos_fixos for all
  using (auth_role() in ('master','financeiro','onboarding'))
  with check (auth_role() in ('master','financeiro','onboarding'));

create table custos_variaveis_extra (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  valor numeric(12,2) not null,
  categoria text,
  cliente text,
  obs text,
  created_at timestamptz not null default now()
);
alter table custos_variaveis_extra enable row level security;
create policy "master/financeiro leem e escrevem custos variaveis"
  on custos_variaveis_extra for all
  using (auth_role() in ('master','financeiro','onboarding'))
  with check (auth_role() in ('master','financeiro','onboarding'));

create table pagamentos (
  id uuid primary key default gen_random_uuid(),
  data date,
  cliente text,
  valor numeric(12,2) not null,
  canal text not null default 'Asaas',
  tipo text not null default 'recorrencia' check (tipo in ('recorrencia','consultoria','avulso')),
  descricao text,
  pendente boolean not null default false,
  created_at timestamptz not null default now()
);
alter table pagamentos enable row level security;
create policy "master/financeiro leem e escrevem pagamentos"
  on pagamentos for all
  using (auth_role() in ('master','financeiro','onboarding'))
  with check (auth_role() in ('master','financeiro','onboarding'));

create table tarefas (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text,
  coluna text not null default 'a-fazer' check (coluna in ('a-fazer','em-andamento','feito')),
  urgencia text not null default 'media' check (urgencia in ('alta','media','baixa')),
  cliente_nome text,
  agenda_id uuid,
  criado_em date not null default current_date,
  created_at timestamptz not null default now()
);
alter table tarefas enable row level security;
create policy "todo mundo le e escreve tarefas"
  on tarefas for all
  using (auth_role() is not null)
  with check (auth_role() is not null);

create table rotinas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  frequencia text not null check (frequencia in ('semana','mes')),
  itens text[] not null default '{}',
  created_at timestamptz not null default now()
);
alter table rotinas enable row level security;
create policy "todo mundo le e escreve rotinas"
  on rotinas for all
  using (auth_role() is not null)
  with check (auth_role() is not null);

create table agendas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  email text,
  created_at timestamptz not null default now()
);
alter table agendas enable row level security;
create policy "todo mundo le e escreve agendas"
  on agendas for all
  using (auth_role() is not null)
  with check (auth_role() is not null);

create table icp_log (
  id uuid primary key default gen_random_uuid(),
  data date not null default current_date,
  titulo text not null,
  detalhe text,
  created_at timestamptz not null default now()
);
alter table icp_log enable row level security;
create policy "master/comercial leem e escrevem icp_log"
  on icp_log for all
  using (auth_role() in ('master','comercial'))
  with check (auth_role() in ('master','comercial'));

-- ---------------------------------------------------------------------
-- Trigger: toda vez que um cliente novo é criado (e não é promo com
-- inicio adiado), gera o evento de receita "novo_cliente" automaticamente.
-- Se for promo_primeiro_mes_gratis, o evento é criado só quando alguém
-- (ou um job) atualizar o cliente confirmando o início da cobrança —
-- feito via Server Action, não aqui, pra manter a trigger simples e
-- auditável.
-- ---------------------------------------------------------------------
create function log_novo_cliente_receita() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not new.promo_primeiro_mes_gratis and new.rec > 0 then
    insert into receita_eventos (cliente_id, tipo, valor, data, descricao, criado_por)
    values (new.id, 'novo_cliente', new.rec, coalesce(new.fechamento, current_date),
            'Novo cliente: ' || new.nome, auth.uid());
  end if;
  return new;
end;
$$;

create trigger trg_log_novo_cliente_receita
  after insert on clientes
  for each row execute function log_novo_cliente_receita();
