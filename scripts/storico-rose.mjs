// Storico delle rose per la Dashboard (RR, DOR, YIA): per ogni squadra, chi era all'Academy nelle stagioni passate con la
// sua annata (dalla carriera, righe "Dalle rose della società" e distinte). Scritto in roster/<squadra>.storico, che il
// mister già legge: { aggiornato, stagioni: { "2025/26": ["rossimario", …] } } (solo chiavi dei nomi, niente altro).
// Uso: node --env-file=.env.local --import ./tests/registra.mjs scripts/storico-rose.mjs [--conferma]
import { createClient } from '@supabase/supabase-js';
import { etaSquadra } from '../lib/programma.ts';
import { fineStagione } from '../lib/categorie.ts';
import { chiaveNome } from '../lib/statistiche.ts';

const conferma = process.argv.includes('--conferma');
const a = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data: acad } = await a.from('societa').select('id').eq('nome', 'Academy Casatese Merate').single();
const righe = [];
for (let da = 0; ; da += 1000) {
  const { data } = await a.from('carriera').select('stagione, giocatore:giocatori(cognome, nome, annata)').eq('societa_id', acad.id).range(da, da + 999);
  righe.push(...data); if (data.length < 1000) break;
}
const perAnnata = {};   // annata → stagione → Set(chiavi)
for (const r of righe) {
  const g = r.giocatore; if (!g) continue;
  ((perAnnata[g.annata] ??= {})[r.stagione] ??= new Set()).add(chiaveNome(`${g.cognome} ${g.nome ?? ''}`));
}
const { data: t } = await a.from('docs').select('data').eq('path', 'shared/teams').single();
// annata di ogni nome (dall'archivio) e tutti i ragazzi delle rose di quest'anno: chi è passato in un'altra squadra è rimasto
const annataDi = new Map(); for (let da = 0; ; da += 1000) { const { data } = await a.from('giocatori').select('cognome, nome, annata').range(da, da + 999); for (const g of data) annataDi.set(chiaveNome(`${g.cognome} ${g.nome ?? ''}`), g.annata); if (data.length < 1000) break; }
const { data: rose } = await a.from('docs').select('path, data').like('path', 'roster/%');
const rosaDi = new Map(rose.map((d) => [d.path, (d.data.players ?? []).map((p) => chiaveNome(p.name))]));
const inSocieta = new Set([...rosaDi.values()].flat());
const fine = fineStagione(), stagioneOra = `${fine - 1}/${String(fine).slice(2)}`;
for (const sq of t.data.items.filter((x) => !x.organizza && !x.vedeTutte)) {
  // annate della squadra: quelle dei suoi ragazzi (almeno 2), se no quella della categoria (U19 = più annate)
  const conta = {}; for (const k of rosaDi.get('roster/' + sq.id) ?? []) { const y = annataDi.get(k); if (y) conta[y] = (conta[y] ?? 0) + 1; }
  const annate = Object.entries(conta).filter(([, n]) => n >= 2).map(([y]) => Number(y));
  if (!annate.length) annate.push(fine - etaSquadra(sq));
  const annata = annate.join('+');
  const st = {};
  for (const y of annate) for (const [s, k] of Object.entries(perAnnata[y] ?? {})) if (s !== stagioneOra) st[s] = [...new Set([...(st[s] ?? []), ...k])].sort();
  const ultima = Object.keys(st).sort().at(-1);
  const qui = new Set(rosaDi.get('roster/' + sq.id) ?? []);
  const altrove = ultima ? st[ultima].filter((k) => !qui.has(k) && inSocieta.has(k)) : [];
  console.log(`${(sq.category || sq.name).padEnd(34)} annate ${annata} · ${Object.entries(st).sort().map(([s, k]) => `${s}: ${k.length}`).join(', ') || 'nessuna stagione passata'} · in altre squadre ${altrove.length}`);
  if (!conferma) continue;
  const { data: d } = await a.from('docs').select('data').eq('path', 'roster/' + sq.id).maybeSingle();
  if (!d) continue;
  const r = await a.from('docs').update({ data: { ...d.data, storico: { aggiornato: new Date().toISOString().slice(0, 10), stagioni: st, altrove } }, updated_at: new Date().toISOString() }).eq('path', 'roster/' + sq.id);
  if (r.error) console.log('  ✗', r.error.message);
}
console.log(conferma ? 'SCRITTO' : 'SIMULAZIONE');
