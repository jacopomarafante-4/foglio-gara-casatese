-- =====================================================================
-- 0010 · Direttori: modificano il Portale e l'area Società
-- Da eseguire in Supabase → SQL Editor, DOPO la 0009
-- =====================================================================

-- I direttori (ruolo `direttore`) lavorano sul Portale come l'admin: tutte le squadre,
-- compresa l'area Società con i codici di mister, scout e direttori.
-- Nello Scouting restano in sola lettura (regole della 0009, invariate).

-- Documenti del Portale (squadre, rose, fogli gara, calendari, registri, schemi): lettura e scrittura
drop policy if exists "direttori: accesso completo" on public.docs;
create policy "direttori: accesso completo" on public.docs
  for all to authenticated
  using (coalesce(public.mio_ruolo() = 'direttore', false))
  with check (coalesce(public.mio_ruolo() = 'direttore', false));

-- Codici personali di scout e direttori: li vedono admin e direttori (Società)
drop policy if exists "solo l'admin vede i pin" on public.codici_accesso;
drop policy if exists "admin e direttori vedono i pin" on public.codici_accesso;
create policy "admin e direttori vedono i pin"
  on public.codici_accesso for select
  to authenticated
  using (public.vede_tutto());

-- La lettura "senza PIN" per i direttori in sola lettura non serve più
drop function if exists public.dirigente_get(text);
