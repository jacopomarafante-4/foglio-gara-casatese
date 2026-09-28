-- =====================================================================
-- 0037 · "Contatto presente": gli scout sanno SE di un giocatore c'è un contatto, senza vederlo
-- Da eseguire in Supabase → SQL Editor, DOPO la 0036
-- =====================================================================
-- I contatti restano leggibili solo da admin e direttori (e da chi li ha inseriti, 0002).
-- Questa funzione dice soltanto quali giocatori (tra quelli che chi chiama può vedere) hanno almeno un contatto:
-- nessun nome, telefono o email esce da qui.

create or replace function public.con_contatto(p_ids uuid[])
returns setof uuid language sql stable security definer set search_path = public as $$
  select distinct c.giocatore_id
    from public.contatti c
    join public.giocatori g on g.id = c.giocatore_id
   where public.puo_segnalare()
     and c.giocatore_id = any (p_ids)
     and public.puo_vedere_annata(g.annata)
     and (nullif(trim(c.telefono), '') is not null or nullif(trim(c.email), '') is not null)
$$;
revoke all on function public.con_contatto(uuid[]) from public, anon;
grant execute on function public.con_contatto(uuid[]) to authenticated;
