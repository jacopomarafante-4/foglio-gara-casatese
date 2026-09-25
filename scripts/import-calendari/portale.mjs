// =====================================================================
// Calendari ufficiali → calendario delle nostre squadre nel Portale (docs calendar/<squadra>)
// Uso: node --env-file=.env.local scripts/import-calendari/portale.mjs [--conferma]
// (dopo importa.mjs; senza --conferma è una simulazione)
//
// Squadra del Portale ↔ gare: "Under 14 - Provinciale" prende le gare "Under 14 … Provinciali …"
// in cui gioca l'Academy Casatese Merate. Regole:
// - partita già nel Portale (stesso avversario, casa/trasferta): si collega alla gara (garaId) e prende
//   la dicitura (Da calendario / Confermata / Variata). Data, ora e campo scritti a mano restano,
//   a meno che un comunicato abbia confermato o variato la gara: allora vale il comunicato;
// - partita che manca: si aggiunge.
// Le differenze tra Portale e calendario (non ancora verificate da un comunicato) si stampano.
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
const NOSTRA = 'Academy Casatese Merate';

const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase()
  .replace(/\b(A\.?S\.?D\.?|S\.?S\.?D\.?|G\.?S\.?O?\.?|POL\.?|C\.?S\.?C\.?|A\.?C\.?|U\.?S\.?D?\.?|CALCIO|\(.*\))/g, ' ')
  .replace(/[^A-Z0-9]/g, '');
const stessoAvversario = (a, b) => { const x = norm(a), y = norm(b); return !!x && !!y && (x === y || x.includes(y) || y.includes(x)); };
const bello = (s) => String(s ?? '').toLowerCase().replace(/(^|[\s"'(.-])(\p{L})/gu, (_, a, b) => a + b.toUpperCase());
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
  .select('id, data_ora, categoria, casa_id, trasferta_id, casa_nome, trasferta_nome, campo, ora_da_definire, stato, comunicato')
  .or(`casa_id.eq.${soc.id},trasferta_id.eq.${soc.id}`).order('data_ora');
if (error) { console.error('❌', error.message); process.exit(1); }

for (const team of teamsDoc.data.items ?? []) {
  const cat = String(team.category ?? '');
  const eta = cat.match(/under\s*(\d+)/i)?.[1];
  const livello = Object.entries(LIVELLI).find(([k]) => cat.toLowerCase().includes(k))?.[1];
  const gare = gareData.filter((g) => eta && g.categoria.startsWith(`Under ${eta}`) && (!livello || g.categoria.includes(livello)));
  console.log(`\n⚽ ${team.id} · ${team.name} · ${cat}: ${gare.length} gare dai calendari`);
  if (!gare.length) continue;

  const { data: calDoc } = await db.from('docs').select('data').eq('path', `calendar/${team.id}`).maybeSingle();
  const matches = structuredClone(calDoc?.data?.matches ?? []);
  let aggiunte = 0, collegate = 0, aggiornate = 0;
  for (const g of gare) {
    const casa = g.casa_id === soc.id;
    const avversario = casa ? g.trasferta_nome : g.casa_nome;
    const { date, time } = dataOra(g.data_ora);
    const ufficiale = { date, time: g.ora_da_definire ? '' : time, venue: bello(g.campo) };
    let m = matches.find((x) => x.garaId === g.id)
      ?? matches.find((x) => !x.garaId && !x.friendly && !!x.home === casa && stessoAvversario(x.opponent, avversario));
    if (!m) {
      matches.push({ id: uid(), ...ufficiale, opponent: avversario, home: casa, garaId: g.id, stato: g.stato, comunicato: g.comunicato ?? '' });
      aggiunte++;
      console.log(`   + ${date} ${ufficiale.time || 'ora ?'} ${casa ? 'casa' : 'trasferta'} ${avversario}`);
      continue;
    }
    if (!m.garaId) collegate++;
    Object.assign(m, { garaId: g.id, stato: g.stato, comunicato: g.comunicato ?? '' });
    const diversa = m.date !== date || (!g.ora_da_definire && (m.time || '').padStart(5, '0') !== time)
      || (g.stato === 'variata' && ufficiale.venue && m.venue !== ufficiale.venue);
    if (!diversa) continue;
    if (g.stato === 'confermata' || g.stato === 'variata') {
      console.log(`   ✎ ${m.opponent}: ${m.date} ${m.time} → ${date} ${ufficiale.time} (${g.comunicato})`);
      Object.assign(m, { date, time: ufficiale.time || m.time }, g.stato === 'variata' && ufficiale.venue ? { venue: ufficiale.venue } : {});
      aggiornate++;
    } else {
      console.log(`   ≠ ${m.opponent}: Portale ${m.date} ${m.time || ''} · calendario ${date} ${ufficiale.time || 'ora ?'} (resta quella del Portale)`);
    }
  }
  console.log(`   collegate ${collegate}, aggiunte ${aggiunte}, aggiornate da comunicato ${aggiornate}`);
  if (CONFERMA) {
    const { error: e } = await db.from('docs').upsert({ path: `calendar/${team.id}`, data: { ...(calDoc?.data ?? {}), matches }, updated_at: new Date().toISOString() });
    if (e) console.error(`   ❌ ${e.message}`);
  }
}
if (!CONFERMA) console.log('\nSimulazione: nulla è stato scritto. Per scrivere aggiungi --conferma');
