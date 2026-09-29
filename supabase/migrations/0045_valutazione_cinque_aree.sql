-- =====================================================================
-- 0045 · Valutazione in 5 aree (Tecnica, Tattica, Fisico, Mentale, Extra): 7 voti in più
-- Da eseguire in Supabase → SQL Editor, DOPO la 0044
-- =====================================================================
-- Nuovi voti facoltativi da 1 a 5: dribbling (Tattica), accelerazione e agilità (Fisico), motivazione (Mentale),
-- famiglia, potenziale e livello attuale (Extra). I gruppi si decidono nell'app (lib/tipi.ts), non qui.
-- coach_valuta (mister dal Portale) ora accetta da sola ogni colonna voto (smallint) della tabella: per aggiungere
-- una voce in futuro basta la colonna, senza riscrivere la funzione.

alter table public.valutazioni
  add column if not exists dribbling smallint check (dribbling between 1 and 5),
  add column if not exists accelerazione smallint check (accelerazione between 1 and 5),
  add column if not exists agilita smallint check (agilita between 1 and 5),
  add column if not exists motivazione smallint check (motivazione between 1 and 5),
  add column if not exists famiglia smallint check (famiglia between 1 and 5),
  add column if not exists potenziale smallint check (potenziale between 1 and 5),
  add column if not exists livello_attuale smallint check (livello_attuale between 1 and 5);

create or replace function public.coach_valuta(p_pin text, p_giocatore uuid, p_dati jsonb)
returns void language plpgsql volatile security definer set search_path = public as $$
declare v_team text; v_squadra text; v_id uuid; c text; v int;
begin
  v_team := public.team_for_pin(p_pin);
  if v_team is null then perform pg_sleep(1); raise exception 'PIN non valido' using errcode = '28000'; end if;
  if not exists (select 1 from public.giocatori where id = p_giocatore) then raise exception 'Giocatore non trovato.'; end if;
  if coalesce(p_dati ->> 'giudizio', '') not in ('da_prendere', 'da_rivedere', 'non_a_livello') then
    raise exception 'Scegli il giudizio finale.';
  end if;
  select concat_ws(' · ', public.mister_for_pin(p_pin), coalesce(nullif(trim(t ->> 'category'), ''), t ->> 'name'))
    into v_squadra
  from public.docs d, jsonb_array_elements(d.data -> 'items') t
  where d.path = 'shared/teams' and t ->> 'id' = v_team;

  insert into public.valutazioni (giocatore_id, autore_id, autore_squadra, data, contesto, giudizio, commento)
  values (p_giocatore, null, v_squadra, coalesce(nullif(p_dati ->> 'data', '')::date, current_date), nullif(trim(p_dati ->> 'contesto'), ''),
          (p_dati ->> 'giudizio')::public.giudizio, nullif(trim(p_dati ->> 'commento'), ''))
  returning id into v_id;

  -- i voti: ogni colonna smallint della tabella (1–5, facoltativi); un errore annulla tutta la valutazione
  for c in select column_name from information_schema.columns
           where table_schema = 'public' and table_name = 'valutazioni' and data_type = 'smallint' loop
    v := nullif(p_dati ->> c, '')::int;
    if v is not null then
      if v not between 1 and 5 then raise exception 'I voti vanno da 1 a 5.'; end if;
      execute format('update public.valutazioni set %I = $1 where id = $2', c) using v, v_id;
    end if;
  end loop;
end $$;
