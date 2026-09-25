-- =====================================================================
-- 0020 · Direttori: modificano l'area Società, le squadre restano in sola lettura
-- Da eseguire in Supabase → SQL Editor, DOPO la 0019
-- =====================================================================

-- L'area Società del Portale è il documento shared/teams (squadre, mister e loro PIN).
-- I direttori possono scriverlo; tutti gli altri documenti del Portale (rose, calendari,
-- fogli gara, registri, schemi) restano in sola lettura per loro (0011).
-- Scout e direttori (account e codici) passano da /api/staff, che ora accetta anche i direttori.

drop policy if exists "direttori: societa (nuovo)" on public.docs;
create policy "direttori: societa (nuovo)" on public.docs
  for insert to authenticated
  with check (coalesce(public.mio_ruolo() = 'direttore', false) and path = 'shared/teams');

drop policy if exists "direttori: societa (modifica)" on public.docs;
create policy "direttori: societa (modifica)" on public.docs
  for update to authenticated
  using (coalesce(public.mio_ruolo() = 'direttore', false) and path = 'shared/teams')
  with check (coalesce(public.mio_ruolo() = 'direttore', false) and path = 'shared/teams');
