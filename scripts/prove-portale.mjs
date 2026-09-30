// Il vecchio Portale squadre è spento (tutte le schede sono pagine dell'app): questa prova controlla che resti spento.
// - in public/portale/ ci sono solo gli stemmi (usati dalle pagine e dai PDF);
// - i vecchi indirizzi (/portale/, js, css) portano alla Home (redirects in next.config.ts);
// - nessuna pagina dell'app rimanda ancora al Portale (/portale/#…).
// La lancia "npm run prove:portale" (anche su GitHub, nelle Prove rapide).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const errori = [];
const STEMMI = ['casatese-logo.png', 'figc-sgs-logo.png'];
const qui = readdirSync('public/portale').filter((f) => !f.startsWith('.'));
for (const f of qui) if (!STEMMI.includes(f)) errori.push(`public/portale/${f}: nel Portale spento restano solo gli stemmi`);
for (const f of STEMMI) if (!qui.includes(f)) errori.push(`public/portale/${f} manca: lo usano le pagine e i PDF`);

const config = readFileSync('next.config.ts', 'utf8');
for (const s of ["'/portale'", "'/portale/'"]) if (!config.includes(s)) errori.push(`next.config.ts: manca il rimando di ${s} alla Home`);

const file = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? file(p) : /\.(ts|tsx)$/.test(f) ? [p] : []; });
for (const p of ['app', 'components', 'lib'].flatMap(file)) {
  const righe = readFileSync(p, 'utf8').split('\n');
  righe.forEach((r, i) => { if (/['"`]\/portale\/(#|['"`?])/.test(r)) errori.push(`${p}:${i + 1}: rimanda ancora al vecchio Portale`); });
}

if (errori.length) { errori.forEach((e) => console.error('✗ ' + e)); process.exit(1); }
console.log('✓ Portale spento: in public/portale/ solo gli stemmi, vecchi indirizzi verso la Home, nessun rimando al Portale nell\'app');
