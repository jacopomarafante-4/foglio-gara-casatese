-- =====================================================================
-- 0060 · Tabelle vere, fase 1 (continua): i mister leggono il calendario dalla tabella a righe
-- Da eseguire in Supabase → SQL Editor, DOPO la 0059
-- =====================================================================
-- coach_calendari (0027) prendeva le partite dal blocco calendar/<squadra>; ora le prende da calendario_partite
-- (0059, tenuta allineata da sola). Stesso risultato di prima per chi chiama: id, name, category, matches.

create or replace function public.coach_calendari(p_pin text)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
begin
  if public.team_for_pin(p_pin) is null then raise exception 'PIN non valido' using errcode = '28000'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', t->>'id',
      'name', t->>'name',
      'category', t->>'category',
      'matches', coalesce((
        select jsonb_agg(c.dati order by c.data nulls last)
          from public.calendario_partite c where c.squadra = (t->>'id')
      ), '[]'::jsonb)
    ))
    from public.docs s, jsonb_array_elements(s.data->'items') t
    where s.path = 'shared/teams'
  ), '[]'::jsonb);
end $$;

-- calendari_squadre (0038): stesso calendario, per lo Scouting (admin, direttori, scout)
create or replace function public.calendari_squadre()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.puo_segnalare() then
    raise exception 'Solo admin, direttori e scout' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', t->>'id',
      'name', t->>'name',
      'category', t->>'category',
      'matches', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', c.id, 'date', to_char(c.data, 'YYYY-MM-DD'), 'time', c.ora, 'opponent', c.avversario,
          'home', coalesce(c.casa, false), 'venue', c.campo, 'address', c.indirizzo,
          'friendly', c.amichevole, 'tipo', c.tipo)
          order by c.data nulls last)
        from public.calendario_partite c where c.squadra = (t->>'id')), '[]'::jsonb)
    ))
    from public.docs s, jsonb_array_elements(s.data->'items') t
    where s.path = 'shared/teams'
      and not coalesce((t->>'organizza')::boolean, false)
      and not coalesce((t->>'vedeTutte')::boolean, false)
  ), '[]'::jsonb);
end $$;
