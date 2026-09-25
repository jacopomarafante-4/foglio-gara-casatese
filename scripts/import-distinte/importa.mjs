// =====================================================================
// Importazione delle distinte di gara (anche di stagioni passate) → storico giocatori
// Uso (dalla cartella del progetto):
//   node --env-file=.env.local scripts/import-distinte/importa.mjs [file.json …] [--conferma]
// Senza file legge tutti i .json in scripts/import-distinte/dati/ (cartella NON versionata:
// contiene dati di minori). Senza --conferma è una simulazione: stampa il riepilogo e non scrive.
//
// Formato di un file (una distinta, o un array di distinte):
// {
//   "fonte": "distinta_2024-10-12_u14.jpg",
//   "data": "2024-10-12", "categoria": "Under 14", "competizione": "Provinciali girone B",
//   "risultato": "2-1",
//   "squadre": [
//     { "lato": "casa", "societa": "Virtus Adda",
//       "giocatori": [ { "numero": 1, "cognome": "Rossi", "nome": "Luca", "data_nascita": "2011-03-02",
//                        "titolare": true, "capitano": false } ] },
//     { "lato": "trasferta", "societa": "Academy Casatese Merate", "giocatori": [ … ] }
//   ]
// }
// Si prendono solo cognome, nome, data di nascita, numero: niente tessere né documenti.
// =====================================================================
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('❌ Mancano NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}
const db = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
const CONFERMA = process.argv.includes('--conferma');
const DATI = new URL('./dati/', import.meta.url).pathname;

// --- Utilità (come lib/utili.ts e lib/doppioni.ts) --------------------------
const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const maiuscole = (s) => (s ? String(s).trim().toLowerCase().replace(/(^|[\s'’-])(\p{L})/gu, (_, a, b) => a + b.toUpperCase()) : null);
function distanza(a, b) {
  const r = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let p = r[0]; r[0] = i;
    for (let j = 1; j <= b.length; j++) { const t = r[j]; r[j] = Math.min(r[j] + 1, r[j - 1] + 1, p + (a[i - 1] === b[j - 1] ? 0 : 1)); p = t; }
  }
  return r[b.length];
}
/** "2024-10-12" → "2024/25" (la stagione parte a luglio) */
function stagioneDi(data) {
  const [y, m] = data.split('-').map(Number);
  const inizio = m >= 7 ? y : y - 1;
  return `${inizio}/${String((inizio + 1) % 100).padStart(2, '0')}`;
}

// --- Lettura dei file ---------------------------------------------------------
const argFile = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const files = argFile.length ? argFile : (await readdir(DATI).catch(() => [])).filter((f) => f.endsWith('.json')).map((f) => join(DATI, f));
if (!files.length) { console.log('Nessun file da importare (cartella scripts/import-distinte/dati/ vuota).'); process.exit(0); }
const distinte = [];
for (const f of files) {
  const j = JSON.parse(await readFile(f, 'utf8'));
  for (const d of Array.isArray(j) ? j : [j]) distinte.push({ ...d, _file: f.split('/').pop() });
}

// --- Stato attuale del database -------------------------------------------------
const { data: societa } = await db.from('societa').select('id, nome, alias');
const { data: giocatori } = await db.from('giocatori').select('id, cognome, nome, annata, data_nascita, osservato, societa_id, categoria');
const perNome = new Map();
for (const g of giocatori) { const k = norm(g.cognome) + '|' + norm(g.nome); perNome.set(k, [...(perNome.get(k) ?? []), g]); }

function trovaSocieta(nome) {
  const n = norm(nome);
  return societa.find((s) => norm(s.nome) === n || (s.alias ?? []).some((a) => norm(a) === n)) ?? null;
}
/** Stesso ragazzo già in archivio? Nome e cognome + data di nascita (o annata se la data manca);
 *  con la stessa data di nascita basta un nome quasi uguale (refusi della distinta). */
function trovaGiocatore(r) {
  const annata = Number(r.data_nascita?.slice(0, 4) ?? r.annata);
  const stessi = (perNome.get(norm(r.cognome) + '|' + norm(r.nome)) ?? []).filter((g) => g.annata === annata);
  const conData = stessi.filter((g) => g.data_nascita && r.data_nascita && g.data_nascita === r.data_nascita);
  if (conData.length === 1) return { g: conData[0], come: 'stessa persona (nome e data di nascita)' };
  const senzaData = stessi.filter((g) => !g.data_nascita || !r.data_nascita);
  if (senzaData.length === 1 && conData.length === 0) return { g: senzaData[0], come: 'stessa persona (nome e annata)' };
  if (r.data_nascita) {
    const simili = giocatori.filter((g) => g.data_nascita === r.data_nascita &&
      distanza(norm(g.cognome), norm(r.cognome)) <= 2 && distanza(norm(g.nome), norm(r.nome)) <= 2);
    if (simili.length === 1) return { g: simili[0], come: 'nome quasi uguale, stessa data di nascita', dubbio: true };
  }
  if (stessi.length > 1) return { g: null, come: 'omonimi della stessa annata: creato nuovo, da controllare', dubbio: true };
  return { g: null, come: 'nuovo' };
}

// --- Simulazione / importazione -----------------------------------------------
const riepilogo = { distinte: 0, societaNuove: new Set(), nuovi: 0, esistenti: 0, dubbi: [], cambiSocieta: [] };
const toccati = new Set();

for (const d of distinte) {
  if (!d.data || !d.categoria || !Array.isArray(d.squadre) || d.squadre.length !== 2) {
    console.log(`⚠️  ${d._file}: manca data, categoria o le due squadre — saltata`); continue;
  }
  const stagione = stagioneDi(d.data);
  const casa = d.squadre.find((s) => s.lato === 'casa') ?? d.squadre[0];
  const trasf = d.squadre.find((s) => s.lato === 'trasferta') ?? d.squadre[1];
  riepilogo.distinte++;

  const idSquadra = {};
  for (const sq of [casa, trasf]) {
    let soc = trovaSocieta(sq.societa);
    if (!soc) {
      riepilogo.societaNuove.add(sq.societa.trim());
      if (CONFERMA) { soc = (await db.from('societa').insert({ nome: sq.societa.trim() }).select('id, nome, alias').single()).data; societa.push(soc); }
    }
    if (CONFERMA && soc) {
      const { data: esiste } = await db.from('squadre').select('id').eq('societa_id', soc.id).ilike('categoria', d.categoria).eq('stagione', stagione).maybeSingle();
      idSquadra[sq.lato ?? (sq === casa ? 'casa' : 'trasferta')] = esiste?.id ??
        (await db.from('squadre').insert({ societa_id: soc.id, categoria: d.categoria, stagione }).select('id').single()).data.id;
    }
    sq._soc = soc;
  }

  let distintaId = null;
  if (CONFERMA) {
    const { data: gia } = await db.from('distinte').select('id').eq('data', d.data).ilike('casa_nome', casa.societa.trim()).ilike('trasferta_nome', trasf.societa.trim()).ilike('categoria', d.categoria).maybeSingle();
    const campi = { data: d.data, stagione, categoria: d.categoria, competizione: d.competizione ?? null, casa_nome: casa.societa.trim(),
      trasferta_nome: trasf.societa.trim(), casa_id: idSquadra.casa ?? null, trasferta_id: idSquadra.trasferta ?? null, risultato: d.risultato ?? null, fonte: d.fonte ?? d._file };
    distintaId = gia ? (await db.from('distinte').update(campi).eq('id', gia.id).select('id').single()).data.id
                     : (await db.from('distinte').insert(campi).select('id').single()).data.id;
  }

  for (const sq of [casa, trasf]) {
    for (const r of sq.giocatori ?? []) {
      if (!r.cognome) continue;
      const { g, come, dubbio } = trovaGiocatore(r);
      if (dubbio) riepilogo.dubbi.push(`${d._file}: ${maiuscole(r.cognome)} ${maiuscole(r.nome) ?? ''} (${r.data_nascita ?? r.annata ?? '?'}) — ${come}${g ? ` → ${g.cognome} ${g.nome ?? ''}` : ''}`);
      let id = g?.id;
      if (g) {
        riepilogo.esistenti++;
        if (sq._soc && g.societa_id && g.societa_id !== sq._soc.id) riepilogo.cambiSocieta.push(`${g.cognome} ${g.nome ?? ''}: ${societa.find((s) => s.id === g.societa_id)?.nome ?? '?'} → ${sq._soc.nome} (${d.data})`);
        if (CONFERMA && !g.data_nascita && r.data_nascita) await db.from('giocatori').update({ data_nascita: r.data_nascita }).eq('id', g.id);
      } else {
        riepilogo.nuovi++;
        if (CONFERMA) {
          const annata = Number(r.data_nascita?.slice(0, 4) ?? r.annata);
          const nuovo = { cognome: maiuscole(r.cognome), nome: maiuscole(r.nome), annata, data_nascita: r.data_nascita ?? null,
            societa_id: sq._soc?.id ?? null, osservato: false };
          id = (await db.from('giocatori').insert(nuovo).select('id').single()).data.id;
          const k = norm(nuovo.cognome) + '|' + norm(nuovo.nome);
          const rec = { id, ...nuovo }; giocatori.push(rec); perNome.set(k, [...(perNome.get(k) ?? []), rec]);
        }
      }
      if (CONFERMA && id && distintaId) {
        await db.from('distinte_giocatori').upsert({ distinta_id: distintaId, giocatore_id: id, squadra_id: idSquadra[sq.lato ?? (sq === casa ? 'casa' : 'trasferta')] ?? null,
          numero: r.numero ?? null, titolare: r.titolare ?? null, capitano: !!r.capitano }, { onConflict: 'distinta_id,giocatore_id' });
        toccati.add(id);
      }
    }
  }
}

// Società e squadra attuali di ogni ragazzo = quelle della sua distinta più recente
if (CONFERMA) {
  for (const id of toccati) {
    const { data } = await db.from('distinte_giocatori').select('squadra:squadre(societa_id), distinta:distinte(data)').eq('giocatore_id', id);
    const ultima = (data ?? []).filter((x) => x.squadra && x.distinta).sort((a, b) => b.distinta.data.localeCompare(a.distinta.data))[0];
    if (ultima) await db.from('giocatori').update({ societa_id: ultima.squadra.societa_id }).eq('id', id);
  }
}

console.log(`\n${CONFERMA ? '✅ IMPORTAZIONE FATTA' : '🔎 SIMULAZIONE (niente scritto: aggiungi --conferma)'}`);
console.log(`Distinte: ${riepilogo.distinte}`);
console.log(`Ragazzi già in archivio: ${riepilogo.esistenti} · nuovi (solo da distinta): ${riepilogo.nuovi}`);
if (riepilogo.societaNuove.size) console.log(`Società nuove: ${[...riepilogo.societaNuove].join(', ')}`);
if (riepilogo.cambiSocieta.length) console.log(`Cambi di società:\n  ${riepilogo.cambiSocieta.join('\n  ')}`);
if (riepilogo.dubbi.length) console.log(`Da controllare:\n  ${riepilogo.dubbi.join('\n  ')}`);
