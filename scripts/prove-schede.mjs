// =====================================================================
// Giro automatico di tutte le schede del Portale, per ogni ruolo, con dati inventati (scripts/prove-schede/dati.mjs).
// Apre il Portale in Chrome nascosto (misura telefono), entra come admin, direttore, mister (agonistica e attività di base),
// preparatore dei portieri e organizzativo, apre ogni scheda che quel ruolo vede e alcune pagine interne (schema dei
// piazzati, allenamento, tabellino). Fallisce se una pagina va in errore o resta vuota.
// Uso: node scripts/prove-schede.mjs   (parte con npm run prove:portale, anche su GitHub a ogni salvataggio)
// Chrome: CHROME_PATH, altrimenti quello del Mac o di Linux (GitHub). Segreteria e famiglie usano il database vero:
// le prova la prova notturna dei profili (scripts/test-profili.mjs).
// =====================================================================
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { chromium } from 'playwright-core';
import { datiPortale, PIN } from './prove-schede/dati.mjs';

const DIR = 'public/portale';
const TIPI = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2' };
const server = createServer(async (req, res) => {
  const p = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^\/+/, '') || 'index.html';
  try { const f = await readFile(join(DIR, p)); res.writeHead(200, { 'content-type': TIPI[extname(p)] || 'application/octet-stream' }); res.end(f); }
  catch { res.writeHead(404); res.end(); }
});
await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
const BASE = `http://127.0.0.1:${server.address().port}/index.html`;

const chrome = [process.env.CHROME_PATH, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find((x) => x && existsSync(x));
if (!chrome) { console.error('✗ Schede del Portale: Chrome non trovato (CHROME_PATH)'); process.exit(1); }
const browser = await chromium.launch({ executablePath: chrome });

/* Profili: come si entra e cosa si imposta dopo (nel Portale di prova i ruoli di staff si simulano) */
const PROFILI = [
  ['Admin', '', null],
  ['Direttore', '', () => { staffRole = 'direttore'; }],
  ['Mister Under 14', PIN.u14, null],
  ['Mister Under 15 (Test)', PIN.u15, null],
  ['Mister Under 10 (attività di base)', PIN.u10, null],
  ['Preparatore portieri', PIN.preparatore, () => { squadraPropria = curTeam; }],
  ['Organizzativo', PIN.organizzativo, () => { squadraOrg = curTeam; S.teams = S.teams; }],
];

const problemi = [];
let schede = 0;
for (const [nome, pin, dopo] of PROFILI) {
  const pagina = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errori = [];
  pagina.on('pageerror', (e) => errori.push(e.message.slice(0, 160)));
  pagina.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|favicon/.test(m.text())) errori.push('console: ' + m.text().slice(0, 160)); });
  await pagina.addInitScript((dati) => {
    const D = JSON.parse(dati);
    const doc = (path) => ({ async get() { return { exists: !!D[path], data: () => D[path] }; }, async set(v) { D[path] = v; },
      onSnapshot(ok) { setTimeout(() => ok({ exists: !!D[path], data: () => D[path] }), 0); return () => {}; } });
    window.claude = { use: async (k) => (k === 'db' ? { doc } : null) };
    window.alert = () => {}; window.confirm = () => false; window.prompt = () => null;
  }, JSON.stringify(datiPortale()));
  await pagina.goto(`${BASE}${pin ? '#squadra=' + pin + '/home' : ''}`);
  await pagina.waitForFunction(() => typeof teamsLoaded !== 'undefined' && teamsLoaded && document.querySelector('#view')?.innerText.trim().length > 0, null, { timeout: 15000 })
    .catch(() => errori.push('il Portale non si apre'));
  if (dopo) { await pagina.evaluate(dopo); await pagina.evaluate(() => render()).catch((e) => errori.push(e.message.split('\n')[0].slice(0, 160))); }
  const visibili = await pagina.evaluate(() => allowedTabs());
  for (const t of visibili) {
    const prima = errori.length;
    await pagina.evaluate((t) => goTab(t), t).catch((e) => errori.push(e.message.split('\n')[0].slice(0, 160)));
    await pagina.waitForTimeout(120);
    const testo = (await pagina.locator('#view').innerText().catch(() => '')).trim();
    if (!testo) errori.push(`scheda "${t}" vuota`);
    if (errori.length > prima) errori[errori.length - 1] = `[${t}] ${errori[errori.length - 1]}`;
    schede++;
  }
  /* pagine interne: schema dei piazzati, un allenamento, un tabellino */
  const interne = await pagina.evaluate(() => {
    const fatte = [];
    if (allowedTabs().includes('piazzati') && S.schemes[0]) { goTab('piazzati'); openSchemeId = S.schemes[0].id; render(); fatte.push('schema'); }
    if (allowedTabs().includes('allenamenti') && S.reg.trainings[0]) { goTab('allenamenti'); openTrainingId = S.reg.trainings[0].id; render(); fatte.push('allenamento'); }
    if (allowedTabs().includes('tabellini') && S.reg.games[0]) { goTab('tabellini'); openGameId = S.reg.games[0].id; render(); fatte.push('tabellino'); }
    return fatte;
  }).catch((e) => { errori.push('pagine interne: ' + e.message.slice(0, 120)); return []; });
  schede += interne.length;
  if (errori.length) problemi.push(`${nome}: ${[...new Set(errori)].slice(0, 6).join(' | ')}`);
  console.log(`${errori.length ? '✗' : '✓'} ${nome}: ${visibili.length} schede${interne.length ? ' + ' + interne.join(', ') : ''}`);
  await pagina.close();
}
await browser.close(); server.close();
if (problemi.length) { console.error('\n✗ Schede del Portale:\n  ' + problemi.join('\n  ')); process.exit(1); }
console.log(`✓ Schede del Portale: ${schede} pagine aperte con ${PROFILI.length} profili, nessun errore`);
