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

/* ---------- Allenamento: presenze, test, statistiche ---------- */
export type Test = { id: string; date: string; name?: string; res?: Record<string, { s?: number; note?: string }> };
export const MOTIVI: { k: string; l: string; s: string }[] = [
  { k: 'MAL', l: 'Malattia', s: 'M' }, { k: 'INF', l: 'Infortunio', s: 'I' }, { k: 'SCU', l: 'Scuola / studio', s: 'S' },
  { k: 'FAM', l: 'Motivi familiari', s: 'F' }, { k: 'ING', l: 'Ingiustificata', s: 'X' },
];
/** % presenza = presenze / sedute registrate, escluse le assenze per infortunio */
export const percentuale = (P: number, assenzeSenzaInfortuni: number) => (P + assenzeSenzaInfortuni ? P / (P + assenzeSenzaInfortuni) : null);
export const pctTesto = (v: number | null) => (v == null ? '—' : Math.round(v * 100) + '%');

/** Tempo scritto dal mister: "12:51", "12.51", "12'51", "12" (minuti) → secondi; null se non è un tempo (resta come nota) */
export function leggiTempo(v: string) {
  const m = String(v || '').trim().match(/^(\d{1,2})(?:\s*[:,.'’]\s*(\d{1,2}))?\s*["”]?$/);
  if (!m) return null;
  const sec = m[2] === undefined ? 0 : m[2].length === 1 ? +m[2] * 10 : +m[2];
  return sec > 59 ? null : +m[1] * 60 + sec;
}
export const scriviTempo = (sec: number) => `${Math.floor(sec / 60)}'${String(sec % 60).padStart(2, '0')}"`;
export const tempoPerCampo = (r?: { s?: number; note?: string }) => (!r ? '' : r.s != null ? `${Math.floor(r.s / 60)}:${String(r.s % 60).padStart(2, '0')}` : r.note || '');
export const tempoCella = (r?: { s?: number; note?: string }) => (!r ? '' : r.s != null ? scriviTempo(r.s) : r.note || '');

/** Mesi con allenamenti o partite giocate (per il filtro del periodo) */
export function mesiDelRegistro(reg: Registro, calendario: Partita[]) {
  return [...new Set([...(reg.trainings ?? []).map((t) => t.date), ...(reg.games ?? []).filter(garaGiocata).map((g) => dataGara(g, calendario))]
    .map((d) => (d || '').slice(0, 7)).filter(Boolean))].sort();
}

/** Statistiche di allenamento nel periodo ('all' = stagione, se no "2026-09") */
export function statisticheAllenamento(reg: Registro, giocatori: { id: string; name: string }[], periodo: string) {
  const nel = (d?: string) => periodo === 'all' || (d || '').startsWith(periodo);
  const tr = (reg.trainings ?? []).filter((t) => nel(t.date)).sort((a, b) => a.date.localeCompare(b.date));
  const righe = giocatori.map((p) => {
    const c: Record<string, number> = { P: 0, A: 0 }; MOTIVI.forEach((a) => { c[a.k] = 0; });
    tr.forEach((t) => { const v = presenzaDi(t, p.id); if (v in c) c[v]++; });
    const assenze = c.A + MOTIVI.reduce((a, x) => a + c[x.k], 0);
    return { p, c, assenze, pct: percentuale(c.P, assenze - c.INF) };
  });
  const conPct = righe.filter((r) => r.pct != null) as (typeof righe[number] & { pct: number })[];
  return {
    tr, righe,
    media: conPct.length ? conPct.reduce((a, r) => a + r.pct, 0) / conPct.length : null,
    presentiMedi: tr.length ? tr.reduce((a, t) => a + Object.values(t.att ?? {}).filter((v) => v === 'P').length, 0) / tr.length : null,
    sottoSoglia: conPct.filter((r) => r.pct < SOGLIA_PRESENZE).length,
    assenze: righe.reduce((a, r) => a + r.assenze, 0), infortuni: righe.reduce((a, r) => a + r.c.INF, 0),
  };
}

/** Presenze per mese: per ogni giocatore {mese: {P, tot}} (tot senza gli infortuni) */
export function presenzePerMese(reg: Registro, giocatori: { id: string }[]) {
  const mesi = [...new Set((reg.trainings ?? []).map((t) => (t.date || '').slice(0, 7)).filter(Boolean))].sort();
  const per: Record<string, Record<string, { P: number; tot: number }>> = Object.fromEntries(giocatori.map((p) => [p.id, {}]));
  (reg.trainings ?? []).forEach((t) => {
    const ym = (t.date || '').slice(0, 7);
    giocatori.forEach((p) => {
      const v = presenzaDi(t, p.id); if (!v) return;
      const m = (per[p.id][ym] ??= { P: 0, tot: 0 }); if (v !== 'INF') m.tot++; if (v === 'P') m.P++;
    });
  });
  return { mesi, per };
}

/* ---------- Partite: tabellini e statistiche ---------- */
export const TIPI_GARA = ['Campionato', 'Partita', 'Coppa', 'Recupero', 'Torneo'];
type CalId = Partita & { id: string; friendly?: boolean };
/** Dati della partita: quelli del calendario hanno la precedenza (se il calendario cambia, il tabellino segue) */
export function infoGara(g: Gara, calendario: CalId[]) {
  const m = g.calId ? calendario.find((x) => x.id === g.calId) : undefined;
  return m ? { date: m.date || '', opponent: m.opponent || '', home: !!m.home, comp: m.friendly ? 'Partita' : g.comp || 'Campionato', venue: m.venue || '', time: m.time || '', cal: m }
    : { date: g.date || '', opponent: g.opponent || '', home: !!g.home, comp: g.comp || 'Partita', venue: '', time: '', cal: undefined };
}
export const inPortaGara = (g: Gara, pid: string, portieri: string[]) => { const x = (g.pl ?? {})[pid] ?? {}; return x.gk != null ? !!x.gk : portieri.includes(pid); };
/** Colonne della tabella partite: partite del calendario fino a oggi + la prossima, più quelle fuori calendario, per data */
export function colonnePartite(reg: Registro, calendario: CalId[], oggi: string) {
  const cal = calendario.filter((m) => m.date).sort((a, b) => a.date!.localeCompare(b.date!));
  const prossima = cal.find((m) => m.date! > oggi);
  const col: { cal: CalId | null; gara: Gara | null }[] = cal.filter((m) => m.date! <= oggi || m === prossima)
    .map((m) => ({ cal: m, gara: (reg.games ?? []).find((g) => g.calId === m.id) ?? null }));
  (reg.games ?? []).filter((g) => !g.calId || !cal.some((m) => m.id === g.calId)).forEach((g) => col.push({ cal: null, gara: g }));
  return col.sort((a, b) => (a.cal?.date || a.gara?.date || '').localeCompare(b.cal?.date || b.gara?.date || ''));
}
/** Attività di base: risultato tempo per tempo (g.tempi = [{noi, loro}]) */
export type Tempo = { noi?: number | ''; loro?: number | '' };
export function riepilogoTempi(tempi?: Tempo[]) {
  const t = (tempi ?? []).filter((x) => x && x.noi !== '' && x.noi != null && x.loro !== '' && x.loro != null);
  if (!t.length) return null;
  const v = t.filter((x) => +x.noi! > +x.loro!).length, pa = t.filter((x) => +x.noi! === +x.loro!).length, pe = t.length - v - pa;
  return { v, pa, pe, noi: t.reduce((a, x) => a + +x.noi!, 0), loro: t.reduce((a, x) => a + +x.loro!, 0) };
}
export const testoTempi = (r: NonNullable<ReturnType<typeof riepilogoTempi>>) =>
  `${r.v} ${r.v === 1 ? 'vinto' : 'vinti'} · ${r.pa} pari · ${r.pe} ${r.pe === 1 ? 'perso' : 'persi'}, gol ${r.noi}–${r.loro}`;

/** Statistiche delle partite giocate nel periodo (come computeStats del Portale: minuti, % sui disponibili, media, gol, subiti) */
export function statistichePartite(reg: Registro, giocatori: { id: string; name: string }[], calendario: CalId[], periodo: string) {
  const nel = (d?: string) => periodo === 'all' || (d || '').startsWith(periodo);
  const portieri = reg.gk ?? [];
  const gm = (reg.games ?? []).filter((g) => garaGiocata(g) && nel(infoGara(g, calendario).date))
    .sort((a, b) => infoGara(a, calendario).date.localeCompare(infoGara(b, calendario).date));
  const righe = giocatori.map((p) => {
    let pres = 0, conMin = 0, min = 0, disp = 0, gol = 0, gc = 0, inPorta = 0;
    gm.forEach((g) => {
      const x = (g.pl ?? {})[p.id] ?? {}, m = num(x.min);
      if (!g.nomin) disp += num(g.dur) || DURATA_PARTITA;
      if (haGiocato(x)) { pres++; if (inPortaGara(g, p.id, portieri)) { inPorta++; gc += num(x.gc); } }
      if (m > 0) { conMin++; min += m; }
      gol += num(x.g);
    });
    return { p, pres, min, pctMin: disp ? min / disp : null, media: conMin ? min / conMin : null, gol, gc, inPorta };
  });
  const noti = gm.map((g) => risultato(g, portieri)).filter(Boolean) as { gf: number; ga: number }[];
  return {
    gm, righe, nNoti: noti.length,
    v: noti.filter((s) => s.gf > s.ga).length, n: noti.filter((s) => s.gf === s.ga).length, p: noti.filter((s) => s.gf < s.ga).length,
    gf: noti.reduce((a, s) => a + s.gf, 0), gs: noti.reduce((a, s) => a + s.ga, 0), inviolata: noti.filter((s) => s.ga === 0).length,
    marcatori: righe.filter((r) => r.gol).length,
  };
}
