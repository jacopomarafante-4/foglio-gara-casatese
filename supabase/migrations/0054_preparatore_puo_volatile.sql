-- =====================================================================
-- 0054 · Corregge preparatore_puo (0053): deve essere "volatile", non "stable"
-- Da eseguire in Supabase → SQL Editor, DOPO la 0053
-- =====================================================================
-- preparatore_puo() chiama team_for_pin(), che scrive (controlla_blocco_pin() pulisce pin_errati, e su un PIN sbagliato ne
-- inserisce uno): dichiarata "stable" veniva eseguita in una transazione di sola lettura e la scrittura falliva
-- ("cannot execute DELETE in a read-only transaction"), bloccando anche le chiamate con un PIN valido.

create or replace function public.preparatore_puo(p_pin text, p_team text)
returns boolean language plpgsql volatile security definer set search_path = public as $$
declare v_team text;
begin
  v_team := public.team_for_pin(p_pin);
  if v_team is null or not public.vede_tutte_squadre(v_team) then return false; end if;
  if p_team = v_team then return true; end if;
  return exists (
    select 1 from public.docs d, jsonb_array_elements(coalesce(d.data -> 'items', '[]'::jsonb)) t,
                  jsonb_array_elements(coalesce(t -> 'coaches', '[]'::jsonb)) c, jsonb_array_elements_text(coalesce(c -> 'eta', '[]'::jsonb)) e
    where d.path = 'shared/teams' and t ->> 'id' = v_team and c ->> 'code' = p_pin and e::int = public.eta_squadra(p_team));
end $$;
revoke all on function public.preparatore_puo(text, text) from public, anon, authenticated;
