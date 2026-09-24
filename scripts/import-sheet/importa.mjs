// =====================================================================
// Scouting Hub · Importazione dal Google Sheet "Database Giocatori Osservati"
// Uso (dalla cartella del progetto):
//   node scripts/import-sheet/importa.mjs [--conferma]
// Senza --conferma fa una simulazione (nessuna scrittura), stampa un riepilogo.
// Legge scripts/import-sheet/dati/generale.json e prima-vista.json
// (esportati a parte dal foglio Google, non versionati: vedi .gitignore).
// =====================================================================
import { readFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('❌ Mancano NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}
const supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

const CONFERMA = process.argv.includes('--conferma');
const SOLO_GENERALE = process.argv.includes('--solo-generale');

function normalizza(s) {
  return String(s ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]/g, '');
}

// --- Date -------------------------------------------------------------
function dataNascitaDa(valoreData) {
  const n = Number(valoreData);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (n >= 1990 && n <= 2030) return null; // era solo l'anno digitato per errore nella cella data
  // serial Excel -> data reale (epoca 1899-12-30)
  const ms = Math.round((n - 25569) * 86400 * 1000);
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

// --- Esito NOTE 25 / NOTE 26 -> stato + motivo -------------------------
// null = "tag" che non sposta lo stato (resta segnalato), solo testo salvato
const MAPPA_ESITO = {
  'open day 25': null,
  'open day 26': null,
  'a prima vista': null,
  'a prima vista - abita nella bergamasca': null,
  scout: null,
  'scout - gioca con i 2016': null,
  'da ottenere numero': null,

  'inserito nei provinciali': { stato: 'inserito' },
  'inserito in squadra': { stato: 'inserito' },
  'inserito in rosa': { stato: 'inserito' },
  'conferma in squadra': { stato: 'inserito' },
  'ha scelto casatenovo': { stato: 'inserito' },
  'ha firmato tesseramento in anticipo': { stato: 'inserito' },

  'non a livello': { stato: 'chiuso', motivo: 'Non a livello' },
  taglio: { stato: 'chiuso', motivo: 'Altro' },

  'non presentato': { stato: 'chiuso', motivo: 'Non presentato' },
  'non presentato, ha scelto la cisanese': { stato: 'chiuso', motivo: 'Non presentato' },
  'non presentato, ha scelto altro progetto': { stato: 'chiuso', motivo: 'Non presentato' },

  'scelto di restare a rovagnate': { stato: 'chiuso', motivo: 'Scelto altro progetto' },
  'ha scelto renate': { stato: 'chiuso', motivo: 'Scelto altro progetto' },
  'ha scelto leon': { stato: 'chiuso', motivo: 'Scelto altro progetto' },
  'inserito in squadra ma tornato alla tritium a marzo': { stato: 'chiuso', motivo: 'Scelto altro progetto' },
  'accettato ma ha preferito elité - cimiano': { stato: 'chiuso', motivo: 'Scelto altro progetto' },
  'scelto altro progetto - timore di non giocare': { stato: 'chiuso', motivo: 'Scelto altro progetto' },
  'scelto altro progetto (regionale)': { stato: 'chiuso', motivo: 'Scelto altro progetto' },
  'andato in elité': { stato: 'chiuso', motivo: 'Scelto altro progetto' },
  'provato, voleva regionali': { stato: 'chiuso', motivo: 'Scelto altro progetto' },
  'lasciato a cornate per giocare per regionali prossima stagione': { stato: 'chiuso', motivo: 'Scelto altro progetto' },
  'leon provinciale': { stato: 'chiuso', motivo: 'Scelto altro progetto' },
  'ha deciso di rimanere a carugate': { stato: 'chiuso', motivo: 'Scelto altro progetto' },

  'buona prospettiva ma siamo troppi': { stato: 'chiuso', motivo: 'Posti in squadra esauriti' },
  'non visto perchè slot portieri pieni': { stato: 'chiuso', motivo: 'Posti in squadra esauriti' },

  'troppo distante': { stato: 'chiuso', motivo: 'Altro' },
  'ha scelto altra società per distanza': { stato: 'chiuso', motivo: 'Altro' },

  'livello medio': { stato: 'da_rivedere' },
  'da rivalutare': { stato: 'da_rivedere' },
  'bel giocatore ma gemello in coppia': { stato: 'da_rivedere' },
  'da inserire assolutamente, livello alto': { stato: 'da_rivedere' },
  'sta valutando inserimento': { stato: 'da_rivedere' },
  'presto ma da valutare': { stato: 'da_rivedere' },

  'viene in prova a fine agosto': { stato: 'invitato' },
};

function classificaEsito(testo) {
  const chiave = normalizza(testo) && String(testo).trim().toLowerCase();
  if (!chiave) return undefined; // niente scritto
  if (Object.prototype.hasOwnProperty.call(MAPPA_ESITO, chiave)) return MAPPA_ESITO[chiave];
  return undefined; // non riconosciuto: non tocchiamo lo stato, ma segnaliamo
}

function esitoRiga(note25, note26) {
  const n25 = String(note25 ?? '').trim();
  const n26 = String(note26 ?? '').trim();
  const c26 = classificaEsito(n26);
  const c25 = classificaEsito(n25);
  let sconosciute = [];
  if (n26 && c26 === undefined) sconosciute.push(n26);
  if (n25 && c25 === undefined) sconosciute.push(n25);

  const testo = [n25, n26].filter(Boolean).join(' | ') || null;
  const decisiva = (c26 && c26 !== null) ? c26 : (c25 && c25 !== null) ? c25 : null;

  return {
    stato: decisiva?.stato ?? 'segnalato',
    motivo: decisiva?.motivo ?? null,
    note: testo,
    sconosciute,
  };
}

// --- Posizione -> ruolo di campo ---------------------------------------
function ruoloCampoDa(posizione) {
  const p = String(posizione ?? '').trim().toLowerCase();
  if (p === 'portiere') return 'portiere';
  if (p.startsWith('1°') || p.includes('difensivo')) return 'difensore';
  if (p.startsWith('2°') || p.includes('mediana')) return 'centrocampista';
  if (p.startsWith('3°') || p.includes('offensivo')) return 'attaccante';
  return null; // "giocatore di movimento": troppo generico
}

// --- Società: trova o crea (stessa logica di lib/societa.ts) -----------
const cacheSocieta = new Map(); // normalizza(nome) -> id
let elencoSocieta = [];

async function caricaSocieta() {
  const { data } = await supabase.from('societa').select('id, nome, alias');
  elencoSocieta = data ?? [];
  for (const s of elencoSocieta) {
    cacheSocieta.set(normalizza(s.nome), s.id);
    for (const a of s.alias ?? []) cacheSocieta.set(normalizza(a), s.id);
  }
}

async function trovaOCreaSocieta(nomeGrezzo) {
  const nome = String(nomeGrezzo ?? '').trim();
  if (!nome || normalizza(nome) === normalizza('nessuna')) return null;
  const chiave = normalizza(nome);
  if (cacheSocieta.has(chiave)) return cacheSocieta.get(chiave);

  if (!CONFERMA) return null; // simulazione: non creiamo nulla
  const { data, error } = await supabase.from('societa').insert({ nome }).select('id').single();
  if (error) {
    console.error(`  ⚠️  società "${nome}" non creata: ${error.message}`);
    return null;
  }
  cacheSocieta.set(chiave, data.id);
  return data.id;
}

// --- Import GENERALE 2024/2026 ------------------------------------------
async function importaGenerale() {
  const righe = JSON.parse(await readFile(new URL('./dati/generale.json', import.meta.url), 'utf8'));
  const visti = new Map(); // chiave dedup -> già vista in questa run o già in DB (rilanci sicuri)
  const { data: esistenti } = await supabase.from('giocatori').select('cognome, nome, annata');
  for (const g of esistenti ?? []) {
    visti.set(`${normalizza(g.cognome)}|${normalizza(g.nome)}|${g.annata}`, true);
  }
  const risultato = { inserite: 0, duplicate: 0, senzaAnno: [], esitiSconosciuti: new Set(), errori: [], perStato: {} };

  for (const r of righe) {
    // righe fantasma: intestazione ripetuta nel mezzo del foglio
    if (['cognome', 'nome'].includes(normalizza(r.COGNOME)) && normalizza(r.NOME) === 'nome') continue;

    const cognome = String(r.COGNOME ?? '').trim() || null;
    const nome = String(r.NOME ?? '').trim() || null;
    const anno = Number(r.ANNO);

    if (!cognome && !nome) continue;
    if (!Number.isFinite(anno) || anno < 1990 || anno > 2030) {
      risultato.senzaAnno.push(`${cognome ?? ''} ${nome ?? ''}`.trim());
      continue;
    }

    const chiaveDedup = `${normalizza(cognome)}|${normalizza(nome)}|${anno}`;
    if (visti.has(chiaveDedup)) {
      risultato.duplicate++;
      continue;
    }
    visti.set(chiaveDedup, true);

    const esito = esitoRiga(r['NOTE 25'], r['NOTE 26']);
    esito.sconosciute.forEach((s) => risultato.esitiSconosciuti.add(s));
    risultato.perStato[esito.stato] = (risultato.perStato[esito.stato] ?? 0) + 1;

    const societaId = await trovaOCreaSocieta(r['SOCIETÀ']);
    const dataNascita = dataNascitaDa(r.DATA);
    const ruolo = ruoloCampoDa(r.POSIZIONE);
    // Il vincolo "giocatore_identificabile" richiede cognome o descrizione: se manca il
    // cognome (solo nome di battesimo, es. open day) usiamo il nome come descrizione.
    const descrizione = cognome ? null : nome;

    if (CONFERMA) {
      const { data: giocatore, error } = await supabase
        .from('giocatori')
        .insert({
          cognome, nome, descrizione, annata: anno, data_nascita: dataNascita, ruolo,
          societa_id: societaId, stato: esito.stato, motivo_chiusura: esito.motivo,
          note: esito.note,
        })
        .select('id').single();

      if (error) { risultato.errori.push(`${cognome} ${nome}: ${error.message}`); continue; }

      const mail = String(r.MAIL ?? '').trim();
      const tel1 = String(r['TELEFONO 1'] ?? '').trim();
      const tel2 = String(r['TELEFONO 2'] ?? '').trim();
      if (mail || tel1) {
        await supabase.from('contatti').insert({
          giocatore_id: giocatore.id, tipo: 'genitore', email: mail || null, telefono: tel1 || null,
        });
      }
      if (tel2 && tel2 !== tel1) {
        await supabase.from('contatti').insert({
          giocatore_id: giocatore.id, tipo: 'altro', telefono: tel2, nome: 'Secondo contatto',
        });
      }
    }
    risultato.inserite++;
  }
  return risultato;
}

// --- Import "A prima vista" (segnalazioni rapide) -----------------------
async function importaPrimaVista() {
  const righe = JSON.parse(await readFile(new URL('./dati/prima-vista.json', import.meta.url), 'utf8'));
  const risultato = { inserite: 0, senzaAnno: [], errori: [] };

  for (const r of righe) {
    const anno = Number(r.Categoria);
    if (!Number.isFinite(anno) || anno < 1990 || anno > 2030) {
      risultato.senzaAnno.push(String(r['Nome/Cognome'] ?? '').trim());
      continue;
    }
    const posizioneLabel = String(r.Posizione ?? '').trim();
    const nomeCognome = String(r['Nome/Cognome'] ?? '').trim() || 'Senza nome';
    const descrizione = `${posizioneLabel ? posizioneLabel + ' — ' : ''}${nomeCognome}`.slice(0, 250);
    const ruolo = ruoloCampoDa(posizioneLabel);
    const societaId = await trovaOCreaSocieta(r['Società']);
    const testo = String(r['Altre Info varie'] ?? '').trim() || 'Nessuna nota aggiuntiva.';
    const dataVisita = (() => {
      const d = new Date(r['Informazioni cronologiche']);
      return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
    })();

    if (CONFERMA) {
      const { data: giocatore, error } = await supabase
        .from('giocatori')
        .insert({ descrizione, annata: anno, ruolo, societa_id: societaId, stato: 'segnalato' })
        .select('id').single();
      if (error) { risultato.errori.push(`${descrizione}: ${error.message}`); continue; }

      await supabase.from('segnalazioni').insert({
        giocatore_id: giocatore.id,
        data: dataVisita ?? undefined,
        contesto: String(r['Società'] ?? '').trim() || null,
        testo,
      });
    }
    risultato.inserite++;
  }
  return risultato;
}

// --- Esecuzione ----------------------------------------------------------
console.log(CONFERMA ? '✍️  Import in scrittura (--conferma)\n' : '👀  Simulazione (nessuna scrittura). Rilancia con --conferma per scrivere davvero.\n');

await caricaSocieta();
const generale = await importaGenerale();
const primaVista = SOLO_GENERALE
  ? { inserite: 0, senzaAnno: [], errori: [], saltata: true }
  : await importaPrimaVista();

console.log('=== GENERALE 2024/2026 ===');
console.log(`Inserite: ${generale.inserite} | Duplicate scartate: ${generale.duplicate}`);
console.log('Per stato:', generale.perStato);
if (generale.senzaAnno.length) console.log(`Senza anno (scartate, da inserire a mano): ${generale.senzaAnno.join(', ')}`);
if (generale.esitiSconosciuti.size) console.log(`Esiti non riconosciuti (stato lasciato invariato): ${[...generale.esitiSconosciuti].join(' | ')}`);
if (generale.errori.length) console.log(`Errori: ${generale.errori.length}`, generale.errori.slice(0, 5));

console.log('\n=== A prima vista ===');
console.log(`Inserite: ${primaVista.inserite}`);
if (primaVista.senzaAnno.length) console.log(`Senza anno (scartate): ${primaVista.senzaAnno.join(', ')}`);
if (primaVista.errori.length) console.log(`Errori: ${primaVista.errori.length}`, primaVista.errori.slice(0, 5));
