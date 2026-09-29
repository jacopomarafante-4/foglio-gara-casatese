// Registro della squadra (registro/<squadra>) nell'app: stesse regole di public/portale/js/registro.js per presenze,
// partite giocate, risultato e riepilogo della stagione (computeStats). Solo funzioni pure: le usano la Home e le prove.
import type { Partita } from '@/lib/programma';

export type Presenza = string;   // 'P' | 'A' (assente senza motivo) | motivo: MAL, INF, SCU, FAM, ING ('G' vecchio = FAM)
export type Allenamento = { id: string; date: string; note?: string; att?: Record<string, Presenza> };
export type Giocata = { min?: number | string; g?: number | string; gc?: number | string; gk?: boolean; pres?: boolean };
export type Gara = { id: string; calId?: string; date?: string; opponent?: string; home?: boolean; comp?: string; dur?: number | string;
  og?: number | string; nomin?: boolean; pl?: Record<string, Giocata> };
export type Registro = { trainings?: Allenamento[]; games?: Gara[]; gk?: string[]; friendlies?: (Partita & { id: string })[] };

export const ASSENZE = ['MAL', 'INF', 'SCU', 'FAM', 'ING'];
export const SOGLIA_PRESENZE = 0.75;   // sotto il 75% di presenze il giocatore viene evidenziato
export const DURATA_PARTITA = 70;

const num = (v: unknown) => +(v as number) || 0;
export const presenzaDi = (t: Allenamento, pid: string) => { const v = (t.att ?? {})[pid]; return v === 'G' ? 'FAM' : v || ''; };
export const assente = (v: string) => !!v && v !== 'P';
/** ha giocato: minuti > 0, oppure presenza senza minuti (partite importate senza minuti) */
export const haGiocato = (x: Giocata) => num(x.min) > 0 || !!x.pres;
export const garaGiocata = (g: Gara) => Object.values(g.pl ?? {}).some(haGiocato);

/** Risultato calcolato: gol dei giocatori + autogol a favore / gol subiti dai portieri. Noto solo se è stato inserito qualcosa */
export function risultato(g: Gara, portieri: string[]) {
  const inPorta = (pid: string) => { const x = (g.pl ?? {})[pid] ?? {}; return x.gk != null ? !!x.gk : portieri.includes(pid); };
  const pl = Object.entries(g.pl ?? {});
  const gf = pl.reduce((a, [, x]) => a + num(x.g), 0) + num(g.og);
  const ga = pl.reduce((a, [pid, x]) => a + (inPorta(pid) ? num(x.gc) : 0), 0);
  const noto = gf > 0 || pl.some(([pid, x]) => inPorta(pid) && x.gc != null && x.gc !== '' && haGiocato(x));
  return noto ? { gf, ga } : null;
}

/** Data della partita: quella del calendario ha la precedenza (se il calendario cambia, il registro segue) */
export const dataGara = (g: Gara, calendario: Partita[]) => (g.calId && calendario.find((m) => m.id === g.calId)?.date) || g.date || '';

/** Riepilogo della stagione (come computeStats del Portale, periodo = tutta la stagione) */
export function riepilogo(reg: Registro, giocatori: { id: string }[], calendario: Partita[]) {
  const tr = reg.trainings ?? [];
  const gm = (reg.games ?? []).filter(garaGiocata);
  const pct = giocatori.map((p) => {
    let P = 0, fuori = 0;
    tr.forEach((t) => { const v = presenzaDi(t, p.id); if (v === 'P') P++; else if (v && v !== 'INF') fuori++; });
    return P + fuori ? P / (P + fuori) : null;   // % presenza = presenze / sedute, esclusi gli infortuni
  }).filter((x): x is number => x != null);
  const noti = gm.map((g) => risultato(g, reg.gk ?? [])).filter(Boolean) as { gf: number; ga: number }[];
  return {
    nT: tr.length, nG: gm.length,
    mediaPresenze: pct.length ? pct.reduce((a, x) => a + x, 0) / pct.length : null,
    sottoSoglia: pct.filter((x) => x < SOGLIA_PRESENZE).length,
    presentiPerPartita: gm.length ? gm.reduce((a, g) => a + Object.values(g.pl ?? {}).filter(haGiocato).length, 0) / gm.length : null,
    v: noti.filter((s) => s.gf > s.ga).length, n: noti.filter((s) => s.gf === s.ga).length, p: noti.filter((s) => s.gf < s.ga).length,
    gf: noti.reduce((a, s) => a + s.gf, 0), gs: noti.reduce((a, s) => a + s.ga, 0), nNoti: noti.length,
    inviolata: noti.filter((s) => s.ga === 0).length,
    date: gm.map((g) => dataGara(g, calendario)),
  };
}

/** "Da fare" della Home: assenze senza motivo, tabellini e gol mancanti delle partite passate, portieri da segnare */
export type DaFare = { testo: string; tipo: 'assenze' | 'tabellino' | 'gol' | 'portieri'; calId?: string; garaId?: string };
export function daFare(reg: Registro, calendario: Partita[], oggi: string, adb: boolean, conGiocatori: boolean): DaFare[] {
  const out: DaFare[] = [];
  const senzaMotivo = (reg.trainings ?? []).reduce((a, t) => a + Object.values(t.att ?? {}).filter((v) => v === 'A').length, 0);
  if (senzaMotivo) out.push({ testo: `${senzaMotivo} assenz${senzaMotivo === 1 ? 'a' : 'e'} senza motivo negli allenamenti`, tipo: 'assenze' });
  const passate = calendario.filter((m) => m.date && m.date < oggi).sort((a, b) => b.date!.localeCompare(a.date!));
  const giorno = (d: string) => d.slice(8, 10) + '/' + d.slice(5, 7);
  passate.forEach((m) => {
    const g = (reg.games ?? []).find((x) => x.calId === m.id);
    if (!g || !garaGiocata(g)) out.push({ testo: `${adb ? 'Presenze da segnare' : 'Tabellino da compilare'}: ${m.opponent || 'partita'} (${giorno(m.date!)})`, tipo: 'tabellino', calId: m.id });
    else if (!adb && !risultato(g, reg.gk ?? [])) out.push({ testo: `Gol da inserire: ${m.opponent || 'partita'} (${giorno(m.date!)})`, tipo: 'gol', garaId: g.id });
  });
  /* Attività di base: niente gol né portieri nei tabellini */
  if (!adb && conGiocatori && !(reg.gk ?? []).length) out.push({ testo: 'Segna i portieri con 🧤 nella Rosa', tipo: 'portieri' });
  return out;
}
