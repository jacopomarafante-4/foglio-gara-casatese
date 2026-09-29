-- =====================================================================
-- 0047 · Già in lista = valutazione, senza domande obbligatorie prima
-- Da eseguire in Supabase → SQL Editor, DOPO la 0046
-- =====================================================================
-- coach_segnala (mister dal Portale): prima cerca se il giocatore è già in lista (di qualsiasi annata) e in quel caso
-- risponde subito "esistente" (il Portale apre la valutazione); "cosa hai visto" e "portiere o movimento" sono
-- obbligatori solo quando la segnalazione va davvero salvata (giocatore nuovo o visto solo nelle distinte).

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
  if p_dati ->> 'ruolo' in ('portiere', 'difensore', 'centrocampista', 'attaccante', 'movimento') then
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

  -- solo per un giocatore nuovo: cosa hai visto e portiere/movimento (per chi è già in lista si passa subito alla valutazione)
  if v_testo is null then raise exception 'Scrivi cosa hai visto.'; end if;
  if v_giocatore is null and v_ruolo is null then raise exception 'Indica se è un portiere o un giocatore di movimento.'; end if;

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
  else
    if v_piede is not null then
      update public.giocatori set piede = v_piede where id = v_giocatore and piede is null;
    end if;
    -- ruolo: si completa se mancava o era solo "movimento"
    if v_ruolo is not null then
      update public.giocatori set ruolo = v_ruolo
      where id = v_giocatore and (ruolo is null or (ruolo = 'movimento' and v_ruolo <> 'movimento'));
    end if;
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
