/* FILE GENERATO da lib/condivisi.ts con "npm run condivisi": non modificarlo qui.
   Regole comuni a Scouting e Portale: CALENDARI, calendarioDi, etaCategoria, COLORI_ANNATA, coloreAnnata, COLORI_AUTORE, inizialiAutore, coloreAutore. */
// Regole comuni a Scouting (Next) e Portale (public/portale): scritte una volta sola, qui.
// Il Portale non ha un passaggio di build: `npm run condivisi` (scripts/genera-condivisi.mjs) toglie i tipi e crea
// public/portale/js/condivisi.js (file generato, da non modificare). Le prove rapide falliscono se non è aggiornato.
// Solo funzioni e costanti semplici, senza import: devono funzionare uguali nel browser del Portale.

/* ---------- Calendari della società ---------- */
/** I tre calendari (come quelli Google della società), ognuno col suo colore */
const CALENDARI = {
  merate: { nome: 'Merate', colore: '#003DA5' },
  cernusco: { nome: 'Cernusco', colore: '#D4AF37' },
  trasferta: { nome: 'Trasferta', colore: '#C41E3A' },
};

/** Calendario di una partita (o di un evento della società): fuori casa = Trasferta, in casa Merate o Cernusco dal campo */
function calendarioDi(m){
  if (m.evento) return m.luogo === 'merate' || m.luogo === 'cernusco' ? m.luogo : 'trasferta';
  return !m.home ? 'trasferta' : /MERATE/i.test(m.venue || '') ? 'merate' : 'cernusco';
}

/* ---------- Squadre e categorie ---------- */
/** Età della categoria: "Under 13 - Attività di base" → 13, "U12" → 12, Esordienti 12, Pulcini/Primi calci/Piccoli 10;
 *  null se non si capisce (squadre di organizzazione, preparatori) */
function etaCategoria(t){
  const c = String(t?.category || t?.name || '');
  const u = c.match(/under\s*(\d+)|\bu\s*(\d{1,2})\b/i);
  return u ? Number(u[1] || u[2]) : /esordienti/i.test(c) ? 12 : /pulcini|primi\s*calci|piccoli/i.test(c) ? 10 : null;
}

/* ---------- Annate ---------- */
/** Ogni annata ha i suoi colori [sfondo, testo]: anni vicini hanno colori diversi */
const COLORI_ANNATA = [
  ['#DCE7FA', '#003DA5'], ['#FBE0E5', '#A3142E'], ['#FBEFCF', '#7A5600'], ['#ECE3F7', '#5B3290'],
  ['#D7F0EE', '#0B6464'], ['#FCE6D6', '#9A4A12'], ['#E3E8EF', '#35506B'], ['#FBE1EE', '#9B2A5E'],
];
const coloreAnnata = (annata) => COLORI_ANNATA[((annata % 8) + 8) % 8];

/* ---------- Chi ha valutato: iniziali e colore ---------- */
const COLORI_AUTORE = ['#003DA5', '#C41E3A', '#B8860B', '#6B3FA0', '#0F7C7C', '#A34A1E', '#B8336A', '#35506B', '#4A5563', '#1F5FA8'];

/** Iniziali: "Mario Rossi" → MR, "Mister Luca Bianchi · Under 14" → LB */
function inizialiAutore(nome){
  const parole = String(nome || '').replace(/^Mister\s+/i, '').split('·')[0].trim().split(/\s+/).filter(Boolean);
  return ((parole[0]?.[0] ?? '?') + (parole.length > 1 ? parole[parole.length - 1][0] : '')).toUpperCase();
}

/** Colore della persona, uguale nello Scouting e nel Portale: dal nome (per i mister dalla firma "mister · categoria") */
function coloreAutore(nome, mister = false){
  const chiave = (mister ? 'm:' : '') + String(nome || '').replace(/^Mister\s+/i, '').trim();
  let h = 0;
  for (const c of chiave) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return COLORI_AUTORE[h % COLORI_AUTORE.length];
}
