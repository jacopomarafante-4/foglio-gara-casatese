// Controllo della 0061: registro_allenamenti e registro_partite sono uguali ai blocchi registro/<squadra> di docs?
// Uso: node --env-file=.env.local scripts/controlla-registro-righe.mjs   (stampa solo conteggi)
import { createClient } from '@supabase/supabase-js';

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const { data: docs, error: e1 } = await db.from('docs').select('path, data').like('path', 'registro/%');
if (e1) { console.error('❌ docs:', e1.message); process.exit(1); }

async function tutte(tabella, campi) {
  const righe = [];
  for (let da = 0; ; da += 1000) {
    const { data, error } = await db.from(tabella).select(campi).range(da, da + 999);
    if (error) { console.error(`❌ ${tabella}:`, error.message, '(hai lanciato la 0061?)'); process.exit(1); }
    righe.push(...data);
    if (data.length < 1000) break;
  }
  return righe;
}
const allenamenti = await tutte('registro_allenamenti', 'squadra, id');
const partite = await tutte('registro_partite', 'squadra, id');

let diversi = 0, totTr = 0, totGm = 0;
for (const d of docs) {
  const squadra = d.path.slice('registro/'.length);
  const tr = (d.data?.trainings ?? []).filter((m) => m && typeof m === 'object');
  const gm = (d.data?.games ?? []).filter((m) => m && typeof m === 'object');
  totTr += tr.length; totGm += gm.length;
  const mieTr = allenamenti.filter((r) => r.squadra === squadra).length;
  const mieGm = partite.filter((r) => r.squadra === squadra).length;
  const qui = Math.abs(tr.length - mieTr) + Math.abs(gm.length - mieGm);
  diversi += qui;
  console.log(`${qui ? '⚠️ ' : '✓ '} ${squadra}: ${tr.length} allenamenti (${mieTr} righe), ${gm.length} partite (${mieGm} righe)`);
}
console.log(`\nTotale: ${totTr} allenamenti, ${totGm} partite, ${diversi} differenze.`);
process.exit(diversi ? 1 : 0);
