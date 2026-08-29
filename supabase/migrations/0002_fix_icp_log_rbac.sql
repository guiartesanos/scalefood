-- =====================================================================
-- Corrige o RBAC de icp_log: o plano aprovado previa acesso total
-- ("tudo") a financeiro/onboarding em tarefas e icp_log, mas a policy
-- original só liberava master/comercial. Além disso, onboarding cria
-- clientes (e agora isso gera uma linha automática em icp_log), então
-- precisa poder inserir também.
-- =====================================================================

drop policy if exists "master/comercial leem e escrevem icp_log" on icp_log;

create policy "todo usuario com papel le e escreve icp_log"
  on icp_log for all
  using (auth_role() is not null)
  with check (auth_role() is not null);
