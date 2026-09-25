-- =====================================================================
-- Scouting Hub · 0005 · Codici PIN per account condivisi (scout/squadre)
-- Da eseguire in Supabase → SQL Editor, DOPO la 0004
-- =====================================================================

-- Per gli account "leggeri" (scout senza email personale, PIN di squadra):
-- il codice resta leggibile da admin/direttore per poterlo ridare a chi
-- lo perde. Non usare questa tabella per account con dati sensibili.
create table public.codici_accesso (
  id          uuid primary key default gen_random_uuid(),
  profilo_id  uuid not null unique references public.profiles (id) on delete cascade,
  pin         text not null,
  nota        text,
  created_at  timestamptz not null default now()
);

alter table public.codici_accesso enable row level security;

create policy "solo admin e direttori vedono i pin"
  on public.codici_accesso for select
  to authenticated
  using (public.vede_tutto());

-- Nessun insert/update/delete dal client: li scrive solo lo script con la
-- chiave di servizio, che aggira comunque la RLS.
