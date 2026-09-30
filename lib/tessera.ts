// Tessera del mister (tappa 3), la parte che cifra e legge il cookie: AES-GCM con chiave da SEGRETO_SESSIONE (solo variabile
// d'ambiente, almeno 32 caratteri), dentro il PIN e l'ora dell'accesso, valida al massimo ORE_ACCESSO ore. Niente Next né
// database: la usano il proxy (lib/supabase/sessione.ts), l'accesso (app/auth/actions.ts), lib/mister.ts e le prove.
import { ORE_ACCESSO } from '@/lib/supabase/durata';

export const COOKIE_MISTER = 'acm_mister';

export type Tessera = { pin: string; t: number };

const base64url = (b: Uint8Array) => btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const daBase64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

async function chiave() {
  const segreto = process.env.SEGRETO_SESSIONE;
  if (!segreto || segreto.length < 32) return null;
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(segreto));
  return crypto.subtle.importKey('raw', h, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

/** Valore del cookie per questo PIN (null se manca SEGRETO_SESSIONE) */
export async function creaTessera(pin: string) {
  const k = await chiave();
  if (!k) return null;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const dati = new TextEncoder().encode(JSON.stringify({ pin, t: Math.floor(Date.now() / 1000) } satisfies Tessera));
  const cifrato = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k, dati));
  const tutto = new Uint8Array(iv.length + cifrato.length);
  tutto.set(iv); tutto.set(cifrato, iv.length);
  return base64url(tutto);
}

/** Tessera valida e non scaduta (null se manca, è alterata o ha più di ORE_ACCESSO ore). Non chiede nulla al database:
 *  la usa anche il proxy per lasciar passare il mister */
export async function leggiTessera(valore: string | undefined): Promise<Tessera | null> {
  if (!valore) return null;
  const k = await chiave();
  if (!k) return null;
  try {
    const tutto = daBase64url(valore);
    const chiaro = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: tutto.slice(0, 12) }, k, tutto.slice(12));
    const t = JSON.parse(new TextDecoder().decode(chiaro)) as Tessera;
    if (typeof t.pin !== 'string' || !(Date.now() / 1000 - t.t < ORE_ACCESSO * 3600)) return null;
    return t;
  } catch {
    return null;
  }
}

/** Impostazioni del cookie: di sessione (sparisce chiudendo il browser), mai leggibile dalla pagina */
export const opzioniCookieMister = {
  httpOnly: true, sameSite: 'lax' as const, path: '/', secure: process.env.NODE_ENV === 'production',
};

/** Cifra un testo con la stessa chiave (SEGRETO_SESSIONE): es. il token di Google Calendar salvato nel database (0049).
 *  Null se manca il segreto */
export async function cifraTesto(testo: string) {
  const k = await chiave();
  if (!k) return null;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cifrato = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k, new TextEncoder().encode(testo)));
  const tutto = new Uint8Array(iv.length + cifrato.length);
  tutto.set(iv); tutto.set(cifrato, iv.length);
  return base64url(tutto);
}

/** Il testo di cifraTesto (null se manca il segreto o il valore è alterato) */
export async function decifraTesto(valore: string) {
  const k = await chiave();
  if (!k) return null;
  try {
    const tutto = daBase64url(valore);
    return new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: tutto.slice(0, 12) }, k, tutto.slice(12)));
  } catch {
    return null;
  }
}
