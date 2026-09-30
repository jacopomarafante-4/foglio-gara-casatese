// Squadra → Partite → Formazione (tappa 3; era viewFormazione del Portale): regole del foglio della partita.
// lineup = { "posizione": giocatore }, bench = panchina in ordine; numero di maglia = posizione (1-11) o 12 + posto in panchina.
// Funzioni pure, provate in tests/formazione.test.mjs.
import { FORMATIONS } from '@/lib/condivisi';

export type FoglioFormazione = {
  formation?: string; lineup?: Record<string, string>; bench?: string[]; captain?: string; vice?: string; notes?: string;
  slotPos?: Record<string, { x: number; y: number }>; selected?: string[];
};
export const MODULI = Object.keys(FORMATIONS);
export const MODULO_BASE = '1-4-4-1-1';

export const posizioniDi = (modulo?: string) => FORMATIONS[modulo || MODULO_BASE] ?? FORMATIONS[MODULO_BASE];
export const slotDi = (lineup: Record<string, string> | undefined, pid: string) => Object.keys(lineup ?? {}).find((k) => lineup![k] === pid);

/** Numero di maglia della partita: posizione in campo, o 12 + posto in panchina; null se non gioca */
export function numeroMaglia(f: FoglioFormazione, pid: string): number | null {
  const s = slotDi(f.lineup, pid);
  if (s) return +s;
  const i = (f.bench ?? []).indexOf(pid);
  return i >= 0 ? 12 + i : null;
}

/** Ordine in cui si riempiono le posizioni toccando un giocatore disponibile: portiere, poi difesa, centrocampo e attacco,
 *  ognuno da destra a sinistra (come slotPriorityOrder del Portale) */
export function ordinePosizioni(modulo?: string): number[] {
  const lista = posizioniDi(modulo), resto = lista.filter(([n]) => n !== 1);
  const forma = (modulo || MODULO_BASE).split('-').slice(1).map(Number).filter((n) => !Number.isNaN(n));
  const bande: (typeof lista)[] = []; let i = 0;
  for (const n of forma) { bande.push(resto.slice(i, i + n)); i += n; }
  const perX = (a: typeof lista) => a.slice().sort((x, y) => y[1] - x[1]).map((t) => t[0]);
  const difesa = bande[0] ?? [], attacco = bande.length > 1 ? bande[bande.length - 1] : [], centro = bande.slice(1, -1).flat();
  return [1, ...perX(difesa), ...perX(centro), ...perX(attacco)];
}

/** Prima posizione libera nell'ordine del modulo (null se il campo è pieno) */
export const primaLibera = (f: FoglioFormazione) => ordinePosizioni(f.formation).find((n) => !(f.lineup ?? {})[n]) ?? null;

/** Mette un giocatore in una posizione (lo toglie da dove era e dalla panchina); chi c'era torna disponibile */
export function metti(f: FoglioFormazione, slot: number | string, pid: string) {
  const lineup = { ...(f.lineup ?? {}) };
  const prima = slotDi(lineup, pid);
  if (prima) delete lineup[prima];
  lineup[String(slot)] = pid;
  return { lineup, bench: (f.bench ?? []).filter((b) => b !== pid) };
}
/** Toglie dal campo chi è in quella posizione */
export function togli(f: FoglioFormazione, slot: number | string) {
  const lineup = { ...(f.lineup ?? {}) };
  delete lineup[String(slot)];
  return { lineup };
}
/** In panchina (in fondo) o fuori dalla panchina; chi va in panchina esce dal campo */
export function panchina(f: FoglioFormazione, pid: string) {
  const bench = f.bench ?? [];
  if (bench.includes(pid)) return { bench: bench.filter((b) => b !== pid) };
  const lineup = { ...(f.lineup ?? {}) };
  const s = slotDi(lineup, pid);
  if (s) delete lineup[s];
  return { lineup, bench: [...bench, pid] };
}
/** Posizione della pedina sul campo: spostata a mano (slotPos) o quella del modulo */
export function posizione(f: FoglioFormazione, n: number, x: number, y: number) {
  const o = (f.slotPos ?? {})[n];
  return o ? { x: o.x, y: o.y } : { x, y };
}
/** Titolari nell'ordine del modulo (anche le posizioni vuote) */
export const titolari = (f: FoglioFormazione) => posizioniDi(f.formation).map(([n]) => ({ slot: n, pid: (f.lineup ?? {})[n] ?? null }));

/** Cognome sulla pedina: "De Luca Mario" → "De Luca", "Rossi Mario" → "Rossi" (i nomi in rosa sono "Cognome Nome") */
export function cognome(n?: string) {
  const w = (n || '').trim().split(/\s+/).filter(Boolean);
  return w.length > 2 && /^(de|di|da|del|della|dello|dei|degli|dal|dalla|lo|la|li|van|von|el|al|mc|san|santa)$/i.test(w[0]) ? w.slice(0, 2).join(' ') : w[0] || '';
}
