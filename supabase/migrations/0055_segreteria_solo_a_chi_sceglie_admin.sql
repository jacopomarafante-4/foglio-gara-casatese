-- =====================================================================
-- 0055 · Segreteria visibile solo a chi l'admin sceglie tra i direttori (oggi tutti i direttori la vedono)
-- Da eseguire in Supabase → SQL Editor, DOPO la 0054
-- =====================================================================
-- profiles.vede_segreteria: solo per i direttori (default false). L'admin e l'account segreteria vedono sempre;
-- un direttore solo se l'admin gli dà questo permesso (imposta_segreteria_direttore, come imposta_squadre_direttore).

alter table public.profiles add column if not exists vede_segreteria boolean not null default false;

create or replace function public.gestisce_segreteria()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.is_admin() or public.mio_ruolo()::text = 'segreteria'
    or (public.mio_ruolo()::text = 'direttore' and (select vede_segreteria from public.profiles where id = auth.uid())), false)
$$;

create or replace function public.imposta_segreteria_direttore(p_profilo uuid, p_vede boolean)
returns void language plpgsql volatile security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Solo l''admin sceglie chi vede la Segreteria' using errcode = '42501'; end if;
  update public.profiles set vede_segreteria = p_vede, updated_at = now() where id = p_profilo and ruolo = 'direttore';
end $$;
revoke all on function public.imposta_segreteria_direttore(uuid, boolean) from public, anon;
grant execute on function public.imposta_segreteria_direttore(uuid, boolean) to authenticated;
