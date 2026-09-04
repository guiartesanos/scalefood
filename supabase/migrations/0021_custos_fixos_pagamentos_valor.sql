-- Permite ajustar o valor de uma ocorrência específica de custo fixo na
-- hora de confirmar o pagamento (ex: conta de luz varia todo mês mesmo
-- sendo "fixa") — sem isso, todo mês pago ficava gravado com o valor do
-- modelo em custos_fixos, mesmo quando o valor real pago era outro.
-- null = usa o valor do modelo (custos_fixos.valor) na hora de exibir,
-- mesmo padrão de fallback usado em financeiro/page.tsx.
alter table custos_fixos_pagamentos add column if not exists valor numeric;
