'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PIEDI, RUOLI_CAMPO, valoreValido } from '@/lib/tipi';
import { intero, testo, testoLungo } from '@/lib/utili';

const PRIORITA = ['alta', 'media', 'bassa'];
function torna(esito: { ok?: string; errore?: string }): never {
  const [k, v] = esito.errore ? ['errore', esito.errore] : ['ok', esito.ok ?? ''];
  redirect(`/necessita?${k}=${encodeURIComponent(v)}`);
}

/** Nuova necessità o modifica (con id): solo admin e direttori (regole 0036) */
export async function salvaNecessita(formData: FormData) {
  const id = testo(formData, 'id');
  let da = intero(formData, 'annata_da'), a = intero(formData, 'annata_a') ?? da;
  if (!da) torna({ errore: 'Scegli l’annata.' });
  if (a! < da!) [da, a] = [a, da];
  const priorita = String(formData.get('priorita'));
  const dati = {
    titolo: testo(formData, 'titolo'),
    annata_da: da, annata_a: a,
    ruolo: valoreValido(RUOLI_CAMPO, formData.get('ruolo')),
    piede: valoreValido(PIEDI, formData.get('piede')),
    priorita: PRIORITA.includes(priorita) ? priorita : 'media',
    note: testoLungo(formData, 'note'),
  };
  const supabase = await createClient();
  const { data, error } = id
    ? await supabase.from('necessita').update(dati).eq('id', id).select('id')
    : await supabase.from('necessita').insert(dati).select('id');
  if (error) torna({ errore: `Necessità non salvata: ${error.message}` });
  if (!data?.length) torna({ errore: 'Solo admin e direttori scrivono le necessità.' });
  torna({ ok: id ? 'Necessità aggiornata.' : 'Necessità aggiunta.' });
}

/** Chiudi (trovato) o riapri */
export async function apriChiudiNecessita(formData: FormData) {
  const supabase = await createClient();
  const aperta = formData.get('aperta') === '1';
  const { error } = await supabase.from('necessita').update({ aperta }).eq('id', testo(formData, 'id')!);
  if (error) torna({ errore: `Non riuscito: ${error.message}` });
  torna({ ok: aperta ? 'Necessità riaperta.' : 'Necessità chiusa.' });
}

export async function eliminaNecessita(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from('necessita').delete().eq('id', testo(formData, 'id')!);
  if (error) torna({ errore: `Non eliminata: ${error.message}` });
  torna({ ok: 'Necessità eliminata.' });
}
