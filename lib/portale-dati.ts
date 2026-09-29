// Documenti del Portale (tabella docs) letti dalle pagine dell'app (tappa 3), con i permessi di chi è entrato:
// mister con la tessera → funzioni coach_* col PIN; admin, direttori → tabella docs (RLS). Solo sul server.
import { getProfilo } from '@/lib/auth';
import { getMister, type Mister } from '@/lib/mister';
import type { Profilo } from '@/lib/ruoli';
import { createClient } from '@/lib/supabase/server';
import { etaSquadra, type Evento, type Impegno, type Partita, type SquadraCal } from '@/lib/programma';
import type { FoglioConvocazioni } from '@/lib/calendario-portale';

export type Chi = { profilo: Profilo | null; mister: Mister | null };
type Dati = Record<string, unknown> & { items?: unknown[]; matches?: unknown[] };

/** Chi è entrato: un account (profilo) o un mister con la tessera */
export async function chiEntra(): Promise<Chi> {
  const profilo = await getProfilo();
  return { profilo, mister: profilo ? null : await getMister() };
}

/** Admin, direttori e responsabile organizzativo: calendari di tutte le squadre, eventi, avvisi (puoOrganizzare del Portale) */
export const organizza = (chi: Chi) => chi.profilo?.ruolo === 'admin' || chi.profilo?.ruolo === 'direttore' || !!chi.mister?.squadra.organizza;

/** Legge più documenti: quelli non permessi o assenti tornano null */
export async function leggiDocs(chi: Chi, paths: string[]): Promise<Record<string, Dati | null>> {
  const supabase = await createClient();
  const out: Record<string, Dati | null> = Object.fromEntries(paths.map((p) => [p, null]));
  if (chi.mister) {
    const pin = chi.mister.pin;
    await Promise.all(paths.map(async (p) => {
      const { data } = await supabase.rpc('coach_get', { p_pin: pin, p_path: p });
      out[p] = (data as Dati | null) ?? null;
    }));
  } else if (chi.profilo) {
    const { data } = await supabase.from('docs').select('path, data').in('path', paths);
    (data ?? []).forEach((d) => { out[d.path] = d.data as Dati; });
  }
  return out;
}

/** Squadre del Portale viste da chi è entrato (per il mister le dà coach_get: tutte per organizzativo e preparatori, se no la sua) */
export async function squadreDelPortale(chi: Chi) {
  const d = (await leggiDocs(chi, ['shared/teams']))['shared/teams'];
  return ((d?.items ?? []) as { id: string; name?: string; category?: string; organizza?: boolean; vedeTutte?: boolean; coaches?: { name?: string; eta?: number[] }[] }[]);
}

/** Calendari di tutte le squadre ed eventi della società. Mister: coach_calendari (nome, categoria e partite di tutte) più
 *  le amichevoli del suo registro; admin e direttori: i documenti calendar/*. `errore` se i calendari non si leggono */
export async function calendariTutti(chi: Chi): Promise<{ squadre: SquadraCal[]; eventi: Evento[]; errore: string }> {
  const supabase = await createClient();
  if (chi.mister) {
    const m = chi.mister;
    const [cal, docs, teams] = await Promise.all([
      supabase.rpc('coach_calendari', { p_pin: m.pin }),
      leggiDocs(chi, ['shared/eventi', 'registro/' + m.squadra.id]),
      squadreDelPortale(chi),
    ]);
    const amichevoli = ((docs['registro/' + m.squadra.id]?.friendlies ?? []) as Partita[]).map((x) => ({ ...x, friendly: true, daRegistro: true }));
    const flag = (id: string) => teams.find((t) => t.id === id) ?? (id === m.squadra.id ? m.squadra : undefined);
    const squadre = ((cal.data ?? []) as SquadraCal[]).map((t) => ({
      ...t, organizza: flag(t.id)?.organizza, vedeTutte: flag(t.id)?.vedeTutte, coaches: flag(t.id)?.coaches,
      matches: [...(t.matches ?? []), ...(t.id === m.squadra.id ? amichevoli : [])],
    }));
    return { squadre, eventi: (docs['shared/eventi']?.items ?? []) as Evento[], errore: cal.error?.message ?? '' };
  }
  const { data, error } = await supabase.from('docs').select('path, data')
    .or('path.eq.shared/teams,path.eq.shared/eventi,path.like.calendar/%');
  const doc = (p: string) => data?.find((d) => d.path === p)?.data;
  const squadre = ((doc('shared/teams')?.items ?? []) as SquadraCal[]).map((t) => ({ ...t, matches: (doc('calendar/' + t.id)?.matches ?? []) as Partita[] }));
  return { squadre, eventi: (doc('shared/eventi')?.items ?? []) as Evento[], errore: error?.message ?? '' };
}

export type Portieri = Record<string, { team: SquadraCal; gk: { id: string; name: string }[]; foglio: FoglioConvocazioni }>;
/** Preparatori dei portieri (squadra con vedeTutte): partite delle squadre delle loro categorie (coaches[].eta del preparatore
 *  entrato; se mancano, tutte) e, per ogni squadra, i portieri della rosa (registro.gk) e il foglio con le convocazioni */
export async function datiPreparatore(chi: Chi): Promise<{ partite: Impegno[]; portieri: Portieri; eta: number[] | null }> {
  const m = chi.mister!;
  const eta = (m.squadra.coaches ?? []).find((c) => c.name && c.name === m.nome)?.eta;
  const etaOk = Array.isArray(eta) && eta.length ? eta : null;
  const { squadre } = await calendariTutti(chi);
  const scelte = squadre.filter((t) => t.id !== m.squadra.id && !t.organizza && !t.vedeTutte && (!etaOk || etaOk.includes(etaSquadra(t))));
  const docs = await leggiDocs(chi, scelte.flatMap((t) => ['roster/' + t.id, 'registro/' + t.id, 'sheet/' + t.id]));
  const portieri: Portieri = {};
  for (const t of scelte) {
    const rosa = (docs['roster/' + t.id]?.players ?? []) as { id: string; name: string }[];
    const gk = ((docs['registro/' + t.id]?.gk ?? []) as string[]).map((id) => rosa.find((p) => p.id === id)).filter(Boolean) as { id: string; name: string }[];
    portieri[t.id] = { team: { ...t, matches: [] }, gk, foglio: (docs['sheet/' + t.id] ?? {}) as FoglioConvocazioni };
  }
  return { partite: scelte.flatMap((t) => t.matches.map((x) => ({ ...x, team: t }))), portieri, eta: etaOk };
}
