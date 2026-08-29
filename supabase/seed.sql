-- =====================================================================
-- Carga inicial: os mesmos dados que já estavam no Artifact (16
-- clientes, 4 tarefas, custos variáveis extra, pagamentos pendentes,
-- histórico do ICP). Rode isso DEPOIS de 0001_init.sql, uma vez só,
-- no SQL Editor do Supabase.
-- =====================================================================

insert into clientes
  (n, nome, dono, status, pgto, nicho, rec, traf, com, imp, taxa, taxa_fonte, liq, marg, entrada, hoje, growth_note, band, extra, fechamento)
values
  (1,  'Betos', 'Gregori', 'Rodando - com resultado', 'asaas · mensal', 'Marmita', 3000, 1240, 0, 180, 2.98, 'real', 1576.50, 52.6, 30000, 70000, null, '26-35k', null, '2026-02-01'),
  (2,  'Perto da chapa', 'Gui, Alecs', 'Pediu pra cancelar', 'asaas · quinz.', 'HotDog', 5000, 1300, 0, 300, 2.98, 'real', 3396.50, 67.9, 0, 40000, 'zero_base', null, null, '2026-02-15'),
  (3,  'Pitaya', 'Fabiana', 'Rodando - com resultado', 'repasse lorenzo', 'Lanche', 500, 0, 0, 0, 2.98, 'real', 500.00, 100.0, 24000, 40000, null, '≤25k', null, '2026-02-25'),
  (4,  'Parada 201', 'Paulo', 'Rodando - com resultado', 'asaas · mensal', 'Lanche', 2500, 890, 500, 150, 94.35, 'real', 872.50, 34.9, 22000, 38000, null, '≤25k', null, '2026-04-09'),
  (5,  'Sigh burger', 'Eduardo', 'Rodando - com resultado', 'asaas · mensal', 'Hambúrguer', 2500, 850, 0, 120, 2.98, 'real', 1526.50, 61.1, 24000, 40000, null, '≤25k', null, '2026-05-07'),
  (6,  'Açai NaLata', 'Diogo', 'Rodando - sem resultado ainda', 'asaas · mensal', 'Açaí', 10000, 2820, 2000, 600, 2.98, 'real', 4576.50, 45.8, 30000, 40000, null, '26-35k', '3 lojas', '2026-04-27'),
  (7,  'Espetinhos Rodrigues', 'Fernando', 'Rodando - com resultado', 'asaas · mensal', 'Espetinho', 2500, 850, 0, 150, 2.98, 'real', 1496.50, 59.9, 25000, 35000, null, '≤25k', null, '2026-06-08'),
  (8,  'SODIE Doces', 'Bete', 'Pediu pra cancelar', 'asaas · mensal', 'Espetinho', 3000, 1020, 600, 180, 2.98, 'real', 1196.50, 39.9, null, null, 'sem_dado', null, null, '2026-06-22'),
  (9,  'Mamma mia', 'Maurício', 'Rodando - sem resultado ainda', 'asaas · mensal', 'Espetinho', 2500, 850, 500, 150, 2.98, 'estimado', 905.00, 36.2, 26000, 26000, 'estagnado', '26-35k', null, '2026-07-27'),
  (10, 'mykonos', 'Denis e Douglas', 'Rodando - sem resultado ainda', 'asaas · mensal', 'Burger', 2000, 850, 0, 120, 2.98, 'estimado', 935.00, 46.8, 49000, 49000, 'estagnado', '≥40k', null, '2026-07-28'),
  (11, 'JK burguer', 'Alvim', 'Rodando - sem resultado ainda', 'asaas · mensal', 'Burger', 1500, 850, 0, 90, 2.98, 'estimado', 556.50, 37.1, null, null, 'sem_dado', null, null, '2026-06-08'),
  (12, 'Milky MOO', 'Elieser', 'Rodando - com resultado', 'asaas · mensal', 'Milkshake', 2500, 850, 0, 150, 2.98, 'real', 1496.50, 59.9, 0, 8000, 'zero_base', null, null, '2026-06-30'),
  (13, 'AP42 pizzaria', 'Rafa', 'Rodando - com resultado', 'asaas · mensal', 'Pizza', 2500, 850, 0, 150, 2.98, 'real', 1496.50, 59.9, 80000, 80000, 'estagnado', '≥40k', null, '2026-08-24'),
  (14, 'Espeto do Gomes', 'Rodrigo', 'Rodando - com resultado', 'asaas · quinz.', 'Espetinho', 3500, 1190, 350, 210, 2.98, 'real', 1746.50, 49.9, 0, 9000, 'zero_base', null, null, '2026-07-15'),
  (15, 'Villa Açaí', 'Vitor', 'Onboarding urgente', 'asaas · mensal', 'Açaí', 3000, 0, 0, 180, 2.98, 'estimado', 2816.50, 93.9, 40000, 40000, 'nao_iniciado', null, null, '2026-08-26'),
  (16, 'Açaí Kidelicia', 'Nicolas', 'Onboarding urgente', 'asaas · mensal', 'Açaí', 2500, 850, 0, 150, 2.98, 'estimado', 1496.50, 59.9, 75000, 75000, 'nao_iniciado', null, null, '2026-08-29');

insert into custos_variaveis_extra (nome, valor, categoria, cliente, obs) values
  ('Leonardo comercial', 100, 'Pessoas', '', null),
  ('Tarifas Asaas (transferência R$6 + antecipação R$189,64 + cobrança R$9,90 + notas R$4,41 + SMS R$1,65 − estorno R$2)', 209.60, 'Taxas', '',
   'Detectado direto no extrato Asaas (financialTransactions), período 01/06 a 29/08/2026. Não inclui a tarifa de R$1,99+R$0,99 por pagamento recebido, que já está no campo taxa de cada cliente.');

insert into pagamentos (data, cliente, valor, canal, tipo, descricao, pendente) values
  (null, null, 5000, 'PIX C6', 'consultoria', 'Consultoria de ticket alto vendida — completar cliente/data', true),
  (null, null, 7000, 'PIX C6', 'consultoria', 'Consultoria de ticket alto vendida — completar cliente/data', true);

insert into tarefas (titulo, descricao, coluna, urgencia, cliente_nome, criado_em) values
  ('Ligar pra Perto da chapa sobre cancelamento', 'Entender motivo real do cancelamento antes do último mês de cobrança fechar.', 'a-fazer', 'alta', 'Perto da chapa', '2026-08-29'),
  ('Cobrar onboarding de Villa Açaí e Açaí Kidelicia', 'Os dois clientes mais novos ainda não têm tráfego rodando.', 'a-fazer', 'alta', null, '2026-08-29'),
  ('Acompanhar de perto a AP42 pizzaria', 'Cliente novo (entrou 24/08) com o maior ticket de entrada da carteira (R$80k) — perfil historicamente arriscado no modelo antigo, vale dar atenção redobrada desde o início.', 'a-fazer', 'media', 'AP42 pizzaria', '2026-08-29'),
  ('Confirmar cliente/data das 2 consultorias PIX C6', 'R$5.000 e R$7.000 recebidos fora do Asaas — completar registro em Financeiro > Pagamentos.', 'a-fazer', 'media', null, '2026-08-29');

insert into icp_log (data, titulo, detalhe) values
  ('2026-08-29', 'Tese original do ICP', 'Comida de rua já operando, faturando R$20-30k/mês na entrada, fechando mensalidade fixa via Asaas. 100% desses clientes cresceram (média +61,6%).'),
  ('2026-08-29', 'Atualização — ICP prioritário mudou', 'Hamburgueria artesanal/gourmet (e açaí, hot dog, nichos similares), até 2 lojas, R$80-150k por loja/mês. Ticket: R$15.000 implementação + R$3.000/mês recorrente. O público de R$20-30k vira entrada de funil, não prioridade.');

-- Nota: a trigger trg_log_novo_cliente_receita (de 0001_init.sql) já
-- gerou um evento em receita_eventos pra cada INSERT acima, na data de
-- fechamento de cada cliente — não precisa (nem deve) inserir de novo
-- aqui, senão duplica.

-- Se quiser rodar esse seed em ambiente de teste e ver a MetaBar com
-- número diferente de zero HOJE, defina uma meta pro mês corrente:
-- insert into metas (ano, mes, valor_meta) values
--   (extract(year from current_date)::int, extract(month from current_date)::int, 60000);
