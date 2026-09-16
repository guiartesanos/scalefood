-- Nova frente de venda "Curso" + status de entrega dos clientes pontuais
-- (quem comprou Consultoria e/ou Curso sem Recorrência — hoje já
-- identificados por consultoria_clientes.cliente_id is null).

alter table pagamentos
  drop constraint if exists pagamentos_tipo_check;
alter table pagamentos
  add constraint pagamentos_tipo_check
  check (tipo in ('recorrencia', 'consultoria', 'curso', 'avulso'));

alter table receita_eventos
  drop constraint if exists receita_eventos_tipo_check;
alter table receita_eventos
  add constraint receita_eventos_tipo_check
  check (tipo in ('novo_cliente', 'upsell', 'downsell', 'consultoria', 'curso', 'avulso'));

-- Quais produtos essa venda pontual teve — usado, por exemplo, pra saber
-- se um cliente "curso_comprado" comprou só o curso (aplica a regra dos 7
-- dias) ou curso + consultoria junto.
alter table consultoria_clientes
  add column if not exists produtos text[] not null default '{}';

-- Substitui o concluido boolean por um status de verdade — permite
-- diferenciar "ainda não começou" de "entregando" antes de "concluído",
-- e dar um status próprio pra quem só comprou curso (conclui sozinho
-- depois de 7 dias, ver /api/cron/curso-status-auto).
alter table consultoria_clientes
  add column if not exists status text not null default 'aguardando_inicio'
  check (status in ('aguardando_inicio', 'entrega', 'curso_comprado', 'concluido'));

update consultoria_clientes
  set status = case when concluido then 'concluido' else 'aguardando_inicio' end;

alter table consultoria_clientes drop column if exists concluido;
alter table consultoria_clientes rename column concluido_em to status_atualizado_em;
