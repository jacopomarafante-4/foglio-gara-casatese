// Calendario del Portale nell'app (tappa 3): stesse regole di portale.js e organizzazione.js (vista Giorno come Google
// Calendar, elenco per mese, eventi della società). Solo funzioni pure: le usano le pagine /calendari/… e le prove.
import { etaSquadra, fmtData, giorno, siglaSquadra, type Evento, type Impegno, type SquadraCal } from '@/lib/programma';

export const TIPI_EVENTO = ['Torneo organizzato', 'Open day', 'Festa', 'Riunione', 'Altro'];
export const LUOGHI_EVENTO: Record<string, string> = { merate: 'Campo di Merate', cernusco: 'Campo di Cernusco', altro: 'Altrove' };
const MESI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];

export const meseDi = (ym: string) => { const [y, m] = ym.split('-'); return `${MESI[+m - 1]} ${y}`; };
export const giornoLungo = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
export const quando = (m: Impegno) => (m.date || '') + (m.time || '').padStart(5, '0');
export const inOrdine = <T extends Impegno>(ms: T[]) => ms.slice().sort((a, b) => quando(a).localeCompare(quando(b)));
/** Nel calendario solo le partite da giocare (quelle senza data restano); le giocate vanno nello storico */
export const daGiocare = (m: Impegno, oggi: string) => !m.date || m.date >= oggi;
export const tipoPartita = (m: Impegno) => (m.friendly ? m.tipo || 'Amichevole' : '');

/** Riga di "Tutte le squadre": "U11 · Fc Milanese" (casa o trasferta la dice il colore); della propria: "Academy - Lecco" */
export const nomePartita = (m: Impegno, tutte: boolean, nomeSquadra = 'Academy') => m.evento ? m.opponent || 'Evento'
  : tutte ? `${siglaSquadra(m.team)} · ${m.opponent || 'Avversario'}`
    : m.home ? `${nomeSquadra} - ${m.opponent || 'Avversario'}` : `${m.opponent || 'Avversario'} - ${nomeSquadra}`;

export const squadreTesto = (ids: string[] | undefined, squadre: SquadraCal[]) => (ids ?? []).length
  ? ids!.map((id) => siglaSquadra(squadre.find((t) => t.id === id))).filter(Boolean).join(', ') : 'Tutta la società';

/* ---------- Vista a giornata: una colonna per calendario, ore in verticale ----------
   Si conosce solo l'inizio della gara: il blocco dura in modo indicativo 60' (fino a U10), 75' (U11–U13), 90' (dopo). */
export const minuti = (t?: string) => { const [h, m] = (t || '').split(':').map(Number); return h * 60 + (m || 0); };
export const durataPartita = (m: Impegno) => {
  if (m.evento) return Math.max(minuti(m.fine) - minuti(m.time), 0) || 120;
  const e = etaSquadra(m.team); return e <= 10 ? 60 : e <= 13 ? 75 : 90;
};
export type Blocco = { m: Impegno; inizio: number; fine: number; corsia: number; corsie: number };
/** Partite che si accavallano nella stessa colonna: affiancate, come in Google Calendar */
export function corsie(evs: Omit<Blocco, 'corsia' | 'corsie'>[]): Blocco[] {
  const out = evs.map((e) => ({ ...e, corsia: 0, corsie: 1 })).sort((a, b) => a.inizio - b.inizio || b.fine - a.fine);
  let gruppo: Blocco[] = [], fineGruppo = -1;
  const chiudi = () => { const n = Math.max(...gruppo.map((e) => e.corsia)) + 1; gruppo.forEach((e) => { e.corsie = n; }); gruppo = []; };
  for (const e of out) {
    if (gruppo.length && e.inizio >= fineGruppo) chiudi();
    const occupate = gruppo.filter((x) => x.fine > e.inizio).map((x) => x.corsia);
    while (occupate.includes(e.corsia)) e.corsia++;
    gruppo.push(e); fineGruppo = Math.max(fineGruppo, e.fine);
  }
  if (gruppo.length) chiudi();
  return out;
}

/** Testo proposto per l'avviso di un evento ("Scrivi un avviso per questo evento") */
export function testoEvento(ev: Evento, squadre: SquadraCal[]) {
  const luogo = ev.luogo === 'altro' ? ev.indirizzo || 'luogo da definire' : LUOGHI_EVENTO[ev.luogo ?? 'merate'];
  return `📣 ${(ev.titolo || 'Evento').toUpperCase()}\n${ev.data ? giorno(ev.data) + ' ' + fmtData(ev.data) : ''}${ev.inizio ? ' dalle ' + ev.inizio : ''}${ev.fine ? ' alle ' + ev.fine : ''}\n📍 ${luogo}\nSquadre: ${squadreTesto(ev.squadre, squadre)}${ev.note ? '\n' + ev.note : ''}`;
}

/** Id nuovo, come uid() del Portale */
export const nuovoId = (prefisso: string) => prefisso + Math.random().toString(36).slice(2, 9);

/* ---------- Preparatori dei portieri: i portieri delle squadre e la loro convocazione (chipsPortieri del Portale) ---------- */
export const ETICHETTE_CONVOCAZIONE: Record<string, string> = { CON: 'Convocato', NC: 'Non convocato', INF: 'Infortunato', SQL: 'Squalificato', ND: 'Non disponibile' };
export type FoglioConvocazioni = { date?: string; opponent?: string; calId?: string; callup?: Record<string, string>;
  adb?: { partite?: { date?: string; opponent?: string; calId?: string; conv?: string[] }[] } };
const stessaPartita = (x: { calId?: string; date?: string; opponent?: string }, m: Impegno) => (!!x.calId && x.calId === m.id)
  || (x.date === m.date && (x.opponent || '').trim().toLowerCase() === (m.opponent || '').trim().toLowerCase());
/** CON/NC/INF/SQL/ND dalla convocazione della partita, '' se il mister non l'ha ancora fatta */
export function statoPortiere(sh: FoglioConvocazioni, m: Impegno, pid: string) {
  const pa = (sh.adb?.partite ?? []).find((x) => stessaPartita(x, m));
  if (pa) return (pa.conv ?? []).includes(pid) ? 'CON' : 'NC';
  if (sh.date && stessaPartita(sh, m)) return (sh.callup ?? {})[pid] || '';
  return '';
}
