-- 0033: documenti caricati dalle famiglie (visita medica, contabile di bonifico per una rata, altri documenti).
-- Dati di minori: tabella protetta come tesserati_dati (gestisce_segreteria()); la famiglia carica e vede i SUOI documenti
-- passando dal PIN. I file (foto ridotte sul telefono o PDF, max 4 MB) stanno nel database: niente contenitori di file
-- pubblici né chiavi di servizio nell'app.

create table if not exists public.documenti_tesserati (
  id           uuid primary key default gen_random_uuid(),
  tesserato_id uuid not null references public.tesserati (id) on delete cascade,
  tipo         text not null check (tipo in ('visita_medica', 'bonifico', 'altro')),
  rata         int,                       -- bonifico: posizione della rata in tesserati_dati.quote
  descrizione  text,
  nome_file    text not null,
  mime         text not null check (mime in ('image/jpeg', 'image/png', 'application/pdf')),
  dimensione   int not null,
  contenuto    bytea not null,
  caricato_il  timestamptz not null default now(),
  stato        text not null default 'da_controllare' check (stato in ('da_controllare', 'accettato', 'rifiutato')),
  nota         text                       -- nota della segreteria, la vede anche la famiglia (es. "foto illeggibile")
);
create index if not exists documenti_tesserati_tesserato_idx on public.documenti_tesserati (tesserato_id);
alter table public.documenti_tesserati enable row level security;
drop policy if exists "segreteria: documenti" on public.documenti_tesserati;
create policy "segreteria: documenti" on public.documenti_tesserati for all to authenticated
  using (public.gestisce_segreteria()) with check (public.gestisce_segreteria());

-- La famiglia carica un documento (base64): tipo, file ammessi, al massimo 4 MB e 40 documenti per ragazzo
create or replace function public.famiglia_carica(p_pin text, p_tipo text, p_rata int, p_descrizione text,
                                                  p_nome_file text, p_mime text, p_base64 text)
returns uuid language plpgsql volatile security definer set search_path = public as $$
declare v_id uuid; v_file bytea; v_doc uuid;
begin
  v_id := public.tesserato_for_pin(p_pin);
  if v_id is null then raise exception 'PIN non valido' using errcode = '28000'; end if;
  if p_tipo not in ('visita_medica', 'bonifico', 'altro') then raise exception 'Tipo di documento non valido.'; end if;
  if p_mime not in ('image/jpeg', 'image/png', 'application/pdf') then raise exception 'Carica una foto (JPG, PNG) o un PDF.'; end if;
  v_file := decode(p_base64, 'base64');
  if length(v_file) > 4 * 1024 * 1024 then raise exception 'Il file è troppo grande (massimo 4 MB).'; end if;
  if (select count(*) from public.documenti_tesserati where tesserato_id = v_id) >= 40 then
    raise exception 'Troppi documenti caricati: chiedi alla segreteria.';
  end if;
  insert into public.documenti_tesserati (tesserato_id, tipo, rata, descrizione, nome_file, mime, dimensione, contenuto)
  values (v_id, p_tipo, case when p_tipo = 'bonifico' then p_rata end, left(nullif(trim(p_descrizione), ''), 200),
          left(coalesce(nullif(trim(p_nome_file), ''), 'documento'), 120), p_mime, length(v_file), v_file)
  returning id into v_doc;
  return v_doc;
end $$;

-- La segreteria apre un documento (base64)
create or replace function public.documento_scarica(p_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.gestisce_segreteria() then raise exception 'Non consentito' using errcode = '42501'; end if;
  return (select jsonb_build_object('nome_file', nome_file, 'mime', mime, 'base64', encode(contenuto, 'base64'))
          from public.documenti_tesserati where id = p_id);
end $$;

-- famiglia_get con l'elenco dei documenti caricati (senza il contenuto)
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
                          from public.risposte_convocazioni where tesserato_id = v_id), '{}'::jsonb),
    'documenti', coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'tipo', x.tipo, 'rata', x.rata, 'descrizione', x.descrizione,
                             'nome_file', x.nome_file, 'caricato_il', x.caricato_il, 'stato', x.stato, 'nota', x.nota) order by x.caricato_il desc)
                           from public.documenti_tesserati x where x.tesserato_id = v_id), '[]'::jsonb));
end $$;

revoke all on function public.famiglia_carica(text, text, int, text, text, text, text) from public;
grant execute on function public.famiglia_carica(text, text, int, text, text, text, text) to anon, authenticated;
revoke all on function public.documento_scarica(uuid) from public, anon;
grant execute on function public.documento_scarica(uuid) to authenticated;
revoke all on function public.famiglia_get(text) from public;
grant execute on function public.famiglia_get(text) to anon, authenticated;
