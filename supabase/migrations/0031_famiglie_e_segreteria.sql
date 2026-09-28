-- 0031: anagrafica e segreteria dei tesserati, accesso delle famiglie col PIN, risposte alle convocazioni.
-- Da eseguire DOPO la 0030.
--
-- Dati di minori: tabelle separate e protette. Le leggono e scrivono solo admin, direttori e segreteria
-- (gestisce_segreteria()); la famiglia vede e aggiorna SOLO il proprio ragazzo, passando da funzioni col suo PIN.
--   tesserati         un ragazzo di una squadra del Portale (squadra_id + giocatore_id della rosa), col PIN famiglia
--   tesserati_dati    contatti dei genitori, certificato medico, taglie, iscrizione, quote (1 a 1 con tesserati)
--   risposte_convocazioni  "ci sarà / non ci sarà" della famiglia per una partita (le legge il mister della squadra)

-- ---------- Chi gestisce la segreteria ----------
create or replace function public.gestisce_segreteria()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.mio_ruolo()::text in ('admin', 'direttore', 'segreteria'), false)
$$;

-- ---------- Tabelle ----------
create table if not exists public.tesserati (
  id            uuid primary key default gen_random_uuid(),
  squadra_id    text not null,               -- id della squadra del Portale (shared/teams)
  giocatore_id  text not null,               -- id del giocatore nella rosa (roster/<squadra>)
  nome_completo text not null,               -- come nella rosa: "Cognome Nome"
  data_nascita  date,
  numero        smallint,
  pin           text unique,                 -- PIN della famiglia (8 cifre, lo genera genera_pin_famiglia)
  attivo        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (squadra_id, giocatore_id)
);

create table if not exists public.tesserati_dati (
  tesserato_id        uuid primary key references public.tesserati (id) on delete cascade,
  genitore1_nome      text, genitore1_tel text, genitore1_email text,
  genitore2_nome      text, genitore2_tel text, genitore2_email text,
  certificato_scadenza date,
  taglia_divisa       text,
  taglia_tuta         text,
  iscrizione_completa boolean not null default false,
  documenti_mancanti  text,
  quote               jsonb not null default '[]'::jsonb,   -- [{rata, importo, scadenza, pagata}]
  note_segreteria     text,                                  -- solo per la segreteria, mai alla famiglia
  updated_at          timestamptz not null default now()
);

create table if not exists public.risposte_convocazioni (
  tesserato_id uuid not null references public.tesserati (id) on delete cascade,
  partita      text not null,     -- id della partita nel calendario della squadra (o "data|avversario")
  risposta     text not null check (risposta in ('si', 'no')),
  nota         text,
  updated_at   timestamptz not null default now(),
  primary key (tesserato_id, partita)
);

alter table public.tesserati enable row level security;
alter table public.tesserati_dati enable row level security;
alter table public.risposte_convocazioni enable row level security;

drop policy if exists "segreteria: tesserati" on public.tesserati;
create policy "segreteria: tesserati" on public.tesserati for all to authenticated
  using (public.gestisce_segreteria()) with check (public.gestisce_segreteria());
drop policy if exists "segreteria: dati dei tesserati" on public.tesserati_dati;
create policy "segreteria: dati dei tesserati" on public.tesserati_dati for all to authenticated
  using (public.gestisce_segreteria()) with check (public.gestisce_segreteria());
drop policy if exists "segreteria: risposte" on public.risposte_convocazioni;
create policy "segreteria: risposte" on public.risposte_convocazioni for select to authenticated
  using (public.gestisce_segreteria());

-- Squadre e rose del Portale per la segreteria (per creare i tesserati): nome, categoria e giocatori, MAI i PIN dei mister
-- (stanno nello stesso documento shared/teams, per questo niente accesso diretto a docs)
create or replace function public.segreteria_rose()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.gestisce_segreteria() then raise exception 'Non consentito' using errcode = '42501'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', t ->> 'id', 'name', t ->> 'name', 'category', t ->> 'category',
             'players', coalesce((select r.data -> 'players' from public.docs r where r.path = 'roster/' || (t ->> 'id')), '[]'::jsonb)))
    from public.docs d, jsonb_array_elements(d.data -> 'items') t
    where d.path = 'shared/teams' and not coalesce((t ->> 'organizza')::boolean, false)), '[]'::jsonb);
end $$;

-- ---------- PIN delle famiglie ----------
-- 8 cifre, diverso da tutti gli altri PIN (mister, personali, altre famiglie)
create or replace function public.genera_pin_famiglia(p_tesserato uuid)
returns text language plpgsql volatile security definer set search_path = public as $$
declare v_pin text;
begin
  if not public.gestisce_segreteria() then raise exception 'Non consentito' using errcode = '42501'; end if;
  loop
    v_pin := lpad((floor(random() * 90000000) + 10000000)::bigint::text, 8, '0');
    exit when not exists (select 1 from public.tesserati where pin = v_pin)
          and not exists (select 1 from public.codici_accesso where pin = v_pin)
          and public.team_for_pin_senza_errori(v_pin) is null;
  end loop;
  update public.tesserati set pin = v_pin, updated_at = now() where id = p_tesserato;
  return v_pin;
end $$;

-- Come team_for_pin ma senza annotare errori né bloccare (serve solo a evitare doppioni nella generazione)
create or replace function public.team_for_pin_senza_errori(p_pin text)
returns text language sql stable security definer set search_path = public as $$
  select t ->> 'id'
  from public.docs d, jsonb_array_elements(coalesce(d.data -> 'items', '[]'::jsonb)) t
  where d.path = 'shared/teams'
    and (t ->> 'code' = p_pin
         or exists (select 1 from jsonb_array_elements(coalesce(t -> 'coaches', '[]'::jsonb)) c where c ->> 'code' = p_pin))
  limit 1
$$;

-- Tesserato per un PIN famiglia: stesso blocco dei PIN a raffica (0015)
create or replace function public.tesserato_for_pin(p_pin text)
returns uuid language plpgsql volatile security definer set search_path = public as $$
declare v uuid;
begin
  if coalesce(p_pin, '') = '' then return null; end if;
  perform public.controlla_blocco_pin();
  select id into v from public.tesserati where pin = p_pin and attivo;
  if v is null then insert into public.pin_errati default values; perform pg_sleep(1); end if;
  return v;
end $$;

-- Che PIN è? 'mister' | 'famiglia' | 'personale' (scout, direttori, segreteria) | null.
-- Annota UN solo errore se il PIN non esiste: con le famiglie gli accessi sono tanti, e provare i tipi uno alla volta
-- (ognuno col suo errore) farebbe scattare il blocco dei PIN a raffica (0015) anche solo con accessi giusti.
create or replace function public.tipo_pin(p_pin text)
returns text language plpgsql volatile security definer set search_path = public as $$
begin
  if coalesce(p_pin, '') = '' then return null; end if;
  perform public.controlla_blocco_pin();
  if public.team_for_pin_senza_errori(p_pin) is not null then return 'mister'; end if;
  if exists (select 1 from public.tesserati where pin = p_pin and attivo) then return 'famiglia'; end if;
  if exists (select 1 from public.codici_accesso c join public.profiles p on p.id = c.profilo_id where c.pin = p_pin and p.attivo) then
    return 'personale';
  end if;
  insert into public.pin_errati default values;
  perform pg_sleep(1);
  return null;
end $$;

-- ---------- Cosa vede la famiglia ----------
-- Il ragazzo (senza note della segreteria), la squadra, il calendario, le SUE convocazioni, gli avvisi per la squadra,
-- le sue risposte. Delle convocazioni si passano solo i dati della partita e lo stato di questo ragazzo.
create or replace function public.famiglia_get(p_pin text)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare v_id uuid; t public.tesserati; d public.tesserati_dati; v_squadra jsonb; v_sheet jsonb; v_conv jsonb;
begin
  v_id := public.tesserato_for_pin(p_pin);
  if v_id is null then raise exception 'PIN non valido' using errcode = '28000'; end if;
  select * into t from public.tesserati where id = v_id;
  select * into d from public.tesserati_dati where tesserato_id = v_id;
  select jsonb_build_object('id', x ->> 'id', 'name', x ->> 'name', 'category', x ->> 'category') into v_squadra
  from public.docs s, jsonb_array_elements(s.data -> 'items') x
  where s.path = 'shared/teams' and x ->> 'id' = t.squadra_id;
  select data into v_sheet from public.docs where path = 'sheet/' || t.squadra_id;
  -- Convocazioni: attività di base (sheet.adb.partite, una o più) oppure foglio gara (sheet.callup della partita del foglio)
  v_conv := coalesce((
    select jsonb_agg(jsonb_build_object(
      'calId', p ->> 'calId', 'date', p ->> 'date', 'time', p ->> 'time', 'meetTime', p ->> 'meetTime',
      'opponent', p ->> 'opponent', 'home', p -> 'home', 'venue', p ->> 'venue', 'address', p ->> 'address', 'll', p ->> 'll',
      'meetAddress', p ->> 'meetAddress', 'note', p ->> 'note',
      'stato', case when coalesce(p -> 'conv', '[]'::jsonb) ? t.giocatore_id then 'CON' else 'NC' end))
    from jsonb_array_elements(coalesce(v_sheet -> 'adb' -> 'partite', '[]'::jsonb)) p), '[]'::jsonb);
  if coalesce(v_sheet ->> 'date', '') <> '' and coalesce(v_sheet -> 'callup' ->> t.giocatore_id, '') <> '' then
    v_conv := v_conv || jsonb_build_array(jsonb_build_object(
      'calId', null, 'date', v_sheet ->> 'date', 'time', v_sheet ->> 'time', 'meetTime', v_sheet ->> 'meetTime',
      'opponent', v_sheet ->> 'opponent', 'home', v_sheet -> 'home', 'venue', v_sheet ->> 'venue', 'address', v_sheet ->> 'address',
      'll', v_sheet ->> 'venueLL', 'meetAddress', v_sheet ->> 'meetAddress', 'note', v_sheet ->> 'convNotes',
      'stato', v_sheet -> 'callup' ->> t.giocatore_id));
  end if;
  return jsonb_build_object(
    'ragazzo', jsonb_build_object('nome', t.nome_completo, 'data_nascita', t.data_nascita, 'numero', t.numero,
       'giocatore_id', t.giocatore_id,
       'ruolo', (select data -> 'ruoli' ->> t.giocatore_id from public.docs where path = 'registro/' || t.squadra_id)),
    'squadra', v_squadra,
    'dati', case when d.tesserato_id is null then '{}'::jsonb else (to_jsonb(d) - 'note_segreteria' - 'tesserato_id') end,
    'calendario', coalesce((select data -> 'matches' from public.docs where path = 'calendar/' || t.squadra_id), '[]'::jsonb),
    'convocazioni', v_conv,
    'avvisi', coalesce((select jsonb_agg(a) from public.docs s, jsonb_array_elements(coalesce(s.data -> 'items', '[]'::jsonb)) a
                        where s.path = 'shared/avvisi'
                          and (jsonb_array_length(coalesce(a -> 'squadre', '[]'::jsonb)) = 0 or (a -> 'squadre') ? t.squadra_id)
                          and coalesce(a ->> 'data', '') >= to_char(current_date - 30, 'YYYY-MM-DD')), '[]'::jsonb),
    'eventi', coalesce((select jsonb_agg(e) from public.docs s, jsonb_array_elements(coalesce(s.data -> 'items', '[]'::jsonb)) e
                        where s.path = 'shared/eventi'
                          and (jsonb_array_length(coalesce(e -> 'squadre', '[]'::jsonb)) = 0 or (e -> 'squadre') ? t.squadra_id)), '[]'::jsonb),
    'risposte', coalesce((select jsonb_object_agg(partita, jsonb_build_object('risposta', risposta, 'nota', nota))
                          from public.risposte_convocazioni where tesserato_id = v_id), '{}'::jsonb));
end $$;

-- La famiglia aggiorna solo contatti dei genitori e taglie
create or replace function public.famiglia_contatti(p_pin text, p_dati jsonb)
returns void language plpgsql volatile security definer set search_path = public as $$
declare v_id uuid;
begin
  v_id := public.tesserato_for_pin(p_pin);
  if v_id is null then raise exception 'PIN non valido' using errcode = '28000'; end if;
  insert into public.tesserati_dati (tesserato_id) values (v_id) on conflict do nothing;
  update public.tesserati_dati set
    genitore1_nome = left(nullif(trim(p_dati ->> 'genitore1_nome'), ''), 80), genitore1_tel = left(nullif(trim(p_dati ->> 'genitore1_tel'), ''), 30),
    genitore1_email = left(nullif(trim(p_dati ->> 'genitore1_email'), ''), 120),
    genitore2_nome = left(nullif(trim(p_dati ->> 'genitore2_nome'), ''), 80), genitore2_tel = left(nullif(trim(p_dati ->> 'genitore2_tel'), ''), 30),
    genitore2_email = left(nullif(trim(p_dati ->> 'genitore2_email'), ''), 120),
    taglia_divisa = left(nullif(trim(p_dati ->> 'taglia_divisa'), ''), 10), taglia_tuta = left(nullif(trim(p_dati ->> 'taglia_tuta'), ''), 10),
    updated_at = now()
  where tesserato_id = v_id;
end $$;

-- "Ci sarà / non ci sarà" per una partita
create or replace function public.famiglia_rispondi(p_pin text, p_partita text, p_risposta text, p_nota text)
returns void language plpgsql volatile security definer set search_path = public as $$
declare v_id uuid;
begin
  v_id := public.tesserato_for_pin(p_pin);
  if v_id is null then raise exception 'PIN non valido' using errcode = '28000'; end if;
  if p_risposta not in ('si', 'no') or coalesce(p_partita, '') = '' then raise exception 'Risposta non valida'; end if;
  insert into public.risposte_convocazioni (tesserato_id, partita, risposta, nota, updated_at)
  values (v_id, left(p_partita, 120), p_risposta, left(nullif(trim(p_nota), ''), 200), now())
  on conflict (tesserato_id, partita) do update set risposta = excluded.risposta, nota = excluded.nota, updated_at = now();
end $$;

-- Il mister vede le risposte delle famiglie della sua squadra
create or replace function public.coach_risposte(p_pin text)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare v_team text;
begin
  v_team := public.team_for_pin(p_pin);
  if v_team is null then raise exception 'PIN non valido' using errcode = '28000'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('giocatore_id', t.giocatore_id, 'partita', r.partita,
                                                        'risposta', r.risposta, 'nota', r.nota, 'quando', r.updated_at))
                   from public.risposte_convocazioni r join public.tesserati t on t.id = r.tesserato_id
                   where t.squadra_id = v_team), '[]'::jsonb);
end $$;

revoke all on function public.gestisce_segreteria() from public, anon;
grant execute on function public.gestisce_segreteria() to authenticated;
revoke all on function public.segreteria_rose() from public, anon;
grant execute on function public.segreteria_rose() to authenticated;
revoke all on function public.genera_pin_famiglia(uuid) from public, anon;
grant execute on function public.genera_pin_famiglia(uuid) to authenticated;
revoke all on function public.team_for_pin_senza_errori(text) from public, anon, authenticated;
revoke all on function public.tesserato_for_pin(text) from public, anon, authenticated;
revoke all on function public.tipo_pin(text) from public;
grant execute on function public.tipo_pin(text) to anon, authenticated;
revoke all on function public.famiglia_get(text) from public;
grant execute on function public.famiglia_get(text) to anon, authenticated;
revoke all on function public.famiglia_contatti(text, jsonb) from public;
grant execute on function public.famiglia_contatti(text, jsonb) to anon, authenticated;
revoke all on function public.famiglia_rispondi(text, text, text, text) from public;
grant execute on function public.famiglia_rispondi(text, text, text, text) to anon, authenticated;
revoke all on function public.coach_risposte(text) from public;
grant execute on function public.coach_risposte(text) to anon, authenticated;
