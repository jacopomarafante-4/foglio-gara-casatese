// =====================================================================
// Versioni dei file del Portale calcolate dal contenuto: in index.html ogni js/… e css/… ha ?v=<impronta di 8 caratteri>.
// Se il file cambia cambia l'impronta, e i telefoni scaricano la copia nuova; se non cambia resta uguale (niente numeri a mano).
// Uso: npm run portale:versioni              (aggiorna index.html)
//      node scripts/versioni-portale.mjs --controlla   (le prove: errore se una versione non corrisponde al file)
// =====================================================================
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const DIR = 'public/portale', INDEX = `${DIR}/index.html`;
const impronta = (file) => createHash('sha256').update(readFileSync(`${DIR}/${file}`)).digest('hex').slice(0, 8);
const html = readFileSync(INDEX, 'utf8');
const sbagliate = [];
const nuovo = html.replace(/((?:src|href)=")((?:js|css)\/[^"?]+)(?:\?v=[^"]*)?"/g, (_, attr, file) => {
  const v = impronta(file), prima = html.match(new RegExp(`${file.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}\\?v=([^"]*)"`))?.[1];
  if (prima !== v) sbagliate.push(file);
  return `${attr}${file}?v=${v}"`;
});

if (process.argv.includes('--controlla')) {
  if (sbagliate.length) { console.error(`✗ Versioni del Portale non aggiornate (${sbagliate.join(', ')}): lancia npm run portale:versioni`); process.exit(1); }
  console.log('✓ Versioni del Portale aggiornate');
} else {
  writeFileSync(INDEX, nuovo);
  console.log(sbagliate.length ? `Versioni aggiornate: ${sbagliate.join(', ')}` : 'Versioni già aggiornate');
}
