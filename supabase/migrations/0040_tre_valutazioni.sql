-- =====================================================================
-- 0040 · Tre valutazioni per inserire un giocatore
-- Da eseguire in Supabase → SQL Editor, DOPO la 0039
-- =====================================================================
-- Un giocatore passa a "Inserito" solo se lo hanno valutato almeno 3 persone diverse (account dello staff o mister
-- dal Portale). Conta le persone, non le valutazioni: la stessa persona che valuta tre volte vale una.
-- Chi è già "Inserito" resta com'è; gli script con la chiave di servizio (auth.uid() nullo) non sono bloccati.

create or replace function public.valutatori_distinti(p_giocatore uuid)
returns int language sql stable security definer set search_path = public as $$
  select count(distinct coalesce(autore_id::text, 'm:' || autore_squadra, 'x:' || id::text))::int
    from public.valutazioni where giocatore_id = p_giocatore
$$;
grant execute on function public.valutatori_distinti(uuid) to authenticated;

create or replace function public.controlla_inserimento()
returns trigger language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if new.stato = 'inserito' and old.stato is distinct from 'inserito' and auth.uid() is not null then
    n := public.valutatori_distinti(new.id);
    if n < 3 then
      raise exception 'Per inserire un giocatore servono almeno 3 valutazioni di persone diverse (ora %)', n using errcode = 'P0001';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists giocatori_controlla_inserimento on public.giocatori;
create trigger giocatori_controlla_inserimento
  before update of stato on public.giocatori
  for each row execute function public.controlla_inserimento();
