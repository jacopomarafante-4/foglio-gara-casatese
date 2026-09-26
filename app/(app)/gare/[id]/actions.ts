'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { elencoSocieta, trovaOCreaSocieta } from '@/lib/societa';
import { istanteItaliano, testo } from '@/lib/utili';

function torna(id: string, msg: { ok?: string; errore?: string }): never {
  const [k, v] = msg.errore ? ['errore', msg.errore] : ['ok', msg.ok ?? ''];
  redirect(`/gare/${id}?${k}=${encodeURIComponent(v)}`);
}

/** Modifica della partita: chi l'ha inserita, admin e direttori (lo controlla il database, 0018 e 0026).
 *  Una gara dei calendari modificata a mano diventa "variata", così la prossima importazione non la sovrascrive. */
export async function modificaGara(fd: FormData) {
  const id = testo(fd, 'id')!;
  const data = testo(fd, 'data');
  const ora = testo(fd, 'ora');
  const categoria = testo(fd, 'categoria');
  const casa = testo(fd, 'casa');
  const trasferta = testo(fd, 'trasferta');
  if (!data || !categoria || !casa || !trasferta) torna(id, { errore: 'Servono data, categoria e le due squadre.' });
  const quando = istanteItaliano(data, ora ?? '12:00');
  if (!quando) torna(id, { errore: 'Data o ora non valide.' });

  const supabase = await createClient();
  const { data: prima } = await supabase.from('gare').select('chiave, precedente, data_ora, ora_da_definire, campo, indirizzo, casa_nome, trasferta_nome').eq('id', id).single();
  if (!prima) torna(id, { errore: 'Partita non trovata.' });
  const societa = await elencoSocieta(supabase);
  const casaS = await trovaOCreaSocieta(supabase, societa, casa);
  const trasfertaS = await trovaOCreaSocieta(supabase, societa, trasferta);
  if (!casaS || !trasfertaS) torna(id, { errore: 'Squadre non salvate.' });

  const agg: Record<string, unknown> = {
    data_ora: quando, ora_da_definire: !ora, categoria,
    casa_id: casaS.id, trasferta_id: trasfertaS.id, casa_nome: casaS.nome, trasferta_nome: trasfertaS.nome,
    campo: testo(fd, 'campo'), indirizzo: testo(fd, 'indirizzo'),
  };
  if (prima.chiave) {
    const { data: utente } = await supabase.auth.getUser();
    const { data: io } = await supabase.from('profiles').select('nome, cognome').eq('id', utente.user?.id ?? '').single();
    Object.assign(agg, {
      stato: 'variata',
      comunicato: `Modificata a mano${io ? ` da ${[io.nome, io.cognome].filter(Boolean).join(' ')}` : ''}`,
      precedente: prima.precedente ?? { data_ora: prima.data_ora, ora_da_definire: prima.ora_da_definire, campo: prima.campo,
        indirizzo: prima.indirizzo, casa_nome: prima.casa_nome, trasferta_nome: prima.trasferta_nome },
    });
  }
  const { data: fatte, error } = await supabase.from('gare').update(agg).eq('id', id).select('id');
  if (error) torna(id, { errore: `Partita non modificata: ${error.message}` });
  if (!fatte?.length) torna(id, { errore: 'Puoi modificare solo le partite inserite da te.' });
  torna(id, { ok: 'Partita aggiornata.' });
}

/** Elimina una partita inserita a mano (quelle dei calendari no). Le segnalazioni restano sulle schede dei giocatori. */
export async function eliminaPartita(fd: FormData) {
  const id = testo(fd, 'id')!;
  const supabase = await createClient();
  const { data: allegati } = await supabase.from('gare_allegati').select('percorso').eq('gara_id', id);
  const { data, error } = await supabase.from('gare').delete().eq('id', id).is('chiave', null).select('id');
  if (error) torna(id, { errore: `Partita non eliminata: ${error.message}` });
  if (!data?.length) torna(id, { errore: 'Si possono eliminare solo le partite inserite a mano, da chi le ha inserite o dai direttori.' });
  if (allegati?.length) await supabase.storage.from('distinte').remove(allegati.map((a) => a.percorso));
  redirect(`/gare?ok=${encodeURIComponent('Partita eliminata. Le segnalazioni restano sulle schede dei giocatori.')}`);
}

/** Toglie una distinta (file e riga): chi l'ha caricata, admin e direttori */
export async function eliminaDistinta(fd: FormData) {
  const id = testo(fd, 'gara_id')!;
  const supabase = await createClient();
  const { data } = await supabase.from('gare_allegati').delete().eq('id', testo(fd, 'id')).select('percorso');
  if (!data?.length) torna(id, { errore: 'Distinta non eliminata.' });
  await supabase.storage.from('distinte').remove(data.map((a) => a.percorso));
  torna(id, { ok: 'Distinta eliminata.' });
}
