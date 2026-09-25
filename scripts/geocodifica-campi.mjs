// =====================================================================
// Coordinate dei campi delle società (per le distanze nel pannello Gare)
// Uso: node --env-file=.env.local scripts/geocodifica-campi.mjs [--tutte] [--conferma]
// Senza --conferma è una simulazione sulle prime 10 società.
//
// Per ogni società senza coordinate ma con l'indirizzo del campo (preso dai calendari) chiede a
// OpenStreetMap (Nominatim, gratuito) latitudine e longitudine di "indirizzo, paese". Se l'indirizzo
// non si trova, usa il centro del paese (distanza approssimata di 1–2 km). Si inviano solo indirizzi
// pubblici dei campi, nessun dato di persone. Regole di Nominatim: al massimo una richiesta al secondo.
// =====================================================================
import { createClient } from '@supabase/supabase-js';
import { paese, paesi, posizioneCampo } from './lib/luoghi.mjs';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('❌ Mancano NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}
const db = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
const CONFERMA = process.argv.includes('--conferma');
const TUTTE = process.argv.includes('--tutte');   // ricalcola anche le società che hanno già le coordinate
let q = db.from('societa').select('id, nome, campo, indirizzo').order('nome');
if (!TUTTE) q = q.is('lat', null);
const { data, error } = await q;
if (error) { console.error('❌', error.message); process.exit(1); }
const daFare = data.filter((s) => s.indirizzo || paese(s.campo));
const lista = CONFERMA ? daFare : daFare.slice(0, 10);
console.log(`📍 ${data.length} società ${TUTTE ? 'in tutto' : 'senza coordinate'}, ${daFare.length} con indirizzo o paese${CONFERMA ? '' : ' (simulazione: prime 10)'}`);

let precise = 0, centri = 0, nessuna = 0;
for (const [i, s] of lista.entries()) {
  const p = paesi(s.campo).join(' / ');
  let c = null, tipo = '';
  try {
    const x = await posizioneCampo(s.campo, s.indirizzo);
    if (x) ({ tipo, ...c } = x);
  } catch (e) {
    console.error(`❌ ${e.message}: mi fermo (rilancia più tardi, riparte da dove era arrivato)`);
    break;
  }
  if (!c) { nessuna++; console.log(`   ? ${s.nome}: non trovata (${s.indirizzo ?? ''} ${p})`); continue; }
  if (tipo === 'indirizzo') precise++; else centri++;
  if (!CONFERMA) { console.log(`   ${tipo === 'indirizzo' ? '✓' : '≈'} ${s.nome}: ${c.lat}, ${c.lon} (${tipo})`); continue; }
  const { error: e } = await db.from('societa').update(c).eq('id', s.id);
  if (e) console.error(`   ❌ ${s.nome}: ${e.message}`);
  if ((i + 1) % 50 === 0) console.log(`   … ${i + 1}/${lista.length}`);
}
console.log(`\n✅ Dall'indirizzo: ${precise} · dal centro del paese: ${centri} · non trovate: ${nessuna}`);
if (!CONFERMA) console.log('Simulazione: nulla è stato scritto. Per salvare aggiungi --conferma');
