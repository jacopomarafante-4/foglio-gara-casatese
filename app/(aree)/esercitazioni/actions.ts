'use server';
// Esercitazioni (0052): crea, salva, duplica ed elimina un esercizio. Solo l'admin (lo ricontrolla il database: RLS is_admin()).
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { chiEntra } from '@/lib/portale-dati';
import { createClient } from '@/lib/supabase/server';
import { CAMPI_SALVATI, esercizioVuoto, type Esercizio } from '@/lib/esercizi';

type Esito = { ok: boolean; errore?: string };
const nuovoId = (p: string) => p + Math.random().toString(36).slice(2, 9);

async function admin() {
  const chi = await chiEntra();
  if (chi.profilo?.ruolo !== 'admin') return null;
  return { autore: [chi.profilo.nome, chi.profilo.cognome].filter(Boolean).join(' ') || 'Admin', id: chi.profilo.id, db: await createClient() };
}

export async function creaEsercizio() {
  const a = await admin();
  if (!a) redirect('/inizio');
  const { data, error } = await a.db.from('esercizi').insert({ ...esercizioVuoto(nuovoId), autore: a.autore, autore_id: a.id }).select('id').single();
  if (error) redirect(`/esercitazioni?errore=${encodeURIComponent('Esercizio non creato: ' + error.message)}`);
  redirect(`/esercitazioni/${data.id}`);
}

/** Salva i campi cambiati (solo quelli della scheda) */
export async function salvaEsercizio(id: string, campi: Partial<Esercizio>): Promise<Esito> {
  const a = await admin();
  if (!a) return { ok: false, errore: 'Solo l’admin modifica le esercitazioni.' };
  const dati = Object.fromEntries(Object.entries(campi).filter(([k]) => (CAMPI_SALVATI as readonly string[]).includes(k)));
  if ('titolo' in dati && !String(dati.titolo ?? '').trim()) return { ok: false, errore: 'Scrivi il titolo.' };
  const { error } = await a.db.from('esercizi').update({ ...dati, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) return { ok: false, errore: error.message };
  revalidatePath('/esercitazioni');
  return { ok: true };
}

/** Duplica / Usa come modello: copia con "da" = l'originale, così l'autore di partenza resta visibile */
export async function duplicaEsercizio(formData: FormData) {
  const a = await admin();
  if (!a) redirect('/inizio');
  const id = String(formData.get('id') ?? '');
  const { data: e } = await a.db.from('esercizi').select('*').eq('id', id).single();
  if (!e) redirect('/esercitazioni?errore=Esercizio non trovato');
  const copia = Object.fromEntries(CAMPI_SALVATI.map((k) => [k, (e as Record<string, unknown>)[k]]));
  const { data, error } = await a.db.from('esercizi')
    .insert({ ...copia, titolo: `${e.titolo} (copia)`, da: e.id, autore: a.autore, autore_id: a.id }).select('id').single();
  if (error) redirect(`/esercitazioni/${id}?errore=${encodeURIComponent('Non duplicato: ' + error.message)}`);
  redirect(`/esercitazioni/${data.id}?ok=${encodeURIComponent('Copia creata: ora puoi adattarla')}`);
}

export async function eliminaEsercizio(formData: FormData) {
  const a = await admin();
  if (!a) redirect('/inizio');
  const { error } = await a.db.from('esercizi').delete().eq('id', String(formData.get('id') ?? ''));
  if (error) redirect(`/esercitazioni?errore=${encodeURIComponent('Non eliminato: ' + error.message)}`);
  revalidatePath('/esercitazioni');
  redirect('/esercitazioni?ok=Esercizio eliminato');
}
