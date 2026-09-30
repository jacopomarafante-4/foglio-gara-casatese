'use server';
// Google Calendar collegato dall'app (0049), azioni dell'admin nel Calendario → Tutte le squadre: elenco dei calendari
// dell'account collegato, scelta di Merate/Cernusco/Trasferta, scollega. I permessi li ricontrolla il database.
import { getProfilo } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { CALENDARI, elencoCalendari, type Calendario } from '@/lib/google-calendar';
import { leggiCollegamento } from '@/lib/google-collegato';
import { accessoDaRinnovo } from '@/lib/google-oauth';
import { decifraTesto } from '@/lib/tessera';

type Esito<T = undefined> = { ok: boolean; errore?: string; valore?: T };
const soloAdmin = async () => (await getProfilo())?.ruolo === 'admin';

/** I calendari dell'account collegato, con quelli già scelti */
export async function calendariGoogle(): Promise<Esito<{ elenco: { id: string; nome: string; scrive: boolean }[]; scelti: Partial<Record<Calendario, string>> }>> {
  if (!(await soloAdmin())) return { ok: false, errore: 'Solo l’admin.' };
  const riga = await leggiCollegamento(await createClient());
  const rinnovo = riga?.token_cifrato ? await decifraTesto(riga.token_cifrato) : null;
  if (!rinnovo) return { ok: false, errore: 'Google Calendar non è collegato.' };
  try {
    const elenco = await elencoCalendari({ token: () => accessoDaRinnovo(rinnovo) });
    return { ok: true, valore: { elenco: elenco.map(({ id, nome, scrive }) => ({ id, nome, scrive })), scelti: riga?.calendari ?? {} } };
  } catch (e) {
    return { ok: false, errore: e instanceof Error ? e.message : 'Google non risponde.' };
  }
}

/** Salva i tre calendari scelti */
export async function scegliCalendari(scelti: Partial<Record<Calendario, string>>): Promise<Esito> {
  if (!(await soloAdmin())) return { ok: false, errore: 'Solo l’admin.' };
  const pulito = Object.fromEntries(CALENDARI.filter((c) => typeof scelti[c] === 'string' && scelti[c]).map((c) => [c, scelti[c]]));
  const { error } = await (await createClient()).rpc('google_salva', { p_token_cifrato: null, p_account: null, p_calendari: pulito });
  return error ? { ok: false, errore: error.message } : { ok: true };
}

/** Scollega Google Calendar (il permesso si toglie anche dall'account Google: myaccount.google.com → Sicurezza) */
export async function scollegaGoogle(): Promise<Esito> {
  if (!(await soloAdmin())) return { ok: false, errore: 'Solo l’admin.' };
  const { error } = await (await createClient()).rpc('google_scollega');
  return error ? { ok: false, errore: error.message } : { ok: true };
}
