-- =====================================================================
-- Scouting Hub · 0003 · Gare del weekend
-- Squadre da seguire, gare da osservare, chi va a vedere cosa.
-- Da eseguire in Supabase → SQL Editor, DOPO la 0002
-- =====================================================================

-- 1. Sedi da cui calcolare la distanza ----------------------------------
create table public.sedi (
  id    smallint generated always as identity primary key,
  nome  text not null unique,
  lat   double precision not null,
  lon   double precision not null
);

-- Coordinate indicative dei due centri: correggile con quelle esatte
-- dei campi (Google Maps → tasto destro sul campo → copia le coordinate)
insert into public.sedi (nome, lat, lon) values
  ('Casatenovo', 45.6977, 9.3120),
  ('Merate',     45.6980, 9.4200);

-- 2. Squadre da seguire --------------------------------------------------
create table public.squadre_seguite (
  id          uuid primary key default gen_random_uuid(),
  societa_id  uuid not null references public.societa (id) on delete cascade,
  categoria   text,              -- es. "U13 Provinciali"; vuoto = tutte le categorie
  motivo      text,              -- es. "Due 2013 interessanti da rivedere"
  attiva      boolean not null default true,
  creato_da   uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);

create unique index squadre_seguite_unica
  on public.squadre_seguite (societa_id, lower(coalesce(categoria, '')));

-- 3. Gare --------------------------------------------------------------
create table public.gare (
  id              uuid primary key default gen_random_uuid(),
  data_ora        timestamptz not null,
  categoria       text not null,
  casa_nome       text not null,
  trasferta_nome  text not null,
  casa_id         uuid references public.societa (id) on delete set null,
  trasferta_id    uuid references public.societa (id) on delete set null,
  campo           text,
  indirizzo       text,
  lat             double precision,
  lon             double precision,
  fonte           text,          -- link al comunicato o a Tuttocampo
  creato_da       uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  constraint gara_unica unique (data_ora, casa_nome, trasferta_nome)
);

create index gare_data_idx on public.gare (data_ora);

-- 4. Chi va a vedere quale gara ------------------------------------------
create table public.gare_osservatori (
  gara_id     uuid not null references public.gare (id) on delete cascade,
  profilo_id  uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (gara_id, profilo_id)
);

-- 5. Sicurezza ----------------------------------------------------------
alter table public.sedi              enable row level security;
alter table public.squadre_seguite   enable row level security;
alter table public.gare              enable row level security;
alter table public.gare_osservatori  enable row level security;

create policy "sedi: lettura" on public.sedi
  for select to authenticated using (true);
create policy "sedi: gestione" on public.sedi
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "squadre seguite: lettura" on public.squadre_seguite
  for select to authenticated using (true);
create policy "squadre seguite: gestione" on public.squadre_seguite
  for all to authenticated using (public.vede_tutto()) with check (public.vede_tutto());

create policy "gare: lettura" on public.gare
  for select to authenticated using (true);
create policy "gare: gestione" on public.gare
  for all to authenticated using (public.vede_tutto()) with check (public.vede_tutto());

create policy "prenotazioni: lettura" on public.gare_osservatori
  for select to authenticated using (true);
-- Ognuno si prenota da solo; admin e responsabili possono assegnare chiunque
create policy "prenotazioni: inserimento" on public.gare_osservatori
  for insert to authenticated
  with check ((profilo_id = auth.uid() and public.puo_segnalare()) or public.vede_tutto());
create policy "prenotazioni: eliminazione" on public.gare_osservatori
  for delete to authenticated
  using (profilo_id = auth.uid() or public.vede_tutto());
