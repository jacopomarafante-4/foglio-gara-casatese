// =====================================================================
// Attività di base: squadre, rose e presenze nel Portale dai fogli presenze (CSV)
// Uso: node --env-file=.env.local scripts/import-adb/importa.mjs [--conferma]
// Senza --conferma è una simulazione.
//
// I fogli stanno in private/adb/U13.csv … U8.csv (NON su git: nomi di minori), scaricati dai fogli Google
// "ACM_Uxx_anno_PRESENZE" (foglio ALLENAMENTI): N°, Cognome, Nome, [Ruoli], poi una colonna per allenamento
// sotto il mese. Valori: 1 presente, 0/A/V assente giustificato (motivi familiari), M malato, I infortunio.
// Crea solo ciò che manca: una squadra, una rosa o un registro già presenti non si toccano.
// =====================================================================
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('❌ Mancano NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}
const db = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
const CONFERMA = process.argv.includes('--conferma');
const CARTELLA = fileURLToPath(new URL('../../private/adb/', import.meta.url));
const ANNO = 2026; // agosto–dicembre 2026, gennaio–giugno 2027

const SQUADRE = [
  { file: 'U13', id: 't_u13', category: 'Under 13 - Attività di base', annata: 2014 },
  { file: 'U12', id: 't_u12', category: 'Under 12 - Attività di base', annata: 2015 },
  { file: 'U11', id: 't_u11', category: 'Under 11 - Attività di base', annata: 2016 },
  { file: 'U10', id: 't_u10', category: 'Under 10 - Attività di base', annata: 2017 },
  { file: 'U9', id: 't_u9', category: 'Under 9 - Attività di base', annata: 2018 },
  { file: 'U8', id: 't_u8', category: 'Under 8 - Attività di base', annata: 2019 },
];
const MESI = { AGOSTO: 8, SETTEMBRE: 9, OTTOBRE: 10, NOVEMBRE: 11, DICEMBRE: 12, GENNAIO: 1, FEBBRAIO: 2, MARZO: 3, APRILE: 4, MAGGIO: 5, GIUGNO: 6 };
const PRESENZA = { '1': 'P', '0': 'FAM', A: 'FAM', M: 'MAL', I: 'INF', V: 'FAM' };   // assenze giustificate come in U14/U15

/** CSV semplice con virgolette */
function leggiCsv(testo) {
  const righe = [];
  let riga = [], campo = '', tra = false;
  for (let i = 0; i < testo.length; i++) {
    const c = testo[i];
    if (tra) { if (c === '"') { if (testo[i + 1] === '"') { campo += '"'; i++; } else tra = false; } else campo += c; }
    else if (c === '"') tra = true;
    else if (c === ',') { riga.push(campo); campo = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && testo[i + 1] === '\n') i++; riga.push(campo); righe.push(riga); riga = []; campo = ''; }
    else campo += c;
  }
  if (campo || riga.length) { riga.push(campo); righe.push(riga); }
  return righe;
}
const proprio = (s) => s.trim().replace(/\s+/g, ' ').toLowerCase().replace(/(^|[\s'’-])(\p{L})/gu, (_, a, b) => a + b.toUpperCase());

const { data: teamsDoc } = await db.from('docs').select('data').eq('path', 'shared/teams').single();
const teams = teamsDoc.data.items ?? [];

for (const sq of SQUADRE) {
  const righe = leggiCsv(await readFile(`${CARTELLA}${sq.file}.csv`, 'utf8'));
  const [mesi, giorni] = righe;
  const conRuoli = /ruol/i.test(mesi[3] ?? '');
  const prima = conRuoli ? 4 : 3;
  // Date degli allenamenti: il mese si trascina da sinistra a destra fino al successivo
  let mese = null;
  const date = [];
  for (let c = prima; c < giorni.length; c++) {
    const m = MESI[(mesi[c] ?? '').trim().toUpperCase()];
    if (m) mese = m;
    const g = Number(giorni[c]);
    if (!mese || !Number.isInteger(g) || g < 1) { date.push(null); continue; }
    const anno = mese >= 8 ? ANNO : ANNO + 1;
    date.push(`${anno}-${String(mese).padStart(2, '0')}-${String(g).padStart(2, '0')}`);
  }
  const giocatori = righe.slice(2).filter((r) => /^\d+$/.test((r[0] ?? '').trim()) && ((r[1] ?? '').trim() || (r[2] ?? '').trim()));
  const players = giocatori.map((r) => ({ id: `p${r[0].trim()}`, name: [proprio(r[1] ?? ''), proprio(r[2] ?? '')].filter(Boolean).join(' ') }));

  // Allenamenti già fatti: colonne con almeno una presenza (1) o un motivo; le date future (tutti 0) no
  const trainings = [];
  const visti = new Map();
  date.forEach((d, i) => {
    if (!d) return;
    const valori = giocatori.map((r) => (r[prima + i] ?? '').trim().toUpperCase());
    if (!valori.some((v) => v && v !== '0' && v in PRESENZA)) return;   // solo segni veri (non i totali in fondo)
    const n = (visti.get(d) ?? 0) + 1; visti.set(d, n);  // due allenamenti nello stesso giorno
    const att = {};
    giocatori.forEach((r, j) => { const v = PRESENZA[valori[j]]; if (v) att[`p${r[0].trim()}`] = v; });
    trainings.push({ id: `tr_${sq.id.slice(2)}_${d}${n > 1 ? `_${n}` : ''}`, date: d, note: '', att });
  });
  // Ruoli (solo nel foglio Under 11): portiere o giocatore di movimento
  const ruoli = {}, gk = [];
  if (conRuoli) giocatori.forEach((r) => { const t = (r[3] ?? '').toLowerCase(); if (!t.trim()) return; const id = `p${r[0].trim()}`; ruoli[id] = /portier/.test(t) ? 'portiere' : 'movimento'; if (ruoli[id] === 'portiere') gk.push(id); });

  const esiste = teams.find((t) => t.id === sq.id);
  const [{ data: rosa }, { data: reg }] = await Promise.all([
    db.from('docs').select('path').eq('path', `roster/${sq.id}`).maybeSingle(),
    db.from('docs').select('path').eq('path', `registro/${sq.id}`).maybeSingle(),
  ]);
  const presenti = trainings.reduce((s, t) => s + Object.values(t.att).filter((v) => v === 'P').length, 0);
  console.log(`⚽ ${sq.category} (${sq.annata}): ${players.length} giocatori, ${trainings.length} allenamenti già fatti (${trainings[0]?.date ?? '–'} → ${trainings.at(-1)?.date ?? '–'}), ${presenti} presenze`
    + (gk.length ? `, ${gk.length} portieri` : '')
    + `${esiste ? ' · squadra già presente' : ''}${rosa ? ' · rosa già presente' : ''}${reg ? ' · registro già presente' : ''}`);
  if (!CONFERMA) continue;

  if (!esiste) teams.push({ id: sq.id, name: 'Academy Casatese Merate', category: sq.category, coach: '', code: '', coaches: [] });
  const ora = new Date().toISOString();
  if (!rosa) await db.from('docs').upsert({ path: `roster/${sq.id}`, data: { players }, updated_at: ora });
  if (!reg) await db.from('docs').upsert({ path: `registro/${sq.id}`, data: { trainings, games: [], tests: [], gk, ruoli, friendlies: [] }, updated_at: ora });
}
if (CONFERMA) {
  const { error } = await db.from('docs').upsert({ path: 'shared/teams', data: { ...teamsDoc.data, items: teams }, updated_at: new Date().toISOString() });
  console.log(error ? `❌ ${error.message}` : '✅ Squadre dell’attività di base create.');
} else console.log('\nSimulazione: nulla è stato scritto. Per creare aggiungi --conferma');
