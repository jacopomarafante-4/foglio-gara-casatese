-- =====================================================================
-- 0009 · Dirigenti: vedono tutto, non modificano niente
-- Da eseguire in Supabase → SQL Editor, DOPO la 0008
-- =====================================================================

-- Il ruolo `direttore` (in interfaccia "Dirigente", a capo di squadre e scout) diventa di
-- sola lettura: vede tutto lo scouting (contatti compresi, vede_tutto() resta com'è) e tutte
-- le squadre del Portale, ma non scrive. Le modifiche di gestione restano all'admin.

-- Segnalare, valutare, aggiungere giocatori/società/contatti, prenotarsi alle gare: admin e scout
create or replace function public.puo_segnalare()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.mio_ruolo() in ('admin', 'scout'), false)
$$;

-- Cambio di stato dei giocatori: solo l'admin
create or replace function public.controlla_cambio_stato()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.stato is distinct from old.stato
     and auth.uid() is not null
     and not public.is_admin() then
    raise exception 'Solo l''admin può cambiare lo stato di un giocatore';
  end if;
  return new;
end;
$$;

-- Regole di scrittura che valevano anche per i direttori → solo admin
drop policy if exists "societa: modifica" on public.societa;
create policy "societa: modifica" on public.societa
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "giocatori: modifica" on public.giocatori;
create policy "giocatori: modifica" on public.giocatori
  for update to authenticated
  using (public.is_admin() or (creato_da = auth.uid() and public.puo_segnalare()))
  with check (public.is_admin() or (creato_da = auth.uid() and public.puo_segnalare()));

drop policy if exists "contatti: modifica" on public.contatti;
create policy "contatti: modifica" on public.contatti
  for update to authenticated
  using (public.is_admin() or (creato_da = auth.uid() and public.puo_segnalare()))
  with check (public.is_admin() or (creato_da = auth.uid() and public.puo_segnalare()));

drop policy if exists "contatti: eliminazione" on public.contatti;
create policy "contatti: eliminazione" on public.contatti
  for delete to authenticated
  using (public.is_admin() or (creato_da = auth.uid() and public.puo_segnalare()));

drop policy if exists "squadre seguite: gestione" on public.squadre_seguite;
create policy "squadre seguite: gestione" on public.squadre_seguite
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "gare: gestione" on public.gare;
create policy "gare: gestione" on public.gare
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "prenotazioni: inserimento" on public.gare_osservatori;
create policy "prenotazioni: inserimento" on public.gare_osservatori
  for insert to authenticated
  with check ((profilo_id = auth.uid() and public.puo_segnalare()) or public.is_admin());

drop policy if exists "prenotazioni: eliminazione" on public.gare_osservatori;
create policy "prenotazioni: eliminazione" on public.gare_osservatori
  for delete to authenticated
  using ((profilo_id = auth.uid() and public.puo_segnalare()) or public.is_admin());

-- Portale squadre: i dirigenti leggono i documenti di tutte le squadre, senza nessun PIN.
-- Nessuna funzione di scrittura per loro.
create or replace function public.dirigente_get(p_path text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v jsonb;
begin
  if coalesce(public.mio_ruolo() = 'direttore', false) is not true then
    raise exception 'Solo per i dirigenti' using errcode = '42501';
  end if;
  select data into v from public.docs where path = p_path;
  if p_path = 'shared/teams' and v is not null then
    select jsonb_build_object('items', coalesce(jsonb_agg(
             (t - 'code') || jsonb_build_object('coaches', coalesce(
               (select jsonb_agg(c - 'code') from jsonb_array_elements(coalesce(t -> 'coaches', '[]'::jsonb)) c),
               '[]'::jsonb))), '[]'::jsonb))
      into v
    from jsonb_array_elements(coalesce(v -> 'items', '[]'::jsonb)) t;
  end if;
  return v;
end $$;

revoke all on function public.dirigente_get(text) from public, anon;
grant execute on function public.dirigente_get(text) to authenticated;
