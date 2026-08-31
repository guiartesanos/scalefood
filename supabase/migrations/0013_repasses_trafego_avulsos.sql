-- =====================================================================
-- Repasses de tráfego avulsos: toda vez que o Asaas confirma que um
-- cliente pagou, o webhook gera automaticamente uma conta a pagar
-- pontual pro gestor de tráfego daquele cliente (Jota ou Lorenzo) —
-- assim só se paga tráfego de quem já pagou a gente. Diferente dos
-- custos_fixos (que são recorrência mensal fixa, sem gatilho externo).
-- =====================================================================

create table if not exists contas_pagar_avulsas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  valor numeric(12,2) not null,
  cliente_nome text,
  gestor text,
  categoria text,
  origem text not null default 'manual',
  referencia text unique,
  data date not null default current_date,
  pago boolean not null default false,
  pago_em timestamptz,
  pago_por uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table contas_pagar_avulsas enable row level security;

create policy "todo usuario com papel le contas avulsas"
  on contas_pagar_avulsas for select
  using (auth_role() is not null);

create policy "todo usuario com papel marca conta avulsa"
  on contas_pagar_avulsas for update
  using (auth_role() is not null)
  with check (auth_role() is not null);

create policy "financeiro insere conta avulsa"
  on contas_pagar_avulsas for insert
  with check (auth_role() in ('master','financeiro','onboarding'));
