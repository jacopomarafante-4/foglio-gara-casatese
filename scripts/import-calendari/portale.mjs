// =====================================================================
// Calendari ufficiali → calendario delle nostre squadre nel Portale (docs calendar/<squadra>)
// Uso: node --env-file=.env.local scripts/import-calendari/portale.mjs [--conferma]
// (dopo importa.mjs; senza --conferma è una simulazione)
//
// Squadra del Portale ↔ gare: "Under 14 - Provinciale" prende le gare "Under 14 … Provinciali …"
// in cui gioca l'Academy Casatese Merate. Regole:
// - partita già nel Portale (stesso avversario, casa/trasferta): si collega alla gara (garaId) e prende
//   la dicitura (Da calendario / Confermata / Variata). Data e ora scritte a mano restano, a meno che un
//   comunicato abbia confermato o variato la gara: allora vale il comunicato;
// - campo: SEMPRE quello scritto nel calendario o nel comunicato, uguale lettera per lettera (venue),
//   con l'indirizzo (address) e le coordinate del campo (ll, "lat,lon") per il link di Google Maps.
//   Le coordinate si cercano su OpenStreetMap dall'indirizzo del campo e si salvano anche sulla gara;
// - partita che manca: si aggiunge.
// Le differenze tra Portale e calendario (non ancora verificate da un comunicato) si stampano.
// =====================================================================
import { createClient } from '@supabase/supabase-js';
import { posizioneCampo } from '../lib/luoghi.mjs';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('❌ Mancano NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}
const db = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
const CONFERMA = process.argv.includes('--conferma');
const NOSTRA = 'Academy Casatese Merate';

const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase()
  .replace(/\b(A\.?S\.?D\.?|S\.?S\.?D\.?|G\.?S\.?O?\.?|POL\.?|C\.?S\.?C\.?|A\.?C\.?|U\.?S\.?D?\.?|CALCIO|\(.*\))/g, ' ')
  .replace(/[^A-Z0-9]/g, '');
const stessoAvversario = (a, b) => { const x = norm(a), y = norm(b); return !!x && !!y && (x === y || x.includes(y) || y.includes(x)); };
const dataOra = (iso) => {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Rome', hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
};
const uid = () => 'm' + Math.random().toString(36).slice(2, 9);
const LIVELLI = { provinciale: 'Provinciali', regionale: 'Regionali', elite: 'Élite', élite: 'Élite' };

const { data: soc } = await db.from('societa').select('id').eq('nome', NOSTRA).single();
if (!soc) { console.error(`❌ Società "${NOSTRA}" non trovata`); process.exit(1); }
const { data: teamsDoc } = await db.from('docs').select('data').eq('path', 'shared/teams').single();
const { data: gareData, error } = await db.from('gare')
  .select('id, data_ora, categoria, casa_id, trasferta_id, casa_nome, trasferta_nome, campo, indirizzo, lat, lon, ora_da_definire, stato, comunicato, casa:societa!gare_casa_id_fkey(lat, lon)')
  .or(`casa_id.eq.${soc.id},trasferta_id.eq.${soc.id}`).order('data_ora');
if (error) { console.error('❌', error.message); process.exit(1); }

// Coordinate dei campi delle nostre gare: dall'indirizzo del campo (una ricerca per campo)
const posizioni = new Map();
for (const g of gareData) if (g.lat !== null) posizioni.set(`${g.campo}|${g.indirizzo}`, { lat: g.lat, lon: g.lon });
let trovate = 0;
for (const g of gareData) {
  if (g.lat !== null || !g.campo) continue;
  const k = `${g.campo}|${g.indirizzo}`;
  if (!posizioni.has(k)) {
    const c = await posizioneCampo(g.campo, g.indirizzo);
    posizioni.set(k, c ? { lat: c.lat, lon: c.lon } : null);
    console.log(`📍 ${g.campo}: ${c ? `${c.lat}, ${c.lon} (${c.tipo})` : 'non trovato'}`);
  }
  // Non trovato: il campo principale della società di casa
  const c = posizioni.get(k) ?? (g.casa?.lat != null ? { lat: g.casa.lat, lon: g.casa.lon } : null);
  if (!c) continue;
  Object.assign(g, { lat: c.lat, lon: c.lon });
  trovate++;
  if (CONFERMA) await db.from('gare').update({ lat: c.lat, lon: c.lon }).eq('id', g.id);
}
if (trovate) console.log(`📍 coordinate trovate per ${trovate} gare`);

for (const team of teamsDoc.data.items ?? []) {
  const cat = String(team.category ?? '');
  const eta = cat.match(/under\s*(\d+)/i)?.[1];
  const livello = Object.entries(LIVELLI).find(([k]) => cat.toLowerCase().includes(k))?.[1];
  const gare = gareData.filter((g) => eta && g.categoria.startsWith(`Under ${eta}`) && (!livello || g.categoria.includes(livello)));
  console.log(`\n⚽ ${team.id} · ${team.name} · ${cat}: ${gare.length} gare dai calendari`);
  if (!gare.length) continue;

  const { data: calDoc } = await db.from('docs').select('data').eq('path', `calendar/${team.id}`).maybeSingle();
  const matches = structuredClone(calDoc?.data?.matches ?? []);
  let aggiunte = 0, collegate = 0, aggiornate = 0, campi = 0;
  for (const g of gare) {
    const casa = g.casa_id === soc.id;
    const avversario = casa ? g.trasferta_nome : g.casa_nome;
    const { date, time } = dataOra(g.data_ora);
    const ufficiale = { date, time: g.ora_da_definire ? '' : time };
    // Campo come scritto nel calendario / comunicato, con indirizzo e coordinate
    const luogo = { venue: g.campo ?? '', address: g.indirizzo ?? '', ll: g.lat !== null ? `${g.lat},${g.lon}` : '' };
    let m = matches.find((x) => x.garaId === g.id)
      ?? matches.find((x) => !x.garaId && !x.friendly && !!x.home === casa && stessoAvversario(x.opponent, avversario));
    if (!m) {
      matches.push({ id: uid(), ...ufficiale, ...luogo, opponent: avversario, home: casa, garaId: g.id, stato: g.stato, comunicato: g.comunicato ?? '' });
      aggiunte++;
      console.log(`   + ${date} ${ufficiale.time || 'ora ?'} ${casa ? 'casa' : 'trasferta'} ${avversario}`);
      continue;
    }
    if (!m.garaId) collegate++;
    Object.assign(m, { garaId: g.id, stato: g.stato, comunicato: g.comunicato ?? '' });
    if (luogo.venue && (m.venue !== luogo.venue || m.address !== luogo.address || m.ll !== luogo.ll)) {
      if (m.venue !== luogo.venue) console.log(`   ⌖ ${m.opponent}: "${m.venue || '–'}" → "${luogo.venue}, ${luogo.address}"`);
      Object.assign(m, luogo);
      campi++;
    }
    const diversa = m.date !== date || (!g.ora_da_definire && (m.time || '').padStart(5, '0') !== time);
    if (!diversa) continue;
    if (g.stato === 'confermata' || g.stato === 'variata') {
      console.log(`   ✎ ${m.opponent}: ${m.date} ${m.time} → ${date} ${ufficiale.time} (${g.comunicato})`);
      Object.assign(m, { date, time: ufficiale.time || m.time });
      aggiornate++;
    } else {
      console.log(`   ≠ ${m.opponent}: Portale ${m.date} ${m.time || ''} · calendario ${date} ${ufficiale.time || 'ora ?'} (resta quella del Portale)`);
    }
  }
  console.log(`   collegate ${collegate}, aggiunte ${aggiunte}, aggiornate da comunicato ${aggiornate}, campi ufficiali ${campi}`);
  if (CONFERMA) {
    const { error: e } = await db.from('docs').upsert({ path: `calendar/${team.id}`, data: { ...(calDoc?.data ?? {}), matches }, updated_at: new Date().toISOString() });
    if (e) console.error(`   ❌ ${e.message}`);
  }
}
if (!CONFERMA) console.log('\nSimulazione: nulla è stato scritto. Per scrivere aggiungi --conferma');
