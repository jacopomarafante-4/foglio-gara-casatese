// Presenze della squadra dei preparatori dei portieri (vedeTutte, 0028): i portieri divisi secondo le categorie assegnate a
// ogni preparatore (coaches[].eta, Società → "Portieri di: Under"). La categoria di un portiere = quella della squadra nella cui
// rosa c'è lo stesso nome (come scripts/import-adb/portieri.mjs); se è in più rose, la più giovane. Funzioni pure, provate in
// tests/portieri.test.mjs.
import { chiaveNome } from '@/lib/squadre-societa';
import { etaSquadra } from '@/lib/programma';

type Persona = { id: string; name: string };
export type RosaSquadra = { category?: string; name?: string; players: { name: string }[] };
export type Preparatore = { name?: string; eta?: number[] };
export type GruppoPortieri = { chiave: string; titolo: string; eta: number[]; ids: string[] };

/** Età della categoria di ogni portiere (id → 15 per l'Under 15); chi non si trova in nessuna rosa non c'è */
export function categorieDeiPortieri(portieri: Persona[], rose: RosaSquadra[]): Record<string, number> {
  const perNome = new Map<string, number>();
  for (const r of rose) {
    const eta = etaSquadra(r);
    if (eta >= 99) continue;
    for (const p of r.players) {
      const k = chiaveNome(p.name);
      if (k && !(perNome.get(k)! <= eta)) perNome.set(k, eta);
    }
  }
  const out: Record<string, number> = {};
  for (const p of portieri) { const e = perNome.get(chiaveNome(p.name)); if (e != null) out[p.id] = e; }
  return out;
}

const elencoEta = (eta: number[]) => eta.map((e) => 'U' + e).join(', ');

/** Un gruppo per preparatore con categorie assegnate (dalla categoria più grande), poi "Altri portieri": chi non è in nessuna
 *  categoria dei preparatori o non si trova nelle rose. Un portiere può stare in due gruppi se due preparatori hanno la sua
 *  categoria. Dentro il gruppo: dalla categoria più grande, poi per nome */
export function gruppiPortieri(portieri: Persona[], etaDi: Record<string, number>, preparatori: Preparatore[]): GruppoPortieri[] {
  const ordina = (ids: string[]) => ids.sort((a, b) => (etaDi[b] ?? 0) - (etaDi[a] ?? 0)
    || (portieri.find((p) => p.id === a)?.name ?? '').localeCompare(portieri.find((p) => p.id === b)?.name ?? '', 'it'));
  const gruppi: GruppoPortieri[] = [];
  const presi = new Set<string>();
  preparatori.forEach((c, i) => {
    const eta = [...new Set(c.eta ?? [])].sort((a, b) => b - a);
    if (!eta.length) return;
    const ids = portieri.filter((p) => eta.includes(etaDi[p.id])).map((p) => p.id);
    ids.forEach((id) => presi.add(id));
    gruppi.push({ chiave: 'p' + i, titolo: `${c.name || 'Preparatore'} · ${elencoEta(eta)}`, eta, ids: ordina(ids) });
  });
  const altri = portieri.filter((p) => !presi.has(p.id)).map((p) => p.id);
  if (altri.length) gruppi.push({ chiave: 'altri', titolo: gruppi.length ? 'Altri portieri' : 'Portieri', eta: [], ids: ordina(altri) });
  return gruppi;
}
