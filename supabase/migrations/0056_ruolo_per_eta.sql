-- =====================================================================
-- 0056 · Valutazione: la domanda sul ruolo cambia con l'età
-- Da eseguire in Supabase → SQL Editor, DOPO la 0055
-- =====================================================================
-- Pulcini e più piccoli (età sportiva fino a 11): solo portiere o di movimento; Under 12-13: portiere o la linea (prima =
-- difensore, seconda = centrocampista, terza = attaccante); dall'Under 14 il ruolo preciso, come prima (ruolo_preciso, 0046).
-- valutazioni.ruolo_campo tiene la risposta dei più piccoli; il trigger aggiorna la scheda del giocatore come per il ruolo preciso.

alter table public.valutazioni add column if not exists ruolo_campo public.ruolo_campo;

create or replace function public.ruolo_da_valutazione()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.ruolo_preciso is not null then
    update public.giocatori set
      ruolo_preciso = new.ruolo_preciso,
      ruolo = (case
        when new.ruolo_preciso = 'portiere' then 'portiere'
        when new.ruolo_preciso in ('difensore_centrale', 'terzino') then 'difensore'
        when new.ruolo_preciso in ('esterno_centrocampo', 'mediano', 'mezzala', 'trequartista') then 'centrocampista'
        else 'attaccante' end)::public.ruolo_campo
    where id = new.giocatore_id;
  elsif new.ruolo_campo is not null then
    -- "di movimento" non cancella una linea già nota; il ruolo preciso resta solo se è ancora coerente
    update public.giocatori set
      ruolo = case when new.ruolo_campo = 'movimento' and ruolo is not null and ruolo <> 'portiere' then ruolo else new.ruolo_campo end,
      ruolo_preciso = case
        when new.ruolo_campo = 'portiere' then 'portiere'
        when ruolo_preciso = 'portiere' then null
        when new.ruolo_campo = 'movimento' then ruolo_preciso
        when new.ruolo_campo = 'difensore' and ruolo_preciso in ('difensore_centrale', 'terzino') then ruolo_preciso
        when new.ruolo_campo = 'centrocampista' and ruolo_preciso in ('esterno_centrocampo', 'mediano', 'mezzala', 'trequartista') then ruolo_preciso
        when new.ruolo_campo = 'attaccante' and ruolo_preciso in ('ala', 'punta') then ruolo_preciso
        else null end
    where id = new.giocatore_id;
  end if;
  return new;
end $$;

-- coach_valuta (0046) con il ruolo dei più piccoli
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

  insert into public.valutazioni (giocatore_id, autore_id, autore_squadra, data, contesto, giudizio, commento, ruolo_preciso, ruolo_campo)
  values (p_giocatore, null, v_squadra, coalesce(nullif(p_dati ->> 'data', '')::date, current_date), nullif(trim(p_dati ->> 'contesto'), ''),
          (p_dati ->> 'giudizio')::public.giudizio, nullif(trim(p_dati ->> 'commento'), ''),
          case when p_dati ->> 'ruolo_preciso' in (select unnest(public.ruoli_precisi())) then p_dati ->> 'ruolo_preciso' end,
          case when p_dati ->> 'ruolo_campo' in ('portiere', 'difensore', 'centrocampista', 'attaccante', 'movimento')
               then (p_dati ->> 'ruolo_campo')::public.ruolo_campo end)
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
