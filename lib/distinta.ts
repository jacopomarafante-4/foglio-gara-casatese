// Distinta (Modulistica, tappa 3): sta nel foglio della squadra, sheet/<squadra>.distinta, come nel Portale
// ({tipo, manifestazione, data, luogo, giocatori:{pid:{sel, numero, nascita, tessera}}, staff:[{ruolo, nome, documento}], note}).
export const TIPI_DISTINTA = ['Torneo', 'Amichevole omologata'];
export const RUOLI_STAFF = ['Allenatore', 'Dirigente accompagnatore', 'Preparatore', 'Massaggiatore', 'Medico'];

export type GiocatoreDistinta = { sel?: boolean; numero?: string; nascita?: string; tessera?: string };
export type Distinta = {
  tipo: string; manifestazione: string; data: string; luogo: string;
  giocatori: Record<string, GiocatoreDistinta>; staff: { ruolo: string; nome: string; documento: string }[]; note: string;
};
export type Foglio = { distinta?: Distinta; senzaCategoria?: boolean; lineup?: Record<string, string>; bench?: string[] };

/** Distinta nuova: allenatore = i mister della squadra, come nel Portale */
export const distintaNuova = (allenatori: string): Distinta => ({
  tipo: 'Torneo', manifestazione: '', data: '', luogo: '', giocatori: {},
  staff: [{ ruolo: 'Allenatore', nome: allenatori, documento: '' }, { ruolo: 'Dirigente accompagnatore', nome: '', documento: '' }], note: '',
});

/** Numero di maglia della partita (foglio gara): titolari = numero dello slot (1-11), panchina = 12 + posizione */
export function numeroPartita(f: Foglio, pid: string) {
  const slot = Object.keys(f.lineup ?? {}).find((k) => f.lineup![k] === pid);
  if (slot) return String(+slot);
  const i = (f.bench ?? []).indexOf(pid);
  return i >= 0 ? String(12 + i) : '';
}

/** Categoria nell'intestazione del PDF: senza "Attività di base", vuota se il mister ha tolto la spunta */
export const categoriaDistinta = (categoria: string | undefined, senza: boolean | undefined) =>
  senza ? '' : String(categoria || '').replace(/\s*-\s*attività di base/i, '');

export const nomiMister = (t?: { coaches?: { name?: string }[]; coach?: string }) =>
  (t?.coaches ?? []).map((c) => c.name).filter(Boolean).join(', ') || t?.coach || '';
