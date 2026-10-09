-- =====================================================================
-- 0061 · Tabelle vere, fase 2: registro (allenamenti e partite) una riga ciascuno
-- Da eseguire in Supabase → SQL Editor, DOPO la 0060
-- =====================================================================
-- Come la 0059 per il calendario: `registro/<squadra>` resta il blocco che l'app legge e scrive (presenze, tabellini,
-- test, ruoli, amichevoli…); queste due tabelle ne sono la copia a righe (un allenamento o una partita per riga),
-- tenute allineate da un trigger. Nessuno scrive qui a mano; per ora nessuna pagina le legge ancora (prossimo passo).

create table if not exists public.registro_allenamenti (
  squadra     text not null,
  id          text not null,
  data        date,
  dati        jsonb not null,              -- voce completa (att = presenze per giocatore, note…)
  aggiornato  timestamptz not null default now(),
  primary key (squadra, id)
);
create index if not exists registro_allenamenti_data_idx on public.registro_allenamenti (data);

create table if not exists public.registro_partite (
  squadra     text not null,
  id          text not null,
  data        date,
  avversario  text,
  casa        boolean,
  competizione text,                       -- comp
  fonte       text,
  dati        jsonb not null,              -- voce completa (pl = presenze/minuti/gol per giocatore, tempi…)
  aggiornato  timestamptz not null default now(),
  primary key (squadra, id)
);
create index if not exists registro_partite_data_idx on public.registro_partite (data);

alter table public.registro_allenamenti enable row level security;
alter table public.registro_partite enable row level security;
drop policy if exists "registro_allenamenti: admin e direttori leggono" on public.registro_allenamenti;
create policy "registro_allenamenti: admin e direttori leggono" on public.registro_allenamenti
  for select using (public.vede_tutto());
drop policy if exists "registro_partite: admin e direttori leggono" on public.registro_partite;
create policy "registro_partite: admin e direttori leggono" on public.registro_partite
  for select using (public.vede_tutto());
-- Niente policy di scrittura: le riempie solo il trigger qui sotto.

create or replace function public.registro_in_righe(p_squadra text, p_dati jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from public.registro_allenamenti where squadra = p_squadra;
  delete from public.registro_partite where squadra = p_squadra;
  if p_dati is null then return; end if;

  if jsonb_typeof(p_dati -> 'trainings') = 'array' then
    insert into public.registro_allenamenti (squadra, id, data, dati)
    select distinct on (coalesce(m ->> 'id', ord::text))
           p_squadra, coalesce(m ->> 'id', ord::text), public.data_sicura(m ->> 'date'), m
      from jsonb_array_elements(p_dati -> 'trainings') with ordinality as e(m, ord)
     where jsonb_typeof(m) = 'object'
     order by coalesce(m ->> 'id', ord::text), ord desc;
  end if;

  if jsonb_typeof(p_dati -> 'games') = 'array' then
    insert into public.registro_partite (squadra, id, data, avversario, casa, competizione, fonte, dati)
    select distinct on (coalesce(m ->> 'id', ord::text))
           p_squadra, coalesce(m ->> 'id', ord::text), public.data_sicura(m ->> 'date'), m ->> 'opponent',
           case when jsonb_typeof(m -> 'home') = 'boolean' then (m ->> 'home')::boolean end,
           m ->> 'comp', m ->> 'fonte', m
      from jsonb_array_elements(p_dati -> 'games') with ordinality as e(m, ord)
     where jsonb_typeof(m) = 'object'
     order by coalesce(m ->> 'id', ord::text), ord desc;
  end if;
end $$;
revoke all on function public.registro_in_righe(text, jsonb) from public, anon, authenticated;

create or replace function public.docs_registro_righe()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    if old.path like 'registro/%' then
      delete from public.registro_allenamenti where squadra = substr(old.path, 10);
      delete from public.registro_partite where squadra = substr(old.path, 10);
    end if;
    return old;
  end if;
  if tg_op = 'UPDATE' and old.path like 'registro/%' and old.path <> new.path then
    delete from public.registro_allenamenti where squadra = substr(old.path, 10);
    delete from public.registro_partite where squadra = substr(old.path, 10);
  end if;
  if new.path like 'registro/%' then perform public.registro_in_righe(substr(new.path, 10), new.data); end if;
  return new;
end $$;

drop trigger if exists docs_registro_righe on public.docs;
create trigger docs_registro_righe
  after insert or update or delete on public.docs
  for each row execute function public.docs_registro_righe();

-- Prima copia dei registri di oggi
select public.registro_in_righe(substr(path, 10), data) from public.docs where path like 'registro/%';
