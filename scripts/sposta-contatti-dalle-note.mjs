// =====================================================================
// Numeri di telefono ed email scritti nei testi (note, segnalazioni, valutazioni…) → contatti protetti
// Uso: node --env-file=.env.local scripts/sposta-contatti-dalle-note.mjs [--conferma]
// Senza --conferma è una simulazione. Stampa solo conteggi: mai numeri, email o nomi (dati di minori e famiglie).
//
// I testi li leggono anche scout e mister; la tabella `contatti` solo admin e direttori (RLS). Per ogni telefono o
// email trovato: nuovo contatto del giocatore (se non c'è già lo stesso numero/email), e nel testo al suo posto
// "(contatto nei Contatti)".
// =====================================================================
import { createClient } from '@supabase/supabase-js';

const conferma = process.argv.includes('--conferma');
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// cellulari (3xx…) e fissi (0…) italiani, con +39/0039 facoltativo e separatori; email
const TELEFONO = /(?:(?:\+|00)39[\s.\-/]*)?(?:3\d{2}|0\d{1,3})(?:[\s.\-/]*\d){5,8}(?!\d)/g;
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const SOSTITUTO = '(contatto nei Contatti)';
const cifre = (s) => s.replace(/\D/g, '').replace(/^(?:0039|39)(?=[03]\d{8,10}$)/, '');
const telefonoValido = (s) => { const c = cifre(s); return c.length >= 9 && c.length <= 11; };

// tabella, colonne di testo, come si risale al giocatore
const DOVE = [
  { tabella: 'giocatori', colonne: ['note', 'descrizione'], giocatore: (r) => r.id },
  { tabella: 'segnalazioni', colonne: ['testo', 'contesto', 'tecnica_note', 'motoria_note', 'tattica_note', 'mentale_note'], giocatore: (r) => r.giocatore_id },
  { tabella: 'valutazioni', colonne: ['commento', 'contesto', 'tecnica_note', 'motoria_note', 'tattica_note', 'mentale_note'], giocatore: (r) => r.giocatore_id },
  { tabella: 'eventi_giocatore', colonne: ['note'], giocatore: (r) => r.giocatore_id },
  { tabella: 'carriera', colonne: ['nota'], giocatore: (r) => r.giocatore_id },
];

async function tutte(tabella, colonne) {
  const righe = [];
  for (let da = 0; ; da += 1000) {
    const { data, error } = await db.from(tabella).select(colonne.join(', ')).range(da, da + 999);
    if (error) throw new Error(`${tabella}: ${error.message}`);
    righe.push(...data);
    if (data.length < 1000) return righe;
  }
}

const esistenti = new Map();   // giocatore → set di telefoni (solo cifre) ed email (minuscole)
for (const c of await tutte('contatti', ['giocatore_id', 'telefono', 'email'])) {
  const s = esistenti.get(c.giocatore_id) ?? new Set();
  if (c.telefono) s.add(cifre(c.telefono));
  if (c.email) s.add(c.email.toLowerCase());
  esistenti.set(c.giocatore_id, s);
}

const conta = { testi: 0, telefoni: 0, email: 0, contattiNuovi: 0, giaPresenti: 0, giocatori: new Set() };
const perTabella = {};
const nuoviContatti = [];
const aggiornamenti = [];

for (const d of DOVE) {
  const campi = ['id', ...(d.tabella === 'giocatori' ? [] : ['giocatore_id']), ...d.colonne];
  const righe = await tutte(d.tabella, campi);
  for (const r of righe) {
    const cambi = {};
    for (const col of d.colonne) {
      const testo = r[col];
      if (!testo) continue;
      const telefoni = (testo.match(TELEFONO) ?? []).filter(telefonoValido);
      const email = testo.match(EMAIL) ?? [];
      if (!telefoni.length && !email.length) continue;
      const gid = d.giocatore(r);
      const noti = esistenti.get(gid) ?? new Set();
      for (const t of telefoni) {
        conta.telefoni++;
        const k = cifre(t);
        if (noti.has(k)) conta.giaPresenti++;
        else { noti.add(k); nuoviContatti.push({ giocatore_id: gid, tipo: 'genitore', telefono: t.trim(), nome: 'Dalle note' }); conta.contattiNuovi++; }
      }
      for (const e of email) {
        conta.email++;
        const k = e.toLowerCase();
        if (noti.has(k)) conta.giaPresenti++;
        else { noti.add(k); nuoviContatti.push({ giocatore_id: gid, tipo: 'genitore', email: e, nome: 'Dalle note' }); conta.contattiNuovi++; }
      }
      esistenti.set(gid, noti);
      let pulito = testo;
      for (const t of telefoni) pulito = pulito.replace(t, SOSTITUTO);
      for (const e of email) pulito = pulito.replace(e, SOSTITUTO);
      cambi[col] = pulito.replace(/\((contatto nei Contatti)\)(\s*[-/,;]\s*\(contatto nei Contatti\))+/g, '($1)');
      conta.testi++; conta.giocatori.add(gid);
      perTabella[d.tabella] = (perTabella[d.tabella] ?? 0) + 1;
    }
    if (Object.keys(cambi).length) aggiornamenti.push({ tabella: d.tabella, id: r.id, cambi });
  }
}

console.log(`Testi con contatti: ${conta.testi} (${Object.entries(perTabella).map(([t, n]) => `${t} ${n}`).join(', ') || 'nessuno'})`);
console.log(`Trovati: ${conta.telefoni} telefoni, ${conta.email} email, di ${conta.giocatori.size} giocatori`);
console.log(`Contatti nuovi da creare: ${conta.contattiNuovi} · già presenti nei contatti: ${conta.giaPresenti}`);

if (!conferma) { console.log('\nSimulazione: niente è cambiato. Per applicare: --conferma'); process.exit(0); }

for (let i = 0; i < nuoviContatti.length; i += 200) {
  const { error } = await db.from('contatti').insert(nuoviContatti.slice(i, i + 200));
  if (error) throw new Error(`contatti: ${error.message}`);
}
let fatti = 0;
for (const a of aggiornamenti) {
  const { error } = await db.from(a.tabella).update(a.cambi).eq('id', a.id);
  if (error) throw new Error(`${a.tabella}: ${error.message}`);
  fatti++;
}
console.log(`\nFatto: ${nuoviContatti.length} contatti creati, ${fatti} righe ripulite.`);
