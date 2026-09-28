-- =====================================================================
-- 0039 · Archivio dei documenti: ogni PDF scaricato dal Portale ne lascia una copia per admin e direttori
-- Da eseguire in Supabase → SQL Editor, DOPO la 0038
-- =====================================================================
-- Convocazioni, fogli gara, report, distinte, programmi gare, comunicazioni. Li archivia chi li scarica:
-- i mister e l'organizzativo col PIN della squadra, lo staff con il suo account. Li vedono e li scaricano solo
-- admin e direttori; li elimina solo l'admin. I fogli con i PIN delle famiglie NON si archiviano (sono credenziali).
-- Il file sta nella tabella (bytea), come i documenti delle famiglie (0033); massimo 15 MB.

create table if not exists public.archivio_documenti (
  id           uuid primary key default gen_random_uuid(),
  nome         text not null,                 -- nome del file, es. 04_10_2026_VIBE_CONVOCAZIONE.pdf
  tipo         text not null,                 -- Convocazione, Foglio gara, Distinta, …
  squadra_id   text,
  squadra      text,                          -- categoria/nome della squadra, com'era allora
  autore       text,                          -- chi l'ha scaricato (nome del mister o dell'account)
  autore_id    uuid references public.profiles (id) on delete set null,
  dimensione   int not null,
  dati         bytea not null,
  created_at   timestamptz not null default now()
);
create index if not exists archivio_data_idx on public.archivio_documenti (created_at desc);

alter table public.archivio_documenti enable row level security;
drop policy if exists "archivio: lettura" on public.archivio_documenti;
create policy "archivio: lettura" on public.archivio_documenti
  for select to authenticated using (public.vede_tutto());
drop policy if exists "archivio: eliminazione" on public.archivio_documenti;
create policy "archivio: eliminazione" on public.archivio_documenti
  for delete to authenticated using (public.is_admin());
-- nessun inserimento diretto: solo con archivia_documento()

-- Archivia un file (base64). Col PIN: squadra e nome del mister dal PIN. Senza PIN: account attivo dello staff.
create or replace function public.archivia_documento(p_pin text, p_nome text, p_tipo text, p_squadra_id text, p_dati text)
returns uuid language plpgsql volatile security definer set search_path = public as $$
declare v_team text; v_autore text; v_squadra text; v_bin bytea; v_id uuid;
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
  v_bin := decode(p_dati, 'base64');
  if length(v_bin) > 15 * 1024 * 1024 then raise exception 'File troppo grande per l''archivio'; end if;
  select coalesce(t->>'category', t->>'name') into v_squadra
    from public.docs d, jsonb_array_elements(coalesce(d.data->'items', '[]'::jsonb)) t
   where d.path = 'shared/teams' and t->>'id' = v_team limit 1;
  insert into public.archivio_documenti (nome, tipo, squadra_id, squadra, autore, autore_id, dimensione, dati)
  values (left(coalesce(nullif(trim(p_nome), ''), 'documento.pdf'), 200), left(coalesce(nullif(trim(p_tipo), ''), 'Documento'), 60),
          v_team, v_squadra, v_autore, auth.uid(), length(v_bin), v_bin)
  returning id into v_id;
  return v_id;
end $$;
revoke all on function public.archivia_documento(text, text, text, text, text) from public;
grant execute on function public.archivia_documento(text, text, text, text, text) to anon, authenticated;

-- Scarica un file dell'archivio (base64): admin e direttori
create or replace function public.archivio_scarica(p_id uuid)
returns text language plpgsql stable security definer set search_path = public as $$
declare v bytea;
begin
  if not public.vede_tutto() then raise exception 'Solo admin e direttori' using errcode = '42501'; end if;
  select dati into v from public.archivio_documenti where id = p_id;
  if v is null then raise exception 'Documento non trovato'; end if;
  return encode(v, 'base64');
end $$;
revoke all on function public.archivio_scarica(uuid) from public, anon;
grant execute on function public.archivio_scarica(uuid) to authenticated;
