// Calendari ufficiali in PDF (LND Lombardia e delegazioni) → partite. Stesse regole di scripts/import-calendari/leggi_pdf.py
// e prepara.py, ma in TypeScript per l'app (Calendario → Tutte le squadre → "Importa calendario ufficiale").
// Funzioni pure: lavorano sulle parole di ogni pagina con la loro posizione (le estrae lib/leggi-pdf.ts), provate in
// tests/calendario-pdf.test.mjs. Le partite si separano per POSIZIONE del trattino tra casa e trasferta (sta sempre alla stessa x
// in ogni colonna), non per testo: così funzionano anche nomi che contengono un trattino ("SPORTING OVZ - ASD").

export type Parola = { text: string; x0: number; x1: number; top: number };
/** Linea dritta disegnata: verticale (a = x, da/fino = dall'alto) o orizzontale (a = dall'alto, da/fino = x) */
export type Linea = { verticale: boolean; a: number; da: number; fino: number };
export type Pagina = { width: number; parole: Parola[]; righe: string[]; linee?: Linea[] };
type Riga = [number, Parola[]];
type Testa = { n: number; x: number; top: number; col: number; a: string | null; r: string | null };
export type PartitaLetta = { giornata: number; andata: string | null; ritorno: string | null; casa: string; trasferta: string };
export type Campo = { societa: string; codice: string; campo: string; ora: string | null; indirizzo: string; giorno: string | null };
export type Lettura = { gironi: Record<string, { partite: PartitaLetta[]; campi: Campo[] }> };

const DATA = /^(\d{1,2})\/(\d{2})\/(\d{2}|\d{4})$/;
const cifre = (s: string) => /^\d+$/.test(s);

export function righe(parole: Parola[], tol = 2.5): Riga[] {
  const out: Riga[] = [];
  for (const w of parole.slice().sort((a, b) => a.top - b.top || a.x0 - b.x0)) {
    const u = out[out.length - 1];
    if (u && Math.abs(u[0] - w.top) <= tol) u[1].push(w); else out.push([w.top, [w]]);
  }
  return out.map(([t, ws]) => [t, ws.sort((a, b) => a.x0 - b.x0)]);
}
/** "13/09/26" → "2026-09-13": l'anno scritto a volte è sbagliato, conta la stagione (da luglio a giugno) */
export function dataIso(s: string, inizio: number) {
  const [, d, m] = s.match(DATA)!.map(Number);
  return `${m >= 7 ? inizio : inizio + 1}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
const testo = (ws: Parola[]) => ws.map((w) => w.text).join(' ').trim();

export function leggiCalendario(p: Pagina, inizio: number): PartitaLetta[] {
  const parole = p.parole.filter((w) => w.text !== '|');
  const rs = righe(parole);
  const teste: Testa[] = [];
  for (const [t, ws] of rs) ws.forEach((w, i) => {
    const dopo = ws[i + 1]?.text ?? '';
    if (w.text.toUpperCase() === 'GIORNATA' && cifre(dopo)) teste.push({ n: +dopo, x: (w.x0 + ws[i + 1].x1) / 2, top: t, col: 0, a: null, r: null });
    else if (cifre(w.text) && dopo === 'G' && ws[i + 2]?.text === 'I') teste.push({ n: +w.text, x: w.x0, top: t, col: 0, a: null, r: null });
  });
  // colonne = posizioni ricorrenti dei trattini
  const trattini = parole.filter((w) => w.text === '-' || w.text === '–');
  const gruppi: number[][] = [];
  for (const x of trattini.map((w) => w.x0).sort((a, b) => a - b)) {
    const g = gruppi[gruppi.length - 1];
    if (g && x - g[g.length - 1] <= 12) g.push(x); else gruppi.push([x]);
  }
  const col = gruppi.filter((g) => g.length >= 4).map((g) => g.reduce((a, b) => a + b, 0) / g.length);
  if (!col.length || !teste.length) return [];
  const confini = [...col.map((_, i) => (i ? (col[i - 1] + col[i]) / 2 : 0)), p.width];
  const colDi = (x: number) => { let k = 0; for (let i = 0; i < col.length; i++) if (confini[i] <= x) k = i; return k; };
  for (const h of teste) h.col = colDi(h.x);
  // date di andata e ritorno: all'intestazione più vicina della stessa colonna (sopra o sotto)
  for (const [t, ws] of rs) ws.slice(0, -1).forEach((w, i) => {
    const k = w.text.toUpperCase().replace(/:+$/, '').replace(/\.+$/, '');
    if (!['A', 'R', 'ANDATA', 'RITORNO'].includes(k) || !DATA.test(ws[i + 1].text)) return;
    const c = colDi(w.x0);
    const cand = teste.filter((h) => h.col === c && h.top - t >= -40 && h.top - t <= 40);
    if (!cand.length) return;
    const h = cand.reduce((a, b) => (Math.abs(b.top - t) < Math.abs(a.top - t) ? b : a));
    h[k === 'A' || k === 'ANDATA' ? 'a' : 'r'] = dataIso(ws[i + 1].text, inizio);
  });
  const partite: PartitaLetta[] = [];
  // ogni trattino di separazione: casa = parole a sinistra, trasferta = a destra, stessa altezza
  for (const sep of trattini) {
    const ci = col.reduce((b, x, i) => (Math.abs(x - sep.x0) < Math.abs(col[b] - sep.x0) ? i : b), 0);
    if (Math.abs(col[ci] - sep.x0) > 10) continue;
    const sx = sep.x0, t = sep.top, lo = confini[ci], hi = confini[ci + 1];
    const riga = parole.filter((w) => Math.abs(w.top - t) <= 3 && w !== sep).sort((a, b) => a.x0 - b.x0);
    const casa = testo(riga.filter((w) => w.x0 >= lo && w.x0 < sx)), fuori = testo(riga.filter((w) => w.x0 > sx && w.x0 < hi));
    if (!casa || !fuori || /^RIPOS/i.test(casa) || /^RIPOS/i.test(fuori)) continue;
    const cand = teste.filter((h) => h.col === ci && h.top < t);
    if (!cand.length) continue;
    const h = cand.reduce((a, b) => (b.top > a.top ? b : a));
    partite.push({ giornata: h.n, andata: h.a, ritorno: h.r, casa, trasferta: fuori });
  }
  return partite;
}

export function gironeDi(p: Pagina) {
  return p.righe.join('\n').match(/GIRONE[:\s]+([A-Z]|\d{1,2})\b/i)?.[1].toUpperCase() ?? null;
}

/** Elenco campi: nome società, codice campo, campo, indirizzo, ora, giorno */
export function leggiCampi(p: Pagina): Campo[] {
  const out: Campo[] = [];
  if (p.righe.some((l) => l.includes('|'))) {   // delegazioni: tabella di testo
    for (const l of p.righe) {
      const c = l.split('|').map((x) => x.trim());
      if (c.length >= 6 && cifre(c[2])) {
        const giorno = /SABATO/i.test(l) ? 'sabato' : /DOMENICA/i.test(l) ? 'domenica' : null;
        out.push({ societa: c[1], codice: c[2], campo: c[3], ora: /^\d{1,2}:\d{2}/.test(c[4]) ? c[4] : null, indirizzo: c[5], giorno });
      }
    }
    if (out.length) return out;
  }
  // Tabella con i bordi disegnati (LND, Lecco…): celle ricostruite dalle linee, poi riconosciute dal contenuto (come pdfplumber)
  const daTabella = campiDaTabella(p);
  if (daTabella.length) return daTabella;
  // Senza bordi: colonne dalle intestazioni (Società, N., Campo, Indirizzo, Orario, Giorno)
  const rs = righe(p.parole);
  let testa: Record<string, number> | null = null, topTesta = 0;
  for (const [t, ws] of rs) {
    const up = ws.map((w) => w.text.toUpperCase());
    if (up.some((u) => u.startsWith('SOCIET')) && up.includes('INDIRIZZO')) {
      testa = {}; ws.forEach((w, i) => { testa![up[i].replace(/\.+$/, '')] = w.x0; }); topTesta = t; break;
    }
  }
  if (!testa) return out;
  const xs: [string, number][] = ([
    ['soc', 0], ['n', (testa.N ?? 0) - 8], ['campo', (testa.CAMPO ?? testa['CAMPO/LOCALITÀ'] ?? 0) - 4], ['ind', testa.INDIRIZZO - 4],
    ['ora', (testa.ORARIO ?? p.width) - 6], ['giorno', (testa.GIORNO ?? p.width) - 6],
  ] as [string, number][]).sort((a, b) => a[1] - b[1]);
  const cella = (ws: Parola[], k: string) => {
    const i = xs.findIndex(([n]) => n === k), lo = xs[i][1], hi = i + 1 < xs.length ? xs[i + 1][1] : p.width;
    return testo(ws.filter((w) => w.x0 >= lo && w.x0 < hi));
  };
  let prec: Campo | null = null;
  for (const [t, ws] of rs) {
    if (t <= topTesta || !ws.length) continue;
    if (ws[0].text.startsWith('La') && testo(ws.slice(0, 3)).includes('Società')) break;
    const cod = cella(ws, 'n');
    if (cifre(cod)) {
      let ora: string | null = cella(ws, 'ora').replace('.', ':');
      if (!/^\d{1,2}:\d{2}$/.test(ora)) ora = null;
      const g = cella(ws, 'giorno').toLowerCase();
      prec = { societa: cella(ws, 'soc'), codice: cod, campo: cella(ws, 'campo'), ora, indirizzo: cella(ws, 'ind'), giorno: g === 'sabato' || g === 'domenica' ? g : null };
      out.push(prec);
    } else if (prec) {   // riga a capo (nome o campo su due righe)
      for (const [k, f] of [['soc', 'societa'], ['campo', 'campo'], ['ind', 'indirizzo']] as const) {
        const extra = cella(ws, k);
        if (extra && extra.length < 60) prec[f] = (prec[f] + ' ' + extra).trim();
      }
      prec = null;
    }
  }
  return out;
}

/** Bordi di una tabella: linee alla stessa posizione messe insieme (bordi doppi o spessi); restano solo quelle lunghe in tutto almeno
 *  `quota` della più lunga (i pezzetti dentro le celle, come sottolineature o lettere disegnate, no) */
function bordi(linee: Linea[], quota: number) {
  const gruppi: { a: number; lungo: number }[] = [];
  for (const l of linee.slice().sort((x, y) => x.a - y.a)) {
    const g = gruppi[gruppi.length - 1];
    if (g && l.a - g.a <= 2) g.lungo += l.fino - l.da; else gruppi.push({ a: l.a, lungo: l.fino - l.da });
  }
  const max = Math.max(0, ...gruppi.map((g) => g.lungo));
  return gruppi.filter((g) => g.lungo >= max * quota).map((g) => g.a);
}
/** Elenco campi da una tabella coi bordi: righe e colonne dalle linee, testo di ogni cella, poi i campi riconosciuti dal contenuto
 *  (le colonne non sono sempre allineate alle intestazioni): numero del campo, ora, giorno, poi campo e indirizzo nell'ordine */
export function campiDaTabella(p: Pagina): Campo[] {
  // niente bordi della pagina intera (sfondo bianco): solo le linee dentro la pagina
  const dentro = (p.linee ?? []).filter((l) => l.fino - l.da < (l.verticale ? 560 : p.width * 0.95) && l.a > 3 && (!l.verticale || l.a < p.width - 3));
  const vert = dentro.filter((l) => l.verticale);
  const xs = bordi(vert, 0.25), ys = bordi(dentro.filter((l) => !l.verticale), 0.25);
  if (xs.length < 4 || ys.length < 3) return [];
  // in ogni riga contano solo i bordi verticali che la attraversano davvero (celle unite, bordi di altre tabelle)
  const taglia = (x: number, y: number) => vert.some((l) => Math.abs(l.a - x) <= 2 && l.da - 1 <= y && l.fino + 1 >= y);
  const out: Campo[] = [];
  let tabellaGiusta = false;
  for (let r = 0; r + 1 < ys.length; r++) {
    const y0 = ys[r], y1 = ys[r + 1];
    if (y1 - y0 < 4) continue;
    const parole = p.parole.filter((w) => w.top + 2 > y0 && w.top + 2 < y1);
    if (!parole.length) continue;
    const celle: string[] = [];
    const xr = xs.filter((x) => taglia(x, (y0 + y1) / 2));
    for (let c = 0; c + 1 < xr.length; c++) {
      const dentro = parole.filter((w) => (w.x0 + w.x1) / 2 >= xr[c] && (w.x0 + w.x1) / 2 < xr[c + 1]);
      // ogni linea della cella poi unite con uno spazio
      celle.push(righe(dentro).map(([, ws]) => testo(ws)).join(' ').replace(/\s+/g, ' ').trim());
    }
    const piene = celle.filter(Boolean);
    if (!tabellaGiusta) { if (piene.join(' ').toUpperCase().includes('SOCIET')) tabellaGiusta = true; continue; }
    if (piene.length < 3) continue;
    const cod = piene.slice(1, 3).find(cifre);
    if (!cod) continue;
    const ora = piene.map((c) => c.replace('.', ':')).find((c) => /^\d{1,2}:\d{2}$/.test(c)) ?? null;
    const g = piene.map((c) => c.toLowerCase()).find((c) => c === 'sabato' || c === 'domenica') ?? null;
    const resto = piene.slice(1).filter((c) => c !== cod && c.replace('.', ':') !== ora && !['sabato', 'domenica', 'ufficiale'].includes(c.toLowerCase()));
    out.push({ societa: piene[0], codice: cod, campo: resto[0] ?? '', ora, indirizzo: resto[1] ?? '', giorno: g });
  }
  return out;
}

export function leggi(pagine: Pagina[], inizio: number): Lettura {
  const gironi: Lettura['gironi'] = {};
  let corrente: string | null = null;
  for (const p of pagine) {
    const g: string | null = gironeDi(p) ?? corrente;
    const partite = leggiCalendario(p, inizio);
    if (partite.length) {
      corrente = g;
      (gironi[g ?? '?'] ??= { partite: [], campi: [] }).partite.push(...partite);
    } else {
      const campi = leggiCampi(p);
      if (campi.length && g) (gironi[g] ??= { partite: [], campi: [] }).campi.push(...campi);
    }
  }
  return { gironi };
}

/* ---------- Preparazione (prepara.py): nomi, abbinamento all'elenco campi, data, ora e campo di ogni partita ---------- */
const FORME = /\b(A\.?S\.?D\.?|S\.?S\.?D\.?|S\.?R\.?L\.?|A\.?\s?R\.?\s?L\.?|SSDARL|SSDSRL|SSDRL|SCARL|S\.C\.A\.R\.L\.|U\.?S\.?D\.?|A\.?C\.?D\.?|G\.?S\.?D\.?|S\.?S\.?|U\.?S\.?|A\.?S\.?|POL\.?D\.?|SQ\.?\s?[A-C]|SQ[A-C])\b/g;
const ABBR: [RegExp, string][] = [
  [/\bACC\.\s*|\bAC\.\s*/g, ' ACCADEMIA '], [/\bC\.\s*/g, ' CALCIO '], [/\bS\.\s*/g, ' SAN '], [/\bORAT\.\s*|\bOR\.\s*/g, ' ORATORIO '],
  [/\bPOL\.\s*/g, ' POLISPORTIVA '], [/\bF\.\s*C\.\s*/g, ' FOOTBALL CLUB '], [/\bACCADEMY\b|\bACADEMY\b/g, ' ACCADEMIA '], [/\bGIOV\.\s*/g, ' GIOVANILE '],
];
const FORME_NOME = /\b(A\.S\.D\.|ASD|S\.S\.D\.?|SSD|S\.R\.L\.|SRL|A\s?R\.?L\.?|ARL|SSDARL|SSDSRL|SCARL|S\.C\.A\.R\.L\.|U\.S\.D\.|USD|G\.S\.D\.|POL\.D\.|A\.S\.|U\.S\.|S\.S\.|SSD\s?A\s?RL|\*FCL\*|SQ\.?\s?[A-C])(?=\s|$)/g;
const UNIONI: Record<string, string> = { ATALANTABERGAMASCACALCIO: 'ATALANTABERGAMASCA' };
const SIGLE = new Set(['AC', 'ACD', 'GSO', 'ASR', 'CSC', 'OSL', 'FBC', 'GS', 'US', 'SC', 'CG', 'BMV', 'OSGB']);
const MINUSCOLE = new Set(['DI', 'DEL', 'DELLA', 'E', 'IN', 'SUL', 'SULL', 'DE']);

export const maiuscolo = (s: string) => s.normalize('NFKD').replace(/[^\x00-\x7f]/g, '').toUpperCase();
/** Chiave di confronto: senza forme societarie, abbreviazioni sciolte, solo lettere e cifre */
export function pulito(s: string) {
  let t = maiuscolo(s).replace(/S\s?Q\.?\s?[A-C]\b|\*FCL\*/g, ' ').replace(FORME, ' ');
  for (const [a, b] of ABBR) t = t.replace(a, b);
  return t.replace(FORME, ' ').replace(/[^A-Z0-9]/g, '');
}
export function squadraB(s: string) {
  const m = s.match(/S\s?Q\.?\s?([BC])\b|sq\.?([BC])\b/i);
  return m ? (m[1] || m[2]).toUpperCase() : '';
}
/** "U.S.D. CASATESE MERATE A.S.D." → "Casatese Merate" */
export function nomeBello(uff: string) {
  let t = uff.replace('*FCL*', ' ').replace(/S\s?Q\.?\s?[A-C]\b/gi, ' ').replace(/\s+/g, ' ');
  t = t.replace(/(\d)(SRL|SSD)\b/g, '$1');
  for (let i = 0; i < 3; i++) t = (t + ' ').replace(FORME_NOME, ' ').trim().replace(/^(U\.S\.D\.|A\.S\.D\.|G\.S\.D\.|S\.S\.D\.)\s*/, '');
  const parole = t.split(/\s+/).filter(Boolean).map((p, i) => {
    if (/^([A-Z]\.)+[A-Z]?\.?$/.test(p) || /\d/.test(p) || SIGLE.has(p.toUpperCase()) || /^[IVX]{2,}$/.test(p.toUpperCase())) return p.toUpperCase();
    if (i > 0 && MINUSCOLE.has(p.toUpperCase())) return p.toLowerCase();
    return p.toLowerCase().replace(/(^|[.'])([a-z])/g, (_, a, b) => a + b.toUpperCase());
  });
  return parole.join(' ') || uff;
}
/** Somiglianza come difflib.SequenceMatcher.ratio() (Ratcliff/Obershelp) */
export function somiglianza(a: string, b: string) {
  if (!a.length && !b.length) return 1;
  const uguali = (a0: number, a1: number, b0: number, b1: number): number => {
    let best = 0, bi = 0, bj = 0;
    for (let i = a0; i < a1; i++) for (let j = b0; j < b1; j++) {
      let k = 0; while (i + k < a1 && j + k < b1 && a[i + k] === b[j + k]) k++;
      if (k > best) { best = k; bi = i; bj = j; }
    }
    return best ? best + uguali(a0, bi, b0, bj) + uguali(bi + best, a1, bj + best, b1) : 0;
  };
  return (2 * uguali(0, a.length, 0, b.length)) / (a.length + b.length);
}
export function punteggio(a: string, b: string) {
  if (squadraB(a) !== squadraB(b)) return 0;
  const x = pulito(a), y = pulito(b);
  if (x === y) return 3;
  if (x.length >= 4 && (x.includes(y) || y.includes(x))) return 2 + Math.min(x.length, y.length) / Math.max(x.length, y.length);
  return somiglianza(x, y) * 2;
}
/** Nome nel calendario → riga dell'elenco campi (uno a uno, i più simili prima); punteggio -1 = variante di un altro nome */
export function abbinaGirone(partite: PartitaLetta[], campi: Campo[]) {
  const conta = new Map<string, number>();
  for (const p of partite) for (const n of [p.casa, p.trasferta]) conta.set(n, (conta.get(n) ?? 0) + 1);
  const top = Math.max(...conta.values());
  const principali = [...conta.keys()].filter((n) => conta.get(n)! >= top / 2), varianti = [...conta.keys()].filter((n) => conta.get(n)! < top / 2);
  const coppie = principali.flatMap((n) => campi.map((k, i) => [punteggio(n, k.societa), n, i] as const))
    .sort((p, q) => q[0] - p[0] || (q[1] < p[1] ? -1 : q[1] > p[1] ? 1 : 0) || q[2] - p[2]);
  const mappa = new Map<string, [number | null, number]>(), usati = new Set<number>();
  for (const [s, n, i] of coppie) { if (mappa.has(n) || usati.has(i)) continue; mappa.set(n, [i, s]); usati.add(i); }
  for (const v of varianti) {
    const best = principali.reduce((a, b) => (punteggio(v, b) > punteggio(v, a) ? b : a));
    mappa.set(v, [mappa.get(best)?.[0] ?? null, -1]);
  }
  return mappa;
}
const giornoSettimana = (iso: string) => new Date(iso + 'T12:00:00Z').getUTCDay();   // 0 domenica … 6 sabato
const sposta = (iso: string, g: number) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + g); return d.toISOString().slice(0, 10); };
/** Il giorno dell'elenco campi (sabato/domenica) sposta la data nello stesso fine settimana */
export function giornoPartita(elencata: string, giorno: string | null) {
  const w = giornoSettimana(elencata);
  if (w === 0 && giorno === 'sabato') return sposta(elencata, -1);
  if (w === 6 && giorno === 'domenica') return sposta(elencata, 1);
  return elencata;
}

export type Lato = { calendario: string; ufficiale: string; chiave: string; nome: string; squadra: string };
export type PartitaPronta = {
  stagione: string; categoria: string; girone: string; giornata: number; turno: 'andata' | 'ritorno'; data_calendario: string; data: string;
  ora: string | null; casa: Lato; trasferta: Lato; campo: string | null; indirizzo: string | null; codice_campo: string | null; fonte: string;
};
/** Le partite di un PDF pronte da importare, più i dubbi da mostrare (nomi abbinati male, elenco campi mancante) */
export function prepara(l: Lettura, categoria: string, inizio: number, file: string) {
  const stagione = `${inizio}/${String(inizio + 1).slice(2)}`;
  const partite: PartitaPronta[] = [], dubbi: string[] = [];
  for (const g of Object.keys(l.gironi).sort()) {
    const { partite: lette, campi } = l.gironi[g];
    if (!campi.length) { dubbi.push(`Girone ${g}: elenco dei campi mancante`); continue; }
    if (!lette.length) continue;
    const mappa = abbinaGirone(lette, campi);
    for (const [n, [i, s]] of mappa) if (i === null || (s >= 0 && s < 1.2)) dubbi.push(`Girone ${g}: "${n}" → ${i !== null ? campi[i].societa : '?'}`);
    const squadra = (n: string) => {
      const i = mappa.get(n)?.[0] ?? null, uff = i !== null ? campi[i].societa : n;
      return { lato: { calendario: n, ufficiale: uff, chiave: pulito(uff), nome: nomeBello(uff), squadra: squadraB(n) || squadraB(uff) }, riga: i !== null ? campi[i] : null };
    };
    for (const p of lette) {
      const casa = squadra(p.casa), fuori = squadra(p.trasferta);
      for (const turno of ['andata', 'ritorno'] as const) {
        const elencata = p[turno];
        if (!elencata) continue;
        const [h, a] = turno === 'andata' ? [casa, fuori] : [fuori, casa];   // al ritorno si invertono casa e trasferta
        const c = h.riga;
        const infrasettimanale = giornoSettimana(elencata) >= 1 && giornoSettimana(elencata) <= 5;
        const ora = c?.ora && /^\d{1,2}[:.]\d{2}$/.test(c.ora) ? c.ora.replace('.', ':') : null;
        partite.push({
          stagione, categoria, girone: g, giornata: p.giornata, turno, data_calendario: elencata, data: giornoPartita(elencata, c?.giorno ?? null),
          ora: infrasettimanale ? null : ora, casa: { ...h.lato }, trasferta: { ...a.lato },
          campo: c?.campo ?? null, indirizzo: c?.indirizzo ?? null, codice_campo: c?.codice ?? null, fonte: `Calendario ${categoria} girone ${g} (${file})`,
        });
      }
    }
  }
  unisciSocieta(partite);
  return { partite, dubbi };
}
/** Stessa società scritta in modo diverso ("C.S.C. COSTAMASNAGA" / "COSTAMASNAGA"): si uniscono se un nome contiene l'altro E giocano
 *  sullo stesso campo; poi ogni società prende il nome più completo */
export function unisciSocieta(partite: PartitaPronta[]) {
  const campi = new Map<string, Set<string>>(), nomi = new Map<string, Map<string, number>>();
  const conta = (m: Map<string, number>, k: string, n = 1) => m.set(k, (m.get(k) ?? 0) + n);
  for (const p of partite) {
    for (const s of [p.casa, p.trasferta]) { if (!nomi.has(s.chiave)) nomi.set(s.chiave, new Map()); conta(nomi.get(s.chiave)!, s.nome); }
    if (p.codice_campo) { if (!campi.has(p.casa.chiave)) campi.set(p.casa.chiave, new Set()); campi.get(p.casa.chiave)!.add(p.codice_campo); }
  }
  const chiavi = [...nomi.keys()].sort((a, b) => a.length - b.length);
  const dove = new Map(chiavi.map((k) => [k, UNIONI[k] ?? k]));
  chiavi.forEach((a, i) => chiavi.slice(i + 1).forEach((b) => {
    const ca = campi.get(a), cb = campi.get(b);
    if (a.length >= 5 && b.includes(a) && ca && cb && [...ca].some((x) => cb.has(x))) dove.set(b, dove.get(a)!);
  }));
  const finale = new Map<string, Map<string, number>>();
  for (const [k, n] of nomi) { const d = dove.get(k)!; if (!finale.has(d)) finale.set(d, new Map()); for (const [x, c] of n) conta(finale.get(d)!, x, c); }
  for (const p of partite) for (const s of [p.casa, p.trasferta]) {
    s.chiave = dove.get(s.chiave)!;
    s.nome = [...finale.get(s.chiave)!.keys()].reduce((a, b) => (b.length > a.length ? b : a));
  }
}

/** Categoria indovinata dal testo della prima pagina e dal nome del file (da controllare): "Under 17 Élite", "Under 15 Provinciali Lecco"… */
export function indovinaCategoria(testo: string, file: string) {
  const t = maiuscolo(testo + ' ' + file), f = maiuscolo(file);
  const m = t.match(/(?<![A-Z])(?:UNDER|U)\s?\.?\s?(1[4-9])(?!\d)/);
  const eta = t.includes('JUNIORES') ? '19' : m ? m[1] : '?';
  const nome = `Under ${eta}` + (eta === '19' ? ' Juniores' : '');
  const CITTA = ['BERGAMO', 'MONZA', 'LECCO', 'SONDRIO', 'COMO', 'VARESE', 'MILANO'];
  const nome1 = (c?: string) => (c ? c[0] + c.slice(1).toLowerCase() : null);
  // prima il nome del file (città o "Reg"), poi il testo del PDF (città nominata in un calendario provinciale, "BG" dei comunicati)
  const delFile = nome1(CITTA.find((c) => f.includes(c))) ?? (/\bBG\b/.test(f) ? 'Bergamo' : null);
  if (t.includes('ELITE')) return `${nome} Élite`;
  if (delFile) return `${nome} Provinciali ${delFile}`;
  if (f.includes('REG') || (t.includes('REGIONAL') && !t.includes('PROVINCIAL'))) return `${nome} Regionali`;
  const dalTesto = (/PROVINCIAL/.test(t) ? nome1(CITTA.find((c) => new RegExp(`\\b${c}\\b`).test(t))) : null) ?? (/COMUNICATO[^*]{0,12}\bBG\b/.test(t) ? 'Bergamo' : null);
  if (dalTesto) return `${nome} Provinciali ${dalTesto}`;
  return `${nome} Provinciali ?`;
}
