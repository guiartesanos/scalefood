-- =====================================================================
-- custos_variaveis_extra ganha uma data de competência explícita — sem
-- isso, o DRE (mês a mês) tinha que adivinhar o mês pelo created_at, o
-- que erra sempre que alguém lança hoje um custo referente ao mês
-- passado. Linhas existentes usam a data de criação como melhor palpite;
-- daqui pra frente o form já pede a data (default hoje).
-- =====================================================================

alter table custos_variaveis_extra add column if not exists data date;
update custos_variaveis_extra set data = created_at::date where data is null;
alter table custos_variaveis_extra alter column data set default current_date;
alter table custos_variaveis_extra alter column data set not null;
