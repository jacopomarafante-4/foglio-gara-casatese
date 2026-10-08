-- =====================================================================
-- 0058 · Percorso del giocatore: Nel database → Segnalato → Osservato → Esito (positivo / rimandato / negativo) → Inserito
-- Da eseguire in Supabase → SQL Editor, DOPO la 0057
-- =====================================================================
-- I nomi interni restano quelli di oggi (li usano tante funzioni): cambiano solo i nomi che l'app mostra (lib/tipi.ts).
--   Nel database = osservato false · Segnalato = in_lista · Osservato = in_osservazione · Esito positivo = positivo (nuovo)
--   Esito rimandato = da_rivedere · Esito negativo = da_non_inserire · Inserito = inserito (positivo + accordo con ragazzo e famiglia)
-- Osservato arriva da solo alla 3ª valutazione di persone diverse (da Segnalato). Ogni stato si può sempre cambiare a mano.

alter type public.stato_giocatore add value if not exists 'positivo' after 'in_osservazione';

-- Alla 3ª persona che valuta: da Segnalato a Osservato (storico_stati registra il passaggio col suo trigger)
create or replace function public.osservato_dopo_tre()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.giocatori set stato = 'in_osservazione'
   where id = new.giocatore_id and stato = 'in_lista' and public.valutatori_distinti(new.giocatore_id) >= 3;
  return new;
end $$;
drop trigger if exists valutazioni_osservato_dopo_tre on public.valutazioni;
create trigger valutazioni_osservato_dopo_tre
  after insert on public.valutazioni
  for each row execute function public.osservato_dopo_tre();

-- Chi ha già 3 valutazioni ed è ancora Segnalato passa a Osservato
update public.giocatori g set stato = 'in_osservazione'
 where g.stato = 'in_lista' and public.valutatori_distinti(g.id) >= 3;
