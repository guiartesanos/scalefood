-- Cadência das próximas reuniões da Consultoria só liberava segunda,
-- terça ou quarta (dia_semana_recorrente in (1,2,3)) — passa a aceitar
-- quinta e sexta também.
alter table consultoria_clientes
  drop constraint if exists consultoria_clientes_dia_semana_recorrente_check;

alter table consultoria_clientes
  add constraint consultoria_clientes_dia_semana_recorrente_check
  check (dia_semana_recorrente in (1, 2, 3, 4, 5));
