-- Nenhum dos crons (fechamento mensal, tarifas Asaas, imposto, radar de
-- notícias) tinha qualquer registro de execução — se uma chamada à API do
-- Asaas falhasse (token expirado, por exemplo), o número financeiro saía
-- errado/incompleto e ninguém percebia, porque a única prova de que o cron
-- rodou fica enterrada nos logs de função da Vercel, que ninguém olha no
-- dia a dia. Essa tabela vira o "última vez que rodou / última vez que deu
-- certo / qual foi o erro" de cada um, mostrado em
-- /configuracoes/integracoes.
create table cron_execucoes (
  nome text primary key,
  ultima_execucao_em timestamptz not null default now(),
  ultimo_sucesso boolean not null,
  ultimo_erro text,
  ultimo_ok_em timestamptz,
  ultimo_detalhe text
);

alter table cron_execucoes enable row level security;

create policy "master le execucoes de cron"
  on cron_execucoes for select
  using (auth_role() = 'master');
