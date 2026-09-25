// =====================================================================
// Importazione dei calendari dei campionati → pannello Gare
// Uso (dalla cartella del progetto):
//   python3 scripts/import-calendari/prepara.py scripts/import-calendari/dati/elenco.tsv   (legge i PDF)
//   node --env-file=.env.local scripts/import-calendari/importa.mjs [--conferma]
// Senza --conferma è una simulazione: stampa il riepilogo e non scrive.
//
// Ogni gara entra come "da calendario" (stato 'calendario'). Se la si reimporta, si aggiornano
// solo le gare ancora "da calendario": quelle già confermate o variate da un comunicato restano.
// Le società si collegano a quelle già in archivio (nome o nome alternativo, senza forme
// societarie); le nuove si creano con i nomi del calendario come nomi alternativi.
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
const FILE = fileURLToPath(new URL('./dati/calendari.json', import.meta.url));

// --- Chiave di confronto delle società (come pulito() in prepara.py) -------------
const FORME = /\b(A\.?S\.?D\.?|S\.?S\.?D\.?|S\.?R\.?L\.?|A\.?\s?R\.?\s?L\.?|SSDARL|SSDSRL|SSDRL|SCARL|S\.C\.A\.R\.L\.|U\.?S\.?D\.?|A\.?C\.?D\.?|G\.?S\.?D\.?|S\.?S\.?|U\.?S\.?|A\.?S\.?|POL\.?D\.?|SQ\.?\s?[A-C]|SQ[A-C])\b/g;
const ABBR = [
  [/\bACC\.\s*|\bAC\.\s*/g, ' ACCADEMIA '], [/\bC\.\s*/g, ' CALCIO '], [/\bS\.\s*/g, ' SAN '],
  [/\bORAT\.\s*|\bOR\.\s*/g, ' ORATORIO '], [/\bPOL\.\s*/g, ' POLISPORTIVA '],
  [/\bF\.\s*C\.\s*/g, ' FOOTBALL CLUB '], [/\bACCADEMY\b|\bACADEMY\b/g, ' ACCADEMIA '], [/\bGIOV\.\s*/g, ' GIOVANILE '],
];
function pulito(s) {
  let t = String(s ?? '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toUpperCase();
  t = t.replace(/S\s?Q\.?\s?[A-C]\b|\*FCL\*/g, ' ').replace(FORME, ' ');
  for (const [a, b] of ABBR) t = t.replace(a, b);
  return t.replace(FORME, ' ').replace(/[^A-Z0-9]/g, '');
}

/** "2026-10-18" + "10:30" (ora italiana) → istante ISO */
function istante(data, ora) {
  const [a, m, g] = data.split('-').map(Number);
  const [hh, mm] = (ora ?? '12:00').split(':').map(Number);
  const comeUtc = Date.UTC(a, m - 1, g, hh, mm);
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Rome', hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric',
  }).formatToParts(new Date(comeUtc)).map((x) => [x.type, x.value]));
  const scarto = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute) - comeUtc;
  return new Date(comeUtc - scarto).toISOString();
}

const partite = JSON.parse(await readFile(FILE, 'utf8'));

// Società che non vanno mai collegate per nome alternativo: "Casatese Merate" di Rogoredo è un'altra
// società rispetto alla nostra Academy Casatese Merate, che in archivio ha "Casatese Merate" tra gli alias
const NOMI_FISSI = { CASATESEMERATE: 'Casatese Merate (Rogoredo)' };
const paese = (campo) => (campo ?? '').split(' - ').pop().replace(/\bFRAZ.*$/i, '').trim().toLowerCase().replace(/(^|\s)(\p{L})/gu, (_, a, b) => a + b.toUpperCase());

// --- Società ----------------------------------------------------------------------
const club = new Map(); // chiave → { nome, alias:Set, campi: Map(campo → {indirizzo, n}) }
for (const p of partite) {
  for (const lato of ['casa', 'trasferta']) {
    const s = p[lato];
    if (!club.has(s.chiave)) club.set(s.chiave, { nome: s.nome, alias: new Set(), campi: new Map() });
    const c = club.get(s.chiave);
    for (const n of [s.ufficiale, s.calendario]) if (!/sq\.?\s?[bc]\b/i.test(n)) c.alias.add(n);
  }
  if (p.campo) {
    const c = club.get(p.casa.chiave).campi;
    const x = c.get(p.campo) ?? { indirizzo: p.indirizzo, n: 0 };
    x.n++; c.set(p.campo, x);
  }
}

const { data: esistenti, error: errSoc } = await db.from('societa').select('id, nome, alias, campo, indirizzo');
if (errSoc) { console.error('❌ Società:', errSoc.message); process.exit(1); }
const perChiave = new Map();
for (const s of esistenti) for (const n of [s.nome, ...(s.alias ?? [])]) {
  const k = pulito(n);
  if (k && !perChiave.has(k)) perChiave.set(k, s);
}

// Due società diverse con lo stesso nome da mostrare ("San Giorgio"): si aggiunge il paese del campo
const stessoNome = {};
for (const c of club.values()) stessoNome[c.nome] = (stessoNome[c.nome] ?? 0) + 1;
for (const [k, c] of club) {
  const principale = [...c.campi].sort((a, b) => b[1].n - a[1].n)[0]?.[0];
  if (NOMI_FISSI[k]) c.nome = NOMI_FISSI[k];
  else if (stessoNome[c.nome] > 1 && principale) c.nome = `${c.nome} (${paese(principale)})`;
}

const collegate = [], nuove = [];
for (const [k, c] of club) {
  const s = NOMI_FISSI[k]
    ? esistenti.find((x) => x.nome === NOMI_FISSI[k])
    : perChiave.get(k) ?? [...c.alias].map((n) => perChiave.get(pulito(n))).find(Boolean);
  if (s) { collegate.push([k, c, s]); c.nome = s.nome; } else nuove.push([k, c]);
}
// Società dell'archivio che non corrispondono a nessuna del calendario: forse scritte diversamente
const usate = new Set(collegate.map(([, , s]) => s.id));
const chiaviCal = [...club.keys()];
const possibili = esistenti.filter((s) => !usate.has(s.id)).map((s) => {
  const k = pulito(s.nome);
  const simili = k.length >= 5 ? chiaviCal.filter((c) => c.includes(k) || (c.length >= 5 && k.includes(c))) : [];
  return [s, simili.map((c) => club.get(c).nome)];
});

// --- Gare -------------------------------------------------------------------------
const nomeSquadra = (s) => (s.squadra ? `${club.get(s.chiave).nome} sq.${s.squadra}` : club.get(s.chiave).nome);
const righe = partite.map((p) => ({
  chiave: [p.stagione, p.categoria, p.girone, p.casa.chiave + p.casa.squadra, p.trasferta.chiave + p.trasferta.squadra].join('|'),
  stagione: p.stagione, categoria: p.categoria, girone: p.girone, giornata: p.giornata, turno: p.turno,
  data_ora: istante(p.data, p.ora), ora_da_definire: !p.ora,
  casa_nome: nomeSquadra(p.casa), trasferta_nome: nomeSquadra(p.trasferta),
  _casa: p.casa.chiave, _trasferta: p.trasferta.chiave,
  campo: p.campo, indirizzo: p.indirizzo, codice_campo: p.codice_campo, fonte: p.fonte, stato: 'calendario',
}));
const doppie = righe.length - new Set(righe.map((r) => r.chiave)).size;

// Gare già in archivio: si aggiornano solo quelle ancora "da calendario"
const giaDentro = new Map();
for (let da = 0; ; da += 1000) {
  const { data, error } = await db.from('gare').select('chiave, stato').not('chiave', 'is', null).range(da, da + 999);
  if (error && !CONFERMA) { console.log('⚠️  Migrazione 0016 non ancora eseguita: simulo con archivio gare vuoto'); break; }
  if (error) { console.error('❌ Gare:', error.message, '(hai eseguito la migrazione 0016?)'); process.exit(1); }
  for (const g of data) giaDentro.set(g.chiave, g.stato);
  if (data.length < 1000) break;
}
const daScrivere = righe.filter((r) => (giaDentro.get(r.chiave) ?? 'calendario') === 'calendario');
const bloccate = righe.length - daScrivere.length;

// --- Riepilogo ----------------------------------------------------------------------
const perCategoria = {};
for (const r of righe) perCategoria[r.categoria] = (perCategoria[r.categoria] ?? 0) + 1;
console.log(`\n📅 ${righe.length} gare dai calendari (${[...giaDentro.keys()].length} già in archivio)`);
for (const [c, n] of Object.entries(perCategoria)) console.log(`   ${c}: ${n}`);
console.log(`   ora da definire: ${righe.filter((r) => r.ora_da_definire).length}`);
if (doppie) console.log(`⚠️  ${doppie} gare con la stessa chiave (verranno unite)`);
if (bloccate) console.log(`🔒 ${bloccate} già confermate o variate da un comunicato: non si toccano`);
console.log(`\n🏟️  ${club.size} società: ${collegate.length} già in archivio, ${nuove.length} nuove`);
for (const [, c, s] of collegate) console.log(`   = ${c.nome}  →  ${s.nome}`);
const conSimili = possibili.filter(([, sim]) => sim.length);
if (conSimili.length) {
  console.log(`\n❓ Società in archivio scritte diversamente (NON collegate, da controllare):`);
  for (const [s, sim] of conSimili) console.log(`   "${s.nome}"  ~  ${sim.join(' / ')}`);
}
console.log(`\n   (${possibili.length - conSimili.length} società in archivio senza corrispondenza nei calendari)`);

if (!CONFERMA) {
  console.log('\nSimulazione: nulla è stato scritto. Per importare aggiungi --conferma');
  process.exit(0);
}

// --- Scrittura ----------------------------------------------------------------------
const idDi = new Map();
for (const [k, c, s] of collegate) {
  idDi.set(k, s.id);
  const alias = [...new Set([...(s.alias ?? []), ...c.alias])].filter((a) => a !== s.nome);
  const [campo, info] = [...c.campi].sort((a, b) => b[1].n - a[1].n)[0] ?? [];
  const agg = { alias };
  if (!s.campo && campo) Object.assign(agg, { campo, indirizzo: info.indirizzo });
  const { error } = await db.from('societa').update(agg).eq('id', s.id);
  if (error) console.error(`❌ ${s.nome}: ${error.message}`);
}
for (let i = 0; i < nuove.length; i += 200) {
  const blocco = nuove.slice(i, i + 200).map(([, c]) => {
    const [campo, info] = [...c.campi].sort((a, b) => b[1].n - a[1].n)[0] ?? [];
    return { nome: c.nome, alias: [...c.alias].filter((a) => a !== c.nome), campo: campo ?? null, indirizzo: info?.indirizzo ?? null };
  });
  const { data, error } = await db.from('societa').insert(blocco).select('id, nome');
  if (error) { console.error('❌ Nuove società:', error.message); process.exit(1); }
  data.forEach((s, j) => idDi.set(nuove[i + j][0], s.id));
}

const unica = new Map(daScrivere.map((r) => [r.chiave, r]));
const finali = [...unica.values()].map(({ _casa, _trasferta, ...r }) => ({
  ...r, casa_id: idDi.get(_casa) ?? null, trasferta_id: idDi.get(_trasferta) ?? null,
}));
let scritte = 0;
for (let i = 0; i < finali.length; i += 500) {
  const { error } = await db.from('gare').upsert(finali.slice(i, i + 500), { onConflict: 'chiave' });
  if (error) { console.error(`❌ Gare ${i}–${i + 500}: ${error.message}`); process.exit(1); }
  scritte += Math.min(500, finali.length - i);
}
console.log(`\n✅ Importate ${scritte} gare, create ${nuove.length} società, aggiornate ${collegate.length}.`);
