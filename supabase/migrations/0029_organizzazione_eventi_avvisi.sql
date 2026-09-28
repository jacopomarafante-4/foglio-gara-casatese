-- 0029: responsabile organizzativo ed eventi, calendario eventi e avvisi della società.
--
-- 1) Una "squadra" del Portale con "organizza": true in shared/teams è il responsabile organizzativo: entra col PIN
--    come un mister, vede l'elenco delle squadre (senza PIN) e scrive:
--      calendar/<qualsiasi squadra>  (orari, campi, amichevoli di tutti),
--      shared/eventi                 (tornei organizzati, open day, feste, riunioni),
--      shared/avvisi                 (avvisi per una o più squadre, da mandare anche su WhatsApp).
--    Non legge rose, registri né fogli gara delle squadre.
-- 2) Tutti i mister leggono shared/eventi e shared/avvisi (li vedono in calendario e in Home).
-- Admin: già tutto (policy di docs). Direttori: leggono (0011).

create or replace function public.squadra_organizza(p_team text)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((
    select (t ->> 'organizza')::boolean
    from public.docs d, jsonb_array_elements(d.data -> 'items') t
    where d.path = 'shared/teams' and t ->> 'id' = p_team
    limit 1), false);
$$;
revoke all on function public.squadra_organizza(text) from public, anon, authenticated;

create or replace function public.coach_get(p_pin text, p_path text)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare v_team text; v_tutte boolean; v_org boolean; v jsonb;
begin
  v_team := public.team_for_pin(p_pin);
  if v_team is null then raise exception 'PIN non valido' using errcode = '28000'; end if;
  v_tutte := public.vede_tutte_squadre(v_team);
  v_org := public.squadra_organizza(v_team);
  if p_path = 'shared/teams' then
    if not (v_tutte or v_org) then
      return jsonb_build_object('items', jsonb_build_array(public.coach_team(p_pin)));
    end if;
    -- Tutte le squadre, senza PIN (né della squadra né dei mister)
    return jsonb_build_object('items', coalesce((
      select jsonb_agg((t - 'code') || jsonb_build_object('coaches', coalesce((
               select jsonb_agg(c - 'code') from jsonb_array_elements(coalesce(t -> 'coaches', '[]'::jsonb)) c), '[]'::jsonb)))
      from public.docs d, jsonb_array_elements(d.data -> 'items') t
      where d.path = 'shared/teams'), '[]'::jsonb));
  end if;
  if p_path not in ('shared/schemes', 'shared/eventi', 'shared/avvisi')
     and p_path not in ('roster/' || v_team, 'sheet/' || v_team, 'calendar/' || v_team, 'registro/' || v_team)
     and not (v_tutte and p_path ~ '^(roster|sheet|calendar|registro)/[A-Za-z0-9_-]+$')
     and not (v_org and p_path ~ '^calendar/[A-Za-z0-9_-]+$') then
    raise exception 'Documento non consentito' using errcode = '42501';
  end if;
  select data into v from public.docs where path = p_path;
  return v;
end $$;

create or replace function public.coach_set(p_pin text, p_path text, p_data jsonb)
returns void language plpgsql volatile security definer set search_path = public as $$
declare v_team text;
begin
  v_team := public.team_for_pin(p_pin);
  if v_team is null then raise exception 'PIN non valido' using errcode = '28000'; end if;
  if p_path not in ('sheet/' || v_team, 'registro/' || v_team)
     and not (public.squadra_organizza(v_team)
              and (p_path in ('shared/eventi', 'shared/avvisi') or p_path ~ '^calendar/[A-Za-z0-9_-]+$')) then
    raise exception 'Documento non consentito' using errcode = '42501';
  end if;
  insert into public.docs (path, data, updated_at) values (p_path, p_data, now())
  on conflict (path) do update set data = excluded.data, updated_at = excluded.updated_at;
end $$;

revoke all on function public.coach_get(text, text) from public;
grant execute on function public.coach_get(text, text) to anon, authenticated;
revoke all on function public.coach_set(text, text, jsonb) from public;
grant execute on function public.coach_set(text, text, jsonb) to anon, authenticated;
