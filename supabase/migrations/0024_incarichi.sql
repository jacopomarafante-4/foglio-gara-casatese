-- =====================================================================
-- 0024 · Incarichi in Home: li creano admin e direttori, li prendono direttori e scout
-- Da eseguire in Supabase → SQL Editor, DOPO la 0023
-- =====================================================================

-- Es. "Andare a vedere Cisanese Under 15", "Supervisionare il torneo di Olginate".
-- Chi lo prende si segna ("Me ne occupo io"); a lavoro finito lo chiude con due righe di esito.
create table if not exists public.incarichi (
  id           uuid primary key default gen_random_uuid(),
  titolo       text not null check (length(trim(titolo)) > 0),
  tipo         text not null default 'altro' check (tipo in ('squadra', 'torneo', 'partita', 'altro')),
  societa_id   uuid references public.societa (id) on delete set null,
  categoria    text,
  quando       date,
  dettagli     text,
  creato_da    uuid default auth.uid() references public.profiles (id) on delete set null,
  assegnato_a  uuid references public.profiles (id) on delete set null,
  preso_il     timestamptz,
  fatto        boolean not null default false,
  fatto_il     timestamptz,
  esito        text,
  created_at   timestamptz not null default now()
);
create index if not exists incarichi_aperti_idx on public.incarichi (fatto, quando);
alter table public.incarichi enable row level security;

-- Li vedono tutti quelli dello Scouting (admin, direttori, scout)
drop policy if exists "incarichi: lettura" on public.incarichi;
create policy "incarichi: lettura" on public.incarichi
  for select to authenticated using (coalesce(public.mio_ruolo() in ('admin', 'direttore', 'scout'), false));
-- Crearli, modificarli ed eliminarli: admin e direttori
drop policy if exists "incarichi: gestione" on public.incarichi;
create policy "incarichi: gestione" on public.incarichi
  for all to authenticated using (public.vede_tutto()) with check (public.vede_tutto());

-- Scout (e direttori): prendere, lasciare, chiudere. Solo con queste funzioni, non modificano il resto.
create or replace function public.prendi_incarico(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if coalesce(public.mio_ruolo() in ('admin', 'direttore', 'scout'), false) is not true then
    raise exception 'Non puoi prendere incarichi' using errcode = '42501';
  end if;
  update public.incarichi set assegnato_a = auth.uid(), preso_il = now()
   where id = p_id and assegnato_a is null and not fatto;
  if not found then raise exception 'L''incarico è già stato preso da qualcun altro'; end if;
end $$;

create or replace function public.lascia_incarico(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.incarichi set assegnato_a = null, preso_il = null
   where id = p_id and not fatto and (assegnato_a = auth.uid() or public.vede_tutto());
  if not found then raise exception 'Puoi lasciare solo un incarico preso da te' using errcode = '42501'; end if;
end $$;

create or replace function public.chiudi_incarico(p_id uuid, p_esito text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.incarichi set fatto = true, fatto_il = now(), esito = nullif(trim(p_esito), '')
   where id = p_id and not fatto and (assegnato_a = auth.uid() or public.vede_tutto());
  if not found then raise exception 'Puoi chiudere solo un incarico preso da te' using errcode = '42501'; end if;
end $$;

revoke all on function public.prendi_incarico(uuid) from public, anon;
revoke all on function public.lascia_incarico(uuid) from public, anon;
revoke all on function public.chiudi_incarico(uuid, text) from public, anon;
grant execute on function public.prendi_incarico(uuid) to authenticated;
grant execute on function public.lascia_incarico(uuid) to authenticated;
grant execute on function public.chiudi_incarico(uuid, text) to authenticated;
