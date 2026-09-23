'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { elencoSocieta, trovaOCreaSocieta } from '@/lib/societa';
import { AREE, GIUDIZI, PIEDI, RUOLI_CAMPO, STATI, valoreValido } from '@/lib/tipi';
import { intero, maiuscoleIniziali, testo, testoLungo } from '@/lib/utili';

function torna(id: string, esito: { ok?: string; errore?: string }): never {
  const [k, v] = esito.errore ? ['errore', esito.errore] : ['ok', esito.ok ?? ''];
  redirect(`/giocatori/${id}?${k}=${encodeURIComponent(v)}`);
}

export async function cambiaStato(formData: FormData) {
  const id = testo(formData, 'id')!;
  const stato = valoreValido(STATI, formData.get('stato'));
  const motivo = testo(formData, 'motivo_chiusura');
  const rivedere = testo(formData, 'rivedere_dal');
  if (!stato) torna(id, { errore: 'Scegli uno stato.' });
  if (stato === 'chiuso' && !motivo) torna(id, { errore: 'Per chiudere serve il motivo.' });

  const supabase = await createClient();
  const { error } = await supabase
    .from('giocatori')
    .update({
      stato,
      motivo_chiusura: stato === 'chiuso' ? motivo : null,
      rivedere_dal: stato === 'chiuso' ? rivedere : null,
    })
    .eq('id', id);

  if (error) torna(id, { errore: `Stato non aggiornato: ${error.message}` });
  torna(id, { ok: `Stato aggiornato: ${STATI[stato]}.` });
}

export async function aggiornaGiocatore(formData: FormData) {
  const id = testo(formData, 'id')!;
  const cognome = maiuscoleIniziali(testo(formData, 'cognome'));
  const descrizione = testo(formData, 'descrizione');
  const annata = intero(formData, 'annata');
  if (!annata) torna(id, { errore: 'L’annata è obbligatoria.' });
  if (!cognome && !descrizione) torna(id, { errore: 'Serve il cognome o una descrizione.' });

  const supabase = await createClient();
  const nomeSocieta = testo(formData, 'societa');
  const societa = nomeSocieta
    ? await trovaOCreaSocieta(supabase, await elencoSocieta(supabase), nomeSocieta)
    : null;

  const { data, error } = await supabase
    .from('giocatori')
    .update({
      cognome,
      nome: maiuscoleIniziali(testo(formData, 'nome')),
      descrizione,
      annata,
      data_nascita: testo(formData, 'data_nascita'),
      ruolo: valoreValido(RUOLI_CAMPO, formData.get('ruolo')),
      piede: valoreValido(PIEDI, formData.get('piede')),
      societa_id: societa?.id ?? null,
      note: testoLungo(formData, 'note'),
    })
    .eq('id', id)
    .select('id');

  if (error) torna(id, { errore: `Dati non salvati: ${error.message}` });
  if (!data?.length) torna(id, { errore: 'Puoi modificare solo i giocatori che hai segnalato tu.' });
  torna(id, { ok: 'Dati del giocatore aggiornati.' });
}

export async function aggiungiContatto(formData: FormData) {
  const id = testo(formData, 'id')!;
  const telefono = testo(formData, 'telefono');
  const email = testo(formData, 'email');
  if (!telefono && !email) torna(id, { errore: 'Inserisci almeno telefono o email.' });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from('contatti').insert({
    giocatore_id: id,
    tipo: ['genitore', 'giocatore', 'altro'].includes(String(formData.get('tipo')))
      ? String(formData.get('tipo'))
      : 'genitore',
    nome: testo(formData, 'nome'),
    telefono,
    email: email?.toLowerCase() ?? null,
    consenso_privacy: formData.get('consenso') === 'on',
    creato_da: user?.id,
  });

  if (error) torna(id, { errore: `Contatto non salvato: ${error.message}` });
  torna(id, { ok: 'Contatto salvato.' });
}

export async function eliminaContatto(formData: FormData) {
  const id = testo(formData, 'id')!;
  const contattoId = testo(formData, 'contatto_id')!;
  const supabase = await createClient();
  const { error } = await supabase.from('contatti').delete().eq('id', contattoId);
  if (error) torna(id, { errore: `Contatto non eliminato: ${error.message}` });
  torna(id, { ok: 'Contatto eliminato.' });
}

export async function salvaValutazione(formData: FormData) {
  const id = testo(formData, 'id')!;
  const giudizio = valoreValido(GIUDIZI, formData.get('giudizio'));

  const voti: Record<string, number | string | null> = {};
  for (const a of AREE) {
    const v = intero(formData, a.chiave);
    if (!v || v < 1 || v > 5) {
      redirect(`/giocatori/${id}/valuta?errore=${encodeURIComponent(`Manca il voto di ${a.nome}.`)}`);
    }
    voti[a.chiave] = v;
    voti[`${a.chiave}_note`] = testoLungo(formData, `${a.chiave}_note`);
  }
  if (!giudizio) redirect(`/giocatori/${id}/valuta?errore=${encodeURIComponent('Scegli il giudizio finale.')}`);

  const data = testo(formData, 'data');
  const supabase = await createClient();
  const { error } = await supabase.from('valutazioni').insert({
    giocatore_id: id,
    ...voti,
    giudizio,
    contesto: testo(formData, 'contesto'),
    commento: testoLungo(formData, 'commento'),
    ...(data ? { data } : {}),
  });

  if (error) {
    redirect(`/giocatori/${id}/valuta?errore=${encodeURIComponent(`Valutazione non salvata: ${error.message}`)}`);
  }
  torna(id, { ok: 'Valutazione salvata.' });
}
