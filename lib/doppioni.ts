// Ricerca delle schede doppie dello stesso giocatore (nomi scritti in modi diversi,
// refusi, nome e cognome invertiti). Criteri prudenti: è l'admin a decidere se unirle.
import { normalizza } from '@/lib/utili';

export type Candidato = {
  id: string;
  cognome: string | null;
  nome: string | null;
  descrizione: string | null;
  annata: number;
  societa_id: string | null;
};

/** Distanza di Levenshtein (numero di lettere da cambiare, aggiungere o togliere) */
export function distanza(a: string, b: string) {
  if (a === b) return 0;
  const riga = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prec = riga[0];
    riga[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = riga[j];
      riga[j] = Math.min(riga[j] + 1, riga[j - 1] + 1, prec + (a[i - 1] === b[j - 1] ? 0 : 1));
      prec = tmp;
    }
  }
  return riga[b.length];
}

/** Due parole "quasi uguali": al massimo 1 lettera diversa (2 se lunghe), oppure una è l'inizio dell'altra */
function simili(a: string, b: string) {
  if (!a || !b) return false;
  if (a === b) return true;
  const corta = Math.min(a.length, b.length);
  if (corta >= 4 && (a.startsWith(b) || b.startsWith(a))) return true;
  return distanza(a, b) <= (Math.max(a.length, b.length) >= 7 ? 2 : 1);
}

const n = (s: string | null) => (s ? normalizza(s) : '');
const parole = (g: Candidato) =>
  [g.cognome, g.nome].filter(Boolean).join(' ').split(/\s+/).map(normalizza).filter((p) => p.length >= 3);

/** Perché due schede sembrano lo stesso giocatore (null = non sembrano) */
export function motivoDoppione(a: Candidato, b: Candidato): string | null {
  const stessaSocieta = !a.societa_id || !b.societa_id || a.societa_id === b.societa_id;
  const [ca, cb, na, nb] = [n(a.cognome), n(b.cognome), n(a.nome), n(b.nome)];

  if (ca && cb && ca === cb && na === nb) {
    return a.annata === b.annata ? 'Stesso nome e cognome' : Math.abs(a.annata - b.annata) === 1 ? 'Stesso nome, annata diversa di un anno' : null;
  }
  if (a.annata !== b.annata) return null;

  if (ca && cb) {
    // cognome quasi uguale e nome compatibile (mancante, quasi uguale o abbreviato)
    if (simili(ca, cb) && (!na || !nb || simili(na, nb))) return 'Cognome e nome quasi uguali';
    // nome e cognome invertiti
    if (na && nb && simili(ca, nb) && simili(na, cb)) return 'Nome e cognome invertiti';
  }
  // una scheda con una sola parola (es. solo il nome) contenuta nell'altra, stessa società
  const [pa, pb] = [parole(a), parole(b)];
  if (stessaSocieta && (pa.length === 1 || pb.length === 1) && pa.length && pb.length) {
    const [uno, altra] = pa.length === 1 ? [pa[0], pb] : [pb[0], pa];
    if (altra.some((p) => simili(uno, p))) return 'Un nome solo, contenuto nell’altra scheda';
  }
  return null;
}

/** Coppie di possibili doppioni, escluse quelle già segnate "persone diverse" */
export function trovaDoppioni(giocatori: Candidato[], esclusi: Set<string>) {
  const coppie: { a: Candidato; b: Candidato; motivo: string }[] = [];
  for (let i = 0; i < giocatori.length; i++) {
    for (let j = i + 1; j < giocatori.length; j++) {
      const [a, b] = [giocatori[i], giocatori[j]];
      if (Math.abs(a.annata - b.annata) > 1) continue;
      if (esclusi.has(chiaveCoppia(a.id, b.id))) continue;
      const motivo = motivoDoppione(a, b);
      if (motivo) coppie.push({ a, b, motivo });
    }
  }
  return coppie;
}

/** Chiave di una coppia indipendente dall'ordine (come nella tabella doppioni_esclusi: a < b) */
export function chiaveCoppia(x: string, y: string) {
  return x < y ? `${x}|${y}` : `${y}|${x}`;
}
