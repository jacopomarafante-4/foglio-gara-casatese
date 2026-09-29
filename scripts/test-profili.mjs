// =====================================================================
// Test di tutti i profili: permessi del database e prova dal vero sul sito (Chrome nascosto, misura telefono).
// Uso: node --env-file=.env.local scripts/test-profili.mjs private/test-profili.json
// - Crea identità di prova temporanee (responsabile organizzativo, account segreteria, famiglia "Test Automatico")
//   e le cancella SEMPRE alla fine; le scritture di prova riscrivono lo stesso contenuto già presente.
// - Nella prova sul sito blocca le scritture automatiche sui dati veri (es. creazione dei tesserati).
// - Nel file di risultato solo esiti, conteggi e tempi (i messaggi possono citare testo della pagina: tenerlo in private/).
// - L'admin non si prova (servono email e password).
// =====================================================================
import { createClient } from '@supabase/supabase-js';
import { chromium } from 'playwright-core';
import { writeFileSync } from 'node:fs';
import { randomInt } from 'node:crypto';

const OUT = process.argv[2];
const BASE = 'https://academy-casatese.vercel.app';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const anon = () => createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
const R = { permessi: [], ui: [], pulizia: [] };
const esito = (profilo, prova, ok, dettaglio = '') => { R.permessi.push({ profilo, prova, ok, dettaglio }); };

// ---------- Credenziali esistenti (mai stampate) ----------
const { data: teamsDoc } = await admin.from('docs').select('data').eq('path', 'shared/teams').single();
const squadre = teamsDoc.data.items;
const pinDi = (id) => { const t = squadre.find((x) => x.id === id); return (t?.coaches ?? []).find((c) => c.code)?.code || t?.code || null; };
const { data: codici } = await admin.from('codici_accesso').select('pin, profilo_id, profiles!inner(ruolo, attivo, email)');
const personale = (ruolo) => (codici ?? []).find((c) => c.profiles.ruolo === ruolo && c.profiles.attivo);
const tuttiPin = new Set([...(codici ?? []).map((c) => c.pin), ...squadre.flatMap((t) => [t.code, ...(t.coaches ?? []).map((c) => c.code)]).filter(Boolean)]);
const { data: tpin } = await admin.from('tesserati').select('pin'); (tpin ?? []).forEach((x) => x.pin && tuttiPin.add(x.pin));
const pinNuovo = (cifre) => { for (;;) { const p = String(randomInt(10 ** (cifre - 1), 10 ** cifre)); if (!tuttiPin.has(p)) { tuttiPin.add(p); return p; } } };

const cred = {
  misterU14: pinDi('t_u14'), misterU15: pinDi('t_u15'), misterU11: pinDi('t_u11'), misterU8: pinDi('t_u8'),
  preparatore: pinDi('t_nt2m1iv'), direttore: personale('direttore'), scout: personale('scout'),
};

// ---------- Identità temporanee ----------
const temp = {};
async function creaTemporanei() {
  // Organizzativo: un responsabile di prova nella squadra Organizzazione
  const { data: d } = await admin.from('docs').select('data').eq('path', 'shared/teams').single();
  const org = d.data.items.find((t) => t.organizza);
  temp.orgPin = pinNuovo(6);
  org.coaches = [...(org.coaches ?? []), { id: 'm_test_auto', name: 'Test Automatico', code: temp.orgPin }];
  await admin.from('docs').update({ data: d.data, updated_at: new Date().toISOString() }).eq('path', 'shared/teams');
  // Segreteria: account personale di prova
  temp.segPin = pinNuovo(6);
  const { data: u, error } = await admin.auth.admin.createUser({ email: `test-automatico-${temp.segPin}@staff.academy.test`, password: temp.segPin,
    email_confirm: true, user_metadata: { nome: 'Test', cognome: 'Automatico' }, app_metadata: { ruolo: 'segreteria' } });
  if (error) throw error;
  temp.segUser = u.user.id; temp.segEmail = u.user.email;
  await admin.from('profiles').update({ ruolo: 'segreteria', nome: 'Test', cognome: 'Automatico' }).eq('id', temp.segUser);
  await admin.from('codici_accesso').insert({ profilo_id: temp.segUser, pin: temp.segPin, nota: 'Test automatico' });
  // Famiglia: un tesserato di prova (non è nella rosa) nella squadra U14
  temp.famPin = pinNuovo(8);
  const { data: t } = await admin.from('tesserati').insert({ squadra_id: 't_u14', giocatore_id: 'test_automatico', nome_completo: 'Test Automatico', pin: temp.famPin }).select('id').single();
  temp.tess = t.id;
  await admin.from('tesserati_dati').insert({ tesserato_id: t.id, certificato_scadenza: '2026-10-10', quote: [{ rata: 'Rata di prova', importo: '1', pagata: false }] });
}
async function pulisci() {
  try { const { data: d } = await admin.from('docs').select('data').eq('path', 'shared/teams').single();
    const org = d.data.items.find((t) => t.organizza); const prima = (org.coaches ?? []).length;
    org.coaches = (org.coaches ?? []).filter((c) => c.id !== 'm_test_auto');
    if (org.coaches.length !== prima) await admin.from('docs').update({ data: d.data, updated_at: new Date().toISOString() }).eq('path', 'shared/teams');
    R.pulizia.push('responsabile organizzativo di prova tolto'); } catch (e) { R.pulizia.push('ERRORE organizzativo: ' + e.message); }
  try { if (temp.segUser) { await admin.from('codici_accesso').delete().eq('profilo_id', temp.segUser); await admin.auth.admin.deleteUser(temp.segUser); }
    R.pulizia.push('account segreteria di prova cancellato'); } catch (e) { R.pulizia.push('ERRORE segreteria: ' + e.message); }
  try { if (temp.tess) await admin.from('tesserati').delete().eq('id', temp.tess);
    const { count } = await admin.from('tesserati').select('id', { count: 'exact', head: true }).eq('giocatore_id', 'test_automatico');
    R.pulizia.push(`famiglia di prova cancellata (rimasti: ${count})`); } catch (e) { R.pulizia.push('ERRORE famiglia: ' + e.message); }
}

// ---------- A. Permessi del database ----------
async function permessi() {
  const a = anon();
  const vietato = async (profilo, prova, promessa) => { const r = await promessa; const neg = !!r.error || (Array.isArray(r.data) && r.data.length === 0) || r.data == null; esito(profilo, prova + ' (deve essere vietato)', neg, r.error?.message ?? (Array.isArray(r.data) ? `${r.data.length} righe` : '')); };
  const permesso = async (profilo, prova, promessa, controllo) => { const r = await promessa; const ok = !r.error && (!controllo || controllo(r.data)); esito(profilo, prova, ok, r.error?.message ?? ''); return r.data; };
  const stesso = async (path) => (await admin.from('docs').select('data').eq('path', path).maybeSingle()).data?.data;

  // Anonimo, senza PIN
  await vietato('Anonimo', 'legge i documenti del Portale', a.from('docs').select('path').limit(3));
  await vietato('Anonimo', 'legge i giocatori dello scouting', a.from('giocatori').select('id').limit(3));
  await vietato('Anonimo', 'legge i contatti delle famiglie', a.from('contatti').select('id').limit(3));
  await vietato('Anonimo', 'legge i tesserati', a.from('tesserati').select('id').limit(3));
  await vietato('Anonimo', 'legge i documenti delle famiglie', a.from('documenti_tesserati').select('id').limit(3));
  await vietato('Anonimo', 'legge i PIN personali', a.from('codici_accesso').select('pin').limit(3));

  // Mister agonistica (U14)
  const p = cred.misterU14;
  if (p) {
    await permesso('Mister U14', 'legge la propria rosa', a.rpc('coach_get', { p_pin: p, p_path: 'roster/t_u14' }), (d) => Array.isArray(d?.players));
    await vietato('Mister U14', 'legge la rosa U15', a.rpc('coach_get', { p_pin: p, p_path: 'roster/t_u15' }));
    await vietato('Mister U14', 'legge il registro U15', a.rpc('coach_get', { p_pin: p, p_path: 'registro/t_u15' }));
    await permesso('Mister U14', 'vede solo la sua squadra (senza PIN)', a.rpc('coach_get', { p_pin: p, p_path: 'shared/teams' }), (d) => d.items.length === 1 && !JSON.stringify(d).match(/"code":"\d/));
    await permesso('Mister U14', 'calendari di tutte le squadre', a.rpc('coach_calendari', { p_pin: p }), (d) => d.length >= 8 && !JSON.stringify(d).match(/"players"|"code":"\d/));
    await permesso('Mister U14', 'giocatori della sua annata (senza contatti)', a.rpc('coach_giocatori', { p_pin: p }), (d) => Array.isArray(d) && !JSON.stringify(d).match(/telefono|email|"note"/));
    await permesso('Mister U14', 'legge eventi e avvisi', a.rpc('coach_get', { p_pin: p, p_path: 'shared/eventi' }));
    await permesso('Mister U14', 'risposte delle famiglie', a.rpc('coach_risposte', { p_pin: p }));
    await permesso('Mister U14', 'scrive il proprio foglio gara (stesso contenuto)', a.rpc('coach_set', { p_pin: p, p_path: 'sheet/t_u14', p_data: await stesso('sheet/t_u14') ?? {} }));
    await vietato('Mister U14', 'scrive il calendario (è della società)', a.rpc('coach_set', { p_pin: p, p_path: 'calendar/t_u14', p_data: await stesso('calendar/t_u14') ?? {} }));
    await vietato('Mister U14', 'scrive gli eventi', a.rpc('coach_set', { p_pin: p, p_path: 'shared/eventi', p_data: await stesso('shared/eventi') ?? { items: [] } }));
    await vietato('Mister U14', 'scrive il foglio gara U15', a.rpc('coach_set', { p_pin: p, p_path: 'sheet/t_u15', p_data: await stesso('sheet/t_u15') ?? {} }));
  } else esito('Mister U14', 'ha un PIN', false, 'nessun PIN');
  // Mister attività di base
  for (const [nome, pin] of [['Mister U11 (ADB)', cred.misterU11], ['Mister U8 (ADB)', cred.misterU8]]) {
    if (!pin) { esito(nome, 'ha un PIN', false, 'nessun PIN'); continue; }
    await permesso(nome, 'entra e legge la propria rosa', a.rpc('coach_team', { p_pin: pin }), (d) => !!d?.id);
    await permesso(nome, 'giocatori della sua annata', a.rpc('coach_giocatori', { p_pin: pin }), (d) => Array.isArray(d));
  }
  // Preparatori dei portieri
  if (cred.preparatore) {
    const q = cred.preparatore;
    await permesso('Preparatore', 'vede tutte le squadre senza PIN', a.rpc('coach_get', { p_pin: q, p_path: 'shared/teams' }), (d) => d.items.length >= 9 && !JSON.stringify(d).match(/"code":"\d/));
    await permesso('Preparatore', 'legge la rosa U14 (sola lettura)', a.rpc('coach_get', { p_pin: q, p_path: 'roster/t_u14' }));
    await vietato('Preparatore', 'scrive il registro U14', a.rpc('coach_set', { p_pin: q, p_path: 'registro/t_u14', p_data: await stesso('registro/t_u14') ?? {} }));
    await permesso('Preparatore', 'portieri di tutte le annate', a.rpc('coach_giocatori', { p_pin: q }), (d) => Array.isArray(d) && d.every((g) => g.ruolo === 'portiere'));
  }
  // Organizzativo (di prova)
  {
    const o = temp.orgPin;
    await permesso('Organizzativo', 'vede tutte le squadre senza PIN', a.rpc('coach_get', { p_pin: o, p_path: 'shared/teams' }), (d) => d.items.length >= 9 && !JSON.stringify(d).match(/"code":"\d/));
    await permesso('Organizzativo', 'scrive il calendario U14 (stesso contenuto)', a.rpc('coach_set', { p_pin: o, p_path: 'calendar/t_u14', p_data: await stesso('calendar/t_u14') }));
    await permesso('Organizzativo', 'scrive gli eventi (stesso contenuto)', a.rpc('coach_set', { p_pin: o, p_path: 'shared/eventi', p_data: await stesso('shared/eventi') ?? { items: [] } }));
    await permesso('Organizzativo', 'scrive gli avvisi (stesso contenuto)', a.rpc('coach_set', { p_pin: o, p_path: 'shared/avvisi', p_data: await stesso('shared/avvisi') ?? { items: [] } }));
    await vietato('Organizzativo', 'legge la rosa U14', a.rpc('coach_get', { p_pin: o, p_path: 'roster/t_u14' }));
    await vietato('Organizzativo', 'scrive il registro U14', a.rpc('coach_set', { p_pin: o, p_path: 'registro/t_u14', p_data: await stesso('registro/t_u14') ?? {} }));
  }
  // Famiglia (di prova)
  {
    const f = temp.famPin;
    const d = await permesso('Famiglia', 'vede il proprio ragazzo', a.rpc('famiglia_get', { p_pin: f }), (x) => x?.ragazzo?.nome === 'Test Automatico' && !('note_segreteria' in (x.dati ?? {})));
    esito('Famiglia', 'non riceve rose, registri o PIN di altri', !JSON.stringify(d ?? {}).match(/"players"|"code":"\d|"trainings"/));
    await permesso('Famiglia', 'risponde "ci sarà"', a.rpc('famiglia_rispondi', { p_pin: f, p_partita: 'prova|test', p_risposta: 'si', p_nota: '' }));
    await permesso('Famiglia', 'aggiorna contatti e taglie', a.rpc('famiglia_contatti', { p_pin: f, p_dati: { genitore1_nome: 'Genitore Prova', taglia_divisa: 'M' } }));
    const pdf = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF').toString('base64');
    await permesso('Famiglia', 'carica un documento (PDF di prova)', a.rpc('famiglia_carica', { p_pin: f, p_tipo: 'bonifico', p_rata: 0, p_descrizione: 'prova', p_nome_file: 'prova.pdf', p_mime: 'application/pdf', p_base64: pdf }));
    await vietato('Famiglia', 'carica un file non ammesso (exe)', a.rpc('famiglia_carica', { p_pin: f, p_tipo: 'altro', p_rata: null, p_descrizione: '', p_nome_file: 'x.exe', p_mime: 'application/x-msdownload', p_base64: pdf }));
    await vietato('Famiglia', 'legge i tesserati direttamente', a.from('tesserati').select('id').limit(3));
    await vietato('Famiglia', 'legge i documenti del Portale', a.rpc('coach_get', { p_pin: f, p_path: 'roster/t_u14' }));
    const n = await admin.from('risposte_convocazioni').select('risposta').eq('tesserato_id', temp.tess);
    esito('Famiglia', 'la risposta arriva al mister', (await a.rpc('coach_risposte', { p_pin: cred.misterU14 })).data?.some((r) => r.giocatore_id === 'test_automatico') ?? false, `${n.data?.length} risposte`);
  }
  // Personale con account (segreteria di prova, direttore, scout)
  const accedi = async (email, pin) => { const c = anon(); const { error } = await c.auth.signInWithPassword({ email, password: pin }); return error ? null : c; };
  const s = await accedi(temp.segEmail, temp.segPin);
  if (s) {
    await permesso('Segreteria', 'squadre e rose senza PIN', s.rpc('segreteria_rose'), (d) => d.length >= 8 && !JSON.stringify(d).match(/"code":"\d/));
    await permesso('Segreteria', 'legge i tesserati', s.from('tesserati').select('id').limit(5), (d) => d.length >= 1);
    await permesso('Segreteria', 'legge i documenti caricati', s.from('documenti_tesserati').select('id, tipo').limit(5), (d) => d.length >= 1);
    await permesso('Segreteria', 'apre un documento', s.rpc('documento_scarica', { p_id: (await admin.from('documenti_tesserati').select('id').eq('tesserato_id', temp.tess).single()).data.id }), (d) => !!d?.base64);
    await vietato('Segreteria', "legge l'elenco squadre con i PIN (shared/teams)", s.from('docs').select('path').eq('path', 'shared/teams'));
    await vietato('Segreteria', 'legge i giocatori dello scouting', s.from('giocatori').select('id').limit(3));
    await vietato('Segreteria', 'legge i PIN personali', s.from('codici_accesso').select('pin').limit(3));
  } else esito('Segreteria', 'entra col PIN personale', false);
  if (cred.direttore) {
    const dir = await accedi(cred.direttore.profiles.email, cred.direttore.pin);
    if (dir) {
      await permesso('Direttore', 'legge il Portale', dir.from('docs').select('path').limit(3), (d) => d.length > 0);
      await permesso('Direttore', 'legge lo scouting', dir.from('giocatori').select('id').limit(3), (d) => d.length > 0);
      await permesso('Direttore', 'legge la segreteria', dir.from('tesserati').select('id').limit(3), (d) => d.length > 0);
      const r = await dir.from('docs').update({ updated_at: new Date().toISOString() }).eq('path', 'registro/t_u14').select('path');
      esito('Direttore', 'modifica un registro del Portale (deve essere vietato)', !!r.error || (r.data ?? []).length === 0, r.error?.message ?? `${(r.data ?? []).length} righe`);
    } else esito('Direttore', 'entra col PIN personale', false);
  }
  if (cred.scout) {
    const sc = await accedi(cred.scout.profiles.email, cred.scout.pin);
    if (sc) {
      await permesso('Scout', 'legge lo scouting', sc.from('giocatori').select('id').limit(3), (d) => d.length > 0);
      await vietato('Scout', 'legge il Portale delle squadre', sc.from('docs').select('path').limit(3));
      await vietato('Scout', 'legge la segreteria', sc.from('tesserati').select('id').limit(3));
      await vietato('Scout', 'legge i PIN personali', sc.from('codici_accesso').select('pin').limit(3));
    } else esito('Scout', 'entra col PIN personale', false);
  }
}

// ---------- B. Prova dal vero sul sito (telefono) ----------
const SCRITTURE = /\/rest\/v1\/(tesserati|tesserati_dati|documenti_tesserati|docs|segnalazioni|valutazioni|giocatori)|\/rpc\/(coach_set|coach_segnala|coach_valuta|famiglia_rispondi|famiglia_contatti|famiglia_carica|genera_pin_famiglia)/;
const SOSPETTI = /undefined|NaN|\[object Object\]|Invalid Date|null ·|· null/;
const ERRORI_TESTO = /non disponibile|Non consentito|Documento non consentito|serve la migrazione|Non salvato|Errore|PIN non valido|Sessione scaduta/i;
async function ui(browser, profilo, pin, opzioni = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'it-IT' });
  const pg = await ctx.newPage();
  const riga = { profilo, errori: [], console: [], bloccate: [], viste: [], problemi: [] };
  pg.on('pageerror', (e) => riga.errori.push(e.message.slice(0, 160)));
  pg.on('console', (m) => { if (m.type() === 'error' && !/favicon|Failed to load resource: the server responded with a status of 4/.test(m.text())) riga.console.push(m.text().slice(0, 160)); });
  await pg.route('**/*', (r) => { const q = r.request(); if (q.method() !== 'GET' && SCRITTURE.test(q.url())) { riga.bloccate.push(q.url().replace(/^.*\/(rest\/v1|rpc)\//, '$1/').slice(0, 60)); return r.abort(); } return r.continue(); });
  const t0 = Date.now();
  await pg.goto(BASE + '/?pin=1', { waitUntil: 'domcontentloaded' });
  await pg.fill('input[name=pin]', pin);
  await pg.click('button[type=submit]');
  try { await pg.waitForURL(/\/portale\/|\/home/, { timeout: 25000 }); } catch { riga.problemi.push('accesso non riuscito: ' + (await pg.locator('[role=alert]').textContent().catch(() => '?'))); }
  riga.arrivo = pg.url().replace(BASE, '');
  if (riga.arrivo.startsWith('/portale')) {
    await pg.waitForFunction(() => document.querySelector('#view')?.innerText.trim().length > 20, null, { timeout: 25000 }).catch(() => riga.problemi.push('Portale: pagina vuota dopo l\'accesso'));
    riga.tempoAccesso = Date.now() - t0;
    await pg.waitForTimeout(2500);   // dati che arrivano dopo (calendari, avvisi)
    const guarda = async (nome) => {
      await pg.waitForTimeout(1200);
      const testo = await pg.locator('#view').innerText().catch(() => '');
      const v = { nome, caratteri: testo.length };
      if (testo.trim().length < 25) v.vuota = true;
      const s = testo.match(SOSPETTI); if (s) v.sospetto = s[0];
      const e = testo.match(ERRORI_TESTO); if (e) v.messaggio = testo.slice(Math.max(0, e.index - 40), e.index + 60).replace(/\s+/g, ' ');
      const larga = await pg.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2); if (larga) v.scorreDiLato = true;
      riga.viste.push(v);
    };
    await guarda('(inizio)');
    const aree = await pg.$$eval('#areanav button[data-area]', (x) => x.map((e) => e.dataset.area));
    riga.aree = aree;
    if (!aree.length) {   // famiglia: solo le schede
      for (const k of await pg.$$eval('#tabs [data-famtab]', (x) => x.map((e) => e.dataset.famtab))) { await pg.click(`[data-famtab="${k}"]`); await guarda('famiglia/' + k); }
    }
    for (const a of aree) {
      await pg.click(`#areanav [data-area="${a}"]`); await guarda(a);
      const schede = await pg.$$eval('#tabs [data-tab]', (x) => x.map((e) => e.dataset.tab));
      for (const s of schede) {
        await pg.click(`#tabs [data-tab="${s}"]`); await guarda(`${a}/${s}`);
        const sotto = await pg.$$eval('#subtabs [data-tab]', (x) => x.map((e) => e.dataset.tab)).catch(() => []);
        for (const t of sotto) { if (t === s) continue; await pg.click(`#subtabs [data-tab="${t}"]`); await guarda(`${a}/${s}/${t}`); }
        if (s === 'calendariotutte') { await pg.click('[data-calvista="elenco"]').catch(() => {}); await guarda(`${a}/${s}/elenco`); await pg.click('[data-calvista="giorno"]').catch(() => {}); }
      }
    }
    if (opzioni.altraSquadra) {   // preparatori e direttori: scegli un'altra squadra
      await pg.selectOption('#curteam', opzioni.altraSquadra).catch(() => riga.problemi.push('scelta squadra non riuscita'));
      await pg.waitForTimeout(1500); await guarda('altra squadra: ' + opzioni.altraSquadra);
      riga.solaLettura = await pg.locator('body.ro, .badge.dir').count() > 0;
    }
  } else if (riga.arrivo.startsWith('/home')) {
    riga.tempoAccesso = Date.now() - t0;
    for (const pagina of ['/home', '/giocatori', '/gare', '/segnala', '/profilo', '/giocatori/stati']) {
      const t1 = Date.now(); const r = await pg.goto(BASE + pagina, { waitUntil: 'domcontentloaded' });
      await pg.waitForTimeout(800);
      const testo = await pg.locator('main').innerText().catch(() => '');
      const v = { nome: pagina, stato: r?.status(), ms: Date.now() - t1, caratteri: testo.length };
      if (/Application error|Something went wrong|Unhandled/i.test(testo)) v.errore = true;
      const s = testo.match(SOSPETTI); if (s) v.sospetto = s[0];
      if (await pg.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2)) v.scorreDiLato = true;
      riga.viste.push(v);
    }
  }
  R.ui.push(riga);
  await ctx.close();
}

try {
  await creaTemporanei();
  await permessi();
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  const giri = [
    ['Mister U14', cred.misterU14], ['Mister U15', cred.misterU15], ['Mister U11 (ADB)', cred.misterU11], ['Mister U8 (ADB)', cred.misterU8],
    ['Preparatore portieri', cred.preparatore, { altraSquadra: 't_u14' }], ['Organizzativo', temp.orgPin], ['Segreteria', temp.segPin],
    ['Famiglia', temp.famPin], ['Direttore', cred.direttore?.pin, { altraSquadra: 't_u11' }], ['Scout', cred.scout?.pin],
  ];
  for (const [nome, pin, op] of giri) {
    if (!pin) { R.ui.push({ profilo: nome, problemi: ['nessun PIN per provarlo'] }); continue; }
    try { await ui(browser, nome, pin, op); } catch (e) { R.ui.push({ profilo: nome, problemi: ['test interrotto: ' + e.message.slice(0, 200)] }); }
  }
  await browser.close();
} catch (e) { R.errore = e.message; }
finally { await pulisci(); writeFileSync(OUT, JSON.stringify(R, null, 1)); console.log('fatto', R.permessi.length, 'prove permessi,', R.ui.length, 'profili provati', R.errore ? '· ERRORE ' + R.errore : ''); console.log(R.pulizia.join(' | ')); }
/* Esito per la prova notturna su GitHub (registri pubblici): solo nomi delle prove e conteggi, mai testi delle pagine.
   Se qualcosa non va il processo esce con errore e GitHub manda l'email. */
const permessiKo = R.permessi.filter((x) => !x.ok);
const uiKo = R.ui.map((x) => ({ profilo: x.profilo, n: (x.problemi?.length ?? 0) + (x.errori?.length ?? 0) })).filter((x) => x.n);
permessiKo.forEach((x) => console.log(`✗ permesso: ${x.profilo} – ${x.prova}`));
uiKo.forEach((x) => console.log(`✗ sito: ${x.profilo} – ${x.n} problemi (dettagli nel file di esito)`));
if (R.errore || permessiKo.length || uiKo.length) process.exitCode = 1;
else console.log('✓ tutto a posto');
