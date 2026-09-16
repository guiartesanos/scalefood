-- E-mails múltiplos por cliente + link do Google Meet nas reuniões de
-- consultoria.
--
-- `clientes` nunca teve e-mail nenhum (só ia pro Asaas na hora de criar a
-- cobrança recorrente, sem voltar pro nosso banco) — vira a fonte única
-- daqui pra frente. `consultoria_clientes.email` (um texto só) vira um
-- array, pra suportar mais de um e-mail por cliente de consultoria.

alter table clientes add column if not exists emails text[] not null default '{}';
grant select (emails) on clientes to authenticated;

create or replace view clientes_view
  with (security_invoker = false) as
select
  id, n, nome, dono, status, pgto, nicho, rec, traf, com, imp, taxa, taxa_fonte,
  case when auth_role() in ('financeiro','onboarding') then null else liq end as liq,
  case when auth_role() in ('financeiro','onboarding') then null else marg end as marg,
  entrada, hoje, growth_note, band, extra, fechamento,
  promo_primeiro_mes_gratis, inicio_cobranca_recorrente,
  created_at, updated_at, asaas_customer_id, trafego_gestor, emails
from clientes;

grant select on clientes_view to authenticated;

alter table consultoria_clientes add column if not exists emails text[] not null default '{}';
update consultoria_clientes set emails = array[email] where email is not null and email <> '' and emails = '{}';
alter table consultoria_clientes drop column if exists email;

alter table consultoria_tarefas add column if not exists google_meet_url text;
