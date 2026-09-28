-- 0028: squadre che vedono tutte le altre (preparatori dei portieri) e giocatori dell'annata per i mister.
--
-- 1) Una squadra del Portale con "vedeTutte": true in shared/teams (i preparatori dei portieri, "SGS") entra col suo PIN
--    come un mister, ma legge rosa, foglio gara, calendario e registro di TUTTE le squadre (in sola lettura:
--    coach_set resta limitato alla propria squadra) e l'elenco delle squadre senza nessun PIN.
-- 2) coach_giocatori(pin): nello Scouting del Portale ogni mister vede i giocatori osservati della propria annata
--    (età della categoria "Under N" → annata = anno di fine stagione − N), esclusi quelli dell'Academy:
--    scheda base, segnalazioni e valutazioni. Mai i contatti delle famiglie né le note interne del giocatore.

create or replace function public.vede_tutte_squadre(p_team text)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((
    select (t ->> 'vedeTutte')::boolean
    from public.docs d, jsonb_array_elements(d.data -> 'items') t
    where d.path = 'shared/teams' and t ->> 'id' = p_team
    limit 1), false);
$$;
revoke all on function public.vede_tutte_squadre(text) from public, anon, authenticated;

create or replace function public.coach_get(p_pin text, p_path text)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare v_team text; v_tutte boolean; v jsonb;
begin
  v_team := public.team_for_pin(p_pin);
  if v_team is null then raise exception 'PIN non valido' using errcode = '28000'; end if;
  v_tutte := public.vede_tutte_squadre(v_team);
  if p_path = 'shared/teams' then
    if not v_tutte then
      return jsonb_build_object('items', jsonb_build_array(public.coach_team(p_pin)));
    end if;
    -- Tutte le squadre, senza PIN (né della squadra né dei mister)
    return jsonb_build_object('items', coalesce((
      select jsonb_agg((t - 'code') || jsonb_build_object('coaches', coalesce((
               select jsonb_agg(c - 'code') from jsonb_array_elements(coalesce(t -> 'coaches', '[]'::jsonb)) c), '[]'::jsonb)))
      from public.docs d, jsonb_array_elements(d.data -> 'items') t
      where d.path = 'shared/teams'), '[]'::jsonb));
  end if;
  if p_path <> 'shared/schemes'
     and p_path not in ('roster/' || v_team, 'sheet/' || v_team, 'calendar/' || v_team, 'registro/' || v_team)
     and not (v_tutte and p_path ~ '^(roster|sheet|calendar|registro)/[A-Za-z0-9_-]+$') then
    raise exception 'Documento non consentito' using errcode = '42501';
  end if;
  select data into v from public.docs where path = p_path;
  return v;
end $$;

create or replace function public.coach_giocatori(p_pin text)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare v_team text; v_cat text; v_eta int; v_annata int; v_nostra uuid;
begin
  v_team := public.team_for_pin(p_pin);
  if v_team is null then
    perform pg_sleep(1);
    raise exception 'PIN non valido' using errcode = '28000';
  end if;
  select t ->> 'category' into v_cat
  from public.docs d, jsonb_array_elements(d.data -> 'items') t
  where d.path = 'shared/teams' and t ->> 'id' = v_team;
  v_eta := substring(lower(coalesce(v_cat, '')) from 'under\s*([0-9]+)')::int;
  if v_eta is null then return '[]'::jsonb; end if;
  -- Stagione da luglio a giugno: anno di fine stagione − età della categoria
  v_annata := extract(year from current_date)::int + case when extract(month from current_date) >= 7 then 1 else 0 end - v_eta;
  select id into v_nostra from public.societa where nome = 'Academy Casatese Merate';
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', g.id, 'cognome', g.cognome, 'nome', g.nome, 'descrizione', g.descrizione, 'annata', g.annata,
      'ruolo', g.ruolo, 'piede', g.piede, 'stato', g.stato, 'categoria', g.categoria, 'societa', s.nome,
      'segnalazioni', coalesce((
        select jsonb_agg(jsonb_build_object('data', x.data, 'contesto', x.contesto, 'testo', x.testo, 'voto', x.voto,
                 'autore', coalesce(nullif(trim(concat_ws(' ', p.nome, p.cognome)), ''), x.squadra)) order by x.data desc)
        from public.segnalazioni x left join public.profiles p on p.id = x.autore_id
        where x.giocatore_id = g.id), '[]'::jsonb),
      'valutazioni', coalesce((
        select jsonb_agg(jsonb_build_object('data', v.data, 'contesto', v.contesto,
                 'tecnica', v.tecnica, 'tecnica_note', v.tecnica_note, 'motoria', v.motoria, 'motoria_note', v.motoria_note,
                 'tattica', v.tattica, 'tattica_note', v.tattica_note, 'mentale', v.mentale, 'mentale_note', v.mentale_note,
                 'giudizio', v.giudizio, 'commento', v.commento,
                 'autore', nullif(trim(concat_ws(' ', p.nome, p.cognome)), '')) order by v.data desc)
        from public.valutazioni v left join public.profiles p on p.id = v.autore_id
        where v.giocatore_id = g.id), '[]'::jsonb)
    ) order by g.cognome nulls last, g.nome)
    from public.giocatori g left join public.societa s on s.id = g.societa_id
    where g.annata = v_annata and g.osservato and g.societa_id is distinct from v_nostra), '[]'::jsonb);
end $$;

revoke all on function public.coach_get(text, text) from public;
grant execute on function public.coach_get(text, text) to anon, authenticated;
revoke all on function public.coach_giocatori(text) from public;
grant execute on function public.coach_giocatori(text) to anon, authenticated;
