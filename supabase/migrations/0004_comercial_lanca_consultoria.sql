-- =====================================================================
-- Fluxo "Lancar consultoria": normalmente quem vende e o comercial, e
-- precisa poder lancar o pagamento da consultoria ele mesmo. Isso NAO
-- abre a aba Financeiro pra comercial (o redirect em financeiro/page.tsx
-- continua valendo) nem da SELECT/UPDATE/DELETE em pagamentos -- so
-- INSERT, o minimo pra esse fluxo funcionar.
-- =====================================================================
create policy "comercial lanca pagamento de consultoria (insert only)"
  on pagamentos for insert
  with check (auth_role() = 'comercial');
