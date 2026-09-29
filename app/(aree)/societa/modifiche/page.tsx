// Società → Storico modifiche (0048; nell'app dalla tappa 3), solo admin: per ogni scheda del Portale le versioni precedenti
// degli ultimi 30 giorni (al massimo una ogni 10 minuti), con chi le aveva salvate. "Ripristina" la rimette come nuova versione.
import { redirect } from 'next/navigation';
import { getProfilo } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Avviso } from '@/components/Avviso';
import { Conferma } from '@/components/Conferma';
import { ripristinaVersione } from '../actions';

type Scheda = { path: string; versione: number; updated_at: string | null; modificato_da: string | null };
type Versione = { id: number; path: string; versione: number; salvato_il: string | null; da: string | null; sostituita: string };
type Squadra = { id: string; name?: string; category?: string };

const quando = (d: string | null) => d
  ? new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(d))
  : '–';
const TIPI: Record<string, string> = { roster: 'Rosa', registro: 'Presenze, partite e test', sheet: 'Foglio gara e convocazioni', calendar: 'Calendario' };
const CONDIVISI: Record<string, string> = { teams: 'Squadre, mister e PIN', schemes: 'Calci piazzati della società', eventi: 'Eventi', avvisi: 'Avvisi' };

export default async function StoricoModifiche({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const profilo = await getProfilo();
  if (!profilo) redirect('/portale/');   // mister con la tessera: qui non entra
  if (profilo.ruolo !== 'admin') redirect('/societa/archivio');
  const { ok, errore, aperta } = await searchParams;
  const supabase = await createClient();
  const [docs, storico, squadre] = await Promise.all([
    supabase.from('docs').select('path, versione, updated_at, modificato_da'),
    supabase.from('docs_storico').select('id, path, versione, salvato_il, da, sostituita').order('sostituita', { ascending: false }).limit(3000),
    supabase.from('docs').select('data').eq('path', 'shared/teams').maybeSingle(),
  ]);
  const elencoSquadre = ((squadre.data?.data as { items?: Squadra[] } | null)?.items) ?? [];
  const nome = (path: string) => {
    const [tipo, id] = path.split('/');
    if (tipo === 'shared') return CONDIVISI[id] ?? id;
    const t = elencoSquadre.find((x) => x.id === id);
    return `${TIPI[tipo] ?? tipo} · ${t ? t.category || t.name : id}`;
  };
  const versioni = new Map<string, Versione[]>();
  for (const v of (storico.data as Versione[] | null) ?? []) versioni.set(v.path, [...(versioni.get(v.path) ?? []), v]);
  /* schede attuali e, se una non si legge (permessi della tabella docs), almeno quelle con versioni nello storico */
  const attuali = (docs.data as Scheda[] | null) ?? [];
  const schede = [...attuali, ...[...versioni.keys()].filter((p) => !attuali.some((d) => d.path === p))
    .map((path) => ({ path, versione: 0, updated_at: versioni.get(path)![0].sostituita, modificato_da: null }))]
    .sort((a, b) => (b.updated_at ?? '').localeCompare(a.updated_at ?? ''));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-4xl font-bold">Storico modifiche</h1>
        <p className="mt-1 max-w-prose text-grigio">
          Se una modifica nel Portale è sbagliata o è andata persa, qui ci sono le versioni precedenti di ogni scheda degli ultimi
          30 giorni (al massimo una ogni 10 minuti). <b>Ripristina</b> rimette quella versione; quella di adesso resta nello storico,
          quindi si può tornare indietro.
        </p>
      </div>
      <Avviso ok={ok} errore={errore} />
      {(docs.error || storico.error) && <p className="text-rosso">Storico non disponibile: {(docs.error || storico.error)?.message}</p>}
      <ul className="space-y-2">
        {schede.map((d) => {
          const vv = versioni.get(d.path) ?? [];
          return (
            <li key={d.path}>
              <details open={aperta === d.path} className="group rounded-xl border border-linea bg-white">
                <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 px-4 py-3">
                  <span>
                    <b className="block">{nome(d.path)}</b>
                    <span className="text-sm text-grigio">Ultima modifica {quando(d.updated_at)}{d.modificato_da ? ` · ${d.modificato_da}` : ''}</span>
                  </span>
                  <span className="text-sm text-grigio">
                    {vv.length ? `${vv.length} ${vv.length === 1 ? 'versione' : 'versioni'} prima` : 'nessuna versione prima'}
                    <span className="ml-1 inline-block transition group-open:rotate-90" aria-hidden>›</span>
                  </span>
                </summary>
                {vv.length ? (
                  <ul className="divide-y divide-linea border-t border-linea px-4">
                    {vv.map((v) => (
                      <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                        <span>{quando(v.salvato_il)}{v.da ? ` · ${v.da}` : ''}<span className="text-grigio"> · sostituita {quando(v.sostituita)}</span></span>
                        <form action={ripristinaVersione}>
                          <input type="hidden" name="id" value={v.id} />
                          <input type="hidden" name="path" value={d.path} />
                          <Conferma domanda={`Rimettere "${nome(d.path)}" com’era ${quando(v.salvato_il)}? La versione di adesso resta nello storico.`}
                            className="rounded-lg border border-blu px-3 py-1 font-semibold text-blu hover:bg-blu/5">Ripristina</Conferma>
                        </form>
                      </li>
                    ))}
                  </ul>
                ) : <p className="border-t border-linea px-4 py-2 text-sm text-grigio">Nessuna versione precedente negli ultimi 30 giorni.</p>}
              </details>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
