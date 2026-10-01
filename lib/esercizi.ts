// Esercitazioni (0052): elenchi e regole dell'eserciziario, dal documento metodologico "Modulazione delle aree di allenamento"
// (tassonomia delle esercitazioni, fasi e principi, Area per Giocatore, morfociclo, progressione per categorie). Funzioni pure,
// provate in tests/esercizi.test.mjs.

export const TIPI = [
  { k: 'attivazione', l: 'Attivazione tecnico-coordinativa' }, { k: 'tecnica', l: 'Tecnica analitica' },
  { k: 'rondo', l: 'Rondo' }, { k: 'gioco_posizione', l: 'Gioco di posizione' },
  { k: 'ssg', l: 'Partita a spazi ridotti (2c2–4c4)' }, { k: 'msg', l: 'Partita media (5c5–7c7)' },
  { k: 'lsg', l: 'Partita a spazi ampi (8c8–11c11)' }, { k: 'partita_tema', l: 'Partita a tema' },
] as const;
export const FASI = [
  { k: 'possesso', l: 'Possesso', principi: ['Scaglionamento', 'Ritmo', 'Imbucata', 'Smarcamento di rottura', 'Trasmissione orientata', 'Costruzione dal basso'] },
  { k: 'transizione_negativa', l: 'Transizione negativa', principi: ['Riaggressione', 'Ricompattamento', 'Contrasto entro 3-5 secondi', 'Chiusura linea visiva'] },
  { k: 'non_possesso', l: 'Non possesso', principi: ['Difesa a zona', 'Compattezza', 'Altezza del blocco', 'Scorrimento sincronizzato', 'Postura difensiva', 'Pressione'] },
  { k: 'transizione_positiva', l: 'Transizione positiva', principi: ['Contrattacco', 'Uscita dalla densità', 'Conduzione aggressiva', 'Taglio profondo'] },
] as const;
export const MORFOCICLO = [
  { k: 'MD+1', l: 'MD+1 · Recupero' }, { k: 'MD-4', l: 'MD-4 · Tensione (forza, accelerazioni)' }, { k: 'MD-3', l: 'MD-3 · Durata (resistenza)' },
  { k: 'MD-2', l: 'MD-2 · Velocità (decisione, reattività)' }, { k: 'MD-1', l: 'MD-1 · Rifinitura' },
] as const;
export const CATEGORIE = ['Under 8', 'Under 9', 'Under 10', 'Under 11', 'Under 12', 'Under 13', 'Under 14', 'Under 15', 'Under 16', 'Under 17', 'Under 18', 'Under 19'];
export const etichetta = (elenco: readonly { k: string; l: string }[], k?: string | null) => elenco.find((x) => x.k === k)?.l ?? '';

/** Area per Giocatore (m²): campo diviso i giocatori di movimento; jolly e sponde contano 0,5, i portieri 0,3 (ApP "mod") */
export function areaPerGiocatore(e: { lunghezza?: number | null; larghezza?: number | null; movimento?: number | null; jolly?: number | null; portieri?: number | null }) {
  const area = (e.lunghezza ?? 0) * (e.larghezza ?? 0), n = (e.movimento ?? 0) + 0.5 * (e.jolly ?? 0) + 0.3 * (e.portieri ?? 0);
  return area > 0 && n > 0 ? Math.round(area / n) : null;
}
/** Fascia di densità e cosa allena (tabella del documento) */
export function fasciaApP(app: number | null) {
  if (app === null) return null;
  if (app < 75) return { k: 'altissima', l: 'Densità altissima', effetto: 'picchi di accelerazioni e frenate: duelli 1c1' };
  if (app <= 150) return { k: 'media', l: 'Densità media', effetto: 'equilibrio neuromuscolare: gioco di posizione' };
  if (app <= 250) return { k: 'ampia', l: 'Spazio ampio', effetto: 'distanze simili alla gara: sviluppo offensivo' };
  return { k: 'massima', l: 'Spazio massimo', effetto: 'velocità di punta: tattica collettiva' };
}
/** Durata totale in minuti: serie × minuti + recuperi tra le serie */
export function durataTotale(e: { serie?: number | null; minuti?: number | null; recupero?: number | null }) {
  const s = e.serie ?? 1, m = e.minuti ?? 0;
  return m > 0 ? Math.round((s * m + Math.max(0, s - 1) * (e.recupero ?? 0)) * 10) / 10 : null;
}
/* ---------- Lavagna ---------- */
export type Elemento = { id: string; tipo: 'giocatore' | 'palla' | 'cinesino' | 'cono' | 'paletto' | 'porta'; squadra?: 'a' | 'b' | 'jolly' | 'portiere'; x: number; y: number; n?: string };
export type Tracciato = { id: string; tipo: 'passaggio' | 'corsa' | 'dribbling'; x1: number; y1: number; x2: number; y2: number };
export type Zona = { id: string; x: number; y: number; w: number; h: number };
export type Lavagna = { elementi?: Elemento[]; tracciati?: Tracciato[]; zone?: Zona[] };

export type Esercizio = {
  id: string; titolo: string; tipo: string | null; fase: string | null; principio: string | null; obiettivo: string | null; categorie: string[];
  formato: string | null; movimento: number | null; jolly: number; portieri: number; lunghezza: number | null; larghezza: number | null;
  serie: number | null; minuti: number | null; recupero: number | null; morfociclo: string | null; descrizione: string | null; varianti: string | null;
  attenzione: string | null; lavagna: Lavagna; da: string | null; autore: string | null; created_at: string; updated_at: string;
};
export const CAMPI_SALVATI = ['titolo', 'tipo', 'fase', 'principio', 'obiettivo', 'categorie', 'formato', 'movimento', 'jolly', 'portieri', 'lunghezza', 'larghezza',
  'serie', 'minuti', 'recupero', 'morfociclo', 'descrizione', 'varianti', 'attenzione', 'lavagna'] as const;

/** Esercizio nuovo: 30×20 m, due squadre da 4 schierate */
export function esercizioVuoto(nuovoId: (p: string) => string): Omit<Esercizio, 'id' | 'created_at' | 'updated_at' | 'da' | 'autore'> {
  const giocatori: Elemento[] = [
    ...[0, 1, 2, 3].map((i) => ({ id: nuovoId('e'), tipo: 'giocatore' as const, squadra: 'a' as const, x: 8, y: 3 + i * 4.5, n: String(i + 1) })),
    ...[0, 1, 2, 3].map((i) => ({ id: nuovoId('e'), tipo: 'giocatore' as const, squadra: 'b' as const, x: 22, y: 3 + i * 4.5, n: String(i + 1) })),
    { id: nuovoId('e'), tipo: 'palla', x: 15, y: 10 },
  ];
  return { titolo: 'Nuovo esercizio', tipo: 'ssg', fase: 'possesso', principio: null, obiettivo: null, categorie: [], formato: '4c4', movimento: 8, jolly: 0,
    portieri: 0, lunghezza: 30, larghezza: 20, serie: 4, minuti: 4, recupero: 1, morfociclo: null, descrizione: null, varianti: null, attenzione: null,
    lavagna: { elementi: giocatori, tracciati: [], zone: [] } };
}

/** Filtri dell'elenco */
export function filtra(lista: Esercizio[], f: { q?: string; tipo?: string; fase?: string; categoria?: string; md?: string }) {
  const q = (f.q ?? '').trim().toLowerCase();
  return lista.filter((e) => (!f.tipo || e.tipo === f.tipo) && (!f.fase || e.fase === f.fase) && (!f.md || e.morfociclo === f.md)
    && (!f.categoria || e.categorie.includes(f.categoria))
    && (!q || [e.titolo, e.obiettivo, e.principio, e.descrizione].some((t) => (t ?? '').toLowerCase().includes(q))));
}
