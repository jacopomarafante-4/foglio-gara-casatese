// =====================================================================
// Portieri dei preparatori → segnati come portieri nella rosa della loro squadra
// Uso: node --env-file=.env.local scripts/import-adb/portieri.mjs [--conferma]
// (senza --conferma è una simulazione; stampa solo squadre e conteggi, mai i nomi dei ragazzi)
//
// La rosa dei preparatori (roster/<squadra con vedeTutte>) resta com'è. Ogni suo portiere si cerca, per cognome e nome
// (anche invertiti, senza accenti e maiuscole), nelle rose delle altre squadre: dove c'è, nel registro di quella squadra
// diventa portiere (registro.gk, e registro.ruoli = 'portiere'). Chi non si trova o si trova in più squadre si segnala.
// =====================================================================
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('❌ Mancano NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}
const db = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
const CONFERMA = process.argv.includes('--conferma');

const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();
const chiave = (s) => norm(s).split(' ').sort().join(' ');   // "Rossi Luca" = "Luca Rossi"

const { data: teamsDoc } = await db.from('docs').select('data').eq('path', 'shared/teams').single();
const squadre = teamsDoc.data.items ?? [];
const prep = squadre.find((t) => t.vedeTutte);
if (!prep) { console.error('❌ Nessuna squadra dei preparatori (vedeTutte)'); process.exit(1); }
const leggi = async (p) => (await db.from('docs').select('data').eq('path', p).maybeSingle()).data?.data ?? null;

const portieri = (await leggi(`roster/${prep.id}`))?.players ?? [];
console.log(`🧤 ${portieri.length} portieri nella rosa dei preparatori`);
const rose = [];
for (const t of squadre.filter((x) => x.id !== prep.id)) rose.push({ t, players: (await leggi(`roster/${t.id}`))?.players ?? [] });

const perSquadra = new Map();
let nonTrovati = 0, doppi = 0;
for (const gk of portieri) {
  const k = chiave(gk.name);
  const dove = rose.flatMap(({ t, players }) => players.filter((p) => chiave(p.name) === k).map((p) => ({ t, p })));
  if (!dove.length) { nonTrovati++; continue; }
  if (dove.length > 1) doppi++;
  for (const { t, p } of dove) { if (!perSquadra.has(t.id)) perSquadra.set(t.id, { t, ids: [] }); perSquadra.get(t.id).ids.push(p.id); }
}
for (const { t, ids } of perSquadra.values()) {
  const reg = (await leggi(`registro/${t.id}`)) ?? { trainings: [], games: [], tests: [], gk: [], friendlies: [] };
  const gk = new Set(reg.gk ?? []), ruoli = { ...(reg.ruoli ?? {}) };
  const nuovi = ids.filter((id) => !gk.has(id) || ruoli[id] !== 'portiere');
  ids.forEach((id) => { gk.add(id); ruoli[id] = 'portiere'; });
  console.log(`   ${t.category || t.name}: ${ids.length} portieri (${nuovi.length} da segnare)`);
  if (CONFERMA && nuovi.length) {
    const { error } = await db.from('docs').upsert({ path: `registro/${t.id}`, data: { ...reg, gk: [...gk], ruoli }, updated_at: new Date().toISOString() });
    if (error) console.error(`   ❌ ${error.message}`);
  }
}
console.log(`   trovati in una squadra ${portieri.length - nonTrovati - doppi}, in più squadre ${doppi}, non trovati ${nonTrovati}`);
if (!CONFERMA) console.log('\nSimulazione: nulla è stato scritto. Per scrivere aggiungi --conferma');
