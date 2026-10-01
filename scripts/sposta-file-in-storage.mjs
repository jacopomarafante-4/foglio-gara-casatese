// =====================================================================
// PDF dell'archivio e documenti delle famiglie: dal database ai contenitori di file (0051). Una volta sola, dopo la migrazione.
// Uso: node --env-file=.env.local scripts/sposta-file-in-storage.mjs [--conferma]
// Senza --conferma è una simulazione. Per ogni riga col file nel database: lo carica nel contenitore, lo riscarica e controlla che
// sia identico, poi scrive il percorso e toglie il file dal database. Stampa solo conteggi (repository pubblico).
// =====================================================================
import { createClient } from '@supabase/supabase-js';
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const CONFERMA = process.argv.includes('--conferma');
const daBytea = (v) => Buffer.from(String(v).replace(/^\\x/, ''), 'hex');   // bytea arriva come "\x…" esadecimale
const ESTENSIONE = { 'application/pdf': '.pdf', 'image/png': '.png', 'image/jpeg': '.jpg' };

async function sposta({ tabella, colonna, contenitore, percorsoDi, mimeDi }) {
  const { data: righe, error } = await db.from(tabella).select(`id, ${colonna}, percorso${tabella === 'documenti_tesserati' ? ', tesserato_id, mime' : ''}`)
    .not(colonna, 'is', null);
  if (error) throw new Error(`${tabella}: ${error.message} (hai eseguito la 0051?)`);
  let fatti = 0, byte = 0;
  for (const r of righe) {
    const file = daBytea(r[colonna]), percorso = percorsoDi(r);
    byte += file.length;
    if (!CONFERMA) continue;
    const { error: e1 } = await db.storage.from(contenitore).upload(percorso, file, { contentType: mimeDi(r), upsert: true });
    if (e1) { console.log(`✗ ${tabella}: un file non caricato (${e1.message})`); continue; }
    const { data: indietro } = await db.storage.from(contenitore).download(percorso);
    if (!indietro || !Buffer.from(await indietro.arrayBuffer()).equals(file)) { console.log(`✗ ${tabella}: un file non torna uguale, lasciato nel database`); continue; }
    const { error: e2 } = await db.from(tabella).update({ percorso, [colonna]: null }).eq('id', r.id);
    if (e2) { console.log(`✗ ${tabella}: ${e2.message}`); continue; }
    fatti++;
  }
  console.log(`${tabella}: ${righe.length} file nel database (${(byte / 1048576).toFixed(1)} MB)${CONFERMA ? `, spostati ${fatti}` : ''}`);
}

await sposta({ tabella: 'archivio_documenti', colonna: 'dati', contenitore: 'archivio', percorsoDi: (r) => `${r.id}.pdf`, mimeDi: () => 'application/pdf' });
await sposta({ tabella: 'documenti_tesserati', colonna: 'contenuto', contenitore: 'documenti-famiglie',
  percorsoDi: (r) => `${r.tesserato_id}/${r.id}${ESTENSIONE[r.mime] ?? ''}`, mimeDi: (r) => r.mime });
if (!CONFERMA) console.log('\nSimulazione: nulla è stato spostato. Per spostare aggiungi --conferma');
