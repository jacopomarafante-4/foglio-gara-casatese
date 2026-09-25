-- =====================================================================
-- 0019 · Niente più stato "Chiuso": i giocatori restano sempre aperti
-- Da eseguire in Supabase → SQL Editor, DOPO la 0018
-- =====================================================================

-- I giocatori chiusi tornano "Segnalato". Il motivo della chiusura (e la data "da rivedere dal")
-- non si perde: si aggiunge in fondo alle note della scheda. Lo storico registra il passaggio.
update public.giocatori
   set note = concat_ws(E'\n\n', nullif(trim(note), ''),
                'Esito: ' || coalesce(motivo_chiusura, 'chiuso')
                || case when rivedere_dal is not null
                        then ' (da rivedere dal ' || to_char(rivedere_dal, 'DD/MM/YYYY') || ')' else '' end),
       stato = 'segnalato',
       motivo_chiusura = null,
       rivedere_dal = null
 where stato = 'chiuso';

-- Da ora in poi "chiuso" non si può più usare (il valore resta nel tipo solo per lo storico)
alter table public.giocatori drop constraint if exists giocatori_niente_chiuso;
alter table public.giocatori add constraint giocatori_niente_chiuso check (stato <> 'chiuso');
