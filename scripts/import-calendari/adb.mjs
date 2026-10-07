// Calendari dell'attività di base (Esordienti, Pulcini, Primi calci, Piccoli amici) nella tabella `gare`, per lo Scouting.
// Stesse regole dell'importazione dei calendari ufficiali dell'app (lib/calendario-pdf.ts, lib/importa-calendario-ufficiale.ts);
// un PDF può contenere più categorie (Monza): le pagine si dividono per categoria prima di leggerle.
// Uso: node --env-file=.env.local scripts/import-calendari/adb.mjs [cartella=private/calendari-adb] [--conferma]
import { readdir, readFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
import { pagineDelPdf } from '../../lib/leggi-pdf.ts';
import { leggi, maiuscolo, prepara } from '../../lib/calendario-pdf.ts';
import { scriviGare } from '../../lib/importa-calendario-ufficiale.ts';

const INIZIO = 2026;   // stagione 2026/27: "12 anni" = nati nel 2014
const conferma = process.argv.includes('--conferma');
const cartella = process.argv.slice(2).find((a) => !a.startsWith('--')) ?? 'private/calendari-adb';
const DELEGAZIONI = ['MONZA', 'LECCO', 'BERGAMO', 'COMO', 'VARESE', 'SONDRIO', 'MILANO'];

/** "ESORDIENTI 9>9 12 anni MONZA" → "Esordienti 12 anni Monza - 2014"; null se non è attività di base */
export function etichetta(testo, delegazione) {
  const t = maiuscolo(testo);
  const tipo = [['ESORDIENTI', 'Esordienti', [12, 11]], ['PULCINI', 'Pulcini', [10, 9]], ['PRIMI CALCI', 'Primi calci', [8, 7]], ['PICCOLI AMICI', 'Piccoli amici', [6, 5]]]
    .find(([k]) => t.includes(k));
  if (!tipo) return null;
  const [, nome, [grande, piccolo]] = tipo;
  let anni;
  if (/MISTI/.test(t) || /\b(\d)\s*-\s*(\d)\s*ANNI/.test(t) || nome === 'Piccoli amici') anni = [grande, piccolo];
  else if (/2\s*°\s*ANNO/.test(t)) anni = [grande];
  else if (/1\s*°\s*ANNO/.test(t)) anni = [piccolo];
  else { const n = Number(t.match(/\b(\d{1,2})\s*ANNI/)?.[1]); anni = n ? [n] : [grande, piccolo]; }
  const del = delegazione[0] + delegazione.slice(1).toLowerCase();
  const descr = anni.length === 1 ? `${anni[0]} anni` : 'misti';
  return `${nome} ${descr} ${del} - ${anni.map((a) => INIZIO - a).sort().join('/')}`;
}

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

/** Nomi dei PDF dell'attività di base che l'abbinamento non riconosce, aggiunti come nomi alternativi della società in archivio */
const ALIAS = { 'Polisportiva Cgb Ssdrl': ['POLISPORTIVA CGB SSDR'], 'Polisportiva Castello  Brianza': ['POL. CASTELLO DI BRIANZA'], 'AC MONZA': ['MONZA S.P.A.'] };
for (const [nome, alias] of Object.entries(ALIAS)) {
  const { data: s } = await db.from('societa').select('id, alias').eq('nome', nome).single();
  if (!s) { console.log(`Società "${nome}" non trovata`); continue; }
  const tutti = [...new Set([...(s.alias ?? []), ...alias])];
  if (conferma && tutti.length !== (s.alias ?? []).length) await db.from('societa').update({ alias: tutti }).eq('id', s.id);
}
const file = (await readdir(cartella)).filter((f) => f.toLowerCase().endsWith('.pdf')).sort();
const tot = { gare: 0, nuove: 0, gia: 0, bloccate: 0, societa: new Set(), dubbi: 0 };
for (const f of file) {
  const pagine = await pagineDelPdf(new Uint8Array(await readFile(`${cartella}/${f}`)));
  // pagine divise per categoria: intestazione della pagina, se manca quella della pagina prima, se no il nome del file
  const gruppi = new Map();
  let corrente = null;
  for (const p of pagine) {
    const testo = p.righe.slice(0, 8).join(' ');
    const del = DELEGAZIONI.find((d) => maiuscolo(testo + ' ' + f).includes(d)) ?? (f.includes('Calendario ') ? 'LECCO' : '?');
    const e = etichetta(testo, del) ?? (corrente ? null : etichetta(f, del));
    if (e) corrente = e;
    if (!corrente) continue;
    if (!gruppi.has(corrente)) gruppi.set(corrente, []);
    gruppi.get(corrente).push(p);
  }
  for (const [categoria, pp] of gruppi) {
    const { partite, dubbi } = prepara(leggi(pp, INIZIO), categoria, INIZIO, f);
    const { riepilogo: r } = await scriviGare(db, partite, conferma);
    tot.gare += r.gare; tot.nuove += r.nuoveGare; tot.gia += r.gia; tot.bloccate += r.bloccate; tot.dubbi += dubbi.length;
    r.nuove.forEach((n) => tot.societa.add(n));
    if (process.argv.includes("--societa")) r.nuove.forEach((n) => console.log("    + " + n));
    console.log(`${categoria.padEnd(40)} gare ${String(r.gare).padStart(4)} (nuove ${r.nuoveGare}, già ${r.gia}) · società nuove ${r.nuove.length} · dubbi ${dubbi.length}`);
    for (const d of dubbi.slice(0, 3)) console.log('    ? ' + d);
  }
}
console.log(`\n${conferma ? 'SCRITTE' : 'SIMULAZIONE (niente scritto)'}: ${tot.gare} gare (${tot.nuove} nuove, ${tot.gia} già presenti, ${tot.bloccate} confermate/variate non toccate), ${tot.societa.size} società nuove, ${tot.dubbi} dubbi`);
