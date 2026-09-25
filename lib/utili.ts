// Funzioni di servizio: testi, date, coordinate, distanze

/** "Vibe Ronchese" e "viberonchese" diventano uguali per il confronto */
export function normalizza(s: string) {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/** Testo da un campo di form: stringa pulita oppure null */
export function testo(formData: FormData, chiave: string): string | null {
  const v = formData.get(chiave);
  if (typeof v !== 'string') return null;
  const pulito = v.trim().replace(/\s+/g, ' ');
  return pulito === '' ? null : pulito;
}

/** Testo lungo (mantiene gli a capo) */
export function testoLungo(formData: FormData, chiave: string): string | null {
  const v = formData.get(chiave);
  if (typeof v !== 'string') return null;
  const pulito = v.trim();
  return pulito === '' ? null : pulito;
}

export function intero(formData: FormData, chiave: string): number | null {
  const v = testo(formData, chiave);
  if (!v) return null;
  const n = Number(v);
  return Number.isInteger(n) ? n : null;
}

/** "Cognome Nome" con le iniziali maiuscole (stessa regola di public.nome_proprio(), 0021) */
export function maiuscoleIniziali(s: string | null) {
  if (!s) return null;
  return s.toLowerCase().replace(/(^|[\s'’-])(\p{L})/gu, (_, a, b) => a + b.toUpperCase());
}

/** Accetta "45.6977, 9.3120" (copiato da Google Maps) */
export function leggiCoordinate(s: string | null): { lat: number; lon: number } | null {
  if (!s) return null;
  const m = s.match(/(-?\d{1,2}[.,]\d+)\s*[,; ]\s*(-?\d{1,3}[.,]\d+)/);
  if (!m) return null;
  const lat = Number(m[1].replace(',', '.'));
  const lon = Number(m[2].replace(',', '.'));
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return { lat, lon };
}

/** Distanza in linea d'aria, in km con un decimale */
export function distanzaKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const R = 6371;
  const rad = (x: number) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)) * 10) / 10;
}

const FUSO = 'Europe/Rome';

/**
 * Converte data e ora italiane in un istante preciso.
 * data: "27/09/2026", "27/09/26" o "2026-09-27"; ora: "15:30" o "15.30"
 */
export function istanteItaliano(data: string, ora: string): string | null {
  let a: number, m: number, g: number;
  const iso = data.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  const ita = data.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (iso) [a, m, g] = [+iso[1], +iso[2], +iso[3]];
  else if (ita) [g, m, a] = [+ita[1], +ita[2], +ita[3] < 100 ? 2000 + +ita[3] : +ita[3]];
  else return null;

  const o = ora.match(/^(\d{1,2})[:.](\d{2})$/);
  if (!o) return null;
  const [hh, mm] = [+o[1], +o[2]];
  if (m < 1 || m > 12 || g < 1 || g > 31 || hh > 23 || mm > 59) return null;

  // Calcola lo scarto di fuso (ora legale compresa) per quella data
  const comeUtc = Date.UTC(a, m - 1, g, hh, mm);
  const parti = new Intl.DateTimeFormat('en-US', {
    timeZone: FUSO, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).formatToParts(new Date(comeUtc));
  const p = (t: string) => Number(parti.find((x) => x.type === t)!.value);
  const inItalia = Date.UTC(p('year'), p('month') - 1, p('day'), p('hour'), p('minute'));
  return new Date(comeUtc - (inItalia - comeUtc)).toISOString();
}

export function dataOraBreve(iso: string) {
  return new Date(iso).toLocaleString('it-IT', {
    timeZone: FUSO, weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

export function dataBreve(iso: string) {
  return new Date(iso).toLocaleDateString('it-IT', {
    timeZone: FUSO, day: 'numeric', month: 'short', year: 'numeric',
  });
}

/** Data di oggi in Italia, formato 2026-09-23 (per i campi data) */
export function oggiIso() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: FUSO }).format(new Date());
}

/** Rimuove i caratteri che confondono i filtri di ricerca del database */
export function perRicerca(s: string) {
  return s.replace(/[%,()*\\]/g, ' ').trim();
}

/** Istante di adesso spostato di N ore (negativo = nel passato), per i filtri sulle date */
export function istanteTraOre(ore: number) {
  return new Date(Date.now() + ore * 3600 * 1000).toISOString();
}
