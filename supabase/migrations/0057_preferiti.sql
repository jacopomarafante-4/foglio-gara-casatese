-- Preferiti ("stellina"): ognuno segna le sue gare e i suoi giocatori. Li vede e li cambia solo chi li ha segnati.
create table if not exists public.preferiti (
  id            uuid primary key default gen_random_uuid(),
  profilo_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  gara_id       uuid references public.gare (id) on delete cascade,
  giocatore_id  uuid references public.giocatori (id) on delete cascade,
  created_at    timestamptz not null default now(),
  constraint preferiti_una_cosa check ((gara_id is null) <> (giocatore_id is null)),
  constraint preferiti_gara_unica unique (profilo_id, gara_id),
  constraint preferiti_giocatore_unico unique (profilo_id, giocatore_id)
);
create index if not exists preferiti_profilo_idx on public.preferiti (profilo_id);

alter table public.preferiti enable row level security;

drop policy if exists "preferiti: i propri" on public.preferiti;
create policy "preferiti: i propri" on public.preferiti
  for select using (profilo_id = auth.uid());
drop policy if exists "preferiti: aggiunge i propri" on public.preferiti;
create policy "preferiti: aggiunge i propri" on public.preferiti
  for insert with check (profilo_id = auth.uid());
drop policy if exists "preferiti: toglie i propri" on public.preferiti;
create policy "preferiti: toglie i propri" on public.preferiti
  for delete using (profilo_id = auth.uid());
