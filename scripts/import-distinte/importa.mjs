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
//                        "titolare": true, "capitano": false,
//                        "societa": "Solo se la società di appartenenza è diversa (prestito, aggregato)" } ] },
//     { "lato": "trasferta", "societa": "Academy Casatese Merate", "giocatori": [ … ] }
//   ]
// }
// Si prendono solo cognome, nome, data di nascita, numero e società di appartenenza: niente tessere né documenti.
// =====================================================================
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('❌ Mancano NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}
const db = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
const CONFERMA = process.argv.includes('--conferma');
const DATI = fileURLToPath(new URL('./dati/', import.meta.url)); // (gli spazi nel percorso restano spazi)

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
/** Per ogni ragazzo: società prima dell'importazione e società nelle distinte di questo lotto (con la data) */
const primaDi = new Map(), viste = new Map();

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
      // In simulazione la società nuova esiste solo in memoria (serve al riepilogo dei cambi)
      soc = CONFERMA ? (await db.from('societa').insert({ nome: sq.societa.trim() }).select('id, nome, alias').single()).data
                     : { id: `nuova:${norm(sq.societa)}`, nome: sq.societa.trim(), alias: [] };
      societa.push(soc);
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
      // Società di appartenenza: quella indicata per il ragazzo (prestito, aggregato) o quella della squadra
      let socRagazzo = sq._soc;
      if (r.societa && norm(r.societa) !== norm(sq.societa)) {
        socRagazzo = trovaSocieta(r.societa);
        if (!socRagazzo) {
          riepilogo.societaNuove.add(r.societa.trim());
          socRagazzo = CONFERMA ? (await db.from('societa').insert({ nome: r.societa.trim() }).select('id, nome, alias').single()).data
                                : { id: `nuova:${norm(r.societa)}`, nome: r.societa.trim(), alias: [] };
          societa.push(socRagazzo);
        }
      }
      const { g, come, dubbio } = trovaGiocatore(r);
      if (dubbio) riepilogo.dubbi.push(`${d._file}: ${maiuscole(r.cognome)} ${maiuscole(r.nome) ?? ''} (${r.data_nascita ?? r.annata ?? '?'}) — ${come}${g ? ` → ${g.cognome} ${g.nome ?? ''}` : ''}`);
      let id = g?.id;
      if (g) {
        riepilogo.esistenti++;
        if (!primaDi.has(g.id)) primaDi.set(g.id, { societa_id: g.societa_id, nome: `${g.cognome} ${g.nome ?? ''}`.trim(), nuovo: !!g._nuovo });
        if (CONFERMA && !g.data_nascita && r.data_nascita) await db.from('giocatori').update({ data_nascita: r.data_nascita }).eq('id', g.id);
      } else {
        riepilogo.nuovi++;
        const annata = Number(r.data_nascita?.slice(0, 4) ?? r.annata);
        const nuovo = { cognome: maiuscole(r.cognome), nome: maiuscole(r.nome), annata, data_nascita: r.data_nascita ?? null,
          societa_id: socRagazzo?.id ?? null, osservato: false };
        // In simulazione il nuovo ragazzo resta solo in memoria, così nelle distinte successive viene riconosciuto
        id = CONFERMA ? (await db.from('giocatori').insert(nuovo).select('id').single()).data.id : `nuovo-${giocatori.length}`;
        const k = norm(nuovo.cognome) + '|' + norm(nuovo.nome);
        const rec = { id, ...nuovo, _nuovo: true }; giocatori.push(rec); perNome.set(k, [...(perNome.get(k) ?? []), rec]);
        primaDi.set(id, { societa_id: null, nome: `${nuovo.cognome} ${nuovo.nome ?? ''}`.trim(), nuovo: true });
      }
      if (id) viste.set(id, [...(viste.get(id) ?? []), { data: d.data, societa: socRagazzo }]);
      if (CONFERMA && id && distintaId) {
        await db.from('distinte_giocatori').upsert({ distinta_id: distintaId, giocatore_id: id, squadra_id: idSquadra[sq.lato ?? (sq === casa ? 'casa' : 'trasferta')] ?? null,
          societa_id: socRagazzo?.id ?? null, numero: r.numero ?? null, titolare: r.titolare ?? null, capitano: !!r.capitano }, { onConflict: 'distinta_id,giocatore_id' });
        toccati.add(id);
      }
    }
  }
}

// Società attuale di ogni ragazzo = la sua società di appartenenza nella distinta più recente
if (CONFERMA) {
  for (const id of toccati) {
    const { data } = await db.from('distinte_giocatori').select('societa_id, squadra:squadre(societa_id), distinta:distinte(data)').eq('giocatore_id', id);
    const ultima = (data ?? []).filter((x) => x.distinta).sort((a, b) => b.distinta.data.localeCompare(a.distinta.data))[0];
    const soc = ultima?.societa_id ?? ultima?.squadra?.societa_id;
    if (soc) await db.from('giocatori').update({ societa_id: soc }).eq('id', id);
  }
}

// Cambi di società: società di prima ↔ società della distinta più recente (di questo lotto o già in archivio)
for (const [id, lotto] of viste) {
  const prima = primaDi.get(id);
  if (!prima || prima.nuovo || !prima.societa_id) continue;
  const ultimaLotto = [...lotto].sort((a, b) => b.data.localeCompare(a.data))[0];
  const { data: gia } = await db.from('distinte_giocatori').select('distinta:distinte(data)').eq('giocatore_id', id);
  const ultimaArchivio = (gia ?? []).map((x) => x.distinta?.data).filter(Boolean).sort().pop();
  if (ultimaArchivio && ultimaArchivio > ultimaLotto.data) continue; // c'è già una distinta più recente
  if (ultimaLotto.societa && ultimaLotto.societa.id !== prima.societa_id) {
    riepilogo.cambiSocieta.push(`${prima.nome}: ${societa.find((s) => s.id === prima.societa_id)?.nome ?? '?'} → ${ultimaLotto.societa.nome} (${ultimaLotto.data})`);
  }
}

console.log(`\n${CONFERMA ? '✅ IMPORTAZIONE FATTA' : '🔎 SIMULAZIONE (niente scritto: aggiungi --conferma)'}`);
console.log(`Distinte: ${riepilogo.distinte}`);
console.log(`Ragazzi già in archivio: ${riepilogo.esistenti} · nuovi (solo da distinta): ${riepilogo.nuovi}`);
if (riepilogo.societaNuove.size) console.log(`Società nuove: ${[...riepilogo.societaNuove].join(', ')}`);
if (riepilogo.cambiSocieta.length) console.log(`Cambi di società:\n  ${riepilogo.cambiSocieta.join('\n  ')}`);
if (riepilogo.dubbi.length) console.log(`Da controllare:\n  ${riepilogo.dubbi.join('\n  ')}`);
