// =====================================================================
// Calendari Google della società (MERATE, CERNUSCO = in casa; TRASFERTA) → calendario delle squadre del Portale
// Uso: node --env-file=.env.local scripts/import-calendari/google.mjs private/google-calendar/*.json [--dal=AAAA-MM-GG] [--conferma]
// (senza --conferma è una simulazione)
//
// I file sono le risposte di Google Calendar (events.list: {summary, events:[…]}), scaricati da Claude
// col connettore Google Calendar e salvati in private/ (contengono telefoni di altre società: mai su git).
// Regole:
// - si prendono gli eventi "U14 - 2013 - Avversario", "AdB - 2014 - Avversario", "AdB - 2019/20 - …"
//   (allenamenti, Prima squadra, Serie D, … si ignorano). Squadra = annata: età = anno di fine stagione − annata;
// - partite di campionato già nel Portale dai calendari ufficiali (garaId, stesso avversario e casa/trasferta):
//   non si toccano (portale.mjs), si stampano solo le date diverse;
// - le altre (amichevoli, tornei, attività di base) si aggiungono con friendly: true e gcal = id dell'evento;
//   reimportando si aggiornano, e quelle sparite da Google (dalla data --dal in poi, di norma oggi) si tolgono;
// - ora = inizio gara scritto nella descrizione ("INIZIO GARA ORE 14:30", "Orario di gioco: 16:30"),
//   se no l'inizio dell'evento; vuota se la descrizione dice che l'orario è da ricevere/definire;
// - nota = descrizione senza contatti, nomi e telefoni (solo "Livello medio", "Da confermare", …).
// =====================================================================
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { cerca } from '../lib/luoghi.mjs';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('❌ Mancano NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}
const db = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
const CONFERMA = process.argv.includes('--conferma');
const file = process.argv.slice(2).filter((a) => !a.startsWith('--'));

const dataOra = (iso) => {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Rome', hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
};
const DAL = process.argv.find((a) => a.startsWith('--dal='))?.slice(6) ?? dataOra(new Date().toISOString()).date;
const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase()
  .replace(/\b(A\.?S\.?D\.?|S\.?S\.?D\.?|G\.?S\.?O?\.?|POL\.?|C\.?S\.?C\.?|A\.?C\.?|U\.?S\.?D?\.?|CALCIO|\(.*\))/g, ' ')
  .replace(/[^A-Z0-9]/g, '');
const stessoAvversario = (a, b) => { const x = norm(a), y = norm(b); return !!x && !!y && (x === y || x.includes(y) || y.includes(x)); };
const uid = () => 'g' + Math.random().toString(36).slice(2, 9);
const hhmm = (h, m) => `${String(h).padStart(2, '0')}:${m}`;

// Campi di casa: il nome del calendario dice dove si gioca
const CASA = {
  MERATE: { venue: 'C.S. COMUNALE - MERATE', address: 'VIA BERGAMO 12', cerca: ['Via Bergamo 12, Merate', 'Merate'] },
  CERNUSCO: { venue: 'C.S. COMUNALE - CERNUSCO LOMBARDONE', address: 'VIA LANFRITTO MAGGIONI', ll: '45.695808,9.397728' },
};

/** Ora d'inizio dalla descrizione: '' se da definire, null se non scritta */
function inizio(desc) {
  const m = desc.match(/\bIN[IZ]+O?\s+(?:GARA\s+|PARTITA\s+)?ORE\s+(\d{1,2})[:.](\d{2})/i) ?? desc.match(/Orario di gioco:\s*(\d{1,2})[:.](\d{2})/i);
  if (m) return hhmm(m[1], m[2]);
  if (/(orario|programma)[^\n]*da (ricevere|definire)|da definire orario/i.test(desc)) return '';
  return null;
}
/** Nota senza contatti: via le righe con telefoni, "Contatto", "Referente", orari già letti */
function nota(desc) {
  return desc.replace(/[‪‬]/g, '').split('\n').map((r) => r.trim())
    .filter((r) => r && !/contatt|referente|\d[\d .]{7,}\d|\bORE\s+\d|orario di gioco|^livello$/i.test(r))
    .map((r) => r.replace(/!+$/, '').replace(/\s+/g, ' '))
    .join(' · ');
}

// ---- Eventi dai file ----
const CALENDARI = ['MERATE', 'CERNUSCO', 'TRASFERTA'];
const eventi = [];
console.log(`🕖 ${new Date().toLocaleString('it-IT', { timeZone: 'Europe/Rome' })}`);
for (const f of file) {
  const j = JSON.parse(readFileSync(f, 'utf8'));
  const cal = String(j.summary ?? '').toUpperCase();
  if (!CALENDARI.includes(cal)) { console.log(`⚠︎ ${f}: calendario "${j.summary}" ignorato`); continue; }
  for (const e of j.events ?? []) if (e.status !== 'cancelled') eventi.push({ ...e, cal });
}
if (!file.length) { console.error('❌ Indica i file JSON dei calendari (private/google-calendar/*.json)'); process.exit(1); }
const visti = new Set();
const partite = [];
for (const e of eventi) {
  if (visti.has(e.id)) continue;
  visti.add(e.id);
  const t = (e.summary ?? '').match(/^\s*(U\s*\d{2}|AdB)\s*-\s*(\d{4})(?:\/\d{2})?\s*-\s*(.+?)\s*$/i);
  if (!t || /allenament/i.test(e.summary)) continue;
  const inizioEvento = dataOra(e.start.dateTime ?? `${e.start.date}T12:00:00`);
  if (inizioEvento.date < DAL) continue;
  const desc = e.description ?? '';
  const ora = inizio(desc);
  const [a, m] = inizioEvento.date.split('-').map(Number);
  const eta = (m >= 7 ? a + 1 : a) - Number(t[2]);
  const avversario = /^da trovare$/i.test(t[3]) ? 'Da trovare' : t[3];
  // Lo stesso evento inserito due volte (stessa annata, ora, avversario e descrizione): uno solo
  const doppione = `${t[2]}|${e.start.dateTime ?? e.start.date}|${avversario}|${desc}`;
  if (visti.has(doppione)) continue;
  visti.add(doppione);
  partite.push({
    gcal: e.id, cal: e.cal, eta, annata: t[2], ufficiale: /Orario di gioco:/i.test(desc),
    date: inizioEvento.date, time: ora ?? (e.start.dateTime ? inizioEvento.time : ''),
    opponent: avversario, home: e.cal !== 'TRASFERTA', location: (e.location ?? '').trim(), note: nota(desc),
    tipo: /torneo|quadrangolare|triangolare|cup|memorial|finali/i.test(avversario) ? 'Torneo' : 'Amichevole',
  });
}
console.log(`📅 ${eventi.length} eventi letti, ${partite.length} partite delle giovanili dal ${DAL}`);

// ---- Luoghi ----
const luoghi = {};
for (const [k, c] of Object.entries(CASA)) {
  let ll = c.ll ?? '';
  if (!ll && c.cerca) { const p = await cerca(...c.cerca).catch(() => null); ll = p ? `${p.lat},${p.lon}` : ''; }
  luoghi[k] = { venue: c.venue, address: c.address, ll };
}
const luogo = (p) => p.home ? luoghi[p.cal] : { venue: p.location, address: '', ll: '' };

// ---- Squadre ----
const { data: teamsDoc } = await db.from('docs').select('data').eq('path', 'shared/teams').single();
const squadre = (teamsDoc?.data?.items ?? []).map((t) => ({ ...t, eta: Number(String(t.category ?? '').match(/under\s*(\d+)/i)?.[1]) }))
  .filter((t) => t.eta);
const senzaSquadra = new Map();
for (const p of partite) if (!squadre.some((t) => t.eta === p.eta)) senzaSquadra.set(`U${p.eta} (${p.annata})`, (senzaSquadra.get(`U${p.eta} (${p.annata})`) ?? 0) + 1);
if (senzaSquadra.size) console.log(`   senza squadra nel Portale (ignorate): ${[...senzaSquadra].map(([k, n]) => `${k} ${n}`).join(', ')}`);

for (const team of squadre) {
  const mie = partite.filter((p) => p.eta === team.eta).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const { data: calDoc } = await db.from('docs').select('data').eq('path', `calendar/${team.id}`).maybeSingle();
  const matches = structuredClone(calDoc?.data?.matches ?? []);
  if (!mie.length && !matches.some((x) => x.gcal)) continue;
  console.log(`\n⚽ ${team.id} · ${team.category}: ${mie.length} partite da Google`);
  let aggiunte = 0, aggiornate = 0, tolte = 0, campionato = 0;
  for (const p of mie) {
    // Campionato: la gara è già nel Portale dai calendari ufficiali
    const uff = matches.find((x) => x.garaId && !!x.home === p.home && stessoAvversario(x.opponent, p.opponent)
      && (p.ufficiale || x.date === p.date));
    if (uff) {
      campionato++;
      if (uff.date !== p.date || (p.time && (uff.time || '').padStart(5, '0') !== p.time))
        console.log(`   ≠ ${uff.opponent}: Portale ${uff.date} ${uff.time || ''} · Google ${p.date} ${p.time || 'ora ?'} (resta quella del Portale)`);
      continue;
    }
    if (p.ufficiale) console.log(`   ⚠︎ ${p.date} ${p.opponent}: campionato su Google ma non nei calendari ufficiali, la aggiungo`);
    const dati = { date: p.date, time: p.time, opponent: p.opponent, home: p.home, ...luogo(p),
      friendly: !p.ufficiale, tipo: p.ufficiale ? '' : p.tipo, note: p.note, gcal: p.gcal };
    const m = matches.find((x) => x.gcal === p.gcal);
    if (!m) {
      matches.push({ id: uid(), ...dati });
      aggiunte++;
      console.log(`   + ${p.date} ${p.time || 'ora ?'} ${p.home ? 'casa' : 'trasferta'} ${p.opponent}${p.note ? ` (${p.note})` : ''}`);
    } else if (Object.entries(dati).some(([k, v]) => (m[k] ?? '') !== v)) {
      console.log(`   ✎ ${m.date} ${m.time} ${m.opponent} → ${p.date} ${p.time} ${p.opponent}`);
      Object.assign(m, dati);
      aggiornate++;
    }
  }
  // Tolte da Google: si tolgono dal Portale (solo dal --dal in poi: le passate restano per i tabellini)
  const ids = new Set(mie.map((p) => p.gcal));
  const resta = matches.filter((x) => {
    if (!x.gcal || ids.has(x.gcal) || (x.date || '') < DAL) return true;
    console.log(`   − ${x.date} ${x.opponent}: non c'è più su Google`);
    tolte++;
    return false;
  });
  console.log(`   campionato già presente ${campionato}, aggiunte ${aggiunte}, aggiornate ${aggiornate}, tolte ${tolte}`);
  if (CONFERMA && (aggiunte || aggiornate || tolte)) {
    const { error: e } = await db.from('docs').upsert({ path: `calendar/${team.id}`, data: { ...(calDoc?.data ?? {}), matches: resta }, updated_at: new Date().toISOString() });
    if (e) console.error(`   ❌ ${e.message}`);
  }
}
if (!CONFERMA) console.log('\nSimulazione: nulla è stato scritto. Per scrivere aggiungi --conferma');
