-- =====================================================================
-- Scouting Hub · 0004 · Rinomina ruoli + accesso al pannello
-- Da eseguire in Supabase → SQL Editor, DOPO la 0003
-- =====================================================================

-- 1. Rinomina dei ruoli (stesso significato, nomi più chiari) ------------
--    responsabile -> direttore   |   osservatore -> scout
--    admin e mister restano invariati.
alter type public.ruolo rename value 'responsabile' to 'direttore';
alter type public.ruolo rename value 'osservatore' to 'scout';

-- 2. Funzioni che citavano i vecchi nomi: da riscrivere con quelli nuovi -
create or replace function public.vede_tutto()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(public.mio_ruolo() in ('admin', 'direttore'), false)
$$;

create or replace function public.puo_segnalare()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(public.mio_ruolo() in ('admin', 'direttore', 'scout'), false)
$$;

create or replace function public.puo_vedere_annata(a int)
returns boolean
language sql stable security definer set search_path = public
as $$
  select case
    when public.mio_ruolo() in ('admin', 'direttore', 'scout') then true
    when public.mio_ruolo() = 'mister' then
      a = any (coalesce((select annate from public.profiles where id = auth.uid()), '{}'))
    else false
  end
$$;

-- 3. Nuovo utente senza ruolo indicato: default "scout" invece di "osservatore"
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
    coalesce((new.raw_app_meta_data ->> 'ruolo')::public.ruolo, 'scout')
  );
  return new;
end;
$$;

-- Nota: il blocco totale dei mister dal pannello Scouting Hub è lato app
-- (vedi app/(app)/layout.tsx), non nel database: i mister restano utenti
-- validi, solo senza accesso alle pagine dell'app.
