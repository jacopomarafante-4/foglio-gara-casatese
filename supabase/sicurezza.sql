-- Sicurezza del database "docs" (Foglio gara Casatese)
-- Da eseguire UNA volta in Supabase → SQL Editor, sul progetto dell'app.
--
-- Prima: chiunque avesse la chiave pubblica (che è dentro la pagina) poteva leggere tutto.
-- Dopo:
--   * admin (login Supabase con l'email sotto): legge e scrive tutto, come prima;
--   * mister: nessun accesso diretto alla tabella. Passa da funzioni che verificano il PIN
--     della squadra e danno accesso SOLO ai documenti della sua squadra
--     (lettura: rosa, foglio gara, calendario, registro, schemi; scrittura: foglio gara e registro);
--   * senza PIN valido non si legge niente.
-- Si può rieseguire senza problemi.

alter table public.docs enable row level security;

-- Via tutte le regole esistenti sulla tabella (anche quelle che aprivano la lettura a tutti).
do $$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'docs' loop
    execute format('drop policy %I on public.docs', p.policyname);
  end loop;
end $$;

revoke all on public.docs from anon;

create policy "admin: accesso completo" on public.docs
  for all to authenticated
  using ((auth.jwt() ->> 'email') = 'jacopo.marafante@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'jacopo.marafante@gmail.com');

-- Squadra corrispondente a un PIN (null se il PIN non esiste).
create or replace function public.team_for_pin(p_pin text)
returns text language sql stable security definer set search_path = public as $$
  select t ->> 'id'
  from public.docs d, jsonb_array_elements(coalesce(d.data -> 'items', '[]'::jsonb)) t
  where d.path = 'shared/teams'
    and coalesce(p_pin, '') <> ''
    and t ->> 'code' = p_pin
  limit 1;
$$;

-- Login mister: restituisce la squadra (senza il PIN) o null. Il ritardo sugli errori rallenta chi prova PIN a caso.
create or replace function public.coach_team(p_pin text)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare v_team text; v jsonb;
begin
  v_team := public.team_for_pin(p_pin);
  if v_team is null then
    if coalesce(p_pin, '') <> '' then perform pg_sleep(1); end if;
    return null;
  end if;
  select t - 'code' into v
  from public.docs d, jsonb_array_elements(d.data -> 'items') t
  where d.path = 'shared/teams' and t ->> 'id' = v_team;
  return v;
end $$;

-- Lettura documento per il mister.
create or replace function public.coach_get(p_pin text, p_path text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_team text; v jsonb;
begin
  v_team := public.team_for_pin(p_pin);
  if v_team is null then raise exception 'PIN non valido' using errcode = '28000'; end if;
  if p_path = 'shared/teams' then
    return jsonb_build_object('items', jsonb_build_array(public.coach_team(p_pin)));
  end if;
  if p_path <> 'shared/schemes'
     and p_path not in ('roster/' || v_team, 'sheet/' || v_team, 'calendar/' || v_team, 'registro/' || v_team) then
    raise exception 'Documento non consentito' using errcode = '42501';
  end if;
  select data into v from public.docs where path = p_path;
  return v;
end $$;

-- Scrittura documento per il mister: solo foglio gara e registro della sua squadra.
create or replace function public.coach_set(p_pin text, p_path text, p_data jsonb)
returns void language plpgsql volatile security definer set search_path = public as $$
declare v_team text;
begin
  v_team := public.team_for_pin(p_pin);
  if v_team is null then raise exception 'PIN non valido' using errcode = '28000'; end if;
  if p_path not in ('sheet/' || v_team, 'registro/' || v_team) then
    raise exception 'Documento non consentito' using errcode = '42501';
  end if;
  insert into public.docs (path, data, updated_at) values (p_path, p_data, now())
  on conflict (path) do update set data = excluded.data, updated_at = excluded.updated_at;
end $$;

revoke all on function public.team_for_pin(text) from public, anon, authenticated;
revoke all on function public.coach_team(text) from public;
revoke all on function public.coach_get(text, text) from public;
revoke all on function public.coach_set(text, text, jsonb) from public;
grant execute on function public.coach_team(text) to anon, authenticated;
grant execute on function public.coach_get(text, text) to anon, authenticated;
grant execute on function public.coach_set(text, text, jsonb) to anon, authenticated;
