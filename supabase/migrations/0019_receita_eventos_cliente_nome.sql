-- Nome do cliente gravado direto na hora da inserção, em vez de só dentro
-- da descrição em texto livre — usado pra exibir o nome primeiro (e a
-- descrição/categoria depois) na listinha de "faturamento novo do mês"
-- (ver FaturamentoNovoModal.tsx). Linhas antigas ficam com null; a UI faz
-- fallback pra extrair da descrição nesse caso.
alter table receita_eventos add column if not exists cliente_nome text;
