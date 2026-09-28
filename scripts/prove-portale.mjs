// Prove rapide del Portale squadre (public/portale): il lint del progetto non lo controlla (JavaScript senza build).
// - ogni file .js si legge senza errori di sintassi;
// - index.html carica file che esistono, ognuno con la sua versione (?v=) e una sola volta;
// - ogni file .js della cartella è caricato da index.html (niente file dimenticati).
// Uso: node scripts/prove-portale.mjs   (parte da sola con npm run prove e su GitHub a ogni salvataggio)
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { Script } from 'node:vm';

const DIR = 'public/portale', errori = [];
const html = readFileSync(`${DIR}/index.html`, 'utf8');
const caricati = [...html.matchAll(/(?:src|href)="((?:js|css)\/[^"?]+)(\?v=\d+)?"/g)].map((m) => ({ file: m[1], versione: m[2] }));

for (const { file, versione } of caricati) {
  if (!existsSync(`${DIR}/${file}`)) errori.push(`index.html carica ${file}, che non esiste`);
  if (!versione) errori.push(`index.html carica ${file} senza versione (?v=): i telefoni terrebbero la copia vecchia`);
}
const doppi = caricati.map((c) => c.file).filter((f, i, a) => a.indexOf(f) !== i);
if (doppi.length) errori.push(`index.html carica due volte: ${[...new Set(doppi)].join(', ')}`);

const js = readdirSync(`${DIR}/js`).filter((f) => f.endsWith('.js'));
for (const f of js) {
  if (!caricati.some((c) => c.file === `js/${f}`)) errori.push(`js/${f} non è caricato da index.html`);
  try { new Script(readFileSync(`${DIR}/js/${f}`, 'utf8'), { filename: `js/${f}` }); }
  catch (e) { errori.push(`js/${f}: ${e.message}`); }
}

if (errori.length) { console.error('✗ Portale:\n  ' + errori.join('\n  ')); process.exit(1); }
console.log(`✓ Portale: ${js.length} file JavaScript senza errori di sintassi, ${caricati.length} file caricati con la loro versione`);
