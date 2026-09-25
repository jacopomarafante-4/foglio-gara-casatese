import Link from 'next/link';
import { getProfilo } from '@/lib/auth';
import { gestisce } from '@/lib/ruoli';
import { createClient } from '@/lib/supabase/server';
import { elencoSocieta } from '@/lib/societa';
import { annateDisponibili, RUOLI_CAMPO, STATI, valoreValido, type RuoloCampo, type StatoGiocatore } from '@/lib/tipi';
import { Avviso } from '@/components/Avviso';
import { VistaGiocatori } from '@/components/VistaGiocatori';
import { spostaStato } from '../actions';

type Carta = {
  id: string;
  cognome: string | null;
  nome: string | null;
  descrizione: string | null;
  annata: number;
  ruolo: RuoloCampo | null;
  stato: StatoGiocatore;
  societa: { nome: string } | null;
  segnalazioni: { count: number }[];
};

/** Quante schede per colonna: le altre si vedono dall'elenco filtrato per stato */
const PER_COLONNA = 25;

/** Pipeline a colonne: un giocatore per scheda, una colonna per stato */
export default async function GiocatoriPerStato({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const filtri = await searchParams;
  const profilo = (await getProfilo())!;
  const admin = gestisce(profilo.ruolo);
  const supabase = await createClient();

  let q = supabase
    .from('giocatori')
    .select('id, cognome, nome, descrizione, annata, ruolo, stato, societa(nome), segnalazioni(count)')
    .eq('osservato', true) // i ragazzi visti solo nelle distinte non sono nella pipeline
    .order('updated_at', { ascending: false });
  const annata = Number(filtri.annata);
  if (Number.isInteger(annata) && annata > 0) q = q.eq('annata', annata);
  const ruolo = valoreValido(RUOLI_CAMPO, filtri.ruolo);
  if (ruolo) q = q.eq('ruolo', ruolo);
  if (filtri.societa) q = q.eq('societa_id', filtri.societa);

  const [{ data, error }, societa] = await Promise.all([q, elencoSocieta(supabase)]);
  const carte = (data as unknown as Carta[]) ?? [];
  const perStato = new Map<StatoGiocatore, Carta[]>((Object.keys(STATI) as StatoGiocatore[]).map((s) => [s, []]));
  for (const c of carte) perStato.get(c.stato)?.push(c);

  // Filtri correnti, per tornare qui dopo uno spostamento e per il link "vedi tutti"
  const qs = new URLSearchParams(
    Object.entries({ annata: filtri.annata, ruolo: filtri.ruolo, societa: filtri.societa }).filter(([, v]) => v) as [string, string][],
  );
  const ritorno = `/giocatori/stati${qs.size ? `?${qs}` : ''}`;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl font-bold">Giocatori per stato</h1>
          <p className="text-grigio">
            {carte.length} giocatori{admin ? ' – sposta un giocatore dal menu sulla sua scheda' : ''}
          </p>
        </div>
        <VistaGiocatori attiva="stati" admin={admin} />
      </div>

      <form method="GET" className="grid grid-cols-2 gap-3 rounded-xl border border-linea bg-white p-4 sm:grid-cols-4">
        <select name="annata" defaultValue={filtri.annata ?? ''} className="campo">
          <option value="">Tutte le annate</option>
          {annateDisponibili().map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        <select name="ruolo" defaultValue={filtri.ruolo ?? ''} className="campo">
          <option value="">Tutti i ruoli</option>
          {Object.entries(RUOLI_CAMPO).map(([v, e]) => (
            <option key={v} value={v}>{e}</option>
          ))}
        </select>
        <select name="societa" defaultValue={filtri.societa ?? ''} className="campo col-span-2 sm:col-span-1">
          <option value="">Tutte le società</option>
          {societa.map((s) => (
            <option key={s.id} value={s.id}>{s.nome}</option>
          ))}
        </select>
        <div className="col-span-2 flex gap-2 sm:col-span-1">
          <Link href="/giocatori/stati" className="rounded-lg px-4 py-3 text-sm font-medium text-grigio hover:bg-carta">Azzera</Link>
          <button className="bottone flex-1">Filtra</button>
        </div>
      </form>

      <Avviso ok={filtri.ok} errore={filtri.errore} />
      {error && <p className="text-rosso">Errore nel caricamento: {error.message}</p>}

      <div className="-mx-4 overflow-x-auto px-4 pb-2">
        <div className="flex snap-x gap-3">
          {[...perStato].map(([stato, lista]) => {
            const tutti = new URLSearchParams(qs);
            tutti.set('stato', stato);
            return (
              <section key={stato} className="w-64 shrink-0 snap-start rounded-xl bg-linea/50 p-2 sm:w-72">
                <h2 className="flex items-baseline justify-between px-1 pb-2 font-display text-lg font-bold">
                  {STATI[stato]}
                  <span className="text-sm font-semibold text-grigio">{lista.length}</span>
                </h2>
                <ul className="space-y-2">
                  {lista.slice(0, PER_COLONNA).map((c) => (
                    <li key={c.id} className="rounded-lg border border-linea bg-white p-3">
                      <Link href={`/giocatori/${c.id}`} className="block font-semibold leading-tight hover:text-blu">
                        {[c.cognome, c.nome].filter(Boolean).join(' ') || <span className="italic">{c.descrizione}</span>}
                      </Link>
                      <p className="mt-0.5 truncate text-xs text-grigio">
                        {[c.annata, c.ruolo && RUOLI_CAMPO[c.ruolo], c.societa?.nome].filter(Boolean).join(' · ')}
                      </p>
                      <p className="text-xs text-grigio">{c.segnalazioni[0]?.count ?? 0} segnalazioni</p>
                      {admin && (
                        <form action={spostaStato} className="mt-2 flex gap-1.5">
                          <input type="hidden" name="id" value={c.id} />
                          <input type="hidden" name="ritorno" value={ritorno} />
                          <select name="stato" defaultValue={c.stato} aria-label="Nuovo stato" className="min-w-0 flex-1 rounded-md border border-linea bg-white px-2 py-1.5 text-sm">
                            {Object.entries(STATI).map(([v, e]) => (
                              <option key={v} value={v}>{e}</option>
                            ))}
                          </select>
                          <button className="rounded-md bg-blu px-2.5 py-1.5 text-sm font-semibold text-white hover:bg-blu-scuro">Sposta</button>
                        </form>
                      )}
                    </li>
                  ))}
                </ul>
                {lista.length > PER_COLONNA && (
                  <Link href={`/giocatori?${tutti}`} className="mt-2 block px-1 text-sm font-medium text-blu">
                    Vedi tutti i {lista.length} ›
                  </Link>
                )}
                {lista.length === 0 && <p className="px-1 text-sm text-grigio">Nessuno</p>}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
