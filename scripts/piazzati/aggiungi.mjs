// Aggiunge al Portale (shared/schemes) i calci piazzati di schemi.mjs che non ci sono ancora (confronto per id).
// Uso: node --env-file=.env.local scripts/piazzati/aggiungi.mjs            → simulazione
//      node --env-file=.env.local scripts/piazzati/aggiungi.mjs --conferma → scrive
// Con --aggiorna rimette come in schemi.mjs anche quelli già aggiunti (stesso id). Gli altri schemi non si toccano.
import { createClient } from '@supabase/supabase-js';
import { SCHEMI, comePortale } from './schemi.mjs';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL, serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) { console.error('❌ Mancano NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY in .env.local'); process.exit(1); }
const conferma = process.argv.includes('--conferma'), aggiorna = process.argv.includes('--aggiorna');
const db = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });


const { data, error } = await db.from('docs').select('data').eq('path', 'shared/schemes').maybeSingle();
if (error) { console.error('❌', error.message); process.exit(1); }
const items = data?.data?.items ?? [];
let nuovi = 0, rifatti = 0;
for (const s of SCHEMI) {
  const i = items.findIndex((x) => x.id === s.id);
  if (i < 0) { items.push(comePortale(s)); nuovi++; console.log('+', s.name, '·', s.subtitle); }
  else if (aggiorna) { items[i] = comePortale(s); rifatti++; console.log('↻', s.name, '·', s.subtitle); }
}
console.log(`\n${nuovi} nuovi, ${rifatti} aggiornati · schemi in totale: ${items.length}`);
if (!conferma) { console.log('Simulazione: aggiungi --conferma per scrivere.'); process.exit(0); }
if (!nuovi && !rifatti) process.exit(0);
const { error: e2 } = await db.from('docs').upsert({ path: 'shared/schemes', data: { ...(data?.data ?? {}), items }, updated_at: new Date().toISOString() });
if (e2) { console.error('❌', e2.message); process.exit(1); }
console.log('✓ Scritto su shared/schemes');
