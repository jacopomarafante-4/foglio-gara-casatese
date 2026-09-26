'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { elencoSocieta, trovaOCreaSocieta } from '@/lib/societa';
import { testo, testoLungo } from '@/lib/utili';

const TIPI = ['squadra', 'torneo', 'partita', 'giocatore', 'altro'];

/** Torna alla pagina da cui si è partiti (Home, scheda del giocatore, Gare), con il messaggio */
function esito(msg: { ok?: string; errore?: string }, ritorno = '/home'): never {
  const [k, v] = msg.errore ? ['errore', msg.errore] : ['ok', msg.ok ?? ''];
  const dove = /^\/(home|gare|giocatori\/[\w-]+)$/.test(ritorno) ? ritorno : '/home';
  redirect(`${dove}?${k}=${encodeURIComponent(v)}${dove === '/home' ? '#incarichi' : ''}`);
}

/** Chi ha affidato e a chi: campi comuni a tutti gli incarichi creati da un direttore */
async function affidamento(supabase: Awaited<ReturnType<typeof createClient>>, persona: string | null) {
  if (!persona) return {};
  const { data } = await supabase.auth.getUser();
  return { assegnato_a: persona, preso_il: new Date().toISOString(), affidato_da: data.user?.id ?? null };
}

/** Nuovo incarico (admin e direttori: lo controlla il database, 0024) */
export async function creaIncarico(fd: FormData) {
  const titolo = testo(fd, 'titolo');
  if (!titolo) esito({ errore: 'Scrivi cosa c’è da fare.' });
  const supabase = await createClient();
  const nomeSocieta = testo(fd, 'societa');
  const societa = nomeSocieta ? await trovaOCreaSocieta(supabase, await elencoSocieta(supabase), nomeSocieta) : null;
  const tipo = String(fd.get('tipo') ?? '');
  const { error } = await supabase.from('incarichi').insert({
    titolo,
    tipo: TIPI.includes(tipo) ? tipo : 'altro',
    societa_id: societa?.id ?? null,
    categoria: testo(fd, 'categoria'),
    quando: testo(fd, 'quando'),
    dettagli: testoLungo(fd, 'dettagli'),
    ...(await affidamento(supabase, testo(fd, 'persona'))),
  });
  if (error) esito({ errore: `Incarico non salvato: ${error.message}` });
  esito({ ok: testo(fd, 'persona') ? 'Incarico aggiunto e affidato.' : 'Incarico aggiunto.' });
}

/** Affida (o riaffida, o libera) un incarico esistente: admin e direttori */
export async function affidaIncarico(fd: FormData) {
  const supabase = await createClient();
  const persona = testo(fd, 'persona');
  const { error } = await supabase
    .from('incarichi')
    .update(persona ? await affidamento(supabase, persona) : { assegnato_a: null, preso_il: null, affidato_da: null })
    .eq('id', testo(fd, 'id'));
  if (error) esito({ errore: `Incarico non affidato: ${error.message}` });
  esito({ ok: persona ? 'Incarico affidato.' : 'Incarico di nuovo libero.' });
}

/** Dalla pagina Gare: affida una partita (incarico + la persona segnata su "Ci va") */
export async function affidaGara(fd: FormData) {
  const supabase = await createClient();
  const garaId = testo(fd, 'gara_id');
  const persona = testo(fd, 'persona');
  if (!garaId || !persona) esito({ errore: 'Scegli a chi affidare la partita.' }, '/gare');
  const { data: g } = await supabase.from('gare').select('id, data_ora, categoria, casa_nome, trasferta_nome, casa_id').eq('id', garaId).single();
  if (!g) esito({ errore: 'Partita non trovata.' }, '/gare');
  const quando = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(new Date(g.data_ora));
  const { error } = await supabase.from('incarichi').insert({
    titolo: `${g.casa_nome} – ${g.trasferta_nome}`,
    tipo: 'partita', gara_id: g.id, categoria: g.categoria, quando, societa_id: g.casa_id,
    dettagli: testoLungo(fd, 'dettagli'),
    ...(await affidamento(supabase, persona)),
  });
  if (error) esito({ errore: `Partita non affidata: ${error.message}` }, '/gare');
  await supabase.from('gare_osservatori').upsert({ gara_id: g.id, profilo_id: persona }, { onConflict: 'gara_id,profilo_id', ignoreDuplicates: true });
  esito({ ok: 'Partita affidata: la trovi negli incarichi in Home.' }, '/gare');
}

/** Dalla scheda del giocatore: affida il giocatore da andare a vedere */
export async function affidaGiocatore(fd: FormData) {
  const supabase = await createClient();
  const id = testo(fd, 'giocatore_id');
  const persona = testo(fd, 'persona');
  const ritorno = `/giocatori/${id}`;
  if (!id || !persona) esito({ errore: 'Scegli a chi affidare il giocatore.' }, ritorno);
  const { data: g } = await supabase.from('giocatori').select('id, cognome, nome, descrizione, annata, categoria, societa_id').eq('id', id).single();
  if (!g) esito({ errore: 'Giocatore non trovato.' }, ritorno);
  const nome = [g.cognome, g.nome].filter(Boolean).join(' ') || g.descrizione || 'giocatore';
  const { error } = await supabase.from('incarichi').insert({
    titolo: `Vedere ${nome} (${g.annata})`,
    tipo: 'giocatore', giocatore_id: g.id, societa_id: g.societa_id, categoria: g.categoria,
    quando: testo(fd, 'quando'), dettagli: testoLungo(fd, 'dettagli'),
    ...(await affidamento(supabase, persona)),
  });
  if (error) esito({ errore: `Giocatore non affidato: ${error.message}` }, ritorno);
  esito({ ok: 'Giocatore affidato: l’incarico è in Home.' }, ritorno);
}

export async function eliminaIncarico(fd: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from('incarichi').delete().eq('id', testo(fd, 'id'));
  if (error) esito({ errore: `Incarico non eliminato: ${error.message}` });
  esito({ ok: 'Incarico eliminato.' });
}

export async function prendiIncarico(fd: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.rpc('prendi_incarico', { p_id: testo(fd, 'id') });
  if (error) esito({ errore: error.message });
  esito({ ok: 'Incarico preso: te ne occupi tu.' });
}

export async function lasciaIncarico(fd: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.rpc('lascia_incarico', { p_id: testo(fd, 'id') });
  if (error) esito({ errore: error.message });
  esito({ ok: 'Incarico lasciato: ora è di nuovo libero.' });
}

export async function chiudiIncarico(fd: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.rpc('chiudi_incarico', { p_id: testo(fd, 'id'), p_esito: testoLungo(fd, 'esito') ?? '' });
  if (error) esito({ errore: error.message });
  esito({ ok: 'Incarico segnato come fatto.' });
}
