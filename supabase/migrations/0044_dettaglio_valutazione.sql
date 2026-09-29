-- =====================================================================
-- 0044 · Valutazione: 5 voti in più nel dettaglio (marcamento, smarcamento, trasmissione, colpo di testa, concentrazione)
-- Da eseguire in Supabase → SQL Editor, DOPO la 0043
-- =====================================================================
-- Voti facoltativi da 1 a 5, come quelli della 0041. "Spunti" ora vale "Spunti, estro e coraggio" (stessa colonna). Anche per i mister dal Portale (coach_valuta riscritta).

alter table public.valutazioni
  add column if not exists marcamento smallint check (marcamento between 1 and 5),
  add column if not exists smarcamento smallint check (smarcamento between 1 and 5),
  add column if not exists trasmissione smallint check (trasmissione between 1 and 5),
  add column if not exists colpo_di_testa smallint check (colpo_di_testa between 1 and 5),
  add column if not exists concentrazione smallint check (concentrazione between 1 and 5);

create or replace function public.coach_valuta(p_pin text, p_giocatore uuid, p_dati jsonb)
returns void language plpgsql volatile security definer set search_path = public as $$
declare v_team text; v_squadra text; a text; v int;
begin
  v_team := public.team_for_pin(p_pin);
  if v_team is null then perform pg_sleep(1); raise exception 'PIN non valido' using errcode = '28000'; end if;
  if not exists (select 1 from public.giocatori where id = p_giocatore) then raise exception 'Giocatore non trovato.'; end if;
  foreach a in array array['tecnica', 'motoria', 'tattica', 'mentale', 'spunti', 'guida_palla', 'ricezione', 'calciata', 'contrasto',
                           'velocita', 'reattivita', 'marcamento', 'smarcamento', 'trasmissione', 'colpo_di_testa', 'concentrazione'] loop
    v := nullif(p_dati ->> a, '')::int;
    if v is not null and v not between 1 and 5 then raise exception 'I voti vanno da 1 a 5.'; end if;
  end loop;
  if coalesce(p_dati ->> 'giudizio', '') not in ('da_prendere', 'da_rivedere', 'non_a_livello') then
    raise exception 'Scegli il giudizio finale.';
  end if;
  select concat_ws(' · ', public.mister_for_pin(p_pin), coalesce(nullif(trim(t ->> 'category'), ''), t ->> 'name'))
    into v_squadra
  from public.docs d, jsonb_array_elements(d.data -> 'items') t
  where d.path = 'shared/teams' and t ->> 'id' = v_team;
  insert into public.valutazioni (giocatore_id, autore_id, autore_squadra, data, contesto,
    tecnica, tecnica_note, motoria, motoria_note, tattica, tattica_note, mentale, mentale_note, giudizio, commento,
    spunti, guida_palla, ricezione, calciata, contrasto, velocita, reattivita,
    marcamento, smarcamento, trasmissione, colpo_di_testa, concentrazione)
  values (p_giocatore, null, v_squadra, coalesce(nullif(p_dati ->> 'data', '')::date, current_date), nullif(trim(p_dati ->> 'contesto'), ''),
    nullif(p_dati ->> 'tecnica', '')::smallint, nullif(trim(p_dati ->> 'tecnica_note'), ''),
    nullif(p_dati ->> 'motoria', '')::smallint, nullif(trim(p_dati ->> 'motoria_note'), ''),
    nullif(p_dati ->> 'tattica', '')::smallint, nullif(trim(p_dati ->> 'tattica_note'), ''),
    nullif(p_dati ->> 'mentale', '')::smallint, nullif(trim(p_dati ->> 'mentale_note'), ''),
    (p_dati ->> 'giudizio')::public.giudizio, nullif(trim(p_dati ->> 'commento'), ''),
    nullif(p_dati ->> 'spunti', '')::smallint, nullif(p_dati ->> 'guida_palla', '')::smallint, nullif(p_dati ->> 'ricezione', '')::smallint,
    nullif(p_dati ->> 'calciata', '')::smallint, nullif(p_dati ->> 'contrasto', '')::smallint, nullif(p_dati ->> 'velocita', '')::smallint,
    nullif(p_dati ->> 'reattivita', '')::smallint,
    nullif(p_dati ->> 'marcamento', '')::smallint, nullif(p_dati ->> 'smarcamento', '')::smallint, nullif(p_dati ->> 'trasmissione', '')::smallint,
    nullif(p_dati ->> 'colpo_di_testa', '')::smallint, nullif(p_dati ->> 'concentrazione', '')::smallint);
end $$;
