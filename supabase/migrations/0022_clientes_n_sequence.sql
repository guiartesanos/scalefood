-- Corrige a causa raiz do "#" duplicado em Clientes ativos: o código
-- calculava o próximo número como count(*) das linhas em clientes na
-- hora do insert. Isso reaproveita número sempre que um cliente é
-- cancelado (sai da tabela, o count cai) e ainda corre risco de colisão
-- em duas inserções próximas — dois clientes novos já nasceram com n=1,
-- colidindo com o Betos original.
--
-- Corrige os 2 registros que colidiram (em ordem de criação, os
-- próximos números livres) e passa a gerar "n" por uma sequence de
-- verdade no banco — nunca reaproveita e é atômica (sem essa corrida).
update clientes set n = 17 where nome = 'Mercadão do Sorvete' and n = 1;
update clientes set n = 18 where nome = 'Lion Café' and n = 1;

create sequence if not exists clientes_n_seq;
select setval('clientes_n_seq', greatest((select max(n) from clientes), 1));
alter table clientes alter column n set default nextval('clientes_n_seq');
