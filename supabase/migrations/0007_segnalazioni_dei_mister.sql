-- =====================================================================
-- Scouting Hub · 0007 · Segnalazioni dai mister (Portale squadre)
-- Da eseguire in Supabase → SQL Editor, DOPO la 0006 e dopo supabase/sicurezza.sql
-- =====================================================================

-- I mister non hanno un account: entrano nel Portale col PIN della squadra.
-- Dal Portale possono SOLO segnalare un giocatore (niente lettura dell'archivio):
-- una funzione verifica il PIN (public.team_for_pin, da sicurezza.sql) e salva
-- la segnalazione firmata col nome del mister e la categoria della squadra
-- (es. "Mario Rossi · Under 15"; solo la categoria se si entra col PIN di squadra).

alter table public.segnalazioni add column if not exists squadra text;   -- es. "Mario Rossi · Under 15" (autore_id vuoto)
alter table public.giocatori    add column if not exists segnalato_da_squadra text;

-- Nome di società confrontabile: minuscole, senza accenti, spazi e punteggiatura
-- (stessa idea di normalizza() in lib/utili.ts)
create or replace function public.normalizza_nome(s text)
returns text language sql immutable as $$
  select regexp_replace(lower(translate(coalesce(s, ''), 'àáâäèéêëìíîïòóôöùúûüÀÁÂÄÈÉÊËÌÍÎÏÒÓÔÖÙÚÛÜ',
                                                         'aaaaeeeeiiiioooouuuuAAAAEEEEIIIIOOOOUUUU')), '[^a-z0-9]', '', 'g')
$$;

-- Nome del mister che ha questo PIN personale (null se è il PIN di squadra).
-- Le squadre stanno nel documento shared/teams: "coaches": [{id, name, code}] (vedi 0008).
create or replace function public.mister_for_pin(p_pin text)
returns text language sql stable security definer set search_path = public as $$
  select c ->> 'name'
  from public.docs d,
       jsonb_array_elements(coalesce(d.data -> 'items', '[]'::jsonb)) t,
       jsonb_array_elements(coalesce(t -> 'coaches', '[]'::jsonb)) c
  where d.path = 'shared/teams' and coalesce(p_pin, '') <> '' and c ->> 'code' = p_pin
  limit 1;
$$;

-- Elenco società per il suggerimento nel form del mister (solo i nomi)
create or replace function public.coach_societa(p_pin text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if public.team_for_pin(p_pin) is null then raise exception 'PIN non valido' using errcode = '28000'; end if;
  return coalesce((select jsonb_agg(nome order by nome) from public.societa), '[]'::jsonb);
end $$;

-- Segnalazione dal Portale. p_dati: annata, cognome, nome, descrizione, ruolo, societa,
-- testo, voto, contesto, data. Stesse regole della pagina Segnala di Scouting Hub:
-- stesso cognome + nome + annata = stesso giocatore; società cercata anche per nome alternativo.
create or replace function public.coach_segnala(p_pin text, p_dati jsonb)
returns void language plpgsql volatile security definer set search_path = public as $$
declare
  v_team text; v_squadra text; v_giocatore uuid; v_societa uuid; v_trovati uuid[];
  v_annata int := nullif(p_dati ->> 'annata', '')::int;
  v_cognome text := initcap(nullif(trim(p_dati ->> 'cognome'), ''));
  v_nome text := initcap(nullif(trim(p_dati ->> 'nome'), ''));
  v_descrizione text := nullif(trim(p_dati ->> 'descrizione'), '');
  v_nome_societa text := nullif(trim(p_dati ->> 'societa'), '');
  v_testo text := nullif(trim(p_dati ->> 'testo'), '');
  v_voto smallint := nullif(p_dati ->> 'voto', '')::smallint;
  v_ruolo public.ruolo_campo;
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
    insert into public.giocatori (cognome, nome, descrizione, annata, ruolo, societa_id, segnalato_da_squadra)
    values (v_cognome, v_nome, v_descrizione, v_annata, v_ruolo, v_societa, v_squadra)
    returning id into v_giocatore;
  end if;

  insert into public.segnalazioni (giocatore_id, autore_id, squadra, testo, voto, contesto, data)
  values (v_giocatore, null, v_squadra, v_testo, v_voto, nullif(trim(p_dati ->> 'contesto'), ''),
          coalesce(nullif(p_dati ->> 'data', '')::date, current_date));
end $$;

revoke all on function public.mister_for_pin(text) from public, anon, authenticated;
revoke all on function public.coach_societa(text) from public;
revoke all on function public.coach_segnala(text, jsonb) from public;
grant execute on function public.coach_societa(text) to anon, authenticated;
grant execute on function public.coach_segnala(text, jsonb) to anon, authenticated;
