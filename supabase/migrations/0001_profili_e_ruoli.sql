-- =====================================================================
-- Scouting Hub · 0001 · Profili e ruoli
-- Da eseguire in Supabase → SQL Editor (una sola volta)
-- =====================================================================

-- 1. Ruoli disponibili --------------------------------------------------
--    admin         → vede tutto + gestisce utenti e ruoli
--    responsabile  → vede tutto (contatti famiglie compresi)
--    osservatore   → segnala e valuta, niente contatti famiglie
--    mister        → sola lettura sulla propria annata
create type public.ruolo as enum ('admin', 'responsabile', 'osservatore', 'mister');

-- 2. Tabella profili (1 riga per ogni utente che fa login) ---------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null unique,
  nome        text,
  cognome     text,
  ruolo       public.ruolo not null default 'osservatore',
  annate      int[] not null default '{}',   -- per i mister: es. {2013, 2014}
  attivo      boolean not null default true, -- false = accesso sospeso
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 3. Funzioni di controllo permessi (usate da tutte le tabelle future) ---
create or replace function public.mio_ruolo()
returns public.ruolo
language sql stable security definer set search_path = public
as $$
  select ruolo from public.profiles where id = auth.uid() and attivo
$$;

-- "Vede tutto": admin + responsabili
create or replace function public.vede_tutto()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(public.mio_ruolo() in ('admin', 'responsabile'), false)
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(public.mio_ruolo() = 'admin', false)
$$;

-- 4. Profilo creato in automatico a ogni nuovo utente --------------------
--    Il ruolo arriva da app_metadata (lo può scrivere solo il server),
--    mai da user_metadata (che l'utente potrebbe manomettere).
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, nome, cognome, ruolo)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'nome',
    new.raw_user_meta_data ->> 'cognome',
    coalesce((new.raw_app_meta_data ->> 'ruolo')::public.ruolo, 'osservatore')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 5. updated_at automatico ----------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- 6. Sicurezza (Row Level Security) -------------------------------------
alter table public.profiles enable row level security;

-- Tutti gli utenti loggati vedono l'elenco del team (serve per gli autori dei report)
create policy "team visibile agli utenti loggati"
  on public.profiles for select
  to authenticated
  using (true);

-- Ognuno modifica solo il proprio profilo…
create policy "modifica solo il proprio profilo"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- …e solo nome e cognome: ruolo, annate e attivo NON sono modificabili dal client
revoke update on public.profiles from authenticated;
grant update (nome, cognome) on public.profiles to authenticated;

-- Nessun insert/delete dal client: li fanno il trigger e gli script server

-- 7. Cambio ruolo: solo l'admin, tramite funzione controllata ------------
create or replace function public.imposta_ruolo(
  utente uuid,
  nuovo_ruolo public.ruolo,
  nuove_annate int[] default null
)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Solo un admin può cambiare i ruoli';
  end if;
  if utente = auth.uid() then
    raise exception 'Non puoi cambiare il tuo stesso ruolo';
  end if;

  update public.profiles
     set ruolo  = nuovo_ruolo,
         annate = coalesce(nuove_annate, annate)
   where id = utente;
end;
$$;

revoke all on function public.imposta_ruolo(uuid, public.ruolo, int[]) from public, anon;
grant execute on function public.imposta_ruolo(uuid, public.ruolo, int[]) to authenticated;
