-- =====================================================================
-- Guarda o id do cliente no Asaas direto na tabela, pra nao depender
-- só do clientes.json separado do projeto asaas-alertas.
-- =====================================================================
alter table clientes add column if not exists asaas_customer_id text;
