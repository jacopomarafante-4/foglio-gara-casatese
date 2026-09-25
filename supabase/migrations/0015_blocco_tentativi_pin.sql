-- =====================================================================
-- 0015 · Blocco dei tentativi di PIN a raffica
-- Da eseguire in Supabase → SQL Editor, DOPO la 0014
-- =====================================================================

-- Ogni PIN sbagliato (mister o personale) viene annotato. Se in 10 minuti se ne accumulano
-- 30 (da chiunque), ogni verifica di PIN si ferma con "troppi tentativi" finché non si scende
-- sotto la soglia. Il ritardo di 1 secondo per tentativo da solo non basta: chi prova tanti
-- PIN in parallelo indovinerebbe un PIN di 4 cifre in pochi minuti.

create table if not exists public.pin_errati (
  id      bigint generated always as identity primary key,
  quando  timestamptz not null default now()
);
create index if not exists pin_errati_quando_idx on public.pin_errati (quando);
alter table public.pin_errati enable row level security;   -- nessuna regola: dall'esterno non si legge né si scrive

-- Blocca se ci sono troppi PIN sbagliati recenti (codice PT429, letto dall'app)
create or replace function public.controlla_blocco_pin()
returns void language plpgsql volatile security definer set search_path = public as $$
begin
  delete from public.pin_errati where quando < now() - interval '1 day';
  if (select count(*) from public.pin_errati where quando > now() - interval '10 minutes') >= 30 then
    raise exception 'Troppi PIN sbagliati: riprova tra qualche minuto' using errcode = 'PT429';
  end if;
end $$;

-- Squadra per un PIN (di squadra o di un mister): ora controlla il blocco e annota gli errori
create or replace function public.team_for_pin(p_pin text)
returns text language plpgsql volatile security definer set search_path = public as $$
declare v text;
begin
  if coalesce(p_pin, '') = '' then return null; end if;
  perform public.controlla_blocco_pin();
  select t ->> 'id' into v
  from public.docs d, jsonb_array_elements(coalesce(d.data -> 'items', '[]'::jsonb)) t
  where d.path = 'shared/teams'
    and (t ->> 'code' = p_pin
         or exists (select 1 from jsonb_array_elements(coalesce(t -> 'coaches', '[]'::jsonb)) c
                    where c ->> 'code' = p_pin))
  limit 1;
  if v is null then insert into public.pin_errati default values; end if;
  return v;
end $$;

-- PIN personale (scout, direttori): stesso blocco e stessa annotazione
create or replace function public.email_per_pin(p_pin text)
returns text language plpgsql volatile security definer set search_path = public as $$
declare v text;
begin
  if coalesce(p_pin, '') = '' then return null; end if;
  perform public.controlla_blocco_pin();
  select p.email into v
  from public.codici_accesso c
  join public.profiles p on p.id = c.profilo_id
  where c.pin = p_pin and p.attivo
  limit 1;
  if v is null then
    insert into public.pin_errati default values;
    perform pg_sleep(1);
  end if;
  return v;
end $$;

-- Queste leggevano soltanto: ora passano da team_for_pin, che scrive, quindi diventano "volatile"
create or replace function public.coach_get(p_pin text, p_path text)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
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

create or replace function public.coach_societa(p_pin text)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
begin
  if public.team_for_pin(p_pin) is null then raise exception 'PIN non valido' using errcode = '28000'; end if;
  return coalesce((select jsonb_agg(nome order by nome) from public.societa), '[]'::jsonb);
end $$;

revoke all on function public.controlla_blocco_pin() from public, anon, authenticated;
revoke all on function public.team_for_pin(text) from public, anon, authenticated;
revoke all on function public.email_per_pin(text) from public;
grant execute on function public.email_per_pin(text) to anon, authenticated;
revoke all on function public.coach_get(text, text) from public;
grant execute on function public.coach_get(text, text) to anon, authenticated;
revoke all on function public.coach_societa(text) from public;
grant execute on function public.coach_societa(text) to anon, authenticated;
