-- =====================================================================
-- Pendências: rastreio de "conta fixa paga" por ocorrência (data
-- específica) — permite marcar/desmarcar como pago e contar quantas
-- contas do mês ainda estão pendentes, sem duplicar o custo fixo em
-- si (que continua sendo só a definição recorrente).
-- =====================================================================

create table if not exists custos_fixos_pagamentos (
  id uuid primary key default gen_random_uuid(),
  custo_fixo_id uuid not null references custos_fixos(id) on delete cascade,
  data date not null,
  pago_em timestamptz not null default now(),
  pago_por uuid references profiles(id) on delete set null,
  unique (custo_fixo_id, data)
);

alter table custos_fixos_pagamentos enable row level security;

create policy "todo usuario com papel le pagamentos de custo fixo"
  on custos_fixos_pagamentos for select
  using (auth_role() is not null);

create policy "todo usuario com papel marca conta como paga"
  on custos_fixos_pagamentos for insert
  with check (auth_role() is not null);

create policy "todo usuario com papel desmarca conta paga"
  on custos_fixos_pagamentos for delete
  using (auth_role() is not null);

-- Responsável (atribuição) de cada tarefa — texto livre por enquanto,
-- mesmo padrão do campo "dono" em clientes. Usado pra filtrar "minhas
-- pendências" por nome (bate com profiles.nome quando a pessoa já tem
-- login; time que ainda não tem login pode ser atribuído do mesmo jeito).
alter table tarefas add column if not exists responsavel text;
