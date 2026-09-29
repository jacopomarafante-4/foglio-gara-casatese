// Prove rapide del Portale squadre (public/portale): il lint del progetto non lo controlla (JavaScript senza build).
// - ogni file .js si legge senza errori di sintassi;
// - index.html carica file che esistono, ognuno con la sua versione (?v=) e una sola volta;
// - ogni file .js della cartella è caricato da index.html (niente file dimenticati);
// - effetti collaterali tra file (variabili globali condivise): nessun nome dichiarato in due file (una funzione con lo
//   stesso nome sostituirebbe l'altra senza avvisi), nessun nome usato ma mai definito (errore solo quando si apre la scheda);
// - public/portale/js/condivisi.js uguale a quello generato da lib/condivisi.ts (npm run condivisi).
// Uso: node scripts/prove-portale.mjs   (parte da sola con npm run prove e su GitHub a ogni salvataggio)
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { Script } from 'node:vm';
import { execFileSync } from 'node:child_process';
import * as espree from 'espree';
import { Linter } from 'eslint';
import globals from 'globals';

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

/* ---------- Effetti collaterali tra file ---------- */
const ordine = caricati.map((c) => c.file).filter((f) => f.endsWith('.js'));
const dichiarati = new Map();   // nome → file in cui è dichiarato in cima al file
const nomiDi = (nodo) => nodo.type === 'Identifier' ? [nodo.name]
  : nodo.type === 'ObjectPattern' ? nodo.properties.flatMap((p) => nomiDi(p.value ?? p.argument))
  : nodo.type === 'ArrayPattern' ? nodo.elements.filter(Boolean).flatMap(nomiDi)
  : nodo.type === 'AssignmentPattern' ? nomiDi(nodo.left) : nodo.type === 'RestElement' ? nomiDi(nodo.argument) : [];
const testi = {};
for (const f of ordine) {
  testi[f] = readFileSync(`${DIR}/${f}`, 'utf8');
  let ast;
  try { ast = espree.parse(testi[f], { ecmaVersion: 'latest', sourceType: 'script' }); } catch { continue; }   // sintassi: già segnalato
  for (const n of ast.body) {
    const nomi = n.type === 'FunctionDeclaration' || n.type === 'ClassDeclaration' ? [n.id.name]
      : n.type === 'VariableDeclaration' ? n.declarations.flatMap((d) => nomiDi(d.id)) : [];
    for (const nome of nomi) {
      if (dichiarati.has(nome)) errori.push(`"${nome}" è dichiarato sia in ${dichiarati.get(nome)} sia in ${f}: uno sostituisce l'altro`);
      else dichiarati.set(nome, f);
    }
  }
}
const esterni = { jspdf: 'readonly', supabase: 'readonly', html2canvas: 'readonly' };   // librerie caricate da index.html
const linter = new Linter({ configType: 'flat' });
const configurazione = [{
  languageOptions: { ecmaVersion: 'latest', sourceType: 'script',
    globals: { ...globals.browser, ...esterni, ...Object.fromEntries([...dichiarati.keys()].map((k) => [k, 'writable'])) } },
  rules: { 'no-undef': 'error' },
}];
for (const f of ordine) {
  for (const m of linter.verify(testi[f], configurazione, { filename: f })) {
    if (m.ruleId === 'no-undef') errori.push(`${f}:${m.line} usa "${m.message.match(/'([^']+)'/)?.[1]}", che non è definito in nessun file`);
  }
}

/* ---------- Regole comuni con lo Scouting ---------- */
try { execFileSync(process.execPath, ['scripts/genera-condivisi.mjs', '--controlla'], { stdio: 'pipe' }); }
catch (e) { errori.push(String(e.stderr || e.message).trim()); }

if (errori.length) { console.error('✗ Portale:\n  ' + errori.join('\n  ')); process.exit(1); }
console.log(`✓ Portale: ${js.length} file JavaScript senza errori di sintassi, ${caricati.length} file caricati con la loro versione, ${dichiarati.size} nomi globali senza doppioni né nomi mancanti, regole comuni aggiornate`);
