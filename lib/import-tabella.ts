// Importazione di una tabella (Excel .xlsx o CSV) con colonne scelte da chi importa: rose (Squadra → Rosa) e anagrafica dei tesserati
// (Segreteria). Il file si legge nel browser; le colonne si indovinano dal nome (sinonimi) e si possono cambiare. Funzioni pure,
// provate in tests/import-tabella.test.mjs.
import { leggiCsv, leggiData } from '@/lib/import-calendario';
import { leggiXlsx } from '@/lib/xlsx';

export type CampoImport = { k: string; etichetta: string; sinonimi: string[]; obbligatorio?: boolean };
export const norm = (s?: string) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

/** Il file come tabella di testo (righe vuote tolte) */
export async function leggiTabella(file: File): Promise<string[][]> {
  const dati = new Uint8Array(await file.arrayBuffer());
  const tab = /\.xlsx$/i.test(file.name) || (dati[0] === 0x50 && dati[1] === 0x4b) ? await leggiXlsx(dati)
    : leggiCsv(new TextDecoder(/�/.test(new TextDecoder().decode(dati.slice(0, 4000))) ? 'windows-1252' : 'utf-8').decode(dati));
  return tab.map((r) => r.map((c) => String(c ?? '').trim())).filter((r) => r.some(Boolean));
}

/** Riga delle intestazioni: la prima (tra le prime 10) che contiene più nomi di colonna conosciuti */
export function rigaIntestazione(tab: string[][], campi: CampoImport[]) {
  let migliore = 0, punti = -1;
  tab.slice(0, 10).forEach((r, i) => {
    const p = r.filter((h) => campi.some((c) => c.sinonimi.some((s) => norm(h) === norm(s) || norm(h).startsWith(norm(s))))).length;
    if (p > punti) { punti = p; migliore = i; }
  });
  return migliore;
}

/** Colonna di ogni campo: prima il nome uguale, poi uno che comincia così; ogni colonna a un solo campo */
export function indovinaColonne(intestazione: string[], campi: CampoImport[]): Record<string, number> {
  const usate = new Set<number>(), out: Record<string, number> = {};
  for (const giro of ['uguale', 'inizio'] as const) for (const c of campi) {
    if (out[c.k] !== undefined) continue;
    const i = intestazione.findIndex((h, j) => !usate.has(j) && c.sinonimi.some((s) => giro === 'uguale' ? norm(h) === norm(s) : norm(h).startsWith(norm(s))));
    if (i >= 0) { out[c.k] = i; usate.add(i); }
  }
  for (const c of campi) out[c.k] ??= -1;
  return out;
}

/** Le righe come oggetti campo → valore (celle vuote tolte) */
export function righeMappate(tab: string[][], intest: number, colonne: Record<string, number>) {
  return tab.slice(intest + 1).map((r) => Object.fromEntries(Object.entries(colonne).filter(([, i]) => i >= 0 && r[i]).map(([k, i]) => [k, r[i]])) as Record<string, string>)
    .filter((r) => Object.keys(r).length);
}

/** "ROSSI", "mario elena" → "Rossi Mario Elena" (come i nomi delle rose: Cognome Nome) */
export function nomeCompleto(r: Record<string, string>) {
  const t = (r.cognome && r.nome ? `${r.cognome} ${r.nome}` : r.completo || r.cognome || r.nome || '').replace(/\s+/g, ' ').trim();
  return t.toLowerCase().replace(/(^|[\s'’-])(\p{L})/gu, (_, a, b) => a + b.toUpperCase());
}
/** Stesso giocatore? Stesse parole, in qualsiasi ordine ("Rossi Mario" = "Mario Rossi") */
export function stessoNome(a: string, b: string) {
  const p = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean).sort().join(' ');
  return !!p(a) && p(a) === p(b);
}
/** Data di nascita da "12/03/2012", "2012-03-12" o numero di Excel; '' se non si capisce */
export const dataNascita = (v?: string) => { const d = leggiData(v ?? ''); return /^(19|20)\d{2}-\d{2}-\d{2}$/.test(d) ? d : ''; };
/** Telefono pulito: solo cifre e + iniziale */
export const telefono = (v?: string) => (v ?? '').replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '');

/* ---------- Anagrafica dei tesserati (Segreteria) ---------- */
export const CAMPI_ANAGRAFICA: CampoImport[] = [
  { k: 'cognome', etichetta: 'Cognome del ragazzo', sinonimi: ['cognome', 'cognomeatleta', 'cognometesserato', 'surname'] },
  { k: 'nome', etichetta: 'Nome del ragazzo', sinonimi: ['nome', 'nomeatleta', 'nometesserato', 'name'] },
  { k: 'completo', etichetta: 'Cognome e nome insieme', sinonimi: ['cognomenome', 'nomecognome', 'nominativo', 'atleta', 'tesserato', 'giocatore'] },
  { k: 'nascita', etichetta: 'Data di nascita', sinonimi: ['datadinascita', 'datanascita', 'nascita', 'natoil', 'nato', 'birth'] },
  { k: 'genitore1_nome', etichetta: 'Genitore 1: nome', sinonimi: ['genitore1', 'genitore', 'nomegenitore', 'padre', 'madre', 'referente', 'tutore'] },
  { k: 'genitore1_tel', etichetta: 'Genitore 1: telefono', sinonimi: ['telefonogenitore1', 'telgenitore1', 'cellularegenitore', 'telefono', 'cellulare', 'tel', 'cell'] },
  { k: 'genitore1_email', etichetta: 'Genitore 1: email', sinonimi: ['emailgenitore1', 'emailgenitore', 'email', 'mail', 'posta'] },
  { k: 'genitore2_nome', etichetta: 'Genitore 2: nome', sinonimi: ['genitore2', 'secondogenitore'] },
  { k: 'genitore2_tel', etichetta: 'Genitore 2: telefono', sinonimi: ['telefonogenitore2', 'telgenitore2', 'telefono2', 'cellulare2'] },
  { k: 'genitore2_email', etichetta: 'Genitore 2: email', sinonimi: ['emailgenitore2', 'email2', 'mail2'] },
  { k: 'certificato_scadenza', etichetta: 'Scadenza certificato medico', sinonimi: ['scadenzacertificato', 'scadenzavisita', 'certificatomedico', 'certificato', 'visitamedica', 'scadenzavisitamedica'] },
  { k: 'taglia_divisa', etichetta: 'Taglia divisa', sinonimi: ['tagliadivisa', 'taglia', 'tagliakit', 'tagliamaglia'] },
  { k: 'taglia_tuta', etichetta: 'Taglia tuta', sinonimi: ['tagliatuta', 'tuta'] },
];
export type DatiAnagrafica = Partial<Record<'genitore1_nome' | 'genitore1_tel' | 'genitore1_email' | 'genitore2_nome' | 'genitore2_tel' | 'genitore2_email'
  | 'certificato_scadenza' | 'taglia_divisa' | 'taglia_tuta', string>>;

/** I dati della segreteria di una riga del file, puliti (telefoni, email, date); solo quelli presenti */
export function datiDaRiga(r: Record<string, string>): DatiAnagrafica {
  const out: DatiAnagrafica = {};
  for (const k of ['genitore1_nome', 'genitore2_nome'] as const) if (r[k]) out[k] = r[k].replace(/\s+/g, ' ').trim();
  for (const k of ['genitore1_tel', 'genitore2_tel'] as const) if (telefono(r[k]).length >= 6) out[k] = telefono(r[k]);
  for (const k of ['genitore1_email', 'genitore2_email'] as const) if (/^\S+@\S+\.\S+$/.test((r[k] ?? '').trim())) out[k] = r[k].trim().toLowerCase();
  const cert = leggiData(r.certificato_scadenza ?? '');
  if (/^20\d{2}-\d{2}-\d{2}$/.test(cert)) out.certificato_scadenza = cert;
  for (const k of ['taglia_divisa', 'taglia_tuta'] as const) if (r[k]) out[k] = r[k].trim().toUpperCase().slice(0, 20);
  return out;
}

export type Abbinamento = { riga: number; nome: string; nascita: string; dati: DatiAnagrafica; giocatori: { squadra: string; id: string; name: string }[] };
/** Ogni riga del file con i giocatori delle rose che hanno lo stesso nome (anche in più squadre, es. U18 e U19 con la stessa rosa);
 *  con lo stesso nome e date di nascita diverse vale la data, se c'è */
export function abbinaAnagrafica(righe: Record<string, string>[], squadre: { id: string; players: { id: string; name: string }[] }[],
  nascite: Record<string, string> = {}) {
  const abbinate: Abbinamento[] = [], nonTrovate: { riga: number; nome: string }[] = [];
  righe.forEach((r, i) => {
    const nome = nomeCompleto(r);
    if (nome.length < 3) return;
    const nascita = dataNascita(r.nascita);
    let giocatori = squadre.flatMap((s) => s.players.filter((p) => stessoNome(p.name, nome)).map((p) => ({ squadra: s.id, id: p.id, name: p.name })));
    if (nascita && giocatori.length > 1) {
      const conData = giocatori.filter((g) => !nascite[`${g.squadra}|${g.id}`] || nascite[`${g.squadra}|${g.id}`] === nascita);
      if (conData.length) giocatori = conData;
    }
    if (giocatori.length) abbinate.push({ riga: i, nome, nascita, dati: datiDaRiga(r), giocatori });
    else nonTrovate.push({ riga: i, nome });
  });
  return { abbinate, nonTrovate };
}
/** Dati nuovi messi sopra quelli di prima: i campi vuoti del file non cancellano nulla; senza `sovrascrivi` si riempiono solo i vuoti */
export function unisciDati<T extends Record<string, unknown>>(prima: T, nuovi: DatiAnagrafica, sovrascrivi: boolean): T {
  const out: Record<string, unknown> = { ...prima };
  for (const [k, v] of Object.entries(nuovi)) if (v && (sovrascrivi || !out[k])) out[k] = v;
  return out as T;
}
