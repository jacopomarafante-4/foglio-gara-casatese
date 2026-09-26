-- =====================================================================
-- 0025 · Incarichi affidati: il direttore sceglie chi, anche per una partita o un giocatore
-- Da eseguire in Supabase → SQL Editor, DOPO la 0024
-- =====================================================================

-- Un incarico può riguardare una partita precisa o un giocatore dell'archivio, e può essere
-- affidato direttamente a una persona (assegnato_a, già nella 0024) da un direttore (affidato_da).
alter table public.incarichi
  add column if not exists gara_id      uuid references public.gare (id) on delete set null,
  add column if not exists giocatore_id uuid references public.giocatori (id) on delete set null,
  add column if not exists affidato_da  uuid references public.profiles (id) on delete set null;

alter table public.incarichi drop constraint if exists incarichi_tipo_check;
alter table public.incarichi add constraint incarichi_tipo_check
  check (tipo in ('squadra', 'torneo', 'partita', 'giocatore', 'altro'));
