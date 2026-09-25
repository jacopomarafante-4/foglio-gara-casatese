-- =====================================================================
-- 0013 · Squadra del giocatore: società + categoria
-- Da eseguire in Supabase → SQL Editor, DOPO la 0012
-- =====================================================================

-- La squadra di appartenenza di un giocatore osservato è la sua società più la categoria.
-- Di norma la categoria si ricava dall'annata e dalla stagione (lib/categorie.ts: stagione
-- 2026/27, un 2013 gioca in Under 14); questo campo serve solo quando è diversa
-- (gioca sotto età, o in una squadra di un'altra annata). Vuoto = quella dell'annata.
alter table public.giocatori add column if not exists categoria text;
