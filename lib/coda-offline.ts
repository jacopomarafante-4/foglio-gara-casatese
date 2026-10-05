'use client';
// Lavoro senza rete (a bordo campo): ogni modifica salvata con useSalva (presenze, tabellini, calendario, avvisi…) si scrive
// prima sul telefono (localStorage) e poi si manda al server; se la rete manca resta qui e riparte da sola quando torna
// (InviaInSospeso, montato nell'intestazione). Le modifiche sono voce per voce per id (modificaDoc): rimandarle due volte non fa
// danni. Ogni voce ricorda di chi è (`proprietario`): su un telefono usato da due persone non si mandano le modifiche dell'altra.
import { modificaDoc } from '@/app/(aree)/docs-actions';
import type { Modifica } from '@/lib/modifiche';

const CHIAVE = 'acm_coda';
const SCADENZA = 7 * 24 * 3600 * 1000;   // una settimana: poi la modifica è troppo vecchia per avere senso
type Voce = { m: Modifica; t: number; chi: string };
type Coda = Record<string, Record<string, Voce>>;   // path → "lista|id" → voce

let proprietario = '';
const ascolta = new Set<() => void>();

export function impostaProprietario(chi: string) { proprietario = chi; }
export function alCambio(f: () => void) { ascolta.add(f); return () => { ascolta.delete(f); }; }

function leggi(): Coda {
  try { return JSON.parse(localStorage.getItem(CHIAVE) || '{}') as Coda; } catch { return {}; }
}
function scrivi(c: Coda) {
  try {
    for (const p of Object.keys(c)) if (!Object.keys(c[p]).length) delete c[p];
    if (Object.keys(c).length) localStorage.setItem(CHIAVE, JSON.stringify(c)); else localStorage.removeItem(CHIAVE);
  } catch { /* spazio pieno o navigazione privata: si lavora solo in memoria, come prima */ }
  ascolta.forEach((f) => f());
}

/** Mette le modifiche nella coda del telefono (sopra a quelle vecchie della stessa voce) */
export function accoda(path: string, modifiche: Modifica[]) {
  const c = leggi();
  const t = Date.now();
  c[path] ??= {};
  for (const m of modifiche) c[path][`${m.lista}|${m.id}`] = { m, t, chi: proprietario };
  scrivi(c);
}

/** Quante modifiche di chi è entrato aspettano la rete */
export function inAttesa(): number {
  return Object.values(leggi()).reduce((n, v) => n + Object.values(v).filter((x) => x.chi === proprietario).length, 0);
}

/** Rifiuti che non cambiano riprovando (messaggi di lib/aggiorna-doc.ts e modificaDoc) */
export const rifiutoDefinitivo = (errore?: string) => /permesso|non consentito|non validi/i.test(errore ?? '');

const inCorso = new Set<string>();
/** Manda al server le modifiche in coda di un documento (o di tutti). `rete` = false se il server non si raggiunge:
 *  la coda resta. Un rifiuto del server (permessi, documento non valido) toglie le modifiche: riprovare non servirebbe. */
export async function invia(soloPath?: string): Promise<{ rete: boolean; errore?: string }> {
  // le voci troppo vecchie si buttano; quelle di un'altra persona restano finché non rientra lei (o scadono)
  const c = leggi();
  const adesso = Date.now();
  for (const path of Object.keys(c)) for (const [k, v] of Object.entries(c[path])) if (adesso - v.t > SCADENZA) delete c[path][k];
  scrivi(c);
  let esito: { rete: boolean; errore?: string } = { rete: true };
  for (const path of Object.keys(c)) {
    if (soloPath && path !== soloPath) continue;
    const mie = Object.entries(c[path] ?? {}).filter(([, v]) => v.chi === proprietario);
    if (!mie.length || inCorso.has(path)) continue;
    inCorso.add(path);
    try {
      const r = await modificaDoc(path, mie.map(([, v]) => v.m)).catch(() => null);
      if (!r) { esito = { rete: false }; continue; }
      // salvate, o rifiutate per sempre (permessi, dati non validi): via dalla coda; accesso scaduto o un intoppo del
      // server: restano e ripartono dopo (rimettendo il PIN, o al prossimo tentativo)
      if (r.ok || rifiutoDefinitivo(r.errore)) {
        const ora = leggi();
        for (const [k, v] of mie) if (ora[path]?.[k]?.t === v.t) delete ora[path][k];   // solo se non cambiate nel frattempo
        scrivi(ora);
      }
      if (!r.ok) esito = { rete: true, errore: r.errore };
    } finally { inCorso.delete(path); }
  }
  return esito;
}
