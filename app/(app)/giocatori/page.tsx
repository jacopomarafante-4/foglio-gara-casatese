import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getProfilo } from '@/lib/auth';
import { puoSegnalare } from '@/lib/ruoli';
import { annateDisponibili, RUOLI_CAMPO, STATI, valoreValido, type RuoloCampo, type StatoGiocatore } from '@/lib/tipi';
import { perRicerca } from '@/lib/utili';
import { StatoBadge } from '@/components/StatoBadge';
import { elencoSocieta } from '@/lib/societa';

type Riga = {
  id: string;
  cognome: string | null;
  nome: string | null;
  descrizione: string | null;
  annata: number;
  ruolo: RuoloCampo | null;
  stato: StatoGiocatore;
  societa: { nome: string } | null;
  segnalazioni: { count: number }[];
  valutazioni: { count: number }[];
};

export default async function Giocatori({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const filtri = await searchParams;
  const profilo = (await getProfilo())!;
  const supabase = await createClient();

  let q = supabase
    .from('giocatori')
    .select(
      'id, cognome, nome, descrizione, annata, ruolo, stato, societa(nome), segnalazioni(count), valutazioni(count)',
    )
    .order('updated_at', { ascending: false })
    .limit(300);

  const annata = Number(filtri.annata);
  if (Number.isInteger(annata) && annata > 0) q = q.eq('annata', annata);
  const ruolo = valoreValido(RUOLI_CAMPO, filtri.ruolo);
  if (ruolo) q = q.eq('ruolo', ruolo);
  const stato = valoreValido(STATI, filtri.stato);
  if (stato) q = q.eq('stato', stato);
  else if (filtri.stato !== 'tutti') q = q.neq('stato', 'chiuso'); // di norma nascondi i chiusi
  if (filtri.societa) q = q.eq('societa_id', filtri.societa);
  const cerca = filtri.q ? perRicerca(filtri.q) : '';
  if (cerca) q = q.or(`cognome.ilike.%${cerca}%,nome.ilike.%${cerca}%,descrizione.ilike.%${cerca}%`);

  const [{ data, error }, societa] = await Promise.all([q, elencoSocieta(supabase)]);
  const giocatori = (data as unknown as Riga[]) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl font-bold">Giocatori</h1>
          <p className="text-grigio">
            {giocatori.length} {giocatori.length === 1 ? 'giocatore' : 'giocatori'}
            {!stato && filtri.stato !== 'tutti' && ' (esclusi i chiusi)'}
          </p>
        </div>
        {puoSegnalare(profilo.ruolo) && (
          <Link href="/segnala" className="bottone">Segnala un giocatore</Link>
        )}
      </div>

      <form method="GET" className="grid grid-cols-2 gap-3 rounded-xl border border-linea bg-white p-4 sm:grid-cols-6">
        <input
          name="q"
          defaultValue={filtri.q}
          placeholder="Cerca per nome o descrizione"
          className="campo col-span-2"
        />
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
        <select name="stato" defaultValue={filtri.stato ?? ''} className="campo">
          <option value="">Aperti</option>
          <option value="tutti">Tutti, anche chiusi</option>
          {Object.entries(STATI).map(([v, e]) => (
            <option key={v} value={v}>{e}</option>
          ))}
        </select>
        <select name="societa" defaultValue={filtri.societa ?? ''} className="campo">
          <option value="">Tutte le società</option>
          {societa.map((s) => (
            <option key={s.id} value={s.id}>{s.nome}</option>
          ))}
        </select>
        <div className="col-span-2 flex gap-2 sm:col-span-6 sm:justify-end">
          <Link href="/giocatori" className="rounded-lg px-4 py-3 text-sm font-medium text-grigio hover:bg-carta">
            Azzera
          </Link>
          <button className="bottone flex-1 sm:flex-none">Filtra</button>
        </div>
      </form>

      {error && <p className="text-rosso">Errore nel caricamento: {error.message}</p>}

      {giocatori.length === 0 ? (
        <div className="rounded-xl border border-dashed border-linea p-10 text-center text-grigio">
          Nessun giocatore con questi filtri.
          {puoSegnalare(profilo.ruolo) && (
            <>
              {' '}
              <Link href="/segnala" className="font-medium text-blu underline">Segnalane uno</Link>.
            </>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-linea overflow-hidden rounded-xl border border-linea bg-white">
          {giocatori.map((g) => (
            <li key={g.id}>
              <Link href={`/giocatori/${g.id}`} className="flex items-center gap-4 px-4 py-3 hover:bg-carta">
                <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-blu/10 font-display text-lg font-bold text-blu">
                  {String(g.annata).slice(2)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">
                    {[g.cognome, g.nome].filter(Boolean).join(' ') || (
                      <span className="italic">{g.descrizione}</span>
                    )}
                  </span>
                  <span className="block truncate text-sm text-grigio">
                    {[g.ruolo && RUOLI_CAMPO[g.ruolo], g.societa?.nome].filter(Boolean).join(' – ') || 'Ruolo e società da completare'}
                  </span>
                </span>
                <span className="hidden text-right text-xs text-grigio sm:block">
                  {g.segnalazioni[0]?.count ?? 0} segnalazioni
                  <br />
                  {g.valutazioni[0]?.count ?? 0} valutazioni
                </span>
                <StatoBadge stato={g.stato} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
