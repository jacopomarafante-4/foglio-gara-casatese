-- =====================================================================
-- 0016 · Calendari dei campionati nelle gare
-- Da eseguire in Supabase → SQL Editor, DOPO la 0015
-- =====================================================================

-- Le gare importate dai calendari ufficiali (LND e delegazioni) partono "da calendario":
-- data, ora e campo sono quelli previsti. Il comunicato ufficiale settimanale poi le
-- conferma o le varia: in quel caso si scrive il comunicato e si conservano i valori di prima.

alter table public.gare
  add column if not exists stagione        text,          -- "2026/27"
  add column if not exists girone          text,
  add column if not exists giornata        int,
  add column if not exists turno           text check (turno in ('andata', 'ritorno')),
  add column if not exists stato           text not null default 'calendario'
                                           check (stato in ('calendario', 'confermata', 'variata')),
  add column if not exists comunicato      text,          -- "C.U. n. 12 del 24/09/2026"
  add column if not exists precedente      jsonb,         -- data_ora, campo, indirizzo prima della variazione
  add column if not exists ora_da_definire boolean not null default false,
  add column if not exists codice_campo    text,          -- numero del campo nell'elenco federale
  add column if not exists chiave          text;          -- stagione|categoria|girone|casa|trasferta (una sola volta)

create unique index if not exists gare_chiave_idx on public.gare (chiave);
create index if not exists gare_casa_idx on public.gare (casa_id, data_ora);
create index if not exists gare_trasferta_idx on public.gare (trasferta_id, data_ora);

-- Stessa coppia di società, stesso giorno e ora ma categoria diversa (Under 16 e Under 17):
-- sono due gare diverse
alter table public.gare drop constraint if exists gara_unica;
alter table public.gare add constraint gara_unica unique (data_ora, categoria, casa_nome, trasferta_nome);
