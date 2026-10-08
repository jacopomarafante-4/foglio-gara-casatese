// Presenze dell'attività di base dai fogli Google ("ACM_Uxx_PRESENZE", foglio ALLENAMENTI) al registro della squadra.
// I fogli si scaricano come Excel (condivisi "chiunque abbia il link"). Gli id dei fogli NON stanno nel codice (repository
// pubblico, nomi di minori): variabile FOGLI_PRESENZE = {"t_u12":"<id>",…} (segreto di GitHub) o private/adb/fogli.json.
// Regole: ragazzi abbinati alla rosa per nome; per le date del foglio vince il foglio; allenamenti nuovi aggiunti, nessuno tolto;
// solo date fino a oggi. Valori: 1 presente, 0/A/V assente (motivi familiari), M malato, I infortunio (come scripts/import-adb).
// Uso: node --env-file=.env.local --import ./tests/registra.mjs scripts/sync-presenze-adb.mjs [--conferma]
import { readFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
import { leggiXlsx } from '../lib/xlsx.ts';
import { chiaveNome } from '../lib/statistiche.ts';

const conferma = process.argv.includes('--conferma');
const fogli = JSON.parse(process.env.FOGLI_PRESENZE || await readFile('private/adb/fogli.json', 'utf8').catch(() => '{}'));
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const MESI = { AGOSTO: 8, SETTEMBRE: 9, OTTOBRE: 10, NOVEMBRE: 11, DICEMBRE: 12, GENNAIO: 1, FEBBRAIO: 2, MARZO: 3, APRILE: 4, MAGGIO: 5, GIUGNO: 6, LUGLIO: 7 };
const PRESENZA = { '1': 'P', '0': 'FAM', A: 'FAM', M: 'MAL', I: 'INF', V: 'FAM' };
const oggi = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Rome' });
const anno = Number(oggi.slice(5, 7)) >= 7 ? Number(oggi.slice(0, 4)) : Number(oggi.slice(0, 4)) - 1;   // inizio stagione
const val = (v) => String(v ?? '').trim().replace(/\.0$/, '').toUpperCase();

let errori = 0;
for (const [squadra, id] of Object.entries(fogli)) {
  const r = await fetch(`https://docs.google.com/spreadsheets/d/${id}/export?format=xlsx`);
  if (!r.ok) { console.log(`✗ ${squadra}: foglio non scaricabile (${r.status}): è condiviso "chiunque abbia il link"?`); errori++; continue; }
  const righe = await leggiXlsx(new Uint8Array(await r.arrayBuffer()));
  const [mesi, giorni] = righe;
  const prima = /ruol/i.test(mesi[3] ?? '') ? 4 : 3;
  const primoScritto = mesi.slice(prima).map((x) => MESI[val(x)]).find(Boolean);
  let mese = primoScritto ? (primoScritto + 10) % 12 + 1 : null, giornoPrima = 0;
  const date = [];
  for (let c = prima; c < giorni.length; c++) {
    const m = MESI[val(mesi[c])], g = Number(val(giorni[c]));
    if (m) mese = m; else if (mese && Number.isInteger(g) && g >= 1 && g < giornoPrima) mese = mese % 12 + 1;
    if (Number.isInteger(g) && g >= 1) giornoPrima = g;
    date.push(mese && Number.isInteger(g) && g >= 1 && g <= 31 ? `${mese >= 7 ? anno : anno + 1}-${String(mese).padStart(2, '0')}-${String(g).padStart(2, '0')}` : null);
  }
  const nelFoglio = righe.slice(2).filter((x) => /^\d+$/.test(val(x[0])) && (String(x[1] ?? '').trim() || String(x[2] ?? '').trim()));
  const [{ data: ros }, { data: reg }] = await Promise.all([
    db.from('docs').select('data').eq('path', `roster/${squadra}`).single(),
    db.from('docs').select('data').eq('path', `registro/${squadra}`).single(),
  ]);
  const perNome = new Map((ros.data.players ?? []).map((p) => [chiaveNome(p.name), p.id]));
  const abbinati = nelFoglio.map((x) => perNome.get(chiaveNome(`${x[1] ?? ''} ${x[2] ?? ''}`)) ?? null);
  const senzaRosa = nelFoglio.filter((_, i) => !abbinati[i]).map((x) => `${x[1]} ${x[2]}`.trim());
  const trainings = [...(reg.data.trainings ?? [])];
  let nuovi = 0, cambiate = 0; const visti = new Map();
  date.forEach((d, i) => {
    if (!d || d > oggi) return;
    const valori = nelFoglio.map((x) => val(x[prima + i]));
    if (!valori.some((v) => v && v !== '0' && v in PRESENZA)) return;   // colonna non ancora compilata
    const n = (visti.get(d) ?? 0) + 1; visti.set(d, n);
    let t = trainings.filter((x) => x.date === d)[n - 1];
    if (!t) { t = { id: `tr_${squadra.slice(2)}_${d}${n > 1 ? `_${n}` : ''}`, date: d, note: '', att: {} }; trainings.push(t); nuovi++; }
    t.att = { ...(t.att ?? {}) };
    valori.forEach((v, j) => { const pid = abbinati[j], p = PRESENZA[v]; if (pid && p && t.att[pid] !== p) { t.att[pid] = p; cambiate++; } });
  });
  trainings.sort((x, y) => x.date.localeCompare(y.date));
  console.log(`${squadra}: ${nuovi} allenamenti nuovi, ${cambiate} presenze nuove o cambiate${senzaRosa.length ? ` · non in rosa: ${senzaRosa.length}` : ''}`);
  if (conferma && (nuovi || cambiate)) {
    const u = await db.from('docs').update({ data: { ...reg.data, trainings }, updated_at: new Date().toISOString() }).eq('path', `registro/${squadra}`);
    if (u.error) { console.log(`  ✗ ${u.error.message}`); errori++; }
  }
}
console.log(conferma ? 'Aggiornato.' : 'SIMULAZIONE (niente scritto).');
if (errori) process.exitCode = 1;
