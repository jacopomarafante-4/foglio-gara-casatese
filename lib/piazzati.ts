// Calci piazzati (tappa 3; era piazzati.js + parte di schede.js del Portale): regole degli schemi. Funzioni pure, provate in
// tests/piazzati.test.mjs.
// - Modelli della società: shared/schemes (li cura l'admin). I miei schemi: della squadra, in registro/<squadra>.schemi.
// - Per la partita (foglio sheet/<squadra>): selected = schemi scelti (vanno nel foglio gara), overrides[schema][pedina] =
//   giocatore scelto a mano (se no chi gioca con quel numero in formazione), schemeEdits[schema] = indicazioni e nomi dei
//   compiti scritti dal mister su un modello della società, solo per questa partita (le vecchie posizioni e frecce si leggono).
// Coordinate in metri: x da -25 a 35 (bandierina a destra x = 34), y da -3 a 31 dalla linea di fondo; sul disegno y × YS.
import { BASES, ROLE_COLORS } from '@/lib/condivisi';

export const YS = 1.5, VX0 = -25, VX1 = 35, VY0 = -3, VY1 = 31;
export type Pedina = { id: string; slot: number; x: number; y: number; role?: string; tag?: string };
export type Segno = { type: 'arrow' | 'line'; dashed?: boolean; x1: number; y1: number; x2: number; y2: number };
export type Scritta = { text: string; x: number; y: number };
export type Schema = {
  id: string; name: string; subtitle?: string; side: 'favore' | 'sfavore'; note?: string; legend?: string;
  ball: { x: number; y: number }; tokens: Pedina[]; draw?: Segno[]; marks?: Scritta[];
  preferito?: boolean; da?: string; autore?: string; aggiornato?: string;
};
export type ModificaPartita = {
  note?: string; roles?: Record<string, { role?: string; tag?: string }>;
  tokens?: Record<string, { x: number; y: number }>; ball?: { x: number; y: number }; draw?: Segno[]; marks?: Scritta[];
};
export type FoglioPiazzati = {
  lineup?: Record<string, string>; selected?: string[]; overrides?: Record<string, Record<string, string>>;
  schemeEdits?: Record<string, ModificaPartita>;
};

const mod = (f: FoglioPiazzati, sc: Schema) => (f.schemeEdits ?? {})[sc.id];
/** Pedine come valgono per la partita: posizione, compito ed etichetta eventualmente cambiati per la partita */
export function pedine(sc: Schema, f: FoglioPiazzati): Pedina[] {
  const ed = mod(f, sc);
  return sc.tokens.map((t) => {
    const pos = ed?.tokens?.[t.id], r = ed?.roles?.[t.id];
    return { ...t, ...(pos ? { x: pos.x, y: pos.y } : {}), ...(r ? { role: r.role ?? t.role, tag: r.tag ?? t.tag } : {}) };
  });
}
export const notaDi = (sc: Schema, f: FoglioPiazzati) => { const n = mod(f, sc)?.note; return typeof n === 'string' ? n : sc.note || ''; };
export const palloneDi = (sc: Schema, f: FoglioPiazzati) => mod(f, sc)?.ball ?? sc.ball;
/** Frecce e scritte: quelle dello schema più quelle vecchie aggiunte per la partita */
export const segniDi = (sc: Schema, f: FoglioPiazzati) => [...(sc.draw ?? []), ...(mod(f, sc)?.draw ?? [])];
export const scritteDi = (sc: Schema, f: FoglioPiazzati) => [...(sc.marks ?? []), ...(mod(f, sc)?.marks ?? [])];

/** Colore di ogni compito, nell'ordine in cui compaiono */
export function coloriCompiti(sc: Schema, f: FoglioPiazzati) {
  const m = new Map<string, string>();
  for (const t of pedine(sc, f)) { const r = (t.role || '').trim(); if (r && !m.has(r)) m.set(r, ROLE_COLORS[m.size % ROLE_COLORS.length]); }
  return m;
}
export const coloreDi = (colori: Map<string, string>, t: Pedina) => colori.get((t.role || '').trim()) || '#15202B';

/** Chi gioca in una pedina: scelto a mano per la partita, se no chi ha quel numero di ruolo in formazione */
export function giocatoreDi(sc: Schema, t: Pedina, f: FoglioPiazzati, rosa: Set<string>): { pid: string | null; aMano: boolean } {
  const ov = f.overrides?.[sc.id]?.[t.id];
  if (ov && rosa.has(ov)) return { pid: ov, aMano: true };
  const dallaFormazione = f.lineup?.[t.slot];
  return { pid: dallaFormazione && rosa.has(dallaFormazione) ? dallaFormazione : null, aMano: false };
}

/** Pedine raggruppate per compito ("Senza compito" in fondo), ognuna in ordine di numero */
export function gruppiCompiti(sc: Schema, f: FoglioPiazzati): [string, Pedina[]][] {
  const g = new Map<string, Pedina[]>();
  for (const t of pedine(sc, f)) { const k = (t.role || '').trim() || 'Senza compito'; g.set(k, [...(g.get(k) ?? []), t]); }
  return [...g.entries()].map(([k, ts]) => [k, ts.slice().sort((a, b) => a.slot - b.slot)] as [string, Pedina[]])
    .sort((a, b) => Number(a[0] === 'Senza compito') - Number(b[0] === 'Senza compito'));
}

/** Stesso giocatore in più pedine: [giocatore, numeri delle pedine] */
export function doppioni(sc: Schema, f: FoglioPiazzati, rosa: Set<string>) {
  const per = new Map<string, number[]>();
  for (const t of pedine(sc, f)) { const { pid } = giocatoreDi(sc, t, f, rosa); if (pid) per.set(pid, [...(per.get(pid) ?? []), t.slot]); }
  return [...per.entries()].filter(([, n]) => n.length > 1);
}

/** Primo numero di ruolo (1-11) non ancora usato nello schema */
export const numeroLibero = (sc: Schema) => Array.from({ length: 11 }, (_, i) => i + 1).find((n) => !sc.tokens.some((t) => t.slot === n)) ?? 1;

/** Schema nuovo: 11 pedine in fila in basso, pallone dove serve per quel tipo */
export function schemaNuovo(chiave: string, nuovoId: (p: string) => string): Schema {
  const b = BASES[chiave] ?? BASES.libero;
  return { id: nuovoId('s'), name: b.name, subtitle: '', side: b.side, note: '', legend: '', ball: { ...b.ball },
    tokens: Array.from({ length: 11 }, (_, i) => ({ id: nuovoId('t'), slot: i + 1, x: -22 + i * 4.5, y: 28, role: '', tag: '' })), marks: [], draw: [] };
}

/** "Usa come modello": copia di un modello della società com'era per la partita, tra i propri schemi; i giocatori scelti per
 *  la partita passano alla copia, che prende il posto del modello tra gli scelti (o si aggiunge in cima) */
export function copiaDaModello(sc: Schema, f: FoglioPiazzati, nuovoId: (p: string) => string, oggi: string, autore: string) {
  const eff = pedine(sc, f);
  const tokens = eff.map((t) => ({ id: nuovoId('t'), slot: t.slot, x: t.x, y: t.y, role: t.role || '', tag: t.tag || '' }));
  const copia: Schema = { ...structuredClone(sc), id: nuovoId('s'), da: sc.id, preferito: true, autore, aggiornato: oggi, tokens,
    ball: { ...palloneDi(sc, f) }, draw: segniDi(sc, f).map((d) => ({ ...d })), marks: scritteDi(sc, f).map((m) => ({ ...m })) };
  const mappa = Object.fromEntries(sc.tokens.map((t, i) => [t.id, tokens[i].id]));
  const ov = f.overrides?.[sc.id];
  const overrides = { ...(f.overrides ?? {}) };
  if (ov) overrides[copia.id] = Object.fromEntries(Object.entries(ov).map(([k, v]) => [mappa[k], v]).filter(([k]) => k));
  const sel = f.selected ?? [];
  const selected = sel.includes(sc.id) ? sel.map((i) => (i === sc.id ? copia.id : i)) : [copia.id, ...sel];
  return { copia, selected, overrides };
}

/** Scegli / togli uno schema per la partita, tenendo l'ordine dell'elenco (i miei schemi, poi i modelli) */
export function sceltaSchema(selected: string[], id: string, ordine: string[]) {
  const s = selected.includes(id) ? selected.filter((i) => i !== id) : [...selected, id];
  return s.sort((a, b) => ordine.indexOf(a) - ordine.indexOf(b));
}

/** Nome di un compito cambiato per tutte le sue pedine: nello schema (chi lo può cambiare) o solo per la partita (mister su un
 *  modello della società: schemeEdits.roles; tornando al nome originale la modifica sparisce) */
export function rinominaCompito(sc: Schema, f: FoglioPiazzati, prima: string, nuovo: string, nelloSchema: boolean):
  { schema?: Schema; modifica?: ModificaPartita } {
  const ids = new Set(pedine(sc, f).filter((t) => (t.role || '').trim() === prima).map((t) => t.id));
  if (nelloSchema) return { schema: { ...sc, tokens: sc.tokens.map((t) => (ids.has(t.id) ? { ...t, role: nuovo } : t)) } };
  const ed: ModificaPartita = structuredClone(mod(f, sc) ?? {});
  for (const t of sc.tokens) {
    if (!ids.has(t.id)) continue;
    if (nuovo === (t.role || '')) {
      if (ed.roles?.[t.id]) { delete ed.roles[t.id].role; if (!Object.keys(ed.roles[t.id]).length) delete ed.roles[t.id]; }
    } else ((ed.roles ??= {})[t.id] ??= {}).role = nuovo;
  }
  return { modifica: ed };
}
