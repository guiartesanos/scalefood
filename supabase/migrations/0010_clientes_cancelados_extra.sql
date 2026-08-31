-- Campos extras pra tela de detalhe do cliente cancelado: telefone (whatsapp
-- de reativação), primeiro pagamento (calcula tempo ativo junto com
-- ultimo_pagamento) e nicho/dono (nao vem do Asaas, preenchido manualmente).

alter table clientes_cancelados
  add column if not exists telefone text,
  add column if not exists primeiro_pagamento date,
  add column if not exists nicho text,
  add column if not exists dono text;
