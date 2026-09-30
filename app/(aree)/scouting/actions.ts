'use server';
// Scouting dei mister: segnalazione (coach_segnala) e valutazione (coach_valuta) col PIN della tessera. I controlli veri li
// fa il database (0047: se il giocatore è già in lista risponde "esistente" e si apre la valutazione).
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getMister } from '@/lib/mister';
import { erroreCoach } from '@/lib/scouting-mister';
import { AREE, DETTAGLI_SEGNALAZIONE, DETTAGLI_VALUTAZIONE } from '@/lib/tipi';
import { testo, testoLungo } from '@/lib/utili';

const campo = (formData: FormData, k: string) => String(formData.get(k) ?? '').trim();

export async function segnalaMister(formData: FormData) {
  const mister = await getMister();
  if (!mister) redirect('/');
  const errore = (msg: string): never => redirect(`/scouting/segnala?errore=${encodeURIComponent(msg)}`);
  if (!campo(formData, 'annata')) errore('Indica l’annata.');
  if (!campo(formData, 'cognome') && !campo(formData, 'descrizione')) errore('Serve il cognome oppure una descrizione per riconoscerlo.');

  // ruolo in due passi (0046): portiere, oppure la linea del giocatore di movimento ("movimento" se non indicata)
  const tipo = campo(formData, 'tipo');
  const dati: Record<string, string> = {
    ruolo: tipo === 'portiere' ? 'portiere' : tipo === 'movimento' ? campo(formData, 'linea') || 'movimento' : '',
  };
  for (const k of ['annata', 'cognome', 'nome', 'descrizione', 'societa', 'testo', 'contesto', 'data', 'piede', 'impressione',
    ...AREE.flatMap((a) => [a.chiave, `${a.chiave}_note`]), ...DETTAGLI_SEGNALAZIONE.map((d) => d.chiave)]) dati[k] = campo(formData, k);

  const { data, error } = await (await createClient()).rpc('coach_segnala', { p_pin: mister.pin, p_dati: dati });
  if (error) errore(erroreCoach(error, 'Segnalazione non inviata, riprova.'));
  const r = data as { esistente?: boolean; giocatore_id?: string; nome?: string; annata?: number; societa?: string } | null;
  if (r?.esistente && r.giocatore_id) {
    // già in lista: si valuta, con quello che si era scritto nel commento
    const q = new URLSearchParams({ gia: '1', nota: dati.testo, nome: r.nome ?? '', annata: String(r.annata ?? ''),
      ...(r.societa ? { societa: r.societa } : {}), ...(dati.contesto ? { contesto: dati.contesto } : {}), ...(dati.data ? { data: dati.data } : {}) });
    redirect(`/scouting/valuta/${r.giocatore_id}?${q}`);
  }
  redirect(`/scouting/segnala?ok=${encodeURIComponent('Segnalazione inviata allo scouting. Grazie!')}`);
}

export async function valutaMister(formData: FormData) {
  const mister = await getMister();
  if (!mister) redirect('/');
  const id = campo(formData, 'id');
  const dati: Record<string, string | null> = {
    giudizio: campo(formData, 'giudizio'), ruolo_preciso: campo(formData, 'ruolo_preciso'),
    contesto: testo(formData, 'contesto'), commento: testoLungo(formData, 'commento'), data: testo(formData, 'data'),
    ...Object.fromEntries(DETTAGLI_VALUTAZIONE.map((d) => [d.chiave, campo(formData, d.chiave)])),
  };
  const torna = (msg: string): never => {
    const q = new URLSearchParams({ errore: msg, nome: campo(formData, 'nome'), annata: campo(formData, 'annata') });
    redirect(`/scouting/valuta/${id}?${q}`);
  };
  if (!dati.giudizio) torna('Scegli il giudizio finale.');
  const { error } = await (await createClient()).rpc('coach_valuta', { p_pin: mister.pin, p_giocatore: id, p_dati: dati });
  if (error) torna(erroreCoach(error, 'Valutazione non salvata, riprova.'));
  redirect(`/scouting/giocatori?ok=${encodeURIComponent('Valutazione salvata. Grazie!')}`);
}
