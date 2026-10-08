// Rose storiche della società (private/rose/rose.json, preparato dagli Excel delle rose) → carriera dei giocatori.
// Per ogni ragazzo: le stagioni con l'Academy (e la società di provenienza, se scritta, nella stagione prima dell'arrivo).
// Ragazzi non in archivio: creati "da distinta" (osservato = false, nascosti nello Scouting), società = Academy se c'erano nel
// 2025/26. Righe con la nota NOTA: si ritrovano (e si tolgono) in blocco. Solo nomi, annata, data di nascita: mai contatti.
// Uso: node --env-file=.env.local --import ./tests/registra.mjs scripts/import-rose-storiche.mjs [--conferma]
import { readFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
import { categoriaDaAnnata } from '../lib/categorie.ts';

const NOTA = 'Dalle rose della società';
const conferma = process.argv.includes('--conferma');
const a = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const rose = JSON.parse(await readFile('private/rose/rose.json', 'utf8'));
const norm = (s) => (s || '').normalize('NFKD').replace(/[^\x00-\x7f]/g, '').toLowerCase().replace(/[^a-z]/g, '');
const fineDi = (st) => Number(st.slice(0, 4)) + 1;
const prima = (st) => `${Number(st.slice(0, 4)) - 1}/${st.slice(2, 4)}`;

const { data: acad } = await a.from('societa').select('id, nome').eq('nome', 'Academy Casatese Merate').single();
const soc = []; for (let da = 0; ; da += 1000) { const { data } = await a.from('societa').select('id, nome, alias').range(da, da + 999); soc.push(...data); if (data.length < 1000) break; }
const socPer = new Map(); for (const s of soc) for (const n of [s.nome, ...(s.alias ?? [])]) if (norm(n).length > 3 && !socPer.has(norm(n))) socPer.set(norm(n), s);
const gioc = []; for (let da = 0; ; da += 1000) { const { data } = await a.from('giocatori').select('id, cognome, nome, annata, data_nascita').range(da, da + 999); gioc.push(...data); if (data.length < 1000) break; }
const idx = new Map(gioc.map((g) => [norm(g.cognome) + '|' + norm(g.nome) + '|' + g.annata, g]));

const persone = new Map();
for (const r of rose) {
  const k = norm(r.cognome) + '|' + norm(r.nome) + '|' + r.annata;
  if (!persone.has(k)) persone.set(k, { k, cognome: r.cognome.trim(), nome: r.nome.trim(), annata: r.annata, stagioni: new Set(), provenienza: '' });
  const p = persone.get(k); p.stagioni.add(r.stagione); if (r.nascita) p.nascita = r.nascita; if (r.provenienza && !p.provenienza) p.provenienza = r.provenienza;
}
// righe già scritte (a blocchi: il database ne dà al massimo 1000 per volta); provenienza = una per giocatore
const gia = []; for (let da = 0; ; da += 1000) { const { data } = await a.from('carriera').select('giocatore_id, stagione, societa_nome, nota').like('nota', NOTA + '%').range(da, da + 999); gia.push(...data); if (data.length < 1000) break; }
const esiste = new Set(gia.map((x) => `${x.giocatore_id}|${x.stagione}|${x.societa_nome}`));
const conProvenienza = new Set(gia.filter((x) => x.nota !== NOTA).map((x) => x.giocatore_id));
let creati = 0, righe = 0, provenienze = 0;
for (const p of persone.values()) {
  let g = idx.get(p.k);
  if (!g) {
    creati++;
    if (conferma) {
      const r = await a.from('giocatori').insert({ cognome: p.cognome, nome: p.nome || null, annata: p.annata, data_nascita: p.nascita ?? null,
        societa_id: p.stagioni.has('2025/26') ? acad.id : null, osservato: false }).select('id').single();
      if (r.error) { console.log('✗', p.cognome, p.nome, r.error.message); continue; }
      g = { id: r.data.id };
    } else g = { id: 'nuovo-' + p.k };
  } else if (conferma && !g.data_nascita && p.nascita) await a.from('giocatori').update({ data_nascita: p.nascita }).eq('id', g.id);
  const nuove = [];
  for (const st of [...p.stagioni].sort()) {
    if (esiste.has(`${g.id}|${st}|${acad.nome}`)) continue;
    nuove.push({ giocatore_id: g.id, societa_id: acad.id, societa_nome: acad.nome, stagione: st, categoria: categoriaDaAnnata(p.annata, fineDi(st)).split(' - ')[0], origine: 'manuale', nota: NOTA });
  }
  const primaSt = [...p.stagioni].sort()[0];
  const prov = p.provenienza.replace(/\?/g, '').trim();
  if (prov.length > 3 && !/\d/.test(prov) && !/prima anagrafica|nuova immissione|chiamare|conferma|taglio|misto|^ok$/i.test(prov) && !conProvenienza.has(g.id)) {
    const s = socPer.get(norm(prov));
    nuove.push({ giocatore_id: g.id, societa_id: s?.id ?? null, societa_nome: s?.nome ?? prov, stagione: prima(primaSt), origine: 'manuale', nota: NOTA + ' (provenienza)' });
    provenienze++;
  }
  righe += nuove.length;
  if (conferma && nuove.length) { const r = await a.from('carriera').insert(nuove); if (r.error) console.log('✗ carriera', p.cognome, r.error.message); }
}
console.log(`${conferma ? 'SCRITTO' : 'SIMULAZIONE'}: ${persone.size} ragazzi · ${creati} nuovi in archivio (da distinta) · ${righe} righe di carriera (${provenienze} provenienze)`);
