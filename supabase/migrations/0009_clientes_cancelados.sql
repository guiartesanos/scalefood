-- =====================================================================
-- Clientes cancelados: gente que ja pagou algo no Asaas mas nao tem
-- mais nenhuma recorrencia ativa -- puxados da API do Asaas (payments +
-- subscriptions), nao vem da tabela clientes (que so tem quem esta
-- ativo hoje).
-- =====================================================================

create table if not exists clientes_cancelados (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  asaas_customer_id text unique,
  total_recebido numeric(12,2) not null default 0,
  ultimo_pagamento date,
  motivo text,
  observacao text,
  created_at timestamptz not null default now()
);

alter table clientes_cancelados enable row level security;

create policy "todo usuario com papel le cancelados"
  on clientes_cancelados for select
  using (auth_role() is not null);

create policy "todo usuario com papel atualiza motivo de cancelados"
  on clientes_cancelados for update
  using (auth_role() is not null)
  with check (auth_role() is not null);

create policy "master gerencia cancelados"
  on clientes_cancelados for insert
  with check (auth_role() = 'master');

create policy "master apaga cancelados"
  on clientes_cancelados for delete
  using (auth_role() = 'master');
