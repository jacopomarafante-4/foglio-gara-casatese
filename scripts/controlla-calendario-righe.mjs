// Controllo della 0059: il calendario a righe (calendario_partite) è uguale ai blocchi calendar/<squadra> di docs?
// Uso: node --env-file=.env.local scripts/controlla-calendario-righe.mjs   (stampa solo conteggi)
import { createClient } from '@supabase/supabase-js';

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const { data: docs, error: e1 } = await db.from('docs').select('path, data').like('path', 'calendar/%');
if (e1) { console.error('❌ docs:', e1.message); process.exit(1); }
const righe = [];
for (let da = 0; ; da += 1000) {
  const { data, error } = await db.from('calendario_partite').select('squadra, id, data, ora, avversario, casa').range(da, da + 999);
  if (error) { console.error('❌ calendario_partite:', error.message, '(hai lanciato la 0059?)'); process.exit(1); }
  righe.push(...data);
  if (data.length < 1000) break;
}

let diversi = 0, totale = 0;
for (const d of docs) {
  const squadra = d.path.slice('calendar/'.length);
  const voci = new Map((d.data?.matches ?? []).filter((m) => m && typeof m === 'object').map((m, i) => [String(m.id ?? i + 1), m]));
  const mie = righe.filter((r) => r.squadra === squadra);
  totale += voci.size;
  let qui = Math.abs(voci.size - mie.length);
  for (const r of mie) {
    const m = voci.get(r.id);
    if (!m || (m.date ?? '').slice(0, 10) !== (r.data ?? '') || (m.time ?? null) !== r.ora || (m.opponent ?? null) !== r.avversario) qui++;
  }
  diversi += qui;
  console.log(`${qui ? '⚠️ ' : '✓ '} ${squadra}: ${voci.size} nel calendario, ${mie.length} righe${qui ? `, ${qui} differenze` : ''}`);
}
const orfane = righe.filter((r) => !docs.some((d) => d.path === `calendar/${r.squadra}`)).length;
console.log(`\nTotale: ${totale} partite, ${righe.length} righe, ${diversi} differenze, ${orfane} righe senza calendario.`);
process.exit(diversi || orfane ? 1 : 0);
