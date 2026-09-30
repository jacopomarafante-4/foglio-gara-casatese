// Società → Squadre (tappa 3; era viewSquadre nel Portale): le squadre in `shared/teams` con i loro mister e PIN.
// Ogni cambio è un'operazione applicata alla versione più recente del documento (cambiaSquadre in app/(aree)/docs-actions.ts),
// così due persone che toccano squadre diverse non si cancellano a vicenda. Funzioni pure, provate in tests/.

export type MisterSquadra = { id: string; name: string; code: string; eta?: number[] };
export type SquadraSocieta = {
  id: string; name: string; category?: string; coach?: string; code?: string; coaches: MisterSquadra[];
  vedeTutte?: boolean; organizza?: boolean;
} & Record<string, unknown>;

export type OpSquadre =
  | { tipo: 'aggiungiSquadra'; id: string }
  | { tipo: 'eliminaSquadra'; id: string }
  | { tipo: 'campo'; id: string; campo: 'name' | 'category'; valore: string }
  | { tipo: 'flag'; id: string; flag: 'vedeTutte' | 'organizza'; valore: boolean }
  | { tipo: 'disattivaPinSquadra'; id: string }
  | { tipo: 'aggiungiMister'; id: string; mister: string }
  | { tipo: 'nomeMister'; id: string; mister: string; valore: string }
  | { tipo: 'etaMister'; id: string; mister: string; valore: string }
  | { tipo: 'pinMister'; id: string; mister: string }
  | { tipo: 'togliMister'; id: string; mister: string };

/** Le squadre di prima avevano solo il testo "coach" ("Nome, Nome"): diventa l'elenco, senza PIN (come withCoaches del Portale) */
export function conMister(t: Record<string, unknown>): SquadraSocieta {
  const s = { ...t } as SquadraSocieta;
  if (!Array.isArray(s.coaches)) {
    s.coaches = String(s.coach ?? '').split(',').map((x) => x.trim()).filter(Boolean).map((name, i) => ({ id: 'm' + i, name, code: '' }));
  }
  return s;
}

/** PIN già usati da squadre e mister (i PIN delle squadre sono di 4 cifre; staff 6, famiglie 8) */
export function pinUsati(squadre: SquadraSocieta[]): Set<string> {
  return new Set(squadre.flatMap((t) => [t.code, ...(t.coaches ?? []).map((c) => c.code)]).filter((x): x is string => !!x));
}

/** "15, 14 e 11" → [15, 14, 11]: le categorie dei portieri di un preparatore */
export function leggiEta(s: string): number[] {
  return [...new Set((s.match(/\d{1,2}/g) ?? []).map(Number))];
}

/** La stessa persona, scritta "Rossi Mario" o "Mario  Rossi": parole senza accenti né maiuscole, in ordine ('' se manca) */
export function chiaveNome(nome?: string | null): string {
  return String(nome ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().split(/[^a-z0-9']+/).filter(Boolean).sort().join(' ');
}

/** Applica l'operazione e restituisce il nuovo elenco (null se non cambia nulla). `nuovoPin` dà il PIN della persona
 *  (0050: un PIN per persona: quello che ha già da mister di un'altra squadra, il suo PIN personale se è anche staff, o uno
 *  nuovo) e lo si mette su tutte le sue righe da mister, in ogni squadra; può fermare l'operazione lanciando un errore.
 *  I testi si prendono come sono (la pagina lo applica mentre si scrive): gli spazi in più li toglie chi salva (senzaSpazi) */
export function applicaOpSquadre(items: SquadraSocieta[], op: OpSquadre,
  nuovoPin: (usati: Set<string>, persona: { nome: string; attuale: string; altri: string[] }) => string): SquadraSocieta[] | null {
  const squadre = items.map(conMister);
  if (op.tipo === 'aggiungiSquadra') {
    if (squadre.some((t) => t.id === op.id)) return null;
    return [...squadre, { id: op.id, name: 'Nuova squadra', category: '', coach: '', code: '', coaches: [] }];
  }
  const i = squadre.findIndex((t) => t.id === op.id);
  if (i < 0) return null;
  if (op.tipo === 'eliminaSquadra') return squadre.filter((t) => t.id !== op.id);

  const t: SquadraSocieta = { ...squadre[i], coaches: squadre[i].coaches.map((c) => ({ ...c })) };
  const riassunto = () => { t.coach = t.coaches.map((c) => c.name).filter(Boolean).join(', '); };
  const mister = 'mister' in op ? t.coaches.find((c) => c.id === op.mister) : undefined;
  switch (op.tipo) {
    case 'campo': t[op.campo] = op.valore; break;
    case 'flag': if (op.valore) t[op.flag] = true; else delete t[op.flag]; break;
    case 'disattivaPinSquadra': delete t.code; break;
    case 'aggiungiMister':
      if (mister) return null;
      t.coaches.push({ id: op.mister, name: '', code: '' }); break;
    case 'nomeMister':
      if (!mister) return null;
      mister.name = op.valore; riassunto(); break;
    case 'etaMister':
      if (!mister) return null;
      mister.eta = leggiEta(op.valore); break;
    case 'pinMister': {
      if (!mister) return null;
      const chiave = chiaveNome(mister.name);
      // le altre righe della stessa persona (altre squadre), per riusare il suo PIN e darlo a tutte
      const stessa = (squadra: string, c: MisterSquadra) => !(squadra === t.id && c.id === mister.id) && !!chiave && chiaveNome(c.name) === chiave;
      const altri = [...new Set(squadre.flatMap((x) => x.coaches.filter((c) => stessa(x.id, c)).map((c) => c.code)).filter(Boolean))];
      const pin = nuovoPin(pinUsati(squadre), { nome: mister.name, attuale: mister.code, altri });
      mister.code = pin;
      return squadre.map((x, j) => (j === i ? t : x)).map((x) => (x.coaches.some((c) => stessa(x.id, c))
        ? { ...x, coaches: x.coaches.map((c) => (stessa(x.id, c) ? { ...c, code: pin } : c)) } : x));
    }
    case 'togliMister':
      if (!mister) return null;
      t.coaches = t.coaches.filter((c) => c !== mister); riassunto(); break;
  }
  return squadre.map((x, j) => (j === i ? t : x));
}

/** Prima di salvare: nomi e categorie senza spazi in più */
export function senzaSpazi(op: OpSquadre): OpSquadre {
  return 'valore' in op && typeof op.valore === 'string' ? { ...op, valore: op.valore.replace(/\s+/g, ' ').trim() } : op;
}
