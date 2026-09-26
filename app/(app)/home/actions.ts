'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { elencoSocieta, trovaOCreaSocieta } from '@/lib/societa';
import { testo, testoLungo } from '@/lib/utili';

const TIPI = ['squadra', 'torneo', 'partita', 'altro'];

function esito(msg: { ok?: string; errore?: string }): never {
  const [k, v] = msg.errore ? ['errore', msg.errore] : ['ok', msg.ok ?? ''];
  redirect(`/home?${k}=${encodeURIComponent(v)}#incarichi`);
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
  });
  if (error) esito({ errore: `Incarico non salvato: ${error.message}` });
  esito({ ok: 'Incarico aggiunto.' });
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
