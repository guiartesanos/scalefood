-- Canal de push notification do Google Calendar (events.watch) — permite
-- que uma reunião de consultoria editada direto na agenda (fora do Food
-- Scale) seja refletida de volta automaticamente, sem precisar de um
-- cron rodando toda hora. Mesmo molde singleton de google_calendar_conexao
-- (0018_consultoria_board.sql).
create table google_calendar_watch (
  id int primary key default 1,
  channel_id text not null,
  resource_id text not null,
  -- segredo devolvido pelo Google em todo POST de notificação — confere
  -- que a chamada é legítima antes de disparar uma sincronização.
  channel_token text not null,
  expiration timestamptz not null,
  -- token de sincronização incremental da Calendar API (events.list) —
  -- sem isso, cada notificação teria que reler o histórico inteiro do
  -- calendário pra saber o que mudou.
  sync_token text,
  ultimo_erro text,
  ultimo_erro_em timestamptz,
  created_at timestamptz not null default now(),
  constraint google_calendar_watch_singleton check (id = 1)
);

alter table google_calendar_watch enable row level security;

create policy "master le o watch do calendar"
  on google_calendar_watch for select
  using (auth_role() = 'master');

create policy "master gerencia o watch do calendar"
  on google_calendar_watch for all
  using (auth_role() = 'master')
  with check (auth_role() = 'master');
