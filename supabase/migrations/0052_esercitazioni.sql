-- =====================================================================
-- 0052 · Esercitazioni: l'eserciziario della società (area "Esercitazioni")
-- Da eseguire in Supabase → SQL Editor, DOPO la 0051
-- =====================================================================
-- Per ora SOLO l'admin la vede e la modifica (lavori in corso, da non pubblicare ai mister finché non è finita):
-- quando si aprirà ai mister basterà cambiare le regole qui sotto con una migrazione nuova.
-- Ogni esercizio: i "4 pilastri" (obiettivo, giocatori, spazi, principio), tipo, fase di gioco, categorie, durata, giorno del
-- morfociclo, testi, e la lavagna (elementi, tracciati e zone, in metri dentro il campo dell'esercizio).
-- "da" = l'esercizio da cui è nato (Duplica / Usa come modello): l'autore originale resta visibile.

create table if not exists public.esercizi (
  id          uuid primary key default gen_random_uuid(),
  titolo      text not null check (length(trim(titolo)) > 0),
  tipo        text,                    -- attivazione, tecnica, rondo, gioco_posizione, ssg, msg, lsg, partita_tema (lib/esercizi.ts)
  fase        text,                    -- possesso, transizione_negativa, non_possesso, transizione_positiva
  principio   text,
  obiettivo   text,
  categorie   text[] not null default '{}',   -- "Under 14", "Under 15"…
  formato     text,                    -- "4c4+2", "6+P c 5"
  movimento   int,                     -- giocatori di movimento in campo
  jolly       int not null default 0,  -- jolly e sponde esterne
  portieri    int not null default 0,
  lunghezza   numeric,                 -- metri
  larghezza   numeric,
  serie       int,
  minuti      numeric,                 -- per serie
  recupero    numeric,                 -- minuti tra le serie
  morfociclo  text,                    -- MD-4, MD-3, MD-2, MD-1, MD+1
  descrizione text,
  varianti    text,
  attenzione  text,                    -- punti d'attenzione del mister
  lavagna     jsonb not null default '{}'::jsonb,
  da          uuid references public.esercizi (id) on delete set null,
  autore_id   uuid references public.profiles (id) on delete set null,
  autore      text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists esercizi_aggiornato_idx on public.esercizi (updated_at desc);

alter table public.esercizi enable row level security;
drop policy if exists "esercizi: solo admin" on public.esercizi;
create policy "esercizi: solo admin" on public.esercizi for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
