-- =====================================================================
-- 0026 · Gare inserite a mano: le modifica ed elimina anche chi le ha inserite
-- Da eseguire in Supabase → SQL Editor, DOPO la 0025
-- =====================================================================

-- Admin e direttori modificano già tutte le gare ("gare: gestione", 0018).
-- Chi ha inserito una partita con "Aggiungi partita" può modificarla ed eliminarla (solo quelle a mano, senza chiave).
drop policy if exists "gare: modifica di chi l'ha inserita" on public.gare;
create policy "gare: modifica di chi l'ha inserita" on public.gare
  for update to authenticated
  using (inserita_da = auth.uid() and chiave is null and public.puo_segnalare())
  with check (inserita_da = auth.uid() and chiave is null);

drop policy if exists "gare: eliminazione di chi l'ha inserita" on public.gare;
create policy "gare: eliminazione di chi l'ha inserita" on public.gare
  for delete to authenticated
  using (inserita_da = auth.uid() and chiave is null and public.puo_segnalare());

-- Distinte: chi ha inserito la partita può aggiungerne anche dopo (lo prevede già "allegati: inserimento", 0023)
