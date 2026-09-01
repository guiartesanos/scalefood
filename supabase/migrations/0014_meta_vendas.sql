-- =====================================================================
-- Meta: além do valor, mostrar número de vendas do mês e quantas
-- vendas faltam pra bater a meta, assumindo o ticket médio atual
-- (faturamento novo do mês / número de vendas). Coluna nova sempre no
-- fim (create or replace view não deixa inserir no meio da lista).
-- =====================================================================

create or replace view faturamento_mes_atual
  with (security_invoker = true) as
with base as (
  select
    date_trunc('month', current_date)::date as inicio_mes,
    (date_trunc('month', current_date) + interval '1 month' - interval '1 day')::date as fim_mes,
    extract(day from current_date)::int as dia_atual,
    extract(day from (date_trunc('month', current_date) + interval '1 month' - interval '1 day'))::int as dias_no_mes
),
receita as (
  select
    coalesce(sum(re.valor), 0) as faturamento_novo_mes,
    count(*) as numero_vendas
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
    else null end as pct_projecao,
  r.numero_vendas,
  case when r.numero_vendas > 0
    then round(r.faturamento_novo_mes / r.numero_vendas, 2)
    else null end as ticket_medio,
  case
    when m.valor_meta > 0 and r.faturamento_novo_mes >= m.valor_meta then 0
    when m.valor_meta > 0 and r.numero_vendas > 0
      then ceil((m.valor_meta - r.faturamento_novo_mes) / (r.faturamento_novo_mes / r.numero_vendas))
    else null
  end as vendas_faltantes
from base b, receita r
left join metas m
  on m.ano = extract(year from current_date) and m.mes = extract(month from current_date);

grant select on faturamento_mes_atual to authenticated;
