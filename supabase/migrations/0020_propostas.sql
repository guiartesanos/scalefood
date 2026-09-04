-- Área de Propostas: registra propostas ENVIADAS (não só vendas fechadas),
-- pra dar visibilidade de follow-up antes de virar (ou não) uma venda de
-- verdade em NovaVendaButton/lancarConsultoria. Não se conecta
-- automaticamente à venda — virar proposta em venda continua sendo uma
-- ação manual de quem fecha o negócio.
create table propostas (
  id uuid primary key default gen_random_uuid(),
  nome_prospect text not null,
  tipo text not null default 'consultoria' check (tipo in ('consultoria', 'recorrencia', 'consultoria_recorrencia')),
  valor numeric,
  data_envio date not null default current_date,
  status text not null default 'enviada' check (status in ('enviada', 'em_negociacao', 'aceita', 'recusada', 'sem_retorno')),
  proximo_followup date,
  observacao text,
  criado_por uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index propostas_status_idx on propostas(status);
create index propostas_followup_idx on propostas(proximo_followup);

alter table propostas enable row level security;

-- Mesmo padrão de tarefas/agendas/consultoria: ferramenta operacional do
-- comercial, qualquer profile autenticado lê e escreve.
create policy "todo mundo le e escreve propostas"
  on propostas for all
  using (auth_role() is not null)
  with check (auth_role() is not null);
