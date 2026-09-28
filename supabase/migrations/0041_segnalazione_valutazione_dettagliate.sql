-- =====================================================================
-- 0041 · Segnalazione e valutazione più dettagliate
-- Da eseguire in Supabase → SQL Editor, DOPO la 0040
-- =====================================================================
-- Segnalazione: il piede del giocatore e 4 voti da 1 a 5 facoltativi (piede forte, piede debole, statura, forza).
-- Valutazione: oltre alle 4 aree (obbligatorie), 7 voti tecnici da 1 a 5 facoltativi: spunti, guida della palla,
-- ricezione, calciata, contrasto, velocità, reattività. Anche per i mister dal Portale (coach_segnala, coach_valuta).

alter table public.segnalazioni
  add column if not exists piede public.piede,
  add column if not exists piede_forte smallint check (piede_forte between 1 and 5),
  add column if not exists piede_debole smallint check (piede_debole between 1 and 5),
  add column if not exists statura smallint check (statura between 1 and 5),
  add column if not exists forza smallint check (forza between 1 and 5);

alter table public.valutazioni
  add column if not exists spunti smallint check (spunti between 1 and 5),
  add column if not exists guida_palla smallint check (guida_palla between 1 and 5),
  add column if not exists ricezione smallint check (ricezione between 1 and 5),
  add column if not exists calciata smallint check (calciata between 1 and 5),
  add column if not exists contrasto smallint check (contrasto between 1 and 5),
  add column if not exists velocita smallint check (velocita between 1 and 5),
  add column if not exists reattivita smallint check (reattivita between 1 and 5);

-- Mister dal Portale: gli stessi campi (0032 riscritte)
create or replace function public.coach_segnala(p_pin text, p_dati jsonb)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  v_team text; v_squadra text; v_giocatore uuid; v_societa uuid; v_trovati uuid[]; v_osservato boolean;
  v_annata int := nullif(p_dati ->> 'annata', '')::int;
  v_cognome text := initcap(nullif(trim(p_dati ->> 'cognome'), ''));
  v_nome text := initcap(nullif(trim(p_dati ->> 'nome'), ''));
  v_descrizione text := nullif(trim(p_dati ->> 'descrizione'), '');
  v_nome_societa text := nullif(trim(p_dati ->> 'societa'), '');
  v_testo text := nullif(trim(p_dati ->> 'testo'), '');
  v_voto smallint := nullif(p_dati ->> 'voto', '')::smallint;
  v_ruolo public.ruolo_campo;
  v_piede public.piede;
  k text; v int;
begin
  v_team := public.team_for_pin(p_pin);
  if v_team is null then
    perform pg_sleep(1);
    raise exception 'PIN non valido' using errcode = '28000';
  end if;
  -- Firma: mister + categoria (il nome della squadra spesso è quello del club per tutte)
  select concat_ws(' · ', public.mister_for_pin(p_pin), coalesce(nullif(trim(t ->> 'category'), ''), t ->> 'name'))
    into v_squadra
  from public.docs d, jsonb_array_elements(d.data -> 'items') t
  where d.path = 'shared/teams' and t ->> 'id' = v_team;

  if v_testo is null then raise exception 'Scrivi cosa hai visto.'; end if;
  if v_annata is null then raise exception 'Indica l''annata.'; end if;
  if v_cognome is null and v_descrizione is null then
    raise exception 'Serve il cognome oppure una descrizione per riconoscerlo.';
  end if;
  if v_voto is not null and v_voto not between 1 and 5 then raise exception 'Il voto va da 1 a 5.'; end if;
  if p_dati ->> 'piede' in ('destro', 'sinistro', 'ambidestro') then v_piede := (p_dati ->> 'piede')::public.piede; end if;
  foreach k in array array['piede_forte', 'piede_debole', 'statura', 'forza'] loop
    v := nullif(p_dati ->> k, '')::int;
    if v is not null and v not between 1 and 5 then raise exception 'I voti vanno da 1 a 5.'; end if;
  end loop;
  if p_dati ->> 'ruolo' in ('portiere', 'difensore', 'centrocampista', 'attaccante') then
    v_ruolo := (p_dati ->> 'ruolo')::public.ruolo_campo;
  end if;

  -- Giocatore già in archivio?
  if v_cognome is not null then
    select array_agg(id) into v_trovati from (
      select id from public.giocatori
      where annata = v_annata and lower(cognome) = lower(v_cognome)
        and (v_nome is null or lower(nome) = lower(v_nome))
      limit 2
    ) g;
    if coalesce(array_length(v_trovati, 1), 0) = 1 then v_giocatore := v_trovati[1]; end if;
  end if;

  -- Già in lista (osservato): niente nuova segnalazione, il Portale apre la valutazione (coach_valuta)
  if v_giocatore is not null then
    select osservato into v_osservato from public.giocatori where id = v_giocatore;
    if v_osservato then
      return (select jsonb_build_object('esistente', true, 'giocatore_id', g.id,
                'nome', concat_ws(' ', g.cognome, g.nome), 'annata', g.annata, 'societa', s.nome)
              from public.giocatori g left join public.societa s on s.id = g.societa_id where g.id = v_giocatore);
    end if;
  end if;

  if v_giocatore is null then
    if v_nome_societa is not null then
      select id into v_societa from public.societa
      where public.normalizza_nome(nome) = public.normalizza_nome(v_nome_societa)
         or exists (select 1 from unnest(alias) a where public.normalizza_nome(a) = public.normalizza_nome(v_nome_societa))
      limit 1;
      if v_societa is null then
        insert into public.societa (nome) values (v_nome_societa) returning id into v_societa;
      end if;
    end if;
    insert into public.giocatori (cognome, nome, descrizione, annata, ruolo, piede, societa_id, segnalato_da_squadra)
    values (v_cognome, v_nome, v_descrizione, v_annata, v_ruolo, v_piede, v_societa, v_squadra)
    returning id into v_giocatore;
  elsif v_piede is not null then
    update public.giocatori set piede = v_piede where id = v_giocatore and piede is null;
  end if;

  insert into public.segnalazioni (giocatore_id, autore_id, squadra, testo, voto, contesto, data,
                                   piede, piede_forte, piede_debole, statura, forza)
  values (v_giocatore, null, v_squadra, v_testo, v_voto, nullif(trim(p_dati ->> 'contesto'), ''),
          coalesce(nullif(p_dati ->> 'data', '')::date, current_date), v_piede,
          nullif(p_dati ->> 'piede_forte', '')::smallint, nullif(p_dati ->> 'piede_debole', '')::smallint,
          nullif(p_dati ->> 'statura', '')::smallint, nullif(p_dati ->> 'forza', '')::smallint);
  return jsonb_build_object('esistente', false, 'giocatore_id', v_giocatore);
end $$;

create or replace function public.coach_valuta(p_pin text, p_giocatore uuid, p_dati jsonb)
returns void language plpgsql volatile security definer set search_path = public as $$
declare v_team text; v_squadra text; a text; v int;
begin
  v_team := public.team_for_pin(p_pin);
  if v_team is null then perform pg_sleep(1); raise exception 'PIN non valido' using errcode = '28000'; end if;
  if not exists (select 1 from public.giocatori where id = p_giocatore) then raise exception 'Giocatore non trovato.'; end if;
  foreach a in array array['tecnica', 'motoria', 'tattica', 'mentale'] loop
    v := nullif(p_dati ->> a, '')::int;
    if v is null or v not between 1 and 5 then raise exception 'Manca il voto di %.', a; end if;
  end loop;
  foreach a in array array['spunti', 'guida_palla', 'ricezione', 'calciata', 'contrasto', 'velocita', 'reattivita'] loop
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
    spunti, guida_palla, ricezione, calciata, contrasto, velocita, reattivita)
  values (p_giocatore, null, v_squadra, coalesce(nullif(p_dati ->> 'data', '')::date, current_date), nullif(trim(p_dati ->> 'contesto'), ''),
    (p_dati ->> 'tecnica')::smallint, nullif(trim(p_dati ->> 'tecnica_note'), ''),
    (p_dati ->> 'motoria')::smallint, nullif(trim(p_dati ->> 'motoria_note'), ''),
    (p_dati ->> 'tattica')::smallint, nullif(trim(p_dati ->> 'tattica_note'), ''),
    (p_dati ->> 'mentale')::smallint, nullif(trim(p_dati ->> 'mentale_note'), ''),
    (p_dati ->> 'giudizio')::public.giudizio, nullif(trim(p_dati ->> 'commento'), ''),
    nullif(p_dati ->> 'spunti', '')::smallint, nullif(p_dati ->> 'guida_palla', '')::smallint, nullif(p_dati ->> 'ricezione', '')::smallint,
    nullif(p_dati ->> 'calciata', '')::smallint, nullif(p_dati ->> 'contrasto', '')::smallint, nullif(p_dati ->> 'velocita', '')::smallint,
    nullif(p_dati ->> 'reattivita', '')::smallint);
end $$;
