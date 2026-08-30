-- =====================================================================
-- clientes_view foi definida com lista explicita de colunas, entao o
-- asaas_customer_id (adicionado na 0003) nunca apareceu nela. Recria a
-- view incluindo essa coluna, pra pagina de detalhe do cliente poder
-- mostrar o id do Asaas.
-- =====================================================================
create or replace view clientes_view
  with (security_invoker = false) as
select
  id, n, nome, dono, status, pgto, nicho, rec, traf, com, imp, taxa, taxa_fonte,
  case when auth_role() in ('financeiro','onboarding') then null else liq end as liq,
  case when auth_role() in ('financeiro','onboarding') then null else marg end as marg,
  entrada, hoje, growth_note, band, extra, fechamento,
  promo_primeiro_mes_gratis, inicio_cobranca_recorrente,
  created_at, updated_at, asaas_customer_id
from clientes;

grant select on clientes_view to authenticated;

-- mesma defesa em profundidade da 0001: libera a coluna nova tambem no
-- grant direto da tabela base (a view roda como dono e nao depende
-- disso, mas mantem consistente com o padrao ja estabelecido).
grant select (asaas_customer_id) on clientes to authenticated;

