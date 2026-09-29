// Modifiche voce per voce a un documento del Portale (usate da modificaDoc in app/(aree)/docs-actions.ts):
// in `lista` si mette o sostituisce la voce con quell'id, oppure la si toglie (voce null). Il resto del documento resta com'è.
export type Voce = { id: string } & Record<string, unknown>;
export type Modifica = { lista: string; id: string; voce: Voce | null };

export function applicaModifiche(base: Record<string, unknown> | null, modifiche: Modifica[]) {
  const nuovo: Record<string, unknown> = { ...(base ?? {}) };
  for (const m of modifiche) {
    const elenco = ((nuovo[m.lista] as Voce[] | undefined) ?? []).slice();
    const i = elenco.findIndex((x) => x?.id === m.id);
    if (m.voce) { if (i >= 0) elenco[i] = m.voce; else elenco.push(m.voce); } else if (i >= 0) elenco.splice(i, 1);
    nuovo[m.lista] = elenco;
  }
  return nuovo;
}
