-- =====================================================================
-- 0036 · Necessità dello scouting: che giocatori cerca la società (annate, ruolo, piede)
-- Da eseguire in Supabase → SQL Editor, DOPO la 0035
-- =====================================================================
-- Le scrivono admin e direttori; le leggono anche gli scout (così sanno cosa andare a cercare).
-- La pagina mostra sotto ogni richiesta i giocatori già in archivio che rientrano nei parametri.

create table if not exists public.necessita (
  id          uuid primary key default gen_random_uuid(),
  titolo      text,                                   -- es. "Terzino sinistro veloce"
  annata_da   int not null check (annata_da between 1990 and 2030),
  annata_a    int not null check (annata_a between 1990 and 2030),
  ruolo       public.ruolo_campo,                     -- vuoto = qualsiasi ruolo
  piede       public.piede,                           -- vuoto = qualsiasi piede
  priorita    text not null default 'media' check (priorita in ('alta', 'media', 'bassa')),
  note        text,
  aperta      boolean not null default true,
  creato_da   uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint necessita_annate check (annata_da <= annata_a)
);

drop trigger if exists necessita_updated_at on public.necessita;
create trigger necessita_updated_at before update on public.necessita
  for each row execute function public.set_updated_at();

alter table public.necessita enable row level security;

drop policy if exists "necessita: lettura" on public.necessita;
create policy "necessita: lettura" on public.necessita
  for select to authenticated using (public.puo_segnalare());
drop policy if exists "necessita: inserimento" on public.necessita;
create policy "necessita: inserimento" on public.necessita
  for insert to authenticated with check (public.vede_tutto());
drop policy if exists "necessita: modifica" on public.necessita;
create policy "necessita: modifica" on public.necessita
  for update to authenticated using (public.vede_tutto()) with check (public.vede_tutto());
drop policy if exists "necessita: eliminazione" on public.necessita;
create policy "necessita: eliminazione" on public.necessita
  for delete to authenticated using (public.vede_tutto());
