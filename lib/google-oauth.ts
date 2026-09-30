// "Collega a Google Calendar" (OAuth di Google, solo sul server): l'admin entra con l'account dei calendari e dà il permesso;
// Google restituisce un token di rinnovo, che si salva cifrato nel database (0049, lib/tessera.ts cifraTesto) e dà a ogni
// richiesta un token di accesso di un'ora. Credenziali dell'app in GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET (solo variabili
// d'ambiente: file scaricato dalla Google Cloud Console, mai nel codice).
import { CALENDARI, type Calendario, type Google } from '@/lib/google-calendar';
import { decifraTesto } from '@/lib/tessera';

/** Permessi chiesti a Google: eventi dei calendari e l'elenco dei calendari (per scegliere Merate, Cernusco, Trasferta) */
const PERMESSI = ['https://www.googleapis.com/auth/calendar.events', 'https://www.googleapis.com/auth/calendar.calendarlist.readonly'];

/** Cookie col codice casuale tra /api/google/collega e /api/google/ritorno */
export const COOKIE_STATO = 'acm_google_stato';

export const oauthConfigurato = () => !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET && !!process.env.SEGRETO_SESSIONE;

/** Pagina di Google dove si dà il permesso; `ritorno` = indirizzo di /api/google/ritorno su questo sito */
export function urlConsenso(ritorno: string, stato: string) {
  return 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!, redirect_uri: ritorno, response_type: 'code', scope: PERMESSI.join(' '),
    access_type: 'offline', prompt: 'consent', include_granted_scopes: 'true', state: stato,
  });
}

async function chiediToken(parametri: Record<string, string>) {
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!, ...parametri }),
  });
  const j = await r.json();
  if (!r.ok) {
    if (j.error === 'invalid_grant') throw new Error('Il collegamento con Google non vale più: l’admin deve ricollegarlo.');
    throw new Error(`Google non ha dato l'accesso: ${j.error_description ?? j.error ?? r.status}`);
  }
  return j as { access_token: string; expires_in: number; refresh_token?: string; scope?: string };
}

/** Dopo il permesso: il codice di Google diventa token di rinnovo (da salvare) e token di accesso */
export async function scambiaCodice(codice: string, ritorno: string) {
  const j = await chiediToken({ grant_type: 'authorization_code', code: codice, redirect_uri: ritorno });
  if (!j.refresh_token) throw new Error('Google non ha dato il permesso permanente: scollega l’app dal tuo account Google e riprova.');
  const mancano = PERMESSI.filter((p) => !(j.scope ?? '').split(' ').includes(p));
  if (mancano.length) throw new Error('Non hai dato tutti i permessi richiesti: riprova e lascia le caselle spuntate.');
  return { rinnovo: j.refresh_token, accesso: j.access_token };
}

/* token di accesso tenuti in memoria (~50 minuti) per token di rinnovo */
const inMemoria = new Map<string, { valore: string; scade: number }>();
export async function accessoDaRinnovo(rinnovo: string) {
  const t = inMemoria.get(rinnovo);
  if (t && t.scade > Date.now()) return t.valore;
  const j = await chiediToken({ grant_type: 'refresh_token', refresh_token: rinnovo });
  inMemoria.set(rinnovo, { valore: j.access_token, scade: Date.now() + Math.min(50 * 60, j.expires_in - 120) * 1000 });
  return j.access_token;
}

/** Il collegamento salvato (0049, da google_leggi) come `Google` pronto; null se manca, se il token non si decifra o se
 *  non sono ancora scelti tutti e tre i calendari */
export async function daCollegamento(riga: { token_cifrato?: string; calendari?: Partial<Record<Calendario, string>> } | null): Promise<Google | null> {
  if (!riga?.token_cifrato || !oauthConfigurato()) return null;
  const cal = riga.calendari ?? {};
  if (!CALENDARI.every((c) => !!cal[c])) return null;
  const rinnovo = await decifraTesto(riga.token_cifrato);
  if (!rinnovo) return null;
  return { token: () => accessoDaRinnovo(rinnovo), id: (c) => cal[c]! };
}

/** Proposta automatica dei tre calendari dal loro nome ("MERATE", "Academy - Cernusco", "Trasferte"…) */
export function proponiCalendari(elenco: { id: string; nome: string }[]): Partial<Record<Calendario, string>> {
  const out: Partial<Record<Calendario, string>> = {};
  for (const c of CALENDARI) {
    const radice = c === 'TRASFERTA' ? 'TRASFERT' : c;
    const trovati = elenco.filter((x) => x.nome.toUpperCase().includes(radice));
    if (trovati.length === 1) out[c] = trovati[0].id;
  }
  return out;
}
