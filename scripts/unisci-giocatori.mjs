// =====================================================================
// Unione di schede doppie dello stesso giocatore, tenendo più informazioni possibile
// Uso: node --env-file=.env.local scripts/unisci-giocatori.mjs private/unioni-giocatori.json [--conferma]
// Senza --conferma è una simulazione.
//
// Il JSON (in private/, non va su git) è un elenco di gruppi:
//   [{ "ids": ["<id scheda>", "<id scheda>"], "cognome": "Zogo", "nome": "Eliezer" }, …]
// "cognome"/"nome" sono facoltativi: servono quando le schede hanno nome e cognome invertiti.
//
// Stessi passaggi di public.unisci_giocatori() (0014/0018), più:
// - si tiene la scheda più completa; ogni campo vuoto si riempie con quello dell'altra;
// - nome e cognome: il più completo ("Davila Cabrera" invece di "Davila");
// - stato: il più avanzato; osservato se lo è una delle due;
// - le differenze scartate (altra società, altra grafia del nome) finiscono nelle note;
// - contatti uguali (stesso telefono o email) restano una volta sola, con i dati di tutti.
// =====================================================================
import { readFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const FILE = process.argv[2];
if (!url || !serviceKey || !FILE) {
  console.error('Uso: node --env-file=.env.local scripts/unisci-giocatori.mjs FILE.json [--conferma]');
  process.exit(1);
}
const db = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
const CONFERMA = process.argv.includes('--conferma');
const gruppi = JSON.parse(await readFile(FILE, 'utf8'));

const ORDINE_STATI = ['in_lista', 'in_osservazione', 'da_rivedere', 'da_non_inserire', 'inserito'];
const CAMPI = ['descrizione', 'data_nascita', 'ruolo', 'piede', 'categoria', 'segnalato_da_squadra'];
const proprio = (s) => (s ? s.trim().replace(/\s+/g, ' ').toLowerCase().replace(/(^|[\s'’-])(\p{L})/gu, (_, a, b) => a + b.toUpperCase()) : s);
const nomeDi = (g) => [g.cognome, g.nome].filter(Boolean).join(' ') || g.descrizione || 'senza nome';
const oggi = new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome' }).format(new Date());
const conta = (g) => ['segnalazioni', 'valutazioni', 'contatti', 'eventi_giocatore', 'distinte_giocatori'].reduce((s, t) => s + (g[t]?.[0]?.count ?? 0), 0);
const completezza = (g) => conta(g) * 3 + [g.cognome, g.nome, ...CAMPI.map((c) => g[c]), g.societa_id].filter(Boolean).length
  + (g.cognome?.length ?? 0) / 100 + (g.nome?.length ?? 0) / 100;
const tel = (c) => c.telefono?.replace(/\D/g, '').slice(-9) || '';
const mail = (c) => c.email?.toLowerCase().trim() || '';

/** Contatti dello stesso giocatore con lo stesso telefono o la stessa email: ne resta uno, con i dati di tutti */
async function unisciContatti(giocatoreId) {
  const { data } = await db.from('contatti').select('id, tipo, nome, telefono, email, consenso_privacy, created_at')
    .eq('giocatore_id', giocatoreId).order('created_at');
  const tenuti = [];
  let tolti = 0;
  for (const c of data ?? []) {
    const t = tenuti.find((x) => (tel(c) && tel(x) === tel(c)) || (mail(c) && mail(x) === mail(c)));
    if (!t) { tenuti.push({ ...c }); continue; }
    const agg = {};
    for (const k of ['nome', 'telefono', 'email']) if (!t[k] && c[k]) agg[k] = t[k] = c[k];
    if ((!t.tipo || t.tipo === 'altro') && c.tipo && c.tipo !== 'altro') agg.tipo = t.tipo = c.tipo;
    if (!t.consenso_privacy && c.consenso_privacy) agg.consenso_privacy = t.consenso_privacy = true;
    if (Object.keys(agg).length) await db.from('contatti').update(agg).eq('id', t.id);
    await db.from('contatti').delete().eq('id', c.id);
    tolti++;
  }
  return tolti;
}

const SELECT = 'id, cognome, nome, descrizione, annata, data_nascita, ruolo, piede, categoria, societa_id, stato, osservato, note, '
  + 'segnalato_da_squadra, societa(nome), segnalazioni(count), valutazioni(count), contatti(count), eventi_giocatore(count), distinte_giocatori(count)';

for (const gr of gruppi) {
  const { data: schede, error } = await db.from('giocatori').select(SELECT).in('id', gr.ids);
  if (error || schede.length !== gr.ids.length) { console.error(`❌ ${gr.ids.join(', ')}: schede non trovate`); continue; }
  schede.sort((a, b) => completezza(b) - completezza(a));
  const [tieni, ...togli] = schede;

  const agg = {};
  for (const c of CAMPI) if (!tieni[c]) { const v = togli.find((t) => t[c])?.[c]; if (v) agg[c] = v; }
  const piuLungo = (campo) => [tieni, ...togli].map((g) => g[campo]).filter(Boolean).sort((a, b) => b.length - a.length)[0] ?? null;
  agg.cognome = proprio(gr.cognome ?? piuLungo('cognome'));
  agg.nome = proprio(gr.nome ?? piuLungo('nome'));
  if (!tieni.societa_id) { const s = togli.find((t) => t.societa_id); if (s) agg.societa_id = s.societa_id; }
  const stati = [tieni, ...togli].map((g) => g.stato);
  const stato = stati.sort((a, b) => ORDINE_STATI.indexOf(b) - ORDINE_STATI.indexOf(a))[0];
  if (stato !== tieni.stato) agg.stato = stato;
  if (!tieni.osservato && togli.some((t) => t.osservato)) agg.osservato = true;

  // Note: quelle di tutte le schede (senza ripetizioni) + cosa si è scartato
  const note = [...new Set([tieni, ...togli].map((g) => g.note?.trim()).filter(Boolean))];
  const scartati = [];
  for (const t of togli) {
    const altroNome = nomeDi(t);
    if (proprio(altroNome) !== proprio([agg.cognome, agg.nome].filter(Boolean).join(' '))) scartati.push(`scritto anche "${altroNome}"`);
    const soc = agg.societa_id ?? tieni.societa_id;
    if (t.societa_id && t.societa_id !== soc) scartati.push(`altra società indicata: ${t.societa?.nome ?? '?'}`);
    if (t.data_nascita && (agg.data_nascita ?? tieni.data_nascita) && t.data_nascita !== (agg.data_nascita ?? tieni.data_nascita)) {
      scartati.push(`altra data di nascita: ${t.data_nascita}`);
    }
  }
  note.push(`Unita con ${togli.length === 1 ? 'la scheda' : 'le schede'} ${togli.map((t) => `"${nomeDi(t)}" (${t.annata})`).join(', ')} il ${oggi}`
    + (scartati.length ? ` – ${scartati.join('; ')}` : ''));
  agg.note = note.join('\n\n');

  console.log(`\n👤 ${nomeDi({ ...tieni, ...agg })} (${tieni.annata}) ← ${togli.map(nomeDi).join(', ')}`);
  for (const [k, v] of Object.entries(agg)) if (k !== 'note' && v !== tieni[k]) console.log(`   ${k}: ${tieni[k] ?? '–'} → ${v}`);
  if (scartati.length) console.log(`   note: ${scartati.join('; ')}`);
  if (!CONFERMA) continue;

  for (const t of togli) {
    for (const tab of ['segnalazioni', 'valutazioni', 'contatti', 'eventi_giocatore', 'storico_stati']) {
      const { error: e } = await db.from(tab).update({ giocatore_id: tieni.id }).eq('giocatore_id', t.id);
      if (e) { console.error(`   ❌ ${tab}: ${e.message}`); process.exit(1); }
    }
    // Presenze in distinta: se erano nella stessa distinta tutte e due, resta quella tenuta
    const { data: pres } = await db.from('distinte_giocatori').select('id, distinta_id').eq('giocatore_id', t.id);
    const { data: gia } = await db.from('distinte_giocatori').select('distinta_id').eq('giocatore_id', tieni.id);
    const dentro = new Set((gia ?? []).map((x) => x.distinta_id));
    for (const p of pres ?? []) {
      const q = db.from('distinte_giocatori');
      const { error: e } = dentro.has(p.distinta_id) ? await q.delete().eq('id', p.id) : await q.update({ giocatore_id: tieni.id }).eq('id', p.id);
      if (e) { console.error(`   ❌ distinte: ${e.message}`); process.exit(1); }
    }
  }
  const tolti = await unisciContatti(tieni.id);
  const { error: e1 } = await db.from('giocatori').update(agg).eq('id', tieni.id);
  if (e1) { console.error(`   ❌ scheda: ${e1.message}`); process.exit(1); }
  const { error: e2 } = await db.from('giocatori').delete().in('id', togli.map((t) => t.id));
  if (e2) { console.error(`   ❌ eliminazione: ${e2.message}`); process.exit(1); }
  console.log(`   ✅ unite (contatti ripetuti tolti: ${tolti})`);
}
if (!CONFERMA) console.log('\nSimulazione: nulla è stato scritto. Per unire aggiungi --conferma');
