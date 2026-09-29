// Calendari Google ↔ calendario del Portale: stesse regole di scripts/import-calendari/google.mjs.
// Da Google: gli eventi "U14 - 2013 - Avversario", "AdB - 2014 - …" diventano amichevoli/tornei della squadra
// dell'annata (gcal = id dell'evento, gcalCal = calendario); il campionato ufficiale non si tocca mai;
// nelle note niente contatti né telefoni. Verso Google: amichevoli, tornei ed eventi creati nell'app.
import { CALENDARI, type Calendario, type EventoGoogle, leggiEventi } from './google-calendar';
import { calendarioDi, etaCategoria } from './condivisi';

export type Partita = {
  id: string; date?: string; time?: string; opponent?: string; home?: boolean; venue?: string; address?: string; ll?: string;
  friendly?: boolean; tipo?: string; note?: string; garaId?: string; gcal?: string; gcalCal?: Calendario; stato?: string;
};
export type Squadra = { id: string; category?: string; name?: string; organizza?: boolean; vedeTutte?: boolean };

const CASA: Record<'MERATE' | 'CERNUSCO', { venue: string; address: string; ll: string }> = {
  MERATE: { venue: 'C.S. COMUNALE - MERATE', address: 'VIA BERGAMO 12', ll: '' },
  CERNUSCO: { venue: 'C.S. COMUNALE - CERNUSCO LOMBARDONE', address: 'VIA LANFRITTO MAGGIONI', ll: '45.695808,9.397728' },
};
const dataOra = (iso: string) => {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Rome', hourCycle: 'h23', year: 'numeric', month: '2-digit',
    day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
};
export const oggi = () => dataOra(new Date().toISOString()).date;
/** Fine della stagione: 30 giugno (da luglio in poi, dell'anno dopo) */
export const fineStagione = () => { const [a, m] = oggi().split('-').map(Number); return `${m >= 7 ? a + 1 : a}-06-30`; };
/** Età della categoria (regola comune col Portale); 0 = squadra senza età (organizzazione, preparatori): non va su Google */
export const etaSquadra = (t?: Squadra) => etaCategoria(t) ?? 0;
const norm = (s?: string) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase()
  .replace(/\b(A\.?S\.?D\.?|S\.?S\.?D\.?|G\.?S\.?O?\.?|POL\.?|C\.?S\.?C\.?|A\.?C\.?|U\.?S\.?D?\.?|CALCIO|\(.*\))/g, ' ').replace(/[^A-Z0-9]/g, '');
const stessoAvversario = (a?: string, b?: string) => { const x = norm(a), y = norm(b); return !!x && !!y && (x === y || x.includes(y) || y.includes(x)); };
const hhmm = (h: string, m: string) => `${h.padStart(2, '0')}:${m}`;
function inizio(desc: string) {
  const m = desc.match(/\bIN[IZ]+O?\s+(?:GARA\s+|PARTITA\s+)?ORE\s+(\d{1,2})[:.](\d{2})/i) ?? desc.match(/Orario di gioco:\s*(\d{1,2})[:.](\d{2})/i);
  if (m) return hhmm(m[1], m[2]);
  if (/(orario|programma)[^\n]*da (ricevere|definire)|da definire orario/i.test(desc)) return '';
  return null;
}
const nota = (desc: string) => desc.replace(/[‪‬]/g, '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').split('\n').map((r) => r.trim())
  .filter((r) => r && !/contatt|referente|\d[\d .]{7,}\d|\bORE\s+\d|orario di gioco|^livello$|inserito dal portale/i.test(r))
  .map((r) => r.replace(/!+$/, '').replace(/\s+/g, ' ')).join(' · ');

type DaGoogle = { gcal: string; gcalCal: Calendario; eta: number; ufficiale: boolean; date: string; time: string; opponent: string;
  home: boolean; location: string; note: string; tipo: string };

/** Le partite delle giovanili nei tre calendari, da oggi a fine stagione */
export async function partiteDaGoogle(): Promise<{ partite: DaGoogle[]; eventi: number }> {
  const dal = oggi(), al = fineStagione();
  const partite: DaGoogle[] = [], visti = new Set<string>();
  let eventi = 0;
  for (const cal of CALENDARI) {
    for (const e of await leggiEventi(cal, dal, al) as EventoGoogle[]) {
      eventi++;
      if (e.status === 'cancelled' || e.recurringEventId || visti.has(e.id)) continue;
      const t = (e.summary ?? '').match(/^\s*(U\s*\d{2}|AdB)\s*-\s*(\d{4})(?:\/\d{2})?\s*-\s*(.+?)\s*$/i);
      if (!t || /allenament/i.test(e.summary ?? '')) continue;
      const d = dataOra(e.start?.dateTime ?? `${e.start?.date}T12:00:00`);
      const desc = e.description ?? '', ora = inizio(desc), avversario = /^da trovare$/i.test(t[3]) ? 'Da trovare' : t[3];
      const doppione = `${t[2]}|${e.start?.dateTime ?? e.start?.date}|${avversario}|${desc}`;
      if (visti.has(doppione)) continue;
      visti.add(e.id); visti.add(doppione);
      const [a, m] = d.date.split('-').map(Number);
      partite.push({ gcal: e.id, gcalCal: cal, eta: (m >= 7 ? a + 1 : a) - Number(t[2]), ufficiale: /Orario di gioco:/i.test(desc),
        date: d.date, time: ora ?? (e.start?.dateTime ? d.time : ''), opponent: avversario, home: cal !== 'TRASFERTA',
        location: (e.location ?? '').trim(), note: nota(desc),
        tipo: /torneo|quadrangolare|triangolare|cup|memorial|finali/i.test(avversario) ? 'Torneo' : 'Amichevole' });
    }
  }
  return { partite, eventi };
}

/** Applica le partite di Google al calendario di una squadra: restituisce il nuovo elenco e i conteggi */
export function applica(team: Squadra, matches: Partita[], partite: DaGoogle[]) {
  const mie = partite.filter((p) => p.eta === etaSquadra(team));
  const out = structuredClone(matches);
  let aggiunte = 0, aggiornate = 0, tolte = 0;
  for (const p of mie) {
    if (out.some((x) => x.garaId && !!x.home === p.home && stessoAvversario(x.opponent, p.opponent) && (p.ufficiale || x.date === p.date))) continue;
    const luogo = p.home ? CASA[p.gcalCal as 'MERATE' | 'CERNUSCO'] : { venue: p.location, address: '', ll: '' };
    const dati: Partita = { id: '', date: p.date, time: p.time, opponent: p.opponent, home: p.home, ...luogo, friendly: !p.ufficiale,
      tipo: p.ufficiale ? '' : p.tipo, note: p.note, gcal: p.gcal, gcalCal: p.gcalCal };
    const m = out.find((x) => x.gcal === p.gcal);
    if (!m) { out.push({ ...dati, id: 'g' + Math.random().toString(36).slice(2, 9) }); aggiunte++; }
    else {
      const campi: Partial<Partita> = { ...dati }; delete campi.id;
      if (Object.entries(campi).some(([k, v]) => ((m as Record<string, unknown>)[k] ?? '') !== v)) { Object.assign(m, campi); aggiornate++; }
    }
  }
  // Tolte da Google (da oggi in poi): via anche dal Portale
  const ids = new Set(mie.map((p) => p.gcal)), dal = oggi();
  const resta = out.filter((x) => { if (!x.gcal || ids.has(x.gcal) || (x.date ?? '') < dal) return true; tolte++; return false; });
  return { matches: resta, aggiunte, aggiornate, tolte };
}

/** Titolo su Google di un'amichevole o di un torneo della squadra: "U14 - 2013 - Avversario", "AdB - 2014 - …" */
export function titoloPartita(team: Squadra, p: Partita) {
  const eta = etaSquadra(team), fine = Number(fineStagione().slice(0, 4));
  return `${eta && eta <= 13 ? 'AdB' : `U${eta}`} - ${fine - eta} - ${p.opponent || 'Da trovare'}`;
}
/** In quale calendario va: in casa Merate o Cernusco (dal campo), fuori Trasferta */
export const calendarioPartita = (p: Partita): Calendario => calendarioDi(p).toUpperCase() as Calendario;
