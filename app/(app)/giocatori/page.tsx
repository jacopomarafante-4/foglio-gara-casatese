import Link from 'next/link';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { getProfilo } from '@/lib/auth';
import { gestisce, puoSegnalare } from '@/lib/ruoli';
import {
  annateDisponibili, GIUDIZI, RUOLI_CAMPO, STATI, valoreValido, type Giudizio, type RuoloCampo, type StatoGiocatore,
} from '@/lib/tipi';
import { istanteTraOre, perRicerca } from '@/lib/utili';
import { categoriaDaAnnata, giocaInGara } from '@/lib/categorie';
import { StatoBadge } from '@/components/StatoBadge';
import { elencoSocieta, idNostraSocieta } from '@/lib/societa';
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
  updated_at: string;
  societa: { nome: string } | null;
  valutazioni: { tecnica: number; motoria: number; tattica: number; mentale: number; giudizio: Giudizio; data: string }[];
};

type GaraBreve = {
  id: string; data_ora: string; ora_da_definire: boolean | null; categoria: string;
  casa_id: string | null; trasferta_id: string | null; casa_nome: string; trasferta_nome: string;
};

const PER_PAGINA = 30;
const RUOLI_BREVI: Record<RuoloCampo, string> = { portiere: 'Por', difensore: 'Dif', centrocampista: 'Cen', attaccante: 'Att' };
const ORDINE_RUOLI = Object.keys(RUOLI_CAMPO);
const ORDINE_STATI = Object.keys(STATI);

const COLORI_GIUDIZIO: Record<Giudizio, string> = {
  da_prendere: 'bg-blu text-white',
  da_rivedere: 'bg-oro/25 text-inchiostro',
  non_a_livello: 'bg-rosso/10 text-rosso',
};

/** Colonne ordinabili (clic sull'intestazione, o "Ordina per" da telefono) */
const COLONNE = {
  anno: 'Anno',
  giocatore: 'Giocatore',
  ruolo: 'Ruolo',
  stato: 'Stato',
  squadra: 'Squadra',
  valutazione: 'Valutazione',
  gara: 'Prossima gara',
} as const;
type Colonna = keyof typeof COLONNE;

/** Istante della gara → "dom 27/09 10:30" (ora italiana) */
function dataGara(iso: string, senzaOra: boolean) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('it-IT', {
    timeZone: 'Europe/Rome', weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  }).formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return `${p.weekday} ${p.day}/${p.month}${senzaOra ? '' : ` ${p.hour}:${p.minute}`}`;
}

/** Media delle 4 aree su tutte le valutazioni, e giudizio dell'ultima */
function sintesiValutazioni(v: Riga['valutazioni']) {
  if (!v.length) return null;
  const media = v.reduce((s, x) => s + (x.tecnica + x.motoria + x.tattica + x.mentale) / 4, 0) / v.length;
  const ultima = [...v].sort((a, b) => b.data.localeCompare(a.data))[0];
  return { media, giudizio: ultima.giudizio, quante: v.length };
}

/** Prossime gare (60 giorni) delle società indicate: a blocchi, per non superare i limiti delle richieste */
async function gareDelleSocieta(supabase: SupabaseClient, ids: string[]) {
  const out: GaraBreve[] = [];
  for (let i = 0; i < ids.length; i += 40) {
    const blocco = ids.slice(i, i + 40).join(',');
    for (let da = 0; ; da += 1000) {
      const { data } = await supabase
        .from('gare')
        .select('id, data_ora, ora_da_definire, categoria, casa_id, trasferta_id, casa_nome, trasferta_nome')
        .or(`casa_id.in.(${blocco}),trasferta_id.in.(${blocco})`)
        .gte('data_ora', istanteTraOre(-2))
        .lte('data_ora', istanteTraOre(24 * 60))
        .order('data_ora')
        .range(da, da + 999);
      out.push(...((data as GaraBreve[] | null) ?? []));
      if (!data || data.length < 1000) break;
    }
  }
  return out.sort((a, b) => a.data_ora.localeCompare(b.data_ora));
}

export default async function Giocatori({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const filtri = await searchParams;
  const profilo = (await getProfilo())!;
  const supabase = await createClient();

  const pagina = Math.max(1, Number(filtri.pagina) || 1);
  const ordina = (filtri.ordina && filtri.ordina in COLONNE ? filtri.ordina : null) as Colonna | null;
  const discendente = filtri.verso === 'giu';

  // Tutti i giocatori dei filtri (sono qualche centinaio): l'ordinamento per valutazione o
  // prossima gara si calcola qui, poi si prende la pagina
  const societa = await elencoSocieta(supabase);
  const nostra = idNostraSocieta(societa);
  const tuttiIGiocatori = filtri.chi === 'tutti';
  const costruisci = () => {
    let q = supabase
      .from('giocatori')
      .select(
        'id, cognome, nome, descrizione, annata, ruolo, stato, osservato, categoria, societa_id, updated_at, societa(nome), ' +
          'valutazioni(tecnica, motoria, tattica, mentale, giudizio, data)',
      )
      .order('updated_at', { ascending: false });
    const annata = Number(filtri.annata);
    if (Number.isInteger(annata) && annata > 0) q = q.eq('annata', annata);
    const ruolo = valoreValido(RUOLI_CAMPO, filtri.ruolo);
    if (ruolo) q = q.eq('ruolo', ruolo);
    const stato = valoreValido(STATI, filtri.stato);
    if (stato) q = q.eq('stato', stato);
    if (filtri.societa) q = q.eq('societa_id', filtri.societa);
    // Di norma solo i ragazzi osservati e non dell'Academy; "Tutti i giocatori" = anche i nostri e quelli
    // visti solo nelle distinte (0014). Scegliendo l'Academy come società si vedono comunque i nostri.
    if (!tuttiIGiocatori) {
      q = q.eq('osservato', true);
      if (nostra && filtri.societa !== nostra) q = q.or(`societa_id.is.null,societa_id.neq.${nostra}`);
    }
    const cerca = filtri.q ? perRicerca(filtri.q) : '';
    if (cerca) q = q.or(`cognome.ilike.%${cerca}%,nome.ilike.%${cerca}%,descrizione.ilike.%${cerca}%`);
    return q;
  };
  const tutti: Riga[] = [];
  let error: { message: string } | null = null;
  for (let da = 0; ; da += 1000) {
    const r = await costruisci().range(da, da + 999);
    if (r.error) { error = r.error; break; }
    tutti.push(...((r.data as unknown as Riga[]) ?? []));
    if ((r.data?.length ?? 0) < 1000) break;
  }

  const nomeDi = (g: Riga) => [g.cognome, g.nome].filter(Boolean).join(' ') || g.descrizione || 'Senza nome';
  const categoriaDi = (g: Riga) => (g.categoria ?? categoriaDaAnnata(g.annata).split(' - ')[0]).replace(/^Under\s*/i, 'U');
  const sintesi = new Map(tutti.map((g) => [g.id, sintesiValutazioni(g.valutazioni)]));

  // Prossime gare: di tutti se si ordina per gara, se no solo della pagina
  const perGara = ordina === 'gara';
  const idSocieta = (lista: Riga[]) => [...new Set(lista.map((g) => g.societa_id).filter(Boolean))] as string[];
  let gare = perGara ? await gareDelleSocieta(supabase, idSocieta(tutti)) : [];
  const prossimaGara = (g: Riga) => (g.societa_id ? gare.find((x) => giocaInGara(g, x)) : undefined);

  if (ordina) {
    const it = new Intl.Collator('it', { sensitivity: 'base' });
    const chiaveGara = new Map(perGara ? tutti.map((g) => [g.id, prossimaGara(g)?.data_ora ?? null]) : []);
    // Valori mancanti sempre in fondo, in tutti e due i versi
    const confronta = (a: Riga, b: Riga): number => {
      const valore = (g: Riga): string | number | null => {
        switch (ordina) {
          case 'anno': return g.annata;
          case 'giocatore': return nomeDi(g);
          case 'ruolo': return g.ruolo ? ORDINE_RUOLI.indexOf(g.ruolo) : null;
          case 'stato': return g.osservato ? ORDINE_STATI.indexOf(g.stato) : null;
          case 'squadra': return g.societa ? `${g.societa.nome} ${categoriaDi(g)}` : null;
          case 'valutazione': return sintesi.get(g.id)?.media ?? null;
          case 'gara': return chiaveGara.get(g.id) ?? null;
        }
      };
      const [x, y] = [valore(a), valore(b)];
      if (x === null || y === null) return x === y ? 0 : x === null ? 1 : -1;
      const c = typeof x === 'number' && typeof y === 'number' ? x - y : it.compare(String(x), String(y));
      return discendente ? -c : c;
    };
    tutti.sort(confronta);
  }

  const totale = tutti.length;
  const totalePagine = Math.max(1, Math.ceil(totale / PER_PAGINA));
  const giocatori = tutti.slice((pagina - 1) * PER_PAGINA, pagina * PER_PAGINA);
  if (!perGara) gare = await gareDelleSocieta(supabase, idSocieta(giocatori));
  const valuta = puoSegnalare(profilo.ruolo);

  const link = (cambi: Record<string, string | null>) => {
    const sp = new URLSearchParams(Object.entries(filtri).filter(([, v]) => v !== undefined) as [string, string][]);
    for (const [k, v] of Object.entries(cambi)) if (v === null) sp.delete(k); else sp.set(k, v);
    return `?${sp.toString()}`;
  };
  // Primo clic: A→Z (o dal più alto per la valutazione); secondo clic: al contrario
  const primoVerso = (c: Colonna) => (c === 'valutazione' ? 'giu' : 'su');
  const linkOrdina = (c: Colonna) =>
    link({ ordina: c, verso: ordina === c ? (discendente ? 'su' : 'giu') : primoVerso(c), pagina: null });
  const freccia = (c: Colonna) => (ordina === c ? (discendente ? ' ▼' : ' ▲') : '');

  const righe = giocatori.map((g) => {
    const v = sintesi.get(g.id) ?? null;
    const gara = prossimaGara(g);
    const inCasa = gara && gara.casa_id === g.societa_id;
    return {
      g,
      nome: nomeDi(g),
      squadra: [g.societa?.nome ?? 'Società ?', categoriaDi(g)].join(' · '),
      v,
      gara,
      testoGara: gara
        ? `${dataGara(gara.data_ora, !!gara.ora_da_definire)} · ${inCasa ? `casa, ${gara.trasferta_nome}` : `a ${gara.casa_nome}`}`
        : g.societa_id ? 'Nessuna in calendario' : '–',
      href: `/giocatori/${g.id}`,
    };
  });

  const stato = (g: Riga) =>
    g.osservato ? (
      <StatoBadge stato={g.stato} />
    ) : (
      <span className="rounded-full border border-linea px-2.5 py-0.5 text-xs font-semibold text-grigio">Da distinta</span>
    );
  const valutazione = (r: (typeof righe)[number]) =>
    r.v ? (
      <span className="flex items-center gap-1.5" title={`Media di ${r.v.quante} ${r.v.quante === 1 ? 'valutazione' : 'valutazioni'} (1–5)`}>
        <span className="font-semibold text-blu">{r.v.media.toFixed(1).replace('.', ',')}</span>
        <span className={`truncate rounded-full px-2 py-0.5 text-xs font-semibold ${COLORI_GIUDIZIO[r.v.giudizio]}`}>
          {GIUDIZI[r.v.giudizio]}
        </span>
      </span>
    ) : null;
  const pulsanteValuta = (href: string) =>
    valuta ? (
      <Link href={`${href}/valuta`} className="relative z-10 inline-block rounded-lg border border-blu px-3 py-1 text-sm font-semibold text-blu hover:bg-blu/5">
        Valuta
      </Link>
    ) : (
      <span className="text-grigio">Da valutare</span>
    );

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

      <form method="GET" className="grid grid-cols-2 gap-3 rounded-xl border border-linea bg-white p-4 sm:grid-cols-4 lg:grid-cols-7">
        <input name="q" defaultValue={filtri.q} placeholder="Cerca per nome o descrizione" className="campo col-span-2" />
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
          <option value="">Osservati (senza Academy)</option>
          <option value="tutti">Tutti i giocatori</option>
        </select>
        <select name="societa" defaultValue={filtri.societa ?? ''} className="campo">
          <option value="">Tutte le società</option>
          {societa.map((s) => (
            <option key={s.id} value={s.id}>{s.nome}</option>
          ))}
        </select>
        {/* Ordinamento: da computer si clicca l'intestazione (queste due restano nascoste ma tengono
            l'ordinamento scelto quando si filtra); da telefono e tablet si sceglie qui */}
        <select name="ordina" defaultValue={ordina ?? ''} className="campo lg:hidden" aria-label="Ordina per">
          <option value="">Ordina: modificati di recente</option>
          {Object.entries(COLONNE).map(([v, e]) => (
            <option key={v} value={v}>Ordina per {e.toLowerCase()}</option>
          ))}
        </select>
        <select name="verso" defaultValue={filtri.verso ?? ''} className="campo lg:hidden" aria-label="Verso">
          <option value="">Crescente (A→Z)</option>
          <option value="giu">Decrescente (Z→A)</option>
        </select>
        <div className="col-span-2 flex gap-2 sm:col-span-4 lg:col-span-7 lg:justify-end">
          <Link href="/giocatori" className="rounded-lg px-4 py-3 text-sm font-medium text-grigio hover:bg-carta">
            Azzera
          </Link>
          <button className="bottone flex-1 lg:flex-none">Filtra</button>
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
        <>
          {/* Computer: tabella a righe singole, colonne ordinabili cliccando l'intestazione */}
          <div className="hidden overflow-hidden rounded-xl border border-linea bg-white lg:block">
            <table className="w-full table-fixed text-left text-sm">
              <colgroup>
                <col className="w-16" />
                <col />
                <col className="w-16" />
                <col className="w-28" />
                <col />
                <col className="w-40" />
                <col />
              </colgroup>
              <thead className="border-b border-linea bg-carta text-xs uppercase tracking-wide text-grigio">
                <tr>
                  {(Object.keys(COLONNE) as Colonna[]).map((c) => (
                    <th
                      key={c}
                      scope="col"
                      aria-sort={ordina === c ? (discendente ? 'descending' : 'ascending') : undefined}
                      className="p-0 font-semibold first:pl-2"
                    >
                      <Link
                        href={linkOrdina(c)}
                        className={`block truncate px-2 py-2 hover:text-inchiostro ${ordina === c ? 'text-inchiostro' : ''}`}
                        title={`Ordina per ${COLONNE[c].toLowerCase()}`}
                      >
                        {COLONNE[c]}{freccia(c)}
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-linea">
                {righe.map((r) => {
                  const cella = (contenuto: React.ReactNode, title?: string, extra = '') => (
                    <td className={`p-0 first:pl-2 ${extra}`}>
                      <Link href={r.href} tabIndex={-1} title={title} className="block truncate px-2 py-2.5">{contenuto}</Link>
                    </td>
                  );
                  return (
                    <tr key={r.g.id} className="hover:bg-carta">
                      {cella(r.g.annata, undefined, 'font-semibold text-blu')}
                      <td className="p-0">
                        <Link href={r.href} title={r.nome} className={`block truncate px-2 py-2.5 font-semibold ${r.g.cognome ? '' : 'italic'}`}>
                          {r.nome}
                        </Link>
                      </td>
                      {cella(r.g.ruolo ? RUOLI_BREVI[r.g.ruolo] : <span className="text-grigio">–</span>, r.g.ruolo ? RUOLI_CAMPO[r.g.ruolo] : undefined)}
                      {cella(stato(r.g))}
                      {cella(r.squadra, r.squadra)}
                      {r.v ? cella(valutazione(r)) : <td className="px-2 py-1.5">{pulsanteValuta(r.href)}</td>}
                      {cella(r.gara ? r.testoGara : <span className="text-grigio">{r.testoGara}</span>, r.testoGara)}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Telefono e tablet: una scheda verticale per giocatore */}
          <ul className="space-y-2 lg:hidden">
            {righe.map((r) => (
              <li key={r.g.id} className="relative rounded-xl border border-linea bg-white p-4">
                <Link href={r.href} className="absolute inset-0 rounded-xl" aria-label={`Apri ${r.nome}`} />
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className={`truncate font-semibold ${r.g.cognome ? '' : 'italic'}`}>{r.nome}</p>
                    <p className="text-sm text-grigio">
                      <span className="font-semibold text-blu">{r.g.annata}</span>
                      {r.g.ruolo && ` · ${RUOLI_CAMPO[r.g.ruolo]}`}
                    </p>
                  </div>
                  <div className="shrink-0">{stato(r.g)}</div>
                </div>
                <dl className="mt-3 grid grid-cols-[6.5rem_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-sm">
                  <dt className="text-grigio">Squadra</dt>
                  <dd className="truncate">{r.squadra}</dd>
                  <dt className="self-center text-grigio">Valutazione</dt>
                  <dd>{r.v ? valutazione(r) : pulsanteValuta(r.href)}</dd>
                  <dt className="text-grigio">Prossima gara</dt>
                  <dd className={r.gara ? '' : 'text-grigio'}>{r.testoGara}</dd>
                </dl>
              </li>
            ))}
          </ul>
        </>
      )}

      {totalePagine > 1 && (
        <div className="flex items-center justify-between gap-3">
          {pagina > 1 ? (
            <Link href={link({ pagina: String(pagina - 1) })} className="rounded-lg border border-linea px-4 py-2 text-sm font-medium hover:border-blu">
              ‹ Precedenti
            </Link>
          ) : <span />}
          <span className="text-sm text-grigio">Pagina {pagina} di {totalePagine}</span>
          {pagina < totalePagine ? (
            <Link href={link({ pagina: String(pagina + 1) })} className="rounded-lg border border-linea px-4 py-2 text-sm font-medium hover:border-blu">
              Successivi ›
            </Link>
          ) : <span />}
        </div>
      )}
    </div>
  );
}
