// Ripristino da un backup (Società → Squadre → Backup, solo admin): confronto scheda per scheda tra il file di backup
// (esportaBackup: { exportedAt, docs: { path: data } }) e i documenti di oggi. Funzioni pure, provate in tests/ripristino.test.mjs.
export type Backup = { exportedAt?: string; docs: Record<string, unknown> };
export type Confronto = { path: string; nome: string; stato: 'uguale' | 'diverso' | 'manca'; dettaglio: string };

const PERCORSI = /^(shared\/(teams|schemes|eventi|avvisi)|(roster|sheet|calendar|registro)\/[A-Za-z0-9_-]+)$/;
const ELENCHI: [string, string][] = [['players', 'giocatori'], ['matches', 'partite'], ['items', 'voci'], ['trainings', 'allenamenti'], ['games', 'tabellini'],
  ['friendlies', 'amichevoli'], ['schemi', 'schemi']];

/** Il file di backup letto e controllato: solo documenti del Portale con un percorso valido */
export function leggiBackup(testo: string): Backup {
  let j: unknown;
  try { j = JSON.parse(testo); } catch { throw new Error('Non è un file di backup (JSON) valido.'); }
  const docs = (j as Backup)?.docs;
  if (!docs || typeof docs !== 'object' || Array.isArray(docs)) throw new Error('Nel file non ci sono le schede (docs): è un backup dell\'app?');
  const buoni = Object.fromEntries(Object.entries(docs).filter(([p, d]) => PERCORSI.test(p) && d && typeof d === 'object'));
  if (!Object.keys(buoni).length) throw new Error('Nel backup non ci sono schede da ripristinare.');
  return { exportedAt: (j as Backup).exportedAt, docs: buoni };
}

/** Nome leggibile: "Rosa · Under 15" */
export function nomeScheda(path: string, squadre: { id: string; name?: string; category?: string }[]) {
  const [tipo, id] = path.split('/');
  if (tipo === 'shared') return ({ teams: 'Società: squadre e PIN', schemes: 'Modelli dei calci piazzati', eventi: 'Eventi', avvisi: 'Avvisi' } as Record<string, string>)[id] ?? path;
  const s = squadre.find((x) => x.id === id), sq = s?.category || s?.name || id;
  return `${({ roster: 'Rosa', sheet: 'Foglio partita', calendar: 'Calendario', registro: 'Registro (presenze, tabellini, schemi)' } as Record<string, string>)[tipo] ?? tipo} · ${sq}`;
}

/** Ordine stabile delle chiavi, per confrontare due documenti */
const stabile = (v: unknown): unknown => Array.isArray(v) ? v.map(stabile)
  : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v as object).sort().map((k) => [k, stabile((v as Record<string, unknown>)[k])])) : v;
const uguali = (a: unknown, b: unknown) => JSON.stringify(stabile(a)) === JSON.stringify(stabile(b));

export function confronta(backup: Backup, oggi: Record<string, unknown>, squadre: { id: string; name?: string; category?: string }[]): Confronto[] {
  return Object.keys(backup.docs).sort().map((path) => {
    const b = backup.docs[path] as Record<string, unknown>, o = oggi[path] as Record<string, unknown> | undefined;
    const nome = nomeScheda(path, squadre);
    if (!o) return { path, nome, stato: 'manca', dettaglio: 'oggi non c\'è' };
    if (uguali(b, o)) return { path, nome, stato: 'uguale', dettaglio: '' };
    const conti = ELENCHI.filter(([k]) => Array.isArray(b[k]) || Array.isArray(o[k]))
      .map(([k, l]) => { const nb = (b[k] as unknown[] | undefined)?.length ?? 0, no = (o[k] as unknown[] | undefined)?.length ?? 0; return nb === no ? `${l}: ${nb}` : `${l}: ${no} oggi, ${nb} nel backup`; });
    return { path, nome, stato: 'diverso', dettaglio: conti.join(' · ') || 'contenuto diverso' };
  });
}
