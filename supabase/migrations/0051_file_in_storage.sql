-- =====================================================================
-- 0051 · PDF dell'archivio e documenti delle famiglie nei contenitori di file (Supabase Storage) invece che nel database
-- Da eseguire in Supabase → SQL Editor, DOPO la 0050
-- =====================================================================
-- Due contenitori PRIVATI senza nessuna regola d'accesso: nessuno li legge o li scrive direttamente (né i mister, né le
-- famiglie, né admin e direttori). Ci arriva solo il server dell'app (lib/supabase/file.ts, chiave di servizio), e solo dopo
-- che una di queste funzioni ha controllato chi chiede (stessi controlli di prima: PIN, admin/direttori, segreteria).
-- Le righe vecchie col file dentro (dati / contenuto) restano leggibili finché lo script scripts/sposta-file-in-storage.mjs
-- non le sposta.

insert into storage.buckets (id, name, public) values ('archivio', 'archivio', false) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('documenti-famiglie', 'documenti-famiglie', false) on conflict (id) do nothing;

alter table public.archivio_documenti add column if not exists percorso text;
alter table public.archivio_documenti alter column dati drop not null;
alter table public.documenti_tesserati add column if not exists percorso text;
alter table public.documenti_tesserati alter column contenuto drop not null;

-- Archivio: chi scarica un PDF lo registra (stessi controlli di archivia_documento, 0039); il file lo carica poi il server
-- nel contenitore "archivio" al percorso restituito
create or replace function public.archivio_registra(p_pin text, p_nome text, p_tipo text, p_squadra_id text, p_dimensione int)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare v_team text; v_autore text; v_squadra text; v_id uuid := gen_random_uuid();
begin
  if coalesce(p_pin, '') <> '' then
    v_team := public.team_for_pin(p_pin);
    if v_team is null then raise exception 'PIN non valido' using errcode = '28000'; end if;
    v_autore := coalesce(public.mister_for_pin(p_pin), 'Mister');
  elsif auth.uid() is not null and exists (select 1 from public.profiles where id = auth.uid() and attivo) then
    v_team := nullif(p_squadra_id, '');
    select nullif(trim(concat_ws(' ', nome, cognome)), '') into v_autore from public.profiles where id = auth.uid();
  else
    raise exception 'Accesso non valido' using errcode = '42501';
  end if;
  if p_dimensione is null or p_dimensione <= 0 or p_dimensione > 15 * 1024 * 1024 then raise exception 'File troppo grande per l''archivio'; end if;
  select coalesce(t->>'category', t->>'name') into v_squadra
    from public.docs d, jsonb_array_elements(coalesce(d.data->'items', '[]'::jsonb)) t
   where d.path = 'shared/teams' and t->>'id' = v_team limit 1;
  insert into public.archivio_documenti (id, nome, tipo, squadra_id, squadra, autore, autore_id, dimensione, dati, percorso)
  values (v_id, left(coalesce(nullif(trim(p_nome), ''), 'documento.pdf'), 200), left(coalesce(nullif(trim(p_tipo), ''), 'Documento'), 60),
          v_team, v_squadra, v_autore, auth.uid(), p_dimensione, null, v_id::text || '.pdf');
  return jsonb_build_object('id', v_id, 'percorso', v_id::text || '.pdf');
end $$;

-- Archivio: dove sta un PDF (o il suo contenuto, per le righe vecchie): admin e direttori
create or replace function public.archivio_apri(p_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.vede_tutto() then raise exception 'Solo admin e direttori' using errcode = '42501'; end if;
  return (select jsonb_build_object('nome', nome, 'percorso', percorso, 'base64', case when dati is not null then encode(dati, 'base64') end)
          from public.archivio_documenti where id = p_id);
end $$;

-- Famiglia: registra un documento da caricare (stessi controlli di famiglia_carica, 0033); il file lo carica poi il server
create or replace function public.famiglia_registra(p_pin text, p_tipo text, p_rata int, p_descrizione text, p_nome_file text, p_mime text, p_dimensione int)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare v_id uuid; v_doc uuid := gen_random_uuid(); v_percorso text;
begin
  v_id := public.tesserato_for_pin(p_pin);
  if v_id is null then raise exception 'PIN non valido' using errcode = '28000'; end if;
  if p_tipo not in ('visita_medica', 'bonifico', 'altro') then raise exception 'Tipo di documento non valido.'; end if;
  if p_mime not in ('image/jpeg', 'image/png', 'application/pdf') then raise exception 'Carica una foto (JPG, PNG) o un PDF.'; end if;
  if p_dimensione is null or p_dimensione <= 0 or p_dimensione > 4 * 1024 * 1024 then raise exception 'Il file è troppo grande (massimo 4 MB).'; end if;
  if (select count(*) from public.documenti_tesserati where tesserato_id = v_id) >= 40 then
    raise exception 'Troppi documenti caricati: chiedi alla segreteria.';
  end if;
  v_percorso := v_id::text || '/' || v_doc::text || case p_mime when 'application/pdf' then '.pdf' when 'image/png' then '.png' else '.jpg' end;
  insert into public.documenti_tesserati (id, tesserato_id, tipo, rata, descrizione, nome_file, mime, dimensione, contenuto, percorso)
  values (v_doc, v_id, p_tipo, case when p_tipo = 'bonifico' then p_rata end, left(nullif(trim(p_descrizione), ''), 200),
          left(coalesce(nullif(trim(p_nome_file), ''), 'documento'), 120), p_mime, p_dimensione, null, v_percorso);
  return jsonb_build_object('id', v_doc, 'percorso', v_percorso);
end $$;

-- Segreteria: dove sta un documento (o il suo contenuto, per le righe vecchie)
create or replace function public.documento_apri(p_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.gestisce_segreteria() then raise exception 'Non consentito' using errcode = '42501'; end if;
  return (select jsonb_build_object('nome_file', nome_file, 'mime', mime, 'percorso', percorso,
                                    'base64', case when contenuto is not null then encode(contenuto, 'base64') end)
          from public.documenti_tesserati where id = p_id);
end $$;

revoke all on function public.archivio_registra(text, text, text, text, int) from public;
grant execute on function public.archivio_registra(text, text, text, text, int) to anon, authenticated;
revoke all on function public.archivio_apri(uuid) from public, anon;
grant execute on function public.archivio_apri(uuid) to authenticated;
revoke all on function public.famiglia_registra(text, text, int, text, text, text, int) from public;
grant execute on function public.famiglia_registra(text, text, int, text, text, text, int) to anon, authenticated;
revoke all on function public.documento_apri(uuid) from public, anon;
grant execute on function public.documento_apri(uuid) to authenticated;
