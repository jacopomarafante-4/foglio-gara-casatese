-- 0027: i mister vedono il calendario di tutte le squadre (Portale → Calendario "Tutte le squadre",
-- Home dell'attività di base con gli impegni del weekend di tutti).
-- Solo nome, categoria e partite di ogni squadra: niente rose, registri, fogli gara né PIN.
-- Come coach_get passa da team_for_pin (blocco dei PIN a raffica, 0015), quindi è "volatile".

create or replace function public.coach_calendari(p_pin text)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
begin
  if public.team_for_pin(p_pin) is null then raise exception 'PIN non valido' using errcode = '28000'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', t->>'id',
      'name', t->>'name',
      'category', t->>'category',
      'matches', coalesce((select d.data->'matches' from public.docs d where d.path = 'calendar/' || (t->>'id')), '[]'::jsonb)
    ))
    from public.docs s, jsonb_array_elements(s.data->'items') t
    where s.path = 'shared/teams'
  ), '[]'::jsonb);
end $$;

revoke all on function public.coach_calendari(text) from public;
grant execute on function public.coach_calendari(text) to anon, authenticated;
