// =====================================================================
// Unisce le società doppie dell'archivio (migrazione 0017, funzione unisci_societa)
// Uso: node --env-file=.env.local scripts/unisci-societa.mjs FILE.json [--conferma]
// FILE.json: { "Nome finale": ["nome in archivio", "altro nome in archivio", …], … }
// Per ogni gruppo si tiene la società con più giocatori, le altre si uniscono a lei, poi prende
// il nome finale (il vecchio nome resta tra i nomi alternativi). Senza --conferma è una simulazione.
// =====================================================================
import { readFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('❌ Mancano NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}
const db = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
const CONFERMA = process.argv.includes('--conferma');
const file = process.argv.slice(2).find((a) => !a.startsWith('--'));
if (!file) { console.error('Indica il file JSON con i gruppi'); process.exit(1); }
const gruppi = JSON.parse(await readFile(file, 'utf8'));

const { data: societa } = await db.from('societa').select('id, nome, alias');
const { data: giocatori } = await db.from('giocatori').select('societa_id');
const quanti = {};
for (const g of giocatori) quanti[g.societa_id] = (quanti[g.societa_id] ?? 0) + 1;
const perNome = new Map(societa.map((s) => [s.nome, s]));

for (const [finale, nomi] of Object.entries(gruppi)) {
  const trovate = nomi.map((n) => perNome.get(n)).filter(Boolean);
  const mancano = nomi.filter((n) => !perNome.has(n));
  if (!trovate.length) { console.log(`–  ${finale}: nessuna società trovata (${nomi.join(', ')})`); continue; }
  trovate.sort((a, b) => (quanti[b.id] ?? 0) - (quanti[a.id] ?? 0));
  const [tenere, ...togliere] = trovate;
  const occupato = finale !== tenere.nome && perNome.has(finale) && !trovate.some((s) => s.nome === finale);
  console.log(`${togliere.length || finale !== tenere.nome ? '✓' : '='}  ${finale}  ←  ${trovate.map((s) => `${s.nome} (${quanti[s.id] ?? 0})`).join(', ')}` +
    (mancano.length ? `   [non trovate: ${mancano.join(', ')}]` : '') + (occupato ? '   ⚠️ nome finale già usato: non rinomino' : ''));
  if (!CONFERMA) continue;
  for (const s of togliere) {
    const { error } = await db.rpc('unisci_societa', { p_tenere: tenere.id, p_togliere: s.id });
    if (error) { console.error(`   ❌ ${s.nome}: ${error.message}`); process.exit(1); }
  }
  if (finale !== tenere.nome && !occupato) {
    const { data: ora } = await db.from('societa').select('alias').eq('id', tenere.id).single();
    const alias = [...new Set([...(ora?.alias ?? []), tenere.nome])].filter((a) => a !== finale);
    const { error } = await db.from('societa').update({ nome: finale, alias }).eq('id', tenere.id);
    if (error) console.error(`   ❌ rinomina ${tenere.nome}: ${error.message}`);
  }
}
if (!CONFERMA) console.log('\nSimulazione: nulla è stato scritto. Per unire aggiungi --conferma');
