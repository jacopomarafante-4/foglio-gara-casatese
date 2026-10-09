-- =====================================================================
-- 0059 · Tabelle vere, fase 1: calendario delle squadre una riga per partita
-- Da eseguire in Supabase → SQL Editor, DOPO la 0058
-- =====================================================================
-- Oggi il calendario di ogni squadra è un blocco unico in docs (`calendar/<squadra>`, { matches: [...] }).
-- Questa tabella ne è la copia a righe, tenuta allineata da un trigger: ogni volta che il blocco cambia
-- (app, Google, import, script) le righe della squadra si riscrivono. L'app continua a scrivere il blocco;
-- le letture passano alla tabella una alla volta. Nessuno scrive qui a mano.

create table if not exists public.calendario_partite (
  squadra     text not null,               -- id di shared/teams (t_u15…)
  id          text not null,               -- id della voce nel calendario
  data        date,
  ora         text,
  avversario  text,
  casa        boolean,
  campo       text,
  indirizzo   text,
  ll          text,                        -- "lat,lon"
  tipo        text,                        -- campionato / partita / torneo …
  amichevole  boolean not null default false,
  stato       text,                        -- calendario / confermata / variata
  gara_id     text,                        -- gare.id dello Scouting, se collegata
  comunicato  text,
  gcal        text,
  gcal_cal    text,
  dati        jsonb not null,              -- voce completa, così non si perde niente
  aggiornato  timestamptz not null default now(),
  primary key (squadra, id)
);
create index if not exists calendario_partite_data_idx on public.calendario_partite (data);

alter table public.calendario_partite enable row level security;
drop policy if exists "calendario_partite: admin e direttori leggono" on public.calendario_partite;
create policy "calendario_partite: admin e direttori leggono" on public.calendario_partite
  for select using (public.vede_tutto());
-- Niente policy di scrittura: la riempie solo il trigger qui sotto.

create or replace function public.data_sicura(t text) returns date
language sql immutable as $$
  select case when t ~ '^\d{4}-\d{2}-\d{2}' then left(t, 10)::date end
$$;

create or replace function public.calendario_in_righe(p_squadra text, p_dati jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from public.calendario_partite where squadra = p_squadra;
  if p_dati is null or jsonb_typeof(p_dati -> 'matches') <> 'array' then return; end if;
  insert into public.calendario_partite
    (squadra, id, data, ora, avversario, casa, campo, indirizzo, ll, tipo, amichevole, stato, gara_id, comunicato, gcal, gcal_cal, dati)
  select distinct on (coalesce(m ->> 'id', ord::text))
         p_squadra, coalesce(m ->> 'id', ord::text), public.data_sicura(m ->> 'date'), m ->> 'time', m ->> 'opponent',
         case when jsonb_typeof(m -> 'home') = 'boolean' then (m ->> 'home')::boolean end,
         m ->> 'venue', m ->> 'address', m ->> 'll', m ->> 'tipo',
         coalesce(case when jsonb_typeof(m -> 'friendly') = 'boolean' then (m ->> 'friendly')::boolean end, false),
         m ->> 'stato', m ->> 'garaId', m ->> 'comunicato', m ->> 'gcal', m ->> 'gcalCal', m
    from jsonb_array_elements(p_dati -> 'matches') with ordinality as e(m, ord)
   where jsonb_typeof(m) = 'object'
   order by coalesce(m ->> 'id', ord::text), ord desc;
end $$;
revoke all on function public.calendario_in_righe(text, jsonb) from public, anon, authenticated;

create or replace function public.docs_calendario_righe()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    if old.path like 'calendar/%' then delete from public.calendario_partite where squadra = substr(old.path, 10); end if;
    return old;
  end if;
  if tg_op = 'UPDATE' and old.path like 'calendar/%' and old.path <> new.path then
    delete from public.calendario_partite where squadra = substr(old.path, 10);
  end if;
  if new.path like 'calendar/%' then perform public.calendario_in_righe(substr(new.path, 10), new.data); end if;
  return new;
end $$;

drop trigger if exists docs_calendario_righe on public.docs;
create trigger docs_calendario_righe
  after insert or update or delete on public.docs
  for each row execute function public.docs_calendario_righe();

-- Prima copia dei calendari di oggi
select public.calendario_in_righe(substr(path, 10), data) from public.docs where path like 'calendar/%';
