// =====================================================================
// Comunicati → gare confermate o variate (dopo comunicati.py)
// Uso: node --env-file=.env.local scripts/import-calendari/applica-comunicati.mjs [--conferma]
// Senza --conferma è una simulazione.
//
// - confermata: solo se la gara è ancora "da calendario" (una variata resta variata);
// - variata: nuova data/ora (e campo, se cambia); in "precedente" restano i valori del calendario
//   (quelli di prima della PRIMA variazione). Inversione di campo: si scambiano casa e trasferta.
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
const esiti = JSON.parse(await readFile(fileURLToPath(new URL('./dati/comunicati.json', import.meta.url)), 'utf8'));

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

const gare = new Map();
const chiavi = esiti.map((e) => e.chiave);
for (let i = 0; i < chiavi.length; i += 40) {
  const { data, error } = await db.from('gare')
    .select('id, chiave, stato, comunicato, precedente, data_ora, ora_da_definire, campo, indirizzo, codice_campo, casa_id, trasferta_id, casa_nome, trasferta_nome')
    .in('chiave', chiavi.slice(i, i + 40));
  if (error) { console.error('❌ Gare:', error.message); process.exit(1); }
  for (const g of data) gare.set(g.chiave, g);
}

const modifiche = [];
let mancanti = 0, gia = 0;
for (const e of esiti) {
  const g = gare.get(e.chiave);
  if (!g) { mancanti++; continue; }
  if (e.stato === 'confermata') {
    if (g.stato !== 'calendario') { gia++; continue; }
    modifiche.push([g, e, { stato: 'confermata', comunicato: e.comunicato }]);
    continue;
  }
  if (g.stato === 'variata' && g.comunicato === e.comunicato) { gia++; continue; }
  const agg = {
    stato: 'variata', comunicato: e.comunicato,
    precedente: g.precedente ?? { data_ora: g.data_ora, ora_da_definire: g.ora_da_definire, campo: g.campo, indirizzo: g.indirizzo,
      casa_nome: g.casa_nome, trasferta_nome: g.trasferta_nome },
    data_ora: istante(e.data, e.ora), ora_da_definire: !e.ora,
  };
  if (e.campo) Object.assign(agg, { campo: e.campo, indirizzo: e.indirizzo ?? null, codice_campo: e.codice_campo ?? null });
  if (e.inverti) Object.assign(agg, { casa_id: g.trasferta_id, trasferta_id: g.casa_id, casa_nome: g.trasferta_nome, trasferta_nome: g.casa_nome });
  modifiche.push([g, e, agg]);
}

const nostra = (x) => /casatese merate/i.test(`${x.casa_nome} ${x.trasferta_nome}`) && !/rogoredo/i.test(`${x.casa_nome} ${x.trasferta_nome}`);
const variate = modifiche.filter(([, e]) => e.stato === 'variata');
console.log(`\n📋 ${esiti.length} esiti dai comunicati: ${variate.length} gare da variare, ${modifiche.length - variate.length} da confermare`);
if (mancanti) console.log(`⚠️  ${mancanti} gare non trovate in archivio (calendari non ancora importati?)`);
if (gia) console.log(`   ${gia} già a posto`);
const nostre = modifiche.filter(([g]) => nostra(g));
if (nostre.length) {
  console.log('\n⭐ Gare dell\'Academy Casatese Merate:');
  for (const [, e] of nostre) console.log(`   ${e.stato === 'variata' ? '✎ Variata' : '✓ Confermata'} · ${e.gara} · ${e.data} ${e.ora ?? ''} · ${e.comunicato}${e.motivo ? ` · ${e.motivo}` : ''}`);
}
console.log('\nVariate:');
for (const [, e] of variate) console.log(`   ✎ ${e.gara}: ${e.motivo} (${e.comunicato})`);

if (!CONFERMA) {
  console.log('\nSimulazione: nulla è stato scritto. Per scrivere aggiungi --conferma');
  process.exit(0);
}
let ok = 0;
for (const [g, e, agg] of modifiche) {
  const { error } = await db.from('gare').update(agg).eq('id', g.id);
  if (error) console.error(`❌ ${e.gara}: ${error.message}`); else ok++;
}
console.log(`\n✅ Aggiornate ${ok} gare. Ora rilancia portale.mjs per portare le modifiche nel Portale.`);
