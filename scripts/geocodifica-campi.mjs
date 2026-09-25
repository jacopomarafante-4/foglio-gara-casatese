// =====================================================================
// Coordinate dei campi delle società (per le distanze nel pannello Gare)
// Uso: node --env-file=.env.local scripts/geocodifica-campi.mjs [--conferma]
// Senza --conferma è una simulazione sulle prime 10 società.
//
// Per ogni società senza coordinate ma con l'indirizzo del campo (preso dai calendari) chiede a
// OpenStreetMap (Nominatim, gratuito) latitudine e longitudine di "indirizzo, paese". Se l'indirizzo
// non si trova, usa il centro del paese (distanza approssimata di 1–2 km). Si inviano solo indirizzi
// pubblici dei campi, nessun dato di persone. Regole di Nominatim: al massimo una richiesta al secondo.
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
const AGENTE = 'AcademyCasateseScouting/1.0 (+https://academy-casatese.vercel.app)';
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

/** Paesi possibili dal nome del campo: "C.S.COMUNALE N. 1 (E.A) - VIMERCATE" → ["VIMERCATE"];
 *  senza trattino ("C.S.COMUNALE N. 1 VIMERCATE") si provano le ultime due parole e l'ultima */
function paesi(campo) {
  let t = (campo ?? '').replace(/\(.*?\)/g, ' ').replace(/\b(FRAZ|FRAZIONE|FR|LOC|LOCALITA|Q\.?RE)\b.*$/i, '').replace(/\s+/g, ' ').trim();
  if (!t) return [];
  if (t.includes(' - ')) t = t.split(' - ').pop().trim();
  // via le parole del campo ("CAMPO N.1", "E.A."): restano i nomi, di cui si provano le ultime tre, due e una
  const parole = t.split(/[\s/]+/).filter((w) => /^[A-ZÀ-Ú']{2,}$/i.test(w) && !/^(COMUNALE|CAMPO|SPORTIVO|CENTRO|STADIO|ORATORIO|PARROCCHIALE|EA|N)$/i.test(w));
  return [...new Set([parole.slice(-3).join(' '), parole.slice(-2).join(' '), parole.slice(-1)[0]].filter(Boolean))];
}
const paese = (campo) => paesi(campo)[0] ?? '';
/** "VIA DEGLI ATLETI,1" → "Via degli Atleti 1" (Nominatim trova meglio senza sigle e virgole attaccate) */
const via = (s) => (s ?? '').replace(/\bS\.N\.C\.?|\bSNC\b/gi, '').replace(/,/g, ' ').replace(/\s+/g, ' ').trim();

let ultima = 0;
async function cerca(q) {
  const attesa = 1100 - (Date.now() - ultima);
  if (attesa > 0) await pausa(attesa);
  ultima = Date.now();
  const u = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=it&q=${encodeURIComponent(q)}`;
  const r = await fetch(u, { headers: { 'User-Agent': AGENTE, 'Accept-Language': 'it' } });
  if (!r.ok) throw new Error(`OpenStreetMap ha risposto ${r.status}`);
  const [x] = await r.json();
  return x ? { lat: Number(Number(x.lat).toFixed(6)), lon: Number(Number(x.lon).toFixed(6)) } : null;
}

const { data, error } = await db.from('societa').select('id, nome, campo, indirizzo').is('lat', null).order('nome');
if (error) { console.error('❌', error.message); process.exit(1); }
const daFare = data.filter((s) => s.indirizzo || paese(s.campo));
const lista = CONFERMA ? daFare : daFare.slice(0, 10);
console.log(`📍 ${data.length} società senza coordinate, ${daFare.length} con indirizzo o paese${CONFERMA ? '' : ' (simulazione: prime 10)'}`);

let precise = 0, centri = 0, nessuna = 0;
for (const [i, s] of lista.entries()) {
  const tutti = paesi(s.campo);
  const p = tutti.join(' / ');
  let c = null, tipo = '';
  try {
    for (const x of tutti) if (!c && s.indirizzo) { c = await cerca(`${via(s.indirizzo)}, ${x}, Lombardia`); tipo = 'indirizzo'; }
    for (const x of tutti) if (!c) { c = await cerca(`${x}, Lombardia`); tipo = 'paese'; }
    // Società fuori regione (es. Castelvetro Piacentino): senza "Lombardia"
    for (const x of tutti) if (!c) { c = await cerca(x); tipo = 'paese'; }
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
