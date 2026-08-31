-- =====================================================================
-- Contas a pagar completo: cada custo fixo ganha uma data de referencia
-- (usada pro calendario) e um tipo de recorrencia (pontual, semanal
-- fixo pelo dia da semana, ou mensal fixo pelo dia do mes).
-- vigente_desde marca desde quando aquele custo realmente existe (pra
-- nao contar ele em meses anteriores no historico).
-- =====================================================================

alter table custos_fixos add column if not exists data date not null default current_date;
alter table custos_fixos add column if not exists recorrencia text not null default 'mensal'
  check (recorrencia in ('pontual','semanal','mensal'));
alter table custos_fixos add column if not exists vigente_desde date not null default current_date;

-- =====================================================================
-- Historico mensal de faturamento/custos fixos, pra aba "Mensal" do
-- Financeiro. Tabela separada da receita_eventos (que e o livro-razao
-- operacional) -- isso aqui e so um retrato congelado de meses
-- fechados, nao mexe em nenhum calculo ao vivo.
-- =====================================================================

create table if not exists faturamento_mensal_historico (
  id uuid primary key default gen_random_uuid(),
  ano int not null,
  mes int not null check (mes between 1 and 12),
  faturamento numeric(12,2) not null default 0,
  custos_fixos numeric(12,2) not null default 0,
  fonte text default 'asaas',
  created_at timestamptz not null default now(),
  unique (ano, mes)
);

alter table faturamento_mensal_historico enable row level security;

create policy "quem ve lucro le o historico mensal"
  on faturamento_mensal_historico for select
  using (auth_role() in ('master','comercial'));

create policy "master insere no historico mensal"
  on faturamento_mensal_historico for insert
  with check (auth_role() = 'master');

create policy "master atualiza o historico mensal"
  on faturamento_mensal_historico for update
  using (auth_role() = 'master')
  with check (auth_role() = 'master');

create policy "master apaga do historico mensal"
  on faturamento_mensal_historico for delete
  using (auth_role() = 'master');
