// Categorie del settore giovanile (FIGC) e abbinamento giocatore ↔ gara.
// L'"età sportiva" è l'età che il ragazzo compie nell'anno in cui finisce la stagione:
// stagione 2026/27 → un 2013 ha età 14 → Under 14; un 2014 ha età 13 → Esordienti.
import { normalizza } from '@/lib/utili';

/** Anno in cui finisce la stagione in corso (la stagione parte a luglio) */
export function fineStagione(oggi = new Date()) {
  return oggi.getMonth() >= 6 ? oggi.getFullYear() + 1 : oggi.getFullYear();
}

/** Categoria in cui gioca di norma un'annata, nella stagione che finisce in `fine`,
 *  sempre con l'anno: "Under 17 - 2010", "Esordienti - 2014" */
export function categoriaDaAnnata(annata: number, fine = fineStagione()) {
  const eta = fine - annata;
  const nome =
    eta >= 18 ? 'Juniores'
    : eta >= 14 ? `Under ${eta}`
    : eta >= 12 ? 'Esordienti'
    : eta >= 10 ? 'Pulcini'
    : eta >= 8 ? 'Primi calci'
    : 'Piccoli amici';
  return `${nome} - ${annata}`;
}

type Intervallo = { min: number; max: number };

/** Età sportive ammesse da un testo di categoria ("U14", "Under 15 Regionali", "Giovanissimi",
 *  "Esordienti 2014", "Pulcini 2016/2017"…). null = non si capisce: meglio non escludere nessuno. */
export function etaDaCategoria(testo: string | null | undefined, fine = fineStagione()): Intervallo | null {
  if (!testo) return null;
  const t = testo.toLowerCase();
  // Annate scritte per esteso: sono le più precise
  const anni = [...t.matchAll(/\b(19[89]\d|20[0-3]\d)\b/g)].map((m) => fine - Number(m[1]));
  if (anni.length) return { min: Math.min(...anni), max: Math.max(...anni) };
  const under = t.match(/\b(?:u|under)\s*-?\s*(\d{1,2})\b/);
  if (under) return { min: Number(under[1]), max: Number(under[1]) };
  const n = normalizza(t);
  if (n.includes('juniores') || n.includes('primavera')) return { min: 18, max: 19 };
  if (n.includes('allievi')) return n.includes('fascia b') || /\bb\b/.test(t) ? { min: 16, max: 16 } : { min: 16, max: 17 };
  if (n.includes('giovanissimi')) return n.includes('fascia b') || /\bb\b/.test(t) ? { min: 14, max: 14 } : { min: 14, max: 15 };
  if (n.includes('esordienti')) return { min: 12, max: 13 };
  if (n.includes('pulcini')) return { min: 10, max: 11 };
  if (n.includes('primicalci')) return { min: 8, max: 9 };
  if (n.includes('piccoliamici')) return { min: 5, max: 7 };
  return null;
}

export type GiocatoreSquadra = { annata: number; categoria: string | null; societa_id: string | null };
export type GaraSquadre = { categoria: string; casa_id: string | null; trasferta_id: string | null };

/** Età sportiva del giocatore: dalla categoria scritta a mano (se gioca sotto età) o dall'annata */
export function etaGiocatore(g: GiocatoreSquadra, fine = fineStagione()): Intervallo {
  const scritta = etaDaCategoria(g.categoria, fine);
  const eta = fine - g.annata;
  return scritta ?? { min: eta, max: eta };
}

/** Il giocatore gioca in questa gara? Stessa società (casa o trasferta) e categoria compatibile */
export function giocaInGara(g: GiocatoreSquadra, gara: GaraSquadre, fine = fineStagione()) {
  if (!g.societa_id || (g.societa_id !== gara.casa_id && g.societa_id !== gara.trasferta_id)) return false;
  const ammesse = etaDaCategoria(gara.categoria, fine);
  if (!ammesse) return true;
  const sua = etaGiocatore(g, fine);
  return sua.max >= ammesse.min && sua.min <= ammesse.max;
}
