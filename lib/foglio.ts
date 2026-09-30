// Foglio della squadra per la partita (sheet/<squadra>), come nel Portale (defaultSheet in core.js): dati della partita,
// convocazioni (callup: pid → CON/NC/INF/SQL/ND), ritrovo, formazione, piazzati scelti. Attività di base: sheet.adb.partite
// (da 1 a 4 partite, ognuna con i suoi convocati). Regole pure, usate dalle pagine Dati partita e Convocazioni.
import type { Partita } from '@/lib/programma';

export type PartitaAdb = { id: string; calId: string; date: string; time: string; meetTime: string; opponent: string; home: boolean;
  venue: string; address: string; ll: string; meetAddress: string; mr: string; note: string; conv: string[] };
export type FoglioPartita = {
  team?: string; opponent?: string; date?: string; time?: string; venue?: string; address?: string; venueLL?: string; category?: string;
  captain?: string; vice?: string; notes?: string; home?: boolean; convType?: string; meetTime?: string; meetAddress?: string;
  convNotes?: string; mrPresente?: string; callup?: Record<string, string>; senzaCategoria?: boolean; adb?: { partite?: PartitaAdb[] };
  selected?: unknown[]; [k: string]: unknown;
};

export const STATI_CONVOCAZIONE = ['CON', 'NC', 'INF', 'SQL', 'ND'];
export const ETICHETTE_STATO: Record<string, string> = { CON: 'Convocato', NC: 'Non convocato', INF: 'Infortunato', SQL: 'Squalificato', ND: 'Non disponibile' };
export const TIPI_IMPEGNO = ['Campionato', 'Amichevole', 'Coppa', 'Recupero', 'Torneo'];
export const MAX_PARTITE_ADB = 4;

/** Foglio vuoto (come defaultSheet del Portale); "Nuova partita" tiene solo i piazzati scelti */
export const foglioVuoto = (): FoglioPartita => ({ team: '', opponent: '', date: '', time: '', venue: '', category: '', formation: '1-4-4-1-1',
  lineup: {}, bench: [], captain: '', vice: '', notes: '', selected: [], overrides: {}, schemeEdits: {}, slotPos: {}, home: true,
  convType: 'Campionato', meetTime: '', meetAddress: '', convNotes: '', callup: {} });

/** Ritrovo proposto: 75 minuti prima dell'inizio */
export function menoSettantacinque(t?: string) {
  if (!/^\d{1,2}:\d{2}$/.test(t || '')) return '';
  const [h, m] = t!.split(':').map(Number);
  let tot = h * 60 + m - 75; if (tot < 0) tot += 1440;
  return String(Math.floor(tot / 60)).padStart(2, '0') + ':' + String(tot % 60).padStart(2, '0');
}
export const ritrovo = (s: FoglioPartita) => s.meetTime || menoSettantacinque(s.time);

/** Il foglio è già sulla partita m? (stessa data e stesso avversario) */
export const stessaPartitaFoglio = (s: FoglioPartita, m: Partita) => s.date === m.date && (s.opponent || '').trim().toLowerCase() === (m.opponent || '').trim().toLowerCase();
/** "Usa questa": i dati della partita del calendario nel foglio */
export const datiDaCalendario = (m: Partita & { ll?: string }) => ({ opponent: m.opponent || '', date: m.date || '', time: m.time || '', venue: m.venue || '',
  address: m.address || '', venueLL: m.ll || '', home: !!m.home, convType: m.friendly ? 'Amichevole' : 'Campionato' });

/** Campo di gioco della partita del foglio: sempre quello del calendario (con indirizzo e coordinate), se no quello del foglio */
export function luogoPartita(s: FoglioPartita, calendario: (Partita & { ll?: string })[]) {
  const avv = (s.opponent || '').trim().toLowerCase();
  const m = s.date ? calendario.find((x) => x.date === s.date && (x.opponent || '').trim().toLowerCase() === avv) : undefined;
  return m ? { venue: m.venue || '', address: m.address || '', ll: m.ll || '' } : { venue: s.venue || '', address: s.address || '', ll: s.venueLL || '' };
}
export const testoLuogo = (l: { venue?: string; address?: string }) => [l.venue, l.address].filter(Boolean).join(', ');

/** Attività di base: una partita della convocazione, dal calendario o vuota */
export const nuovaPartitaAdb = (id: string, m?: Partita & { id: string; ll?: string }): PartitaAdb => ({
  id, calId: m?.id || '', date: m?.date || '', time: m?.time || '', meetTime: '', opponent: m?.opponent || '', home: !!m?.home,
  venue: m?.venue || '', address: m?.address || '', ll: m?.ll || '', meetAddress: '', mr: '', note: '', conv: [],
});
