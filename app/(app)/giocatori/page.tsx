import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getProfilo } from '@/lib/auth';
import { gestisce, puoSegnalare } from '@/lib/ruoli';
import { annateDisponibili, RUOLI_CAMPO, STATI, valoreValido, type RuoloCampo, type StatoGiocatore } from '@/lib/tipi';
import { perRicerca } from '@/lib/utili';
import { StatoBadge } from '@/components/StatoBadge';
import { elencoSocieta } from '@/lib/societa';
import { VistaGiocatori } from '@/components/VistaGiocatori';

type Riga = {
  id: string;
  cognome: string | null;
  nome: string | null;
  descrizione: string | null;
  annata: number;
  ruolo: RuoloCampo | null;
  stato: StatoGiocatore;
  osservato: boolean;
  societa: { nome: string } | null;
  segnalazioni: { count: number }[];
  valutazioni: { count: number }[];
};

const PER_PAGINA = 30;

export default async function Giocatori({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const filtri = await searchParams;
  const profilo = (await getProfilo())!;
  const supabase = await createClient();

  const pagina = Math.max(1, Number(filtri.pagina) || 1);

  let q = supabase
    .from('giocatori')
    .select(
      'id, cognome, nome, descrizione, annata, ruolo, stato, osservato, societa(nome), segnalazioni(count), valutazioni(count)',
      { count: 'exact' },
    )
    .order('updated_at', { ascending: false })
    .range((pagina - 1) * PER_PAGINA, pagina * PER_PAGINA - 1);

  const annata = Number(filtri.annata);
  if (Number.isInteger(annata) && annata > 0) q = q.eq('annata', annata);
  const ruolo = valoreValido(RUOLI_CAMPO, filtri.ruolo);
  if (ruolo) q = q.eq('ruolo', ruolo);
  const stato = valoreValido(STATI, filtri.stato);
  if (stato) q = q.eq('stato', stato);
  else if (filtri.stato !== 'tutti') q = q.neq('stato', 'chiuso'); // di norma nascondi i chiusi
  if (filtri.societa) q = q.eq('societa_id', filtri.societa);
  // Di norma solo i ragazzi osservati; "da distinta" = anche quelli visti solo nelle distinte (0014)
  const conDistinte = filtri.chi === 'tutti';
  if (!conDistinte) q = q.eq('osservato', true);
  const cerca = filtri.q ? perRicerca(filtri.q) : '';
  if (cerca) q = q.or(`cognome.ilike.%${cerca}%,nome.ilike.%${cerca}%,descrizione.ilike.%${cerca}%`);

  const [{ data, error, count }, societa] = await Promise.all([q, elencoSocieta(supabase)]);
  const giocatori = (data as unknown as Riga[]) ?? [];
  const totale = count ?? giocatori.length;
  const totalePagine = Math.max(1, Math.ceil(totale / PER_PAGINA));

  const paramsPagina = (p: number) => {
    const sp = new URLSearchParams(
      Object.entries(filtri).filter(([, v]) => v !== undefined) as [string, string][],
    );
    sp.set('pagina', String(p));
    return `?${sp.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl font-bold">Giocatori</h1>
          <p className="text-grigio">
            {totale} {totale === 1 ? 'giocatore' : 'giocatori'}
            {!stato && filtri.stato !== 'tutti' && ' (esclusi i chiusi)'}
            {totalePagine > 1 && ` – pagina ${pagina} di ${totalePagine}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <VistaGiocatori attiva="elenco" admin={gestisce(profilo.ruolo)} />
          {puoSegnalare(profilo.ruolo) && (
            <Link href="/segnala" className="bottone">Segnala un giocatore</Link>
          )}
        </div>
      </div>

      <form method="GET" className="grid grid-cols-2 gap-3 rounded-xl border border-linea bg-white p-4 sm:grid-cols-7">
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
        <select name="chi" defaultValue={filtri.chi ?? ''} className="campo">
          <option value="">Solo osservati</option>
          <option value="tutti">Anche solo da distinta</option>
        </select>
        <select name="societa" defaultValue={filtri.societa ?? ''} className="campo">
          <option value="">Tutte le società</option>
          {societa.map((s) => (
            <option key={s.id} value={s.id}>{s.nome}</option>
          ))}
        </select>
        <div className="col-span-2 flex gap-2 sm:col-span-7 sm:justify-end">
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
                {g.osservato ? (
                  <StatoBadge stato={g.stato} />
                ) : (
                  <span className="rounded-full border border-linea px-2.5 py-0.5 text-xs font-semibold text-grigio">Da distinta</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {totalePagine > 1 && (
        <div className="flex items-center justify-between gap-3">
          {pagina > 1 ? (
            <Link href={paramsPagina(pagina - 1)} className="rounded-lg border border-linea px-4 py-2 text-sm font-medium hover:border-blu">
              ‹ Precedenti
            </Link>
          ) : <span />}
          <span className="text-sm text-grigio">Pagina {pagina} di {totalePagine}</span>
          {pagina < totalePagine ? (
            <Link href={paramsPagina(pagina + 1)} className="rounded-lg border border-linea px-4 py-2 text-sm font-medium hover:border-blu">
              Successivi ›
            </Link>
          ) : <span />}
        </div>
      )}
    </div>
  );
}
