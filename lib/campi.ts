// Campi di gioco e link di Google Maps (come venueKey, parseLL, venueQuery, venueUrl, luogoUrl di schede.js).
// La posizione esatta del cancello si salva una volta per campo in registro/<squadra>.venues e vale per tutte le partite lì.
export type PosizioneCampo = { name?: string; ll?: string; url?: string };
export type Campi = Record<string, PosizioneCampo>;

export const chiaveCampo = (v?: string) => (v || '').trim().toLowerCase().replace(/\s+/g, ' ');
/** Coordinate da "45.69, 9.40" o da un link di Google Maps → "45.690000,9.400000"; null se non ci sono */
export function leggiCoordinate(v?: string) {
  const t = String(v || '');
  const m = t.match(/^\s*(-?\d{1,2}\.\d+)\s*[,;\s]\s*(-?\d{1,3}\.\d+)\s*$/)
    || t.match(/!3d(-?\d{1,2}\.\d+)!4d(-?\d{1,3}\.\d+)/)
    || t.match(/@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/)
    || t.match(/[?&](?:q|query|ll|destination)=(-?\d{1,2}\.\d+)(?:,|%2C)\s*(-?\d{1,3}\.\d+)/i);
  return m ? `${(+m[1]).toFixed(6)},${(+m[2]).toFixed(6)}` : null;
}
const ricerca = (q: string) => (q ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q) : '');
const destinazione = (ll: string) => 'https://www.google.com/maps/dir/?api=1&destination=' + ll;
/** "C.S. Comunale Campo 2 - Cernusco Lombardone" → "Centro Sportivo Comunale, Cernusco Lombardone" */
export function campoPerRicerca(v: string) {
  const i = v.lastIndexOf(' - ');
  let nome = i > 0 ? v.slice(0, i) : v, paese = i > 0 ? v.slice(i + 3) : '';
  nome = nome.replace(/\bC\.\s?S\./g, 'Centro Sportivo').replace(/\bCom\./g, 'Comunale').replace(/\bSport\./g, 'Sportivo')
    .replace(/\s*(Campo\s*)?N\.\s*\d+/gi, '').replace(/\s+Campo\s+\d+$/i, '').trim();
  paese = paese.replace(/\s*\(.*?\)/g, '').replace(/\s+Fraz\..*$/i, '').trim();
  return paese ? `${nome}, ${paese}` : nome;
}
export const posizioneDi = (campi: Campi | undefined, v?: string) => (campi ?? {})[chiaveCampo(v)] ?? null;
/** Link al campo: posizione salvata, se no coordinate scritte nel nome, se no ricerca col nome ripulito */
export function linkCampo(campi: Campi | undefined, v?: string) {
  const t = (v || '').trim(); if (!t) return '';
  const pin = posizioneDi(campi, t), ll = leggiCoordinate(t) || pin?.ll;
  if (ll) return destinazione(ll);
  if (pin?.url) return pin.url;
  return ricerca(campoPerRicerca(t));
}
/** Link al campo di una partita del calendario (con indirizzo e coordinate): prima la posizione salvata dal mister */
export function linkLuogo(campi: Campi | undefined, l: { venue?: string; address?: string; ll?: string }) {
  if (!l.venue) return '';
  const pin = posizioneDi(campi, l.venue);
  if (pin?.ll) return destinazione(pin.ll);
  if (pin?.url) return pin.url;
  if (l.ll) return destinazione(l.ll);
  return ricerca([campoPerRicerca(l.venue), l.address].filter(Boolean).join(', '));
}
