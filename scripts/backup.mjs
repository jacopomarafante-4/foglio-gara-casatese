// =====================================================================
// Backup completo del database (Supabase) sul Mac
// Uso: npm run backup   (lo lancia anche il Mac da solo, ogni lunedì: vedi README)
// Salva ogni tabella in private/backup/AAAA-MM-GG_HHMM/<tabella>.json (cartella esclusa da git:
// contiene dati di minori). Tiene gli ultimi 12 backup. Le password non si possono esportare:
// degli account si salvano solo email e ruolo (profiles).
// =====================================================================
import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('❌ Mancano NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}
const db = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

const TABELLE = [
  // Portale squadre
  'docs',
  // Account e accessi
  'profiles', 'codici_accesso',
  // Scouting
  'societa', 'giocatori', 'contatti', 'segnalazioni', 'valutazioni', 'storico_stati', 'eventi_giocatore',
  'doppioni_esclusi', 'sedi', 'squadre_seguite', 'gare', 'gare_osservatori', 'gare_allegati', 'incarichi',
  // Distinte e storico
  'squadre', 'distinte', 'distinte_giocatori',
];
const TENERE = 12;
const BASE = fileURLToPath(new URL('../private/backup/', import.meta.url)); // (gli spazi nel percorso restano spazi)

const ora = new Date();
const nome = ora.toLocaleString('sv-SE', { timeZone: 'Europe/Rome' }).slice(0, 16).replace(' ', '_').replace(':', '');
const cartella = join(BASE, nome);
await mkdir(cartella, { recursive: true });

const riepilogo = {};
let problemi = 0;
for (const t of TABELLE) {
  const righe = [];
  for (let da = 0; ; da += 1000) {
    const { data, error } = await db.from(t).select('*').range(da, da + 999);
    if (error) { console.error(`❌ ${t}: ${error.message}`); problemi++; break; }
    righe.push(...data);
    if (data.length < 1000) break;
  }
  await writeFile(join(cartella, `${t}.json`), JSON.stringify(righe, null, 1));
  riepilogo[t] = righe.length;
}
// File delle distinte caricate con "Aggiungi partita" (contenitore privato "distinte"): contengono nomi di minori,
// restano solo qui in private/
let file = 0;
for (const a of (await db.from('gare_allegati').select('percorso')).data ?? []) {
  const { data } = await db.storage.from('distinte').download(a.percorso);
  if (!data) { problemi++; continue; }
  const dest = join(cartella, 'distinte', a.percorso);
  await mkdir(dirname(dest), { recursive: true });
  await writeFile(dest, Buffer.from(await data.arrayBuffer()));
  file++;
}
riepilogo['file distinte'] = file;
await writeFile(join(cartella, '_riepilogo.json'), JSON.stringify({ quando: ora.toISOString(), righe: riepilogo }, null, 1));

// Tiene solo gli ultimi TENERE backup
const tutti = (await readdir(BASE, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name).sort();
for (const vecchio of tutti.slice(0, Math.max(0, tutti.length - TENERE))) await rm(join(BASE, vecchio), { recursive: true });

console.log(`${problemi ? '⚠️' : '✅'} Backup ${nome}: ${Object.entries(riepilogo).map(([t, n]) => `${t} ${n}`).join(' · ')}`);
if (problemi) process.exit(1);
