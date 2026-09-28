-- =====================================================================
-- 0038 · Calendario delle nostre squadre nello Scouting (anche per gli scout)
-- Da eseguire in Supabase → SQL Editor, DOPO la 0037
-- =====================================================================
-- Gli scout non leggono i documenti del Portale (docs). Questa funzione dà ad admin, direttori e scout solo
-- nome, categoria e partite delle squadre (niente PIN né mister; esclusi organizzazione e preparatori),
-- e di ogni partita solo data, ora, avversario, casa/trasferta, campo, tipo. Come coach_calendari (0027) per i mister.

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
          'id', m->>'id', 'date', m->>'date', 'time', m->>'time', 'opponent', m->>'opponent',
          'home', coalesce((m->>'home')::boolean, false), 'venue', m->>'venue', 'address', m->>'address',
          'friendly', coalesce((m->>'friendly')::boolean, false), 'tipo', m->>'tipo'))
        from public.docs d, jsonb_array_elements(coalesce(d.data->'matches', '[]'::jsonb)) m
        where d.path = 'calendar/' || (t->>'id')), '[]'::jsonb)
    ))
    from public.docs s, jsonb_array_elements(s.data->'items') t
    where s.path = 'shared/teams'
      and not coalesce((t->>'organizza')::boolean, false)
      and not coalesce((t->>'vedeTutte')::boolean, false)
  ), '[]'::jsonb);
end $$;
revoke all on function public.calendari_squadre() from public, anon;
grant execute on function public.calendari_squadre() to authenticated;
