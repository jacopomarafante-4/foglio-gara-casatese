// Stampa i manuali (HTML generati da genera.py) in PDF dentro public/manuali/, con Chrome.
// Uso: npm run manuali   (genera l'HTML con Python e lo stampa con il Chrome del Mac)
import { chromium } from 'playwright-core';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const dir = fileURLToPath(new URL('./', import.meta.url));
const out = fileURLToPath(new URL('../../public/manuali/', import.meta.url));
const b = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
for (const f of readdirSync(dir).filter((x) => x.startsWith('Manuale_') && x.endsWith('.html'))) {
  const p = await b.newPage();
  await p.goto('file://' + dir + f, { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  const titolo = await p.title();
  await p.pdf({ path: out + f.replace('.html', '.pdf'), format: 'A4', printBackground: true, preferCSSPageSize: true, displayHeaderFooter: true,
    headerTemplate: '<span></span>',
    footerTemplate: `<div style="font-size:8px;color:#5b6b80;width:100%;padding:0 16mm;display:flex;justify-content:space-between;font-family:sans-serif"><span>Academy Casatese Merate · ${titolo}</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>` });
  await p.close();
  console.log('✓', f.replace('.html', '.pdf'));
}
await b.close();
