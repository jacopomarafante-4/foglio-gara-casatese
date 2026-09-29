'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { elencoSocieta, trovaOCreaSocieta } from '@/lib/societa';
import { DETTAGLI_SEGNALAZIONE, IMPRESSIONI, PIEDI, RUOLI_CAMPO, valoreValido } from '@/lib/tipi';
import { intero, maiuscoleIniziali, normalizza, testo, testoLungo } from '@/lib/utili';

function errore(msg: string, giocatoreId?: string | null): never {
  const extra = giocatoreId ? `&giocatore=${giocatoreId}` : '';
  redirect(`/segnala?errore=${encodeURIComponent(msg)}${extra}`);
}

export async function salvaSegnalazione(formData: FormData) {
  const supabase = await createClient();

  let giocatoreId = testo(formData, 'giocatore_id');
  const osservazione = testoLungo(formData, 'testo');
  const voto = intero(formData, 'voto');
  const contesto = testo(formData, 'contesto');
  const data = testo(formData, 'data');

  if (!osservazione) errore('Scrivi cosa hai visto: è la parte più importante.', giocatoreId);
  if (voto !== null && (voto < 1 || voto > 5)) errore('Il voto va da 1 a 5.', giocatoreId);

  // Giocatore nuovo o da cercare tra quelli esistenti
  let nuovoGiocatore = false;
  if (!giocatoreId) {
    const annata = intero(formData, 'annata');
    const cognome = maiuscoleIniziali(testo(formData, 'cognome'));
    const nome = maiuscoleIniziali(testo(formData, 'nome'));
    const descrizione = testo(formData, 'descrizione');
    const ruolo = valoreValido(RUOLI_CAMPO, formData.get('ruolo'));
    const piede = valoreValido(PIEDI, formData.get('piede'));
    const nomeSocieta = testo(formData, 'societa');

    if (!annata) errore('Indica l’annata.');
    if (!cognome && !descrizione)
      errore('Serve il cognome oppure una descrizione per riconoscerlo (es. "N.8, biondo").');

    // Stesso cognome, nome e annata = stesso giocatore: niente doppioni
    // (confronto senza accenti, apostrofi e spazi: "D'Angelo" = "Dangelo")
    if (cognome) {
      const { data: omonimi } = await supabase.from('giocatori').select('id, cognome, nome')
        .eq('annata', annata).ilike('cognome', `${cognome.slice(0, 2)}%`).limit(200);
      const trovati = (omonimi ?? []).filter((g) => normalizza(g.cognome ?? '') === normalizza(cognome)
        && (!nome || normalizza(g.nome ?? '') === normalizza(nome)));
      if (trovati.length === 1) giocatoreId = trovati[0].id;
    }

    if (!giocatoreId) {
      const societa = nomeSocieta
        ? await trovaOCreaSocieta(supabase, await elencoSocieta(supabase), nomeSocieta)
        : null;

      const { data: nuovo, error } = await supabase
        .from('giocatori')
        .insert({ cognome, nome, descrizione, annata, ruolo, piede, societa_id: societa?.id ?? null })
        .select('id')
        .single();
      if (error || !nuovo) errore(`Giocatore non salvato: ${error?.message ?? 'errore sconosciuto'}`);
      giocatoreId = nuovo.id;
      nuovoGiocatore = true;
    }
  }

  // Giocatore già in lista (osservato): niente nuova segnalazione, si apre la valutazione con quello che si è scritto
  if (!nuovoGiocatore) {
    const { data: gia } = await supabase.from('giocatori').select('osservato').eq('id', giocatoreId).maybeSingle();
    if (gia?.osservato) {
      const q = new URLSearchParams({ gia: '1', nota: osservazione ?? '', ...(contesto ? { contesto } : {}), ...(data ? { data } : {}) });
      redirect(`/giocatori/${giocatoreId}/valuta?${q}`);
    }
  }

  // voti facoltativi (0041): solo da 1 a 5, se no niente
  const dettagli = Object.fromEntries(DETTAGLI_SEGNALAZIONE.map((d) => {
    const v = intero(formData, d.chiave); return [d.chiave, v && v >= 1 && v <= 5 ? v : null];
  }));
  const { error } = await supabase.from('segnalazioni').insert({
    giocatore_id: giocatoreId,
    testo: osservazione,
    voto,
    piede: valoreValido(PIEDI, formData.get('piede')),
    impressione: valoreValido(IMPRESSIONI, formData.get('impressione')),
    ...dettagli,
    contesto,
    ...(data ? { data } : {}),
  });
  if (error) errore(`Segnalazione non salvata: ${error.message}`, giocatoreId);

  redirect(`/giocatori/${giocatoreId}?ok=${encodeURIComponent('Segnalazione salvata.')}`);
}
