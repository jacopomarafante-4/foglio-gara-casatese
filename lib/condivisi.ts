// Regole comuni a Scouting (Next) e Portale (public/portale): scritte una volta sola, qui.
// Il Portale non ha un passaggio di build: `npm run condivisi` (scripts/genera-condivisi.mjs) toglie i tipi e crea
// public/portale/js/condivisi.js (file generato, da non modificare). Le prove rapide falliscono se non è aggiornato.
// Solo funzioni e costanti semplici, senza import: devono funzionare uguali nel browser del Portale.

/* ---------- Calendari della società ---------- */
/** I tre calendari (come quelli Google della società), ognuno col suo colore */
export const CALENDARI = {
  merate: { nome: 'Merate', colore: '#003DA5' },
  cernusco: { nome: 'Cernusco', colore: '#D4AF37' },
  trasferta: { nome: 'Trasferta', colore: '#C41E3A' },
} as const;
export type Calendario = keyof typeof CALENDARI;

/** Calendario di una partita (o di un evento della società): fuori casa = Trasferta, in casa Merate o Cernusco dal campo */
export function calendarioDi(m: { home?: boolean | null; venue?: string | null; evento?: unknown; luogo?: string | null }): Calendario {
  if (m.evento) return m.luogo === 'merate' || m.luogo === 'cernusco' ? m.luogo : 'trasferta';
  return !m.home ? 'trasferta' : /MERATE/i.test(m.venue || '') ? 'merate' : 'cernusco';
}

/* ---------- Barra delle aree ---------- */
/** Icone delle aree (tracciati SVG 24×24, contorno): uguali nella barra del Portale e in quella dello Scouting */
export const ICONE_AREE: Record<string, string> = {
  home:'<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10"/><path d="M10 20v-6h4v6"/>',
  calendario:'<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="M8 14h2M14 14h2M8 17h2"/>',
  eventi:'<path d="M4 10v4l11 5V5L4 10z"/><path d="M15 9a3 3 0 0 1 0 6"/><path d="M7 14.5 8 20h3l-1-4.5"/>',
  segreteria:'<rect x="4" y="3.5" width="16" height="17" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  squadra:'<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.6 2.7-6 6-6s6 2.4 6 6"/><circle cx="17" cy="9" r="2.5"/><path d="M16.5 14.2c2.6.3 4.5 2.4 4.5 5.8"/>',
  gara:'<circle cx="12" cy="12" r="9"/><path d="m12 7.5 4 2.9-1.5 4.8h-5L8 10.4z"/><path d="M12 3v4.5M21 10.4l-5 0M17.3 19.3l-2.8-4.1M6.7 19.3l2.8-4.1M3 10.4l5 0"/>',
  allenamento:'<circle cx="13.5" cy="4.5" r="2"/><path d="m9 21 2.5-6 2.5 2.5V21"/><path d="M6 12.5 9 9l4 1.5 2.5 3.5H19"/><path d="m11.5 15-2-3"/>',
  statistiche:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  modulistica:'<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/>',
  scouting:'<circle cx="6.5" cy="15.5" r="3.5"/><circle cx="17.5" cy="15.5" r="3.5"/><path d="M10 15.5h4M4 13l2.5-8h3l1 5.5M20 13l-2.5-8h-3l-1 5.5"/>',
  societa:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'
};

/** Schede del Portale già portate nell'app (tappa 3): nel Portale si aprono lì (`goTab` in portale.js); un mister che apre
 *  una di queste pagine senza essere entrato passa dal PIN e ci torna (`accedi` in app/auth/actions.ts) */
export const NELL_APP: Record<string, string> = {
  archivio: '/societa/archivio', modifiche: '/societa/modifiche', tesserati: '/segreteria', programma: '/modulistica/programma',
  distinta: '/modulistica/distinta', comunicazione: '/modulistica/comunicazione',
  calendario: '/calendari/squadra', calendariotutte: '/calendari/tutte', avvisi: '/calendari/avvisi', home: '/inizio',
  rosa: '/squadra/rosa',
};

/** Modelli degli avvisi e delle comunicazioni (Calendario → Avvisi nel Portale, Modulistica → Comunicazione nell'app) */
export const MODELLI_AVVISO: Record<string, { label: string; titolo: string; testo: string }> = {
  libero: {label:'Avviso libero', titolo:'', testo:''},
  campo: {label:'Cambio campo', titolo:'Cambio campo', testo:'⚠️ CAMBIO CAMPO\nLa partita di [giorno] contro [avversario] si gioca a [campo, indirizzo].\nOrario invariato: ritrovo alle [ora].'},
  orario: {label:'Cambio orario', titolo:'Cambio orario', testo:'⚠️ CAMBIO ORARIO\nLa partita di [giorno] contro [avversario] inizia alle [ora] (ritrovo alle [ora ritrovo]).'},
  evento: {label:'Evento', titolo:'', testo:''}
};

/* ---------- Squadre e categorie ---------- */
/** Età della categoria: "Under 13 - Attività di base" → 13, "U12" → 12, Esordienti 12, Pulcini/Primi calci/Piccoli 10;
 *  null se non si capisce (squadre di organizzazione, preparatori) */
export function etaCategoria(t: { category?: string | null; name?: string | null } | null | undefined): number | null {
  const c = String(t?.category || t?.name || '');
  const u = c.match(/under\s*(\d+)|\bu\s*(\d{1,2})\b/i);
  return u ? Number(u[1] || u[2]) : /esordienti/i.test(c) ? 12 : /pulcini|primi\s*calci|piccoli/i.test(c) ? 10 : null;
}

/* ---------- Annate ---------- */
/** Ogni annata ha i suoi colori [sfondo, testo]: anni vicini hanno colori diversi */
export const COLORI_ANNATA = [
  ['#DCE7FA', '#003DA5'], ['#FBE0E5', '#A3142E'], ['#FBEFCF', '#7A5600'], ['#ECE3F7', '#5B3290'],
  ['#D7F0EE', '#0B6464'], ['#FCE6D6', '#9A4A12'], ['#E3E8EF', '#35506B'], ['#FBE1EE', '#9B2A5E'],
] as const;
export const coloreAnnata = (annata: number) => COLORI_ANNATA[((annata % 8) + 8) % 8];

/* ---------- Chi ha valutato: iniziali e colore ---------- */
export const COLORI_AUTORE = ['#003DA5', '#C41E3A', '#B8860B', '#6B3FA0', '#0F7C7C', '#A34A1E', '#B8336A', '#35506B', '#4A5563', '#1F5FA8'] as const;

/** Iniziali: "Mario Rossi" → MR, "Mister Luca Bianchi · Under 14" → LB */
export function inizialiAutore(nome: string): string {
  const parole = String(nome || '').replace(/^Mister\s+/i, '').split('·')[0].trim().split(/\s+/).filter(Boolean);
  return ((parole[0]?.[0] ?? '?') + (parole.length > 1 ? parole[parole.length - 1][0] : '')).toUpperCase();
}

/** Colore della persona, uguale nello Scouting e nel Portale: dal nome (per i mister dalla firma "mister · categoria") */
export function coloreAutore(nome: string, mister = false): string {
  const chiave = (mister ? 'm:' : '') + String(nome || '').replace(/^Mister\s+/i, '').trim();
  let h = 0;
  for (const c of chiave) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return COLORI_AUTORE[h % COLORI_AUTORE.length];
}
