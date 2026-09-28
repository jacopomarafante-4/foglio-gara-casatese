// Giocatori dell'archivio dello scouting che ora sono nelle rose delle nostre squadre (Portale): diventano "Inseriti",
// della società Academy (così la carriera lo registra) e con una nota nello storico ("In rosa Under 14 dal Portale").
// Abbinamento: stesso cognome e nome (senza accenti, apostrofi, spazi; anche nome e cognome invertiti) e annata compatibile
// con la categoria della squadra (± 1 anno, per chi gioca sotto o sopra età). Nomi uguali per più schede: non si tocca, si segnala.
// Uso: node --env-file=.env.local scripts/inserisci-da-rose.mjs            → simulazione (solo conteggi; elenco in private/)
//      node --env-file=.env.local scripts/inserisci-da-rose.mjs --conferma → scrive
// Con la chiave di servizio la regola delle 3 valutazioni (0040) non blocca: lo decide la società inserendoli in rosa.
import { createClient } from '@supabase/supabase-js';
import { writeFileSync, mkdirSync } from 'node:fs';

const conferma = process.argv.includes('--conferma');
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');
const oggi = new Date(), fine = oggi.getMonth() >= 6 ? oggi.getFullYear() + 1 : oggi.getFullYear();
const stagione = `${fine - 1}/${String(fine % 100).padStart(2, '0')}`;

const { data: td } = await db.from('docs').select('data').eq('path', 'shared/teams').single();
const squadre = td.data.items.filter((t) => !t.organizza && !t.vedeTutte && /under\s*\d+/i.test(t.category || ''));
const { data: soc } = await db.from('societa').select('id, nome').eq('nome', 'Academy Casatese Merate').single();

let giocatori = [];
for (let da = 0; ; da += 1000) {
  const { data } = await db.from('giocatori').select('id, cognome, nome, annata, stato, societa_id, osservato').range(da, da + 999);
  giocatori.push(...data); if (data.length < 1000) break;
}
const chiavi = (g) => [norm(`${g.cognome}${g.nome}`), norm(`${g.nome}${g.cognome}`)];

const esito = { daInserire: [], giaInseriti: [], ambigui: [], soloDistinta: [], rose: 0 };
for (const t of squadre) {
  const eta = Number(t.category.match(/under\s*(\d+)/i)[1]), annata = fine - eta;
  const { data } = await db.from('docs').select('data').eq('path', 'roster/' + t.id).maybeSingle();
  for (const p of data?.data?.players ?? []) {
    esito.rose++;
    const k = norm(p.name);
    const trovati = giocatori.filter((g) => chiavi(g).includes(k) && Math.abs(g.annata - annata) <= 1);
    if (!trovati.length) continue;
    const osservati = trovati.filter((g) => g.osservato);
    const voce = { squadra: t.category, nome: p.name, schede: trovati.map((g) => g.id) };
    if (!osservati.length) { esito.soloDistinta.push(voce); continue; }
    if (osservati.length > 1) { esito.ambigui.push(voce); continue; }
    const g = osservati[0];
    if (g.stato === 'inserito' && g.societa_id === soc.id) esito.giaInseriti.push(voce);
    else esito.daInserire.push({ ...voce, id: g.id, statoPrima: g.stato, societaGiusta: g.societa_id === soc.id });
  }
}

mkdirSync('private', { recursive: true });
writeFileSync('private/inseriti-da-rose.json', JSON.stringify(esito, null, 1));
console.log(`Giocatori nelle rose: ${esito.rose}`);
console.log(`Da inserire (in archivio, osservati): ${esito.daInserire.length}`);
console.log(`Già inseriti e dell'Academy: ${esito.giaInseriti.length}`);
console.log(`Nomi con più schede (non toccati, da unire): ${esito.ambigui.length}`);
console.log(`Visti solo nelle distinte (non toccati): ${esito.soloDistinta.length}`);
const perSquadra = {}; esito.daInserire.forEach((v) => { perSquadra[v.squadra] = (perSquadra[v.squadra] || 0) + 1; });
console.log('Per squadra:', perSquadra);
const perStato = {}; esito.daInserire.forEach((v) => { perStato[v.statoPrima] = (perStato[v.statoPrima] || 0) + 1; });
console.log('Stato di adesso:', perStato);
console.log('Elenco con i nomi: private/inseriti-da-rose.json');
if (!conferma) { console.log('Simulazione: aggiungi --conferma per scrivere.'); process.exit(0); }

let fatti = 0;
for (const v of esito.daInserire) {
  const nota = `In rosa ${v.squadra} (${stagione}) dal Portale`;
  const { error } = await db.from('giocatori').update({ stato: 'inserito', societa_id: soc.id }).eq('id', v.id);
  if (error) { console.error('❌', error.message); continue; }
  // storico: la riga appena scritta dal trigger (cambio di stato) riceve il motivo; la carriera la nota
  const { data: st } = await db.from('storico_stati').select('id').eq('giocatore_id', v.id).order('created_at', { ascending: false }).limit(1);
  if (st?.[0] && v.statoPrima !== 'inserito') await db.from('storico_stati').update({ motivo: nota }).eq('id', st[0].id);
  if (!v.societaGiusta) {
    const { data: c } = await db.from('carriera').select('id').eq('giocatore_id', v.id).eq('origine', 'cambio').order('created_at', { ascending: false }).limit(1);
    if (c?.[0]) await db.from('carriera').update({ nota, categoria: v.squadra.split(' - ')[0] }).eq('id', c[0].id);
  }
  fatti++;
}
console.log(`✓ Aggiornati ${fatti} giocatori`);
