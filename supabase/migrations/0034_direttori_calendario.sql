-- 0034: i direttori modificano il calendario (partite di tutte le squadre), gli eventi e gli avvisi della società,
-- come il responsabile organizzativo (0029). Il resto del Portale (rose, registri, fogli gara) resta in sola lettura (0011).

drop policy if exists "direttori: calendario ed eventi (nuovo)" on public.docs;
create policy "direttori: calendario ed eventi (nuovo)" on public.docs
  for insert to authenticated
  with check (coalesce(public.mio_ruolo() = 'direttore', false)
              and (path like 'calendar/%' or path in ('shared/eventi', 'shared/avvisi')));

drop policy if exists "direttori: calendario ed eventi (modifica)" on public.docs;
create policy "direttori: calendario ed eventi (modifica)" on public.docs
  for update to authenticated
  using (coalesce(public.mio_ruolo() = 'direttore', false)
         and (path like 'calendar/%' or path in ('shared/eventi', 'shared/avvisi')))
  with check (coalesce(public.mio_ruolo() = 'direttore', false)
              and (path like 'calendar/%' or path in ('shared/eventi', 'shared/avvisi')));
