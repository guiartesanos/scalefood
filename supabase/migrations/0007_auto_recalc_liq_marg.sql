-- =====================================================================
-- liq/marg viviam desatualizados: eram calculados em JS e so gravados
-- quando alguem editava valores pelo app. Qualquer alteracao de
-- rec/traf/com/imp/taxa por fora do app (script, SQL direto, etc.)
-- deixava liq/marg errados sem ninguem perceber.
--
-- Trigger no banco: liq/marg passam a ser SEMPRE recalculados a
-- partir de rec/traf/com/imp/taxa em todo insert/update, nao importa
-- de onde a mudanca venha. Nao tem mais como desalinhar.
-- =====================================================================

create or replace function recalc_cliente_liq() returns trigger as $$
begin
  new.liq := new.rec - new.traf - new.com - new.imp - new.taxa;
  new.marg := case when new.rec > 0 then (new.liq / new.rec) * 100 else 0 end;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_recalc_cliente_liq on clientes;
create trigger trg_recalc_cliente_liq
  before insert or update on clientes
  for each row execute function recalc_cliente_liq();

-- corrige de uma vez os valores ja desatualizados
update clientes set updated_at = updated_at;
