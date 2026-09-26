-- =====================================================================
-- 0023 · "Aggiungi partita": gara a mano con distinte e segnalazioni
-- Da eseguire in Supabase → SQL Editor, DOPO la 0022
-- =====================================================================

-- 1. Gare inserite a mano anche dagli scout (solo quelle senza chiave: i calendari restano all'import)
alter table public.gare
  add column if not exists inserita_da uuid default auth.uid() references public.profiles (id) on delete set null;

drop policy if exists "gare: inserite a mano" on public.gare;
create policy "gare: inserite a mano" on public.gare
  for insert to authenticated
  with check (public.puo_segnalare() and chiave is null);

-- 2. Segnalazione fatta durante una partita precisa
alter table public.segnalazioni
  add column if not exists gara_id uuid references public.gare (id) on delete set null;
create index if not exists segnalazioni_gara_idx on public.segnalazioni (gara_id);

-- 3. Distinte (foto o PDF) allegate alla partita: contengono nomi di minori, quindi private.
--    Le vedono admin e direttori (vede_tutto) e chi le ha caricate.
create table if not exists public.gare_allegati (
  id          uuid primary key default gen_random_uuid(),
  gara_id     uuid not null references public.gare (id) on delete cascade,
  percorso    text not null unique,          -- nel contenitore "distinte": <gara>/<file>
  nome_file   text,
  tipo        text,
  caricato_da uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists gare_allegati_gara_idx on public.gare_allegati (gara_id);
alter table public.gare_allegati enable row level security;

drop policy if exists "allegati: lettura" on public.gare_allegati;
create policy "allegati: lettura" on public.gare_allegati
  for select to authenticated using (public.vede_tutto() or caricato_da = auth.uid());
drop policy if exists "allegati: inserimento" on public.gare_allegati;
create policy "allegati: inserimento" on public.gare_allegati
  for insert to authenticated with check (public.puo_segnalare() and caricato_da = auth.uid());
drop policy if exists "allegati: eliminazione" on public.gare_allegati;
create policy "allegati: eliminazione" on public.gare_allegati
  for delete to authenticated using (public.vede_tutto() or caricato_da = auth.uid());

-- Contenitore privato dei file (massimo 15 MB, foto e PDF)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('distinte', 'distinte', false, 15728640,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'])
on conflict (id) do nothing;

drop policy if exists "distinte: caricamento" on storage.objects;
create policy "distinte: caricamento" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'distinte' and public.puo_segnalare());
drop policy if exists "distinte: lettura" on storage.objects;
create policy "distinte: lettura" on storage.objects
  for select to authenticated
  using (bucket_id = 'distinte' and (public.vede_tutto() or owner = auth.uid()));
drop policy if exists "distinte: eliminazione" on storage.objects;
create policy "distinte: eliminazione" on storage.objects
  for delete to authenticated
  using (bucket_id = 'distinte' and (public.vede_tutto() or owner = auth.uid()));
