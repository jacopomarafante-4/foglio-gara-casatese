// Documenti del Portale (tabella docs) letti dalle pagine dell'app (tappa 3), con i permessi di chi è entrato:
// mister con la tessera → funzioni coach_* col PIN; admin, direttori → tabella docs (RLS). Solo sul server.
import { getProfilo } from '@/lib/auth';
import { getMister, type Mister } from '@/lib/mister';
import { filtraSquadreDirettore, type Profilo } from '@/lib/ruoli';
import { createClient } from '@/lib/supabase/server';
import { etaSquadra, type Evento, type Impegno, type Partita, type SquadraCal } from '@/lib/programma';
import type { FoglioConvocazioni } from '@/lib/calendario-portale';

/** `mister` = mister entrato col PIN (senza account); `misterDi` = staff (non admin) che è anche mister: stesso PIN personale,
 *  tessera data all'accesso (0050). Nelle sue squadre scrive come un mister, per il resto è staff */
export type Chi = { profilo: Profilo | null; mister: Mister | null; misterDi?: Mister | null };
type Dati = Record<string, unknown> & { items?: unknown[]; matches?: unknown[] };

/** Chi è entrato: un account (profilo) o un mister con la tessera */
export async function chiEntra(): Promise<Chi> {
  const profilo = await getProfilo();
  if (!profilo) return { profilo, mister: await getMister() };
  return { profilo, mister: null, misterDi: profilo.ruolo === 'admin' ? null : await getMister() };
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

/** Filtra un elenco di squadre secondo le squadre assegnate a un direttore (lib/ruoli.ts, 0053); con gli altri ruoli non tocca nulla */
export function filtraSquadre<T extends { id: string }>(chi: Chi, lista: T[]): T[] {
  return filtraSquadreDirettore(chi.profilo, lista);
}

/** Squadre del Portale viste da chi è entrato (per il mister le dà coach_get: tutte per organizzativo e preparatori, se no la sua).
 *  Per un direttore con squadre limitate (0053), solo le sue. */
export async function squadreDelPortale(chi: Chi) {
  const d = (await leggiDocs(chi, ['shared/teams']))['shared/teams'];
  const tutte = ((d?.items ?? []) as { id: string; name?: string; category?: string; organizza?: boolean; vedeTutte?: boolean; coaches?: { name?: string; eta?: number[] }[] }[]);
  return filtraSquadre(chi, tutte);
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

/** Squadra della pagina: quella del mister, o per admin e direttori quella scelta (?squadra=, se no la prima; mai
 *  l'Organizzazione). `squadre` = l'elenco da scegliere (vuoto per i mister) */
export async function squadraDellaPagina(chi: Chi, scelta?: string): Promise<{ squadre: SquadraCal[]; squadra: SquadraCal | undefined }> {
  if (chi.mister?.squadra.vedeTutte) {
    // preparatori dei portieri: le rose di tutte le squadre (in lettura, 0028), per segnare i portieri (coach_portiere, 0050)
    // prima la propria (presenze dei portieri), poi le altre in sola lettura
    const mia = chi.mister.squadra.id;
    const tutte = (await squadreDelPortale(chi)).filter((t) => !t.organizza).map((t) => ({ ...t, matches: [] as Partita[] }))
      .sort((a, b) => Number(b.id === mia) - Number(a.id === mia));
    return { squadre: tutte, squadra: tutte.find((t) => t.id === scelta) ?? tutte[0] };
  }
  if (chi.mister) {
    // mister di più squadre (un PIN, 0050): si sceglie quale aprire (cookie acm_squadra, /api/squadra)
    const sue = chi.mister.squadre.filter((t) => !t.organizza).map((t) => ({ ...t, matches: [] as Partita[] }));
    return { squadre: sue.length > 1 ? sue : [], squadra: { ...chi.mister.squadra, matches: [] } };
  }
  const squadre = (await squadreDelPortale(chi)).filter((t) => !t.organizza).map((t) => ({ ...t, matches: [] }));
  // staff che è anche mister: di norma si apre la sua squadra
  const sua = squadre.find((t) => chi.misterDi?.squadre.some((m) => m.id === t.id));
  return { squadre, squadra: squadre.find((t) => t.id === scelta) ?? sua ?? squadre[0] };
}

/** Risposte delle famiglie alle convocazioni ("ci sarà / non ci sarà", 0031): chiave "<giocatore>|<partita>" (partita = id nel
 *  calendario o "data|avversario"). Il mister col PIN (coach_risposte), admin e direttori dal database (RLS) */
export async function risposteFamiglie(chi: Chi, squadraId: string) {
  const supabase = await createClient();
  type Riga = { giocatore_id: string; partita: string; risposta: 'si' | 'no'; nota?: string };
  let righe: Riga[] = [];
  if (chi.mister) {
    const { data } = await supabase.rpc('coach_risposte', { p_pin: chi.mister.pin });
    righe = (data ?? []) as Riga[];
  } else if (chi.profilo) {
    const { data } = await supabase.from('risposte_convocazioni').select('partita, risposta, nota, tesserati!inner(squadra_id, giocatore_id)').eq('tesserati.squadra_id', squadraId);
    righe = ((data ?? []) as unknown as { partita: string; risposta: 'si' | 'no'; nota?: string; tesserati: { giocatore_id: string } }[])
      .map((r) => ({ giocatore_id: r.tesserati.giocatore_id, partita: r.partita, risposta: r.risposta, nota: r.nota }));
  }
  return Object.fromEntries(righe.map((r) => [`${r.giocatore_id}|${r.partita}`, { risposta: r.risposta, nota: r.nota }]));
}
