-- =====================================================================
-- 0011 · Direttori: nel Portale vedono tutte le squadre, non modificano
-- Da eseguire in Supabase → SQL Editor, DOPO la 0010
-- =====================================================================

-- Cambia la 0010: i direttori leggono i documenti del Portale (tutte le squadre, area
-- Società compresa) ma non li scrivono. Scrive solo l'admin (regola "admin: accesso completo"
-- di supabase/sicurezza.sql) e i mister, per la loro squadra, via coach_set.
-- I codici personali (codici_accesso) restano visibili ai direttori (0010), senza poterli cambiare.

drop policy if exists "direttori: accesso completo" on public.docs;
drop policy if exists "direttori: sola lettura" on public.docs;
create policy "direttori: sola lettura" on public.docs
  for select to authenticated
  using (coalesce(public.mio_ruolo() = 'direttore', false));
