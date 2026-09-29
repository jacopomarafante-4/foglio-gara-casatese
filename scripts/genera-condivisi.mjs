// =====================================================================
// lib/condivisi.ts → public/portale/js/condivisi.js (il Portale non ha build: stesse regole dello Scouting, senza tipi)
// Uso: npm run condivisi            (rigenera il file)
//      npm run condivisi -- --controlla   (le prove rapide: errore se il file del Portale non è aggiornato)
// =====================================================================
import { readFileSync, writeFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
process.removeAllListeners('warning');   // l'avviso "sperimentale" di Node non serve

const SORGENTE = 'lib/condivisi.ts', DEST = 'public/portale/js/condivisi.js';
const ts = readFileSync(SORGENTE, 'utf8');
const js = stripTypeScriptTypes(ts, { mode: 'strip' })
  .replace(/^export type .*$/gm, '')            // tipi sulla riga (già svuotati)
  .replace(/^export /gm, '')                     // nel Portale sono variabili globali
  .replace(/ {2,}(?=[){;,])/g, '')                // spazi rimasti al posto dei tipi
  .replace(/[ \t]+$/gm, '')
  .replace(/\n{3,}/g, '\n\n');
const nomi = [...ts.matchAll(/^export (?:const|function) (\w+)/gm)].map((m) => m[1]);
const testa = `/* FILE GENERATO da lib/condivisi.ts con "npm run condivisi": non modificarlo qui.
   Regole comuni a Scouting e Portale: ${nomi.join(', ')}. */\n`;
const risultato = testa + js.trimStart();

if (process.argv.includes('--controlla')) {
  let attuale = '';
  try { attuale = readFileSync(DEST, 'utf8'); } catch { /* manca */ }
  if (attuale !== risultato) { console.error(`✗ ${DEST} non è aggiornato: lancia npm run condivisi`); process.exit(1); }
  console.log(`✓ Regole comuni: ${DEST} aggiornato (${nomi.length} voci)`);
} else {
  writeFileSync(DEST, risultato);
  console.log(`Creato ${DEST}: ${nomi.join(', ')}`);
}
