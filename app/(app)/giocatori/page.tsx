import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getProfilo } from '@/lib/auth';
import { gestisce, puoSegnalare } from '@/lib/ruoli';
import {
  annateDisponibili, GIUDIZI, RUOLI_CAMPO, STATI, valoreValido, type Giudizio, type RuoloCampo, type StatoGiocatore,
} from '@/lib/tipi';
import { dataBreve, dataOraBreve, istanteTraOre, perRicerca } from '@/lib/utili';
import { categoriaDaAnnata, giocaInGara } from '@/lib/categorie';
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
  categoria: string | null;
  societa_id: string | null;
  societa: { nome: string } | null;
  valutazioni: { tecnica: number; motoria: number; tattica: number; mentale: number; giudizio: Giudizio; data: string }[];
};

type GaraBreve = {
  id: string; data_ora: string; ora_da_definire: boolean | null; categoria: string;
  casa_id: string | null; trasferta_id: string | null; casa_nome: string; trasferta_nome: string;
};

const COLORI_GIUDIZIO: Record<Giudizio, string> = {
  da_prendere: 'bg-blu text-white',
  da_rivedere: 'bg-oro/25 text-inchiostro',
  non_a_livello: 'bg-rosso/10 text-rosso',
};

/** Media delle 4 aree su tutte le valutazioni, e giudizio dell'ultima */
function sintesiValutazioni(v: Riga['valutazioni']) {
  if (!v.length) return null;
  const media = v.reduce((s, x) => s + (x.tecnica + x.motoria + x.tattica + x.mentale) / 4, 0) / v.length;
  const ultima = [...v].sort((a, b) => b.data.localeCompare(a.data))[0];
  return { media, giudizio: ultima.giudizio, data: ultima.data, quante: v.length };
}

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
      'id, cognome, nome, descrizione, annata, ruolo, stato, osservato, categoria, societa_id, societa(nome), ' +
        'valutazioni(tecnica, motoria, tattica, mentale, giudizio, data)',
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

  // Prossima gara della squadra di ogni giocatore (società + categoria), nei prossimi 60 giorni
  const idSocieta = [...new Set(giocatori.map((g) => g.societa_id).filter(Boolean))] as string[];
  const { data: gareData } = idSocieta.length
    ? await supabase
        .from('gare')
        .select('id, data_ora, ora_da_definire, categoria, casa_id, trasferta_id, casa_nome, trasferta_nome')
        .or(`casa_id.in.(${idSocieta.join(',')}),trasferta_id.in.(${idSocieta.join(',')})`)
        .gte('data_ora', istanteTraOre(-2))
        .lte('data_ora', istanteTraOre(24 * 60))
        .order('data_ora')
        .limit(3000)
    : { data: [] };
  const gare = (gareData as GaraBreve[] | null) ?? [];
  const prossimaGara = (g: Riga) => (g.societa_id ? gare.find((x) => giocaInGara(g, x)) : undefined);
  const valuta = puoSegnalare(profilo.ruolo);

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
          <option value="">Tutti gli stati</option>
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
        // Tabella a righe singole: da telefono scorre in orizzontale. Tutte le celle aprono la scheda,
        // tranne il pulsante "Valuta"
        <div className="overflow-x-auto rounded-xl border border-linea bg-white">
          <table className="w-full whitespace-nowrap text-left text-sm">
            <thead className="border-b border-linea bg-carta text-xs uppercase tracking-wide text-grigio">
              <tr>
                {['Anno', 'Giocatore', 'Ruolo', 'Stato', 'Società', 'Categoria', 'Valutazione', 'Ultima val.', 'Prossima gara'].map((t) => (
                  <th key={t} scope="col" className="px-3 py-2 font-semibold">{t}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-linea">
              {giocatori.map((g) => {
                const nome = [g.cognome, g.nome].filter(Boolean).join(' ');
                const categoria = g.categoria ?? categoriaDaAnnata(g.annata).split(' - ')[0];
                const v = sintesiValutazioni(g.valutazioni);
                const gara = prossimaGara(g);
                const inCasa = gara && gara.casa_id === g.societa_id;
                const href = `/giocatori/${g.id}`;
                const cella = (contenuto: React.ReactNode, extra = '') => (
                  <td className={`p-0 ${extra}`}>
                    <Link href={href} tabIndex={-1} className="block px-3 py-2.5">{contenuto}</Link>
                  </td>
                );
                return (
                  <tr key={g.id} className="hover:bg-carta">
                    {cella(g.annata, 'font-semibold text-blu')}
                    <td className="p-0">
                      <Link href={href} className="block max-w-56 truncate px-3 py-2.5 font-semibold">
                        {nome || <span className="italic">{g.descrizione}</span>}
                      </Link>
                    </td>
                    {cella(g.ruolo ? RUOLI_CAMPO[g.ruolo] : <span className="text-grigio">–</span>)}
                    {cella(
                      g.osservato ? (
                        <StatoBadge stato={g.stato} />
                      ) : (
                        <span className="rounded-full border border-linea px-2.5 py-0.5 text-xs font-semibold text-grigio">Da distinta</span>
                      ),
                    )}
                    {cella(<span className="block max-w-48 truncate">{g.societa?.nome ?? <span className="text-grigio">–</span>}</span>)}
                    {cella(categoria)}
                    {v ? (
                      cella(
                        <span className="flex items-center gap-2">
                          <span className="font-semibold text-blu" title={`Media di ${v.quante} ${v.quante === 1 ? 'valutazione' : 'valutazioni'} (1–5)`}>
                            {v.media.toFixed(1).replace('.', ',')}
                          </span>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${COLORI_GIUDIZIO[v.giudizio]}`}>
                            {GIUDIZI[v.giudizio]}
                          </span>
                        </span>,
                      )
                    ) : (
                      <td className="px-3 py-1.5">
                        {valuta ? (
                          <Link href={`${href}/valuta`} className="inline-block rounded-lg border border-blu px-3 py-1 font-semibold text-blu hover:bg-blu/5">
                            Valuta
                          </Link>
                        ) : (
                          <span className="text-grigio">Da valutare</span>
                        )}
                      </td>
                    )}
                    {cella(v ? dataBreve(v.data) : <span className="text-grigio">–</span>)}
                    {cella(
                      gara ? (
                        <span>
                          <span className="first-letter:uppercase">
                            {gara.ora_da_definire ? `${dataOraBreve(gara.data_ora).split(',')[0]} · ora da definire` : dataOraBreve(gara.data_ora)}
                          </span>
                          <span className="text-grigio">
                            {' · '}{inCasa ? `in casa con ${gara.trasferta_nome}` : `a ${gara.casa_nome}`}
                          </span>
                        </span>
                      ) : (
                        <span className="text-grigio">{g.societa_id ? 'Nessuna in calendario' : '–'}</span>
                      ),
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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
