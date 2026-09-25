-- =====================================================================
-- 0008 · PIN personali dei mister · PIN del team solo all'admin
-- Da eseguire in Supabase → SQL Editor, DOPO la 0007
-- =====================================================================

-- Squadre (documento shared/teams del Portale): ogni squadra ha l'elenco dei suoi mister,
-- ciascuno col suo PIN: "coaches": [{id, name, code}]. Lo genera l'admin da Società → Squadre.
-- Il vecchio PIN di squadra ("code") resta valido finché l'admin non lo disattiva.

-- Squadra corrispondente a un PIN: di squadra o di un suo mister (sostituisce quella di sicurezza.sql)
create or replace function public.team_for_pin(p_pin text)
returns text language sql stable security definer set search_path = public as $$
  select t ->> 'id'
  from public.docs d, jsonb_array_elements(coalesce(d.data -> 'items', '[]'::jsonb)) t
  where d.path = 'shared/teams'
    and coalesce(p_pin, '') <> ''
    and (t ->> 'code' = p_pin
         or exists (select 1 from jsonb_array_elements(coalesce(t -> 'coaches', '[]'::jsonb)) c
                    where c ->> 'code' = p_pin))
  limit 1;
$$;

-- Login mister: la squadra senza NESSUN PIN (né di squadra né degli altri mister),
-- più il nome del mister entrato. Null se il PIN non esiste (con ritardo, contro i tentativi a caso).
create or replace function public.coach_team(p_pin text)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare v_team text; v jsonb;
begin
  v_team := public.team_for_pin(p_pin);
  if v_team is null then
    if coalesce(p_pin, '') <> '' then perform pg_sleep(1); end if;
    return null;
  end if;
  select (t - 'code') || jsonb_build_object(
           'coaches', coalesce((select jsonb_agg(c - 'code')
                                from jsonb_array_elements(coalesce(t -> 'coaches', '[]'::jsonb)) c), '[]'::jsonb),
           'mister', public.mister_for_pin(p_pin))
    into v
  from public.docs d, jsonb_array_elements(d.data -> 'items') t
  where d.path = 'shared/teams' and t ->> 'id' = v_team;
  return v;
end $$;

revoke all on function public.team_for_pin(text) from public, anon, authenticated;
revoke all on function public.coach_team(text) from public;
grant execute on function public.coach_team(text) to anon, authenticated;

-- PIN di scout e direttori (codici_accesso): li vede SOLO l'admin (prima anche i direttori)
drop policy if exists "solo admin e direttori vedono i pin" on public.codici_accesso;
drop policy if exists "solo l'admin vede i pin" on public.codici_accesso;
create policy "solo l'admin vede i pin"
  on public.codici_accesso for select
  to authenticated
  using (public.is_admin());
