-- =====================================================================
-- 0043 · Le 4 aree (Tecnica, Motoria, Tattica, Mentale) passano dalla valutazione alla segnalazione
-- Da eseguire in Supabase → SQL Editor, DOPO la 0042
-- =====================================================================
-- Nella segnalazione le 4 aree (voto 1–5 e note) sono facoltative. Nella valutazione non si chiedono più: le colonne
-- restano (non più obbligatorie) per le valutazioni già fatte. Le medie per area si calcolano da segnalazioni e valutazioni.
-- Anche per i mister dal Portale (coach_segnala, coach_valuta, coach_giocatori riscritte).

alter table public.segnalazioni
  add column if not exists tecnica smallint check (tecnica between 1 and 5), add column if not exists tecnica_note text,
  add column if not exists motoria smallint check (motoria between 1 and 5), add column if not exists motoria_note text,
  add column if not exists tattica smallint check (tattica between 1 and 5), add column if not exists tattica_note text,
  add column if not exists mentale smallint check (mentale between 1 and 5), add column if not exists mentale_note text;

alter table public.valutazioni
  alter column tecnica drop not null, alter column motoria drop not null,
  alter column tattica drop not null, alter column mentale drop not null;

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
  v_impressione text := nullif(p_dati ->> 'impressione', '');
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
  if v_impressione is not null and v_impressione not in ('positiva', 'da_rivedere', 'negativa') then v_impressione := null; end if;
  if p_dati ->> 'piede' in ('destro', 'sinistro', 'ambidestro') then v_piede := (p_dati ->> 'piede')::public.piede; end if;
  foreach k in array array['piede_forte', 'piede_debole', 'statura', 'forza', 'tecnica', 'motoria', 'tattica', 'mentale'] loop
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
                                   piede, piede_forte, piede_debole, statura, forza, impressione,
                                   tecnica, tecnica_note, motoria, motoria_note, tattica, tattica_note, mentale, mentale_note)
  values (v_giocatore, null, v_squadra, v_testo, v_voto, nullif(trim(p_dati ->> 'contesto'), ''),
          coalesce(nullif(p_dati ->> 'data', '')::date, current_date), v_piede,
          nullif(p_dati ->> 'piede_forte', '')::smallint, nullif(p_dati ->> 'piede_debole', '')::smallint,
          nullif(p_dati ->> 'statura', '')::smallint, nullif(p_dati ->> 'forza', '')::smallint, v_impressione,
          nullif(p_dati ->> 'tecnica', '')::smallint, nullif(trim(p_dati ->> 'tecnica_note'), ''),
          nullif(p_dati ->> 'motoria', '')::smallint, nullif(trim(p_dati ->> 'motoria_note'), ''),
          nullif(p_dati ->> 'tattica', '')::smallint, nullif(trim(p_dati ->> 'tattica_note'), ''),
          nullif(p_dati ->> 'mentale', '')::smallint, nullif(trim(p_dati ->> 'mentale_note'), ''));
  return jsonb_build_object('esistente', false, 'giocatore_id', v_giocatore);
end $$;

create or replace function public.coach_valuta(p_pin text, p_giocatore uuid, p_dati jsonb)
returns void language plpgsql volatile security definer set search_path = public as $$
declare v_team text; v_squadra text; a text; v int;
begin
  v_team := public.team_for_pin(p_pin);
  if v_team is null then perform pg_sleep(1); raise exception 'PIN non valido' using errcode = '28000'; end if;
  if not exists (select 1 from public.giocatori where id = p_giocatore) then raise exception 'Giocatore non trovato.'; end if;
  foreach a in array array['tecnica', 'motoria', 'tattica', 'mentale', 'spunti', 'guida_palla', 'ricezione', 'calciata', 'contrasto', 'velocita', 'reattivita'] loop
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
    nullif(p_dati ->> 'tecnica', '')::smallint, nullif(trim(p_dati ->> 'tecnica_note'), ''),
    nullif(p_dati ->> 'motoria', '')::smallint, nullif(trim(p_dati ->> 'motoria_note'), ''),
    nullif(p_dati ->> 'tattica', '')::smallint, nullif(trim(p_dati ->> 'tattica_note'), ''),
    nullif(p_dati ->> 'mentale', '')::smallint, nullif(trim(p_dati ->> 'mentale_note'), ''),
    (p_dati ->> 'giudizio')::public.giudizio, nullif(trim(p_dati ->> 'commento'), ''),
    nullif(p_dati ->> 'spunti', '')::smallint, nullif(p_dati ->> 'guida_palla', '')::smallint, nullif(p_dati ->> 'ricezione', '')::smallint,
    nullif(p_dati ->> 'calciata', '')::smallint, nullif(p_dati ->> 'contrasto', '')::smallint, nullif(p_dati ->> 'velocita', '')::smallint,
    nullif(p_dati ->> 'reattivita', '')::smallint);
end $$;

create or replace function public.coach_giocatori(p_pin text)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare v_team text; v_cat text; v_eta int; v_annata int; v_nostra uuid; v_portieri boolean;
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
  v_portieri := public.vede_tutte_squadre(v_team);
  if v_eta is null and not v_portieri then return '[]'::jsonb; end if;
  -- Stagione da luglio a giugno: anno di fine stagione − età della categoria
  v_annata := extract(year from current_date)::int + case when extract(month from current_date) >= 7 then 1 else 0 end - v_eta;
  select id into v_nostra from public.societa where nome = 'Academy Casatese Merate';
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', g.id, 'cognome', g.cognome, 'nome', g.nome, 'descrizione', g.descrizione, 'annata', g.annata,
      'ruolo', g.ruolo, 'piede', g.piede, 'stato', g.stato, 'categoria', g.categoria, 'societa', s.nome,
      'segnalazioni', coalesce((
        select jsonb_agg(jsonb_build_object('data', x.data, 'contesto', x.contesto, 'testo', x.testo, 'voto', x.voto,
                 'impressione', x.impressione, 'piede', x.piede, 'statura', x.statura, 'forza', x.forza,
                 'tecnica', x.tecnica, 'tecnica_note', x.tecnica_note, 'motoria', x.motoria, 'motoria_note', x.motoria_note,
                 'tattica', x.tattica, 'tattica_note', x.tattica_note, 'mentale', x.mentale, 'mentale_note', x.mentale_note,
                 'autore', coalesce(nullif(trim(concat_ws(' ', p.nome, p.cognome)), ''), x.squadra)) order by x.data desc)
        from public.segnalazioni x left join public.profiles p on p.id = x.autore_id
        where x.giocatore_id = g.id), '[]'::jsonb),
      'valutazioni', coalesce((
        select jsonb_agg(jsonb_build_object('data', v.data, 'contesto', v.contesto,
                 'tecnica', v.tecnica, 'tecnica_note', v.tecnica_note, 'motoria', v.motoria, 'motoria_note', v.motoria_note,
                 'tattica', v.tattica, 'tattica_note', v.tattica_note, 'mentale', v.mentale, 'mentale_note', v.mentale_note,
                 'giudizio', v.giudizio, 'commento', v.commento,
                 'autore', coalesce(nullif(trim(concat_ws(' ', p.nome, p.cognome)), ''), v.autore_squadra)) order by v.data desc)
        from public.valutazioni v left join public.profiles p on p.id = v.autore_id
        where v.giocatore_id = g.id), '[]'::jsonb)
    ) order by g.annata desc, g.cognome nulls last, g.nome)
    from public.giocatori g left join public.societa s on s.id = g.societa_id
    where (case when v_portieri then g.ruolo = 'portiere' else g.annata = v_annata end)
      and g.osservato and g.societa_id is distinct from v_nostra), '[]'::jsonb);
end $$;
