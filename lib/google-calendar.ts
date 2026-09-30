// Google Calendar (solo sul server): legge, crea, modifica e cancella eventi dei tre calendari della società. Due modi di
// collegarsi, entrambi senza segreti nel codice (repository pubblico):
// - dall'app, "Collega a Google Calendar" (OAuth, lib/google-oauth.ts): token di rinnovo cifrato nel database (0049) e
//   calendari scelti dall'admin; servono GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET;
// - account di servizio (vecchio modo): GOOGLE_SERVICE_ACCOUNT (il file JSON di Google, intero) e GCAL_ID_MERATE/CERNUSCO/TRASFERTA.
// Ogni funzione riceve il collegamento da usare (`Google`), scelto da chi chiama (app/api/calendario-google/route.ts).
import { createSign } from 'node:crypto';

export type Calendario = 'MERATE' | 'CERNUSCO' | 'TRASFERTA';
export const CALENDARI: Calendario[] = ['MERATE', 'CERNUSCO', 'TRASFERTA'];

export type EventoGoogle = {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  status?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  recurringEventId?: string;
};

/** Un collegamento pronto: come avere il token di accesso e l'id Google di ogni calendario */
export type Google = { token: () => Promise<string>; id: (c: Calendario) => string };

/** Account di servizio dalle variabili d'ambiente (null se mancano) */
export function daAccountDiServizio(): Google | null {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT || !CALENDARI.every((c) => !!process.env[`GCAL_ID_${c}`])) return null;
  return { token: accessoServizio, id: (c) => process.env[`GCAL_ID_${c}`]! };
}

let tokenServizio: { valore: string; scade: number } | null = null;
const b64url = (s: Buffer | string) => Buffer.from(s).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

/** Token OAuth dell'account di servizio (JWT firmato con la chiave privata), tenuto in memoria per ~50 minuti */
async function accessoServizio() {
  if (tokenServizio && tokenServizio.scade > Date.now()) return tokenServizio.valore;
  const sa = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT!);
  const ora = Math.floor(Date.now() / 1000);
  const corpo = `${b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${b64url(JSON.stringify({
    iss: sa.client_email, scope: 'https://www.googleapis.com/auth/calendar',
    aud: 'https://oauth2.googleapis.com/token', iat: ora, exp: ora + 3600,
  }))}`;
  const firma = b64url(createSign('RSA-SHA256').update(corpo).sign(sa.private_key));
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${corpo}.${firma}` }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`Google non ha dato l'accesso: ${j.error_description ?? j.error ?? r.status}`);
  tokenServizio = { valore: j.access_token, scade: Date.now() + 50 * 60 * 1000 };
  return tokenServizio.valore;
}

async function chiama(g: Pick<Google, 'token'>, metodo: string, percorso: string, corpo?: unknown) {
  const r = await fetch(`https://www.googleapis.com/calendar/v3${percorso}`, {
    method: metodo,
    headers: { Authorization: `Bearer ${await g.token()}`, 'Content-Type': 'application/json' },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  if (r.status === 204 || r.status === 410) return null;   // cancellato (o già cancellato)
  const j = await r.json();
  if (!r.ok) throw new Error(`Google Calendar: ${j.error?.message ?? r.status}`);
  return j;
}

/** I calendari dell'account collegato (per scegliere Merate, Cernusco e Trasferta); `principale` = quello dell'account */
export async function elencoCalendari(g: Pick<Google, 'token'>): Promise<{ id: string; nome: string; principale: boolean; scrive: boolean }[]> {
  const j = await chiama(g, 'GET', '/users/me/calendarList?maxResults=250');
  return ((j?.items ?? []) as { id: string; summary?: string; summaryOverride?: string; primary?: boolean; accessRole?: string }[])
    .map((c) => ({ id: c.id, nome: c.summaryOverride || c.summary || c.id, principale: !!c.primary, scrive: c.accessRole === 'owner' || c.accessRole === 'writer' }));
}

/** Eventi singoli (le ripetizioni, cioè gli allenamenti, si espandono ma poi si scartano) tra due date */
export async function leggiEventi(g: Google, cal: Calendario, dal: string, al: string) {
  const eventi: EventoGoogle[] = [];
  let pagina: string | undefined;
  do {
    const q = new URLSearchParams({ timeMin: `${dal}T00:00:00Z`, timeMax: `${al}T23:59:59Z`, singleEvents: 'true',
      orderBy: 'startTime', maxResults: '2500', timeZone: 'Europe/Rome', ...(pagina ? { pageToken: pagina } : {}) });
    const j = await chiama(g, 'GET', `/calendars/${encodeURIComponent(g.id(cal))}/events?${q}`);
    eventi.push(...(j.items ?? []));
    pagina = j.nextPageToken;
  } while (pagina);
  return eventi;
}

export type DatiEvento = { titolo: string; data: string; inizio?: string; fine?: string; minuti?: number; luogo?: string; descrizione?: string };
const giornoDopo = (d: string) => { const x = new Date(`${d}T12:00:00Z`); x.setUTCDate(x.getUTCDate() + 1); return x.toISOString().slice(0, 10); };
function corpoEvento(d: DatiEvento) {
  const oraFine = (ini: string, min: number) => { const [h, m] = ini.split(':').map(Number); const t = h * 60 + m + min; return `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; };
  const quando = d.inizio
    ? { start: { dateTime: `${d.data}T${d.inizio}:00`, timeZone: 'Europe/Rome' },
        end: { dateTime: `${d.data}T${d.fine || oraFine(d.inizio, d.minuti ?? 90)}:00`, timeZone: 'Europe/Rome' } }
    : { start: { date: d.data }, end: { date: giornoDopo(d.data) } };   // tutto il giorno: la fine è il giorno dopo (esclusa)
  return { summary: d.titolo, location: d.luogo || undefined, description: d.descrizione || undefined, ...quando };
}
export async function creaEvento(g: Google, cal: Calendario, d: DatiEvento): Promise<string> {
  const j = await chiama(g, 'POST', `/calendars/${encodeURIComponent(g.id(cal))}/events`, corpoEvento(d));
  return j.id;
}
export async function aggiornaEvento(g: Google, cal: Calendario, id: string, d: DatiEvento) {
  await chiama(g, 'PATCH', `/calendars/${encodeURIComponent(g.id(cal))}/events/${encodeURIComponent(id)}`, corpoEvento(d));
}
export async function cancellaEvento(g: Google, cal: Calendario, id: string) {
  await chiama(g, 'DELETE', `/calendars/${encodeURIComponent(g.id(cal))}/events/${encodeURIComponent(id)}`);
}
