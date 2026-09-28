// Traduzione degli indirizzi per le prove: "@/x" → cartella del progetto, import senza estensione → ".ts" (o ".tsx").
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RADICE = new URL('../', import.meta.url);
export async function resolve(specifier, context, nextResolve) {
  let s = specifier;
  if (s.startsWith('@/')) s = new URL(s.slice(2), RADICE).href;
  else if ((s.startsWith('./') || s.startsWith('../')) && context.parentURL) s = new URL(s, context.parentURL).href;
  if (s.startsWith('file:') && !/\.[cm]?[jt]sx?$/.test(s)) {
    const base = fileURLToPath(s);
    for (const est of ['.ts', '.tsx', '.mjs', '.js']) if (existsSync(base + est)) { s = pathToFileURL(base + est).href; break; }
  }
  return nextResolve(s, context);
}
/* i file .ts del progetto sono moduli ES (senza questo Node prova prima a leggerli come CommonJS e avvisa) */
export async function load(url, context, nextLoad) {
  if (url.startsWith('file:') && url.endsWith('.ts') && !url.includes('/node_modules/')) return nextLoad(url, { ...context, format: 'module-typescript' });
  return nextLoad(url, context);
}
