-- =====================================================================
-- 0022 · Nuovi stati dei giocatori
-- Da eseguire in Supabase → SQL Editor, DOPO la 0021
-- =====================================================================

-- In lista → In osservazione → Da rivedere → Inserito → Da non inserire
--   segnalato                 → in_lista         (rinominato: giocatori e storico cambiano da soli)
--   contattato                → in_osservazione  (rinominato)
--   invitato, in_prova        → in_osservazione  (i giocatori si spostano; restano nel tipo solo per lo storico)
--   chiuso (non più usato)    → da_non_inserire  (rinominato: il vecchio storico "chiuso" diventa "da non inserire")
-- da_rivedere e inserito restano uguali.

alter table public.giocatori drop constraint if exists giocatori_niente_chiuso;

alter type public.stato_giocatore rename value 'segnalato'  to 'in_lista';
alter type public.stato_giocatore rename value 'contattato' to 'in_osservazione';
alter type public.stato_giocatore rename value 'chiuso'     to 'da_non_inserire';

-- Lo storico dei cambi di stato citava 'chiuso' (0002): senza, il primo cambio di stato si bloccherebbe
create or replace function public.registra_cambio_stato()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' or new.stato is distinct from old.stato then
    insert into public.storico_stati (giocatore_id, da_stato, a_stato, motivo, autore_id)
    values (
      new.id,
      case when tg_op = 'UPDATE' then old.stato end,
      new.stato,
      null,
      auth.uid()
    );
  end if;
  return new;
end;
$$;

-- Invitati e in prova → in osservazione, senza cambiare la data di ultima modifica
alter table public.giocatori disable trigger giocatori_updated_at;
update public.giocatori set stato = 'in_osservazione' where stato in ('invitato', 'in_prova');
-- Ex "chiusi" (0019) con motivo "Non a livello" nelle note → da non inserire; gli altri restano in lista
update public.giocatori set stato = 'da_non_inserire'
 where stato = 'in_lista' and note ilike '%Esito: Non a livello%';
alter table public.giocatori enable trigger giocatori_updated_at;

alter table public.giocatori drop constraint if exists giocatori_stati_attuali;
alter table public.giocatori add constraint giocatori_stati_attuali check (stato not in ('invitato', 'in_prova'));
