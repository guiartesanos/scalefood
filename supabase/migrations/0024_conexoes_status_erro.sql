-- As 3 conexões OAuth (Drive, Calendar, Canva) são um registro único
-- compartilhado por todo mundo. Hoje "conectado()" só checa se a linha
-- existe — se o token de renovação for revogado (usuário desconectou pelo
-- lado do Google/Canva, trocou de senha, ficou 6 meses sem uso), a linha
-- continua lá e a tela mostra "conectado" mesmo com tudo quebrado, sem
-- avisar ninguém. Essas 2 colunas guardam o último erro de renovação pra
-- dar pra mostrar isso na tela (ver /configuracoes/integracoes).
alter table google_drive_conexao add column if not exists ultimo_erro text;
alter table google_drive_conexao add column if not exists ultimo_erro_em timestamptz;

alter table google_calendar_conexao add column if not exists ultimo_erro text;
alter table google_calendar_conexao add column if not exists ultimo_erro_em timestamptz;

alter table canva_conexao add column if not exists ultimo_erro text;
alter table canva_conexao add column if not exists ultimo_erro_em timestamptz;
