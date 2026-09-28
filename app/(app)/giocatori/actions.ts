'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { elencoSocieta, trovaOCreaSocieta } from '@/lib/societa';
import { AREE, DETTAGLI_VALUTAZIONE, ESITI_EVENTO, GIUDIZI, PIEDI, RUOLI_CAMPO, STATI, TIPI_EVENTO, valoreValido } from '@/lib/tipi';
import { intero, maiuscoleIniziali, testo, testoLungo } from '@/lib/utili';

function torna(id: string, esito: { ok?: string; errore?: string }): never {
  const [k, v] = esito.errore ? ['errore', esito.errore] : ['ok', esito.ok ?? ''];
  redirect(`/giocatori/${id}?${k}=${encodeURIComponent(v)}`);
}

export async function cambiaStato(formData: FormData) {
  const id = testo(formData, 'id')!;
  const stato = valoreValido(STATI, formData.get('stato'));
  if (!stato) torna(id, { errore: 'Scegli uno stato.' });

  const supabase = await createClient();
  const { error } = await supabase.from('giocatori').update({ stato }).eq('id', id);

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
  // la società non si cambia da qui: "Cambia società" nella Carriera (0035) la registra con data e nota
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
      categoria: testo(formData, 'categoria'),
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
  // voti tecnici facoltativi (0041)
  for (const d of DETTAGLI_VALUTAZIONE) { const v = intero(formData, d.chiave); voti[d.chiave] = v && v >= 1 && v <= 5 ? v : null; }

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

/* ---------- Eventi (open day, provini) nella scheda del giocatore ---------- */

/** "si" / "no" / "" → true / false / null (presenza non ancora saputa) */
function presenza(formData: FormData) {
  const v = formData.get('presente');
  return v === 'si' ? true : v === 'no' ? false : null;
}

export async function aggiungiEvento(formData: FormData) {
  const id = testo(formData, 'id')!;
  const tipo = valoreValido(TIPI_EVENTO, formData.get('tipo'));
  if (!tipo) torna(id, { errore: 'Scegli il tipo di evento.' });
  const data = testo(formData, 'data');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase.from('eventi_giocatore').insert({
    giocatore_id: id,
    tipo,
    ...(data ? { data } : {}),
    presente: presenza(formData),
    esito: valoreValido(ESITI_EVENTO, formData.get('esito')),
    note: testoLungo(formData, 'note'),
    autore_id: user?.id,
  });
  if (error) torna(id, { errore: `Evento non salvato: ${error.message}` });
  torna(id, { ok: `${TIPI_EVENTO[tipo]} aggiunto.` });
}

export async function modificaEvento(formData: FormData) {
  const id = testo(formData, 'id')!;
  const eventoId = testo(formData, 'evento_id')!;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('eventi_giocatore')
    .update({
      presente: presenza(formData),
      esito: valoreValido(ESITI_EVENTO, formData.get('esito')),
      note: testoLungo(formData, 'note'),
    })
    .eq('id', eventoId)
    .select('id');
  if (error) torna(id, { errore: `Evento non aggiornato: ${error.message}` });
  if (!data?.length) torna(id, { errore: 'Puoi modificare solo gli eventi che hai inserito tu.' });
  torna(id, { ok: 'Evento aggiornato.' });
}

export async function eliminaEvento(formData: FormData) {
  const id = testo(formData, 'id')!;
  const eventoId = testo(formData, 'evento_id')!;
  const supabase = await createClient();
  const { error } = await supabase.from('eventi_giocatore').delete().eq('id', eventoId);
  if (error) torna(id, { errore: `Evento non eliminato: ${error.message}` });
  torna(id, { ok: 'Evento eliminato.' });
}

/* ---------- Schede doppie (solo admin: i permessi li controlla il database) ---------- */

function tornaDoppioni(esito: { ok?: string; errore?: string }): never {
  const [k, v] = esito.errore ? ['errore', esito.errore] : ['ok', esito.ok ?? ''];
  redirect(`/giocatori/doppioni?${k}=${encodeURIComponent(v)}`);
}

export async function unisciGiocatori(formData: FormData) {
  const tieni = testo(formData, 'tieni')!;
  const togli = testo(formData, 'togli')!;
  const supabase = await createClient();
  const { error } = await supabase.rpc('unisci_giocatori', { p_tieni: tieni, p_togli: togli });
  if (error) tornaDoppioni({ errore: `Schede non unite: ${error.message}` });
  tornaDoppioni({ ok: 'Schede unite: segnalazioni, valutazioni, contatti ed eventi sono ora in una scheda sola.' });
}

export async function segnaPersoneDiverse(formData: FormData) {
  const [x, y] = [testo(formData, 'a')!, testo(formData, 'b')!];
  const [a, b] = x < y ? [x, y] : [y, x];
  const supabase = await createClient();
  const { error } = await supabase.from('doppioni_esclusi').insert({ a, b });
  if (error) tornaDoppioni({ errore: `Non salvato: ${error.message}` });
  tornaDoppioni({ ok: 'Segnate come persone diverse: la coppia non verrà più proposta.' });
}

/* ---------- Vista a colonne per stato: spostamento rapido (admin e direttori) ---------- */

export async function spostaStato(formData: FormData) {
  const id = testo(formData, 'id')!;
  const stato = valoreValido(STATI, formData.get('stato'));
  const ritorno = testo(formData, 'ritorno') ?? '/giocatori/stati';
  const dove = ritorno.startsWith('/giocatori/stati') ? ritorno : '/giocatori/stati';
  const sep = dove.includes('?') ? '&' : '?';
  if (!stato) redirect(`${dove}${sep}errore=${encodeURIComponent('Scegli uno stato.')}`);

  const supabase = await createClient();
  const { data, error } = await supabase.from('giocatori').update({ stato }).eq('id', id).select('id');
  if (error || !data?.length) redirect(`${dove}${sep}errore=${encodeURIComponent('Stato non aggiornato: possono cambiarlo solo admin e direttori.')}`);
  redirect(`${dove}${sep}ok=${encodeURIComponent(`Spostato in ${STATI[stato]}.`)}`);
}

/* ---------- Carriera (0035): società stagione per stagione ---------- */

/** Nuova società del giocatore: admin, direttori e scout (anche sui giocatori segnalati da altri) */
export async function cambiaSocieta(formData: FormData) {
  const id = testo(formData, 'id')!;
  const nome = testo(formData, 'societa');
  if (!nome) torna(id, { errore: 'Scrivi la nuova società.' });
  const supabase = await createClient();
  const societa = await trovaOCreaSocieta(supabase, await elencoSocieta(supabase), nome!);
  if (!societa) torna(id, { errore: 'Società non salvata: riprova.' });
  const { error } = await supabase.rpc('cambia_societa', {
    p_giocatore: id, p_societa: societa!.id, p_dal: testo(formData, 'dal'), p_nota: testoLungo(formData, 'nota'),
  });
  if (error) torna(id, { errore: `Società non cambiata: ${error.message}` });
  torna(id, { ok: `Nuova società: ${societa!.nome}. Il cambio è nella carriera.` });
}

/** Stagione passata aggiunta a mano (es. "2023/24 · Usmate · Pulcini") */
export async function aggiungiStagione(formData: FormData) {
  const id = testo(formData, 'id')!;
  const stagione = testo(formData, 'stagione');
  const nome = testo(formData, 'societa');
  if (!stagione || !/^\d{4}\/\d{2}$/.test(stagione) || !nome) torna(id, { errore: 'Scegli la stagione e scrivi la società.' });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const societa = await trovaOCreaSocieta(supabase, await elencoSocieta(supabase), nome!);
  const { error } = await supabase.from('carriera').insert({
    giocatore_id: id, societa_id: societa?.id ?? null, societa_nome: societa?.nome ?? nome!.trim(), stagione,
    categoria: testo(formData, 'categoria'), nota: testoLungo(formData, 'nota'), origine: 'manuale', autore_id: user?.id,
  });
  if (error) torna(id, { errore: `Stagione non salvata: ${error.message}` });
  torna(id, { ok: `Stagione ${stagione} aggiunta alla carriera.` });
}

export async function eliminaStagione(formData: FormData) {
  const id = testo(formData, 'id')!;
  const supabase = await createClient();
  const { data, error } = await supabase.from('carriera').delete().eq('id', intero(formData, 'riga') ?? 0).select('id');
  if (error) torna(id, { errore: `Riga non eliminata: ${error.message}` });
  if (!data?.length) torna(id, { errore: 'Puoi togliere solo le righe che hai scritto tu.' });
  torna(id, { ok: 'Riga tolta dalla carriera.' });
}

/** Elimina una valutazione: chi l'ha scritta, admin e direttori (regole 0018) */
export async function eliminaValutazione(formData: FormData) {
  const id = testo(formData, 'id')!;
  const supabase = await createClient();
  const { data, error } = await supabase.from('valutazioni').delete().eq('id', testo(formData, 'valutazione')!).select('id');
  if (error) torna(id, { errore: `Valutazione non eliminata: ${error.message}` });
  if (!data?.length) torna(id, { errore: 'Solo admin, direttori e chi l’ha scritta eliminano una valutazione.' });
  torna(id, { ok: 'Valutazione eliminata.' });
}
