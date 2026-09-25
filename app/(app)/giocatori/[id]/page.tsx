import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getProfilo } from '@/lib/auth';
import { gestisce, nomeCompleto, puoSegnalare, vedeTutto } from '@/lib/ruoli';
import { elencoSocieta } from '@/lib/societa';
import {
  AREE, GIUDIZI, MOTIVI_CHIUSURA, PIEDI, RUOLI_CAMPO, STATI, annateDisponibili,
  type Giudizio, type Piede, type RuoloCampo, type StatoGiocatore,
} from '@/lib/tipi';
import { dataBreve, istanteTraOre } from '@/lib/utili';
import { categoriaDaAnnata } from '@/lib/categorie';
import { arricchisci, giocatoriDellaGara, SELECT_GARA, squadreSeguite, type Gara, type GiocatoreInGara, type Sede } from '@/lib/gare';
import { GaraCard } from '@/components/GaraCard';
import { StoricoGiocatore, type Presenza } from '@/components/StoricoGiocatore';
import { Avviso } from '@/components/Avviso';
import { Etichetta } from '@/components/Etichetta';
import { StatoBadge } from '@/components/StatoBadge';
import { EventiGiocatore, type Evento } from '@/components/EventiGiocatore';
import { aggiornaGiocatore, aggiungiContatto, cambiaStato, eliminaContatto } from '../actions';

type Autore = { nome: string | null; cognome: string | null; email: string } | null;

type Giocatore = {
  id: string;
  cognome: string | null;
  nome: string | null;
  descrizione: string | null;
  annata: number;
  data_nascita: string | null;
  ruolo: RuoloCampo | null;
  piede: Piede | null;
  stato: StatoGiocatore;
  motivo_chiusura: string | null;
  rivedere_dal: string | null;
  categoria: string | null; // solo se diversa da quella dell'annata (0013)
  osservato: boolean; // false = visto solo nelle distinte (0014)
  societa_id: string | null;
  note: string | null;
  creato_da: string | null;
  segnalato_da_squadra: string | null;
  societa: { nome: string } | null;
};

type Segnalazione = {
  id: string; data: string; contesto: string | null; testo: string; voto: number | null; autore: Autore;
  squadra: string | null; // segnalazione di un mister dal Portale squadre
};

type Valutazione = {
  id: string; data: string; contesto: string | null; giudizio: Giudizio; commento: string | null; autore: Autore;
  tecnica: number; motoria: number; tattica: number; mentale: number;
  tecnica_note: string | null; motoria_note: string | null; tattica_note: string | null; mentale_note: string | null;
};

type CambioStato = {
  id: number; da_stato: StatoGiocatore | null; a_stato: StatoGiocatore; motivo: string | null;
  created_at: string; autore: Autore;
};

type Contatto = {
  id: string; tipo: string; nome: string | null; telefono: string | null; email: string | null;
  consenso_privacy: boolean; autore: Autore;
};

const chi = (a: Autore) => (a ? nomeCompleto(a) : 'Autore non disponibile (utente rimosso o importazione storica)');

export default async function SchedaGiocatore({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; errore?: string }>;
}) {
  const { id } = await params;
  const { ok, errore } = await searchParams;
  const profilo = (await getProfilo())!;
  const supabase = await createClient();

  const { data } = await supabase
    .from('giocatori')
    // `*` e non l'elenco dei campi: segnalato_da_squadra esiste solo dopo la migrazione 0007
    .select('*, societa(nome)')
    .eq('id', id)
    .maybeSingle();
  if (!data) notFound();
  const g = data as unknown as Giocatore;

  const autore = 'autore:profiles(nome, cognome, email)';
  const [segn, val, storico, contatti, ev, pres] = await Promise.all([
    supabase.from('segnalazioni').select(`*, ${autore}`).eq('giocatore_id', id).order('data', { ascending: false }),
    supabase.from('valutazioni').select(`*, ${autore}`).eq('giocatore_id', id).order('data', { ascending: false }),
    supabase.from('storico_stati').select(`id, da_stato, a_stato, motivo, created_at, ${autore}`).eq('giocatore_id', id).order('created_at', { ascending: false }),
    supabase.from('contatti').select(`id, tipo, nome, telefono, email, consenso_privacy, ${autore}`).eq('giocatore_id', id).order('created_at'),
    supabase.from('eventi_giocatore').select(`*, ${autore}`).eq('giocatore_id', id).order('data', { ascending: false }),
    supabase
      .from('distinte_giocatori')
      .select('numero, titolare, capitano, appartenenza:societa(nome), squadra:squadre(categoria, stagione, societa(nome)), distinta:distinte(id, data, stagione, categoria, competizione, casa_nome, trasferta_nome, risultato)')
      .eq('giocatore_id', id),
  ]);
  const presenze = (pres.data as unknown as Presenza[]) ?? [];
  const eventi = (ev.data as unknown as Evento[]) ?? [];

  // Squadra di appartenenza e sue prossime gare (dal pannello Gare), se la società è nota
  const categoria = g.categoria || categoriaDaAnnata(g.annata);
  const [{ data: gareData }, { data: sediData }, seguite] = g.societa_id
    ? await Promise.all([
        supabase.from('gare').select(SELECT_GARA)
          .or(`casa_id.eq.${g.societa_id},trasferta_id.eq.${g.societa_id}`)
          .gte('data_ora', istanteTraOre(-3)).order('data_ora').limit(30),
        supabase.from('sedi').select('id, nome, lat, lon').order('id'),
        squadreSeguite(supabase),
      ])
    : [{ data: [] }, { data: [] }, []];
  const prossimeGare = ((gareData as unknown as Gara[]) ?? [])
    .filter((x) => giocatoriDellaGara(x, [{ ...(g as unknown as GiocatoreInGara), stato: 'segnalato' }]).length > 0)
    .map((x) => arricchisci(x, ((sediData as Sede[]) ?? [])[0] ?? null, seguite));
  const segnalazioni = (segn.data as unknown as Segnalazione[]) ?? [];
  const valutazioni = (val.data as unknown as Valutazione[]) ?? [];
  const cambi = (storico.data as unknown as CambioStato[]) ?? [];
  const elencoContatti = (contatti.data as unknown as Contatto[]) ?? [];

  const gestore = gestisce(profilo.ruolo);
  const tutto = vedeTutto(profilo.ruolo); // i direttori vedono anche i contatti, senza modificare
  const scrive = puoSegnalare(profilo.ruolo);
  const modifica = gestore || (scrive && g.creato_da === profilo.id);
  const societa = modifica ? await elencoSocieta(supabase) : [];

  const titolo = [g.cognome, g.nome].filter(Boolean).join(' ') || g.descrizione || 'Giocatore';
  const medie = AREE.map((a) => ({
    ...a,
    media: valutazioni.length
      ? valutazioni.reduce((s, v) => s + v[a.chiave], 0) / valutazioni.length
      : null,
  }));

  // Storia unica: creazione scheda, segnalazioni, valutazioni e cambi di stato
  const storia = [
    ...segnalazioni.map((s) => ({ tipo: 'segnalazione' as const, quando: s.data, s })),
    ...valutazioni.map((v) => ({ tipo: 'valutazione' as const, quando: v.data, v })),
    ...cambi.filter((c) => c.da_stato).map((c) => ({ tipo: 'stato' as const, quando: c.created_at, c })),
    ...cambi.filter((c) => !c.da_stato).map((c) => ({ tipo: 'creazione' as const, quando: c.created_at, c })),
  ].sort((a, b) => b.quando.localeCompare(a.quando));

  return (
    <div className="space-y-8">
      <Link href="/giocatori" className="text-sm text-grigio hover:text-blu">‹ Tutti i giocatori</Link>

      <section className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-4xl font-bold">{titolo}</h1>
            {g.osservato === false ? (
              <span className="rounded-full border border-linea px-2.5 py-0.5 text-xs font-semibold text-grigio">
                Solo da distinta: mai osservato
              </span>
            ) : (
              <StatoBadge stato={g.stato} />
            )}
          </div>
          <p className="mt-1 text-grigio">
            {[
              g.annata,
              g.ruolo && RUOLI_CAMPO[g.ruolo],
              g.piede && `piede ${PIEDI[g.piede].toLowerCase()}`,
              g.societa?.nome,
            ].filter(Boolean).join(' – ')}
          </p>
          <p className="mt-1">
            <span className="text-grigio">Squadra: </span>
            <span className="font-semibold">
              {g.societa?.nome ?? 'società da completare'} · {categoria}
            </span>
            {g.categoria && !g.categoria.includes(String(g.annata)) && (
              <span className="text-sm text-grigio"> (annata {g.annata}, gioca sotto/sopra età)</span>
            )}
          </p>
          {g.cognome && g.descrizione && <p className="mt-1 text-sm italic text-grigio">{g.descrizione}</p>}
          {g.stato === 'chiuso' && g.motivo_chiusura && (
            <p className="mt-2 text-sm">
              Chiuso: {g.motivo_chiusura}
              {g.rivedere_dal && ` – da rivedere dal ${dataBreve(g.rivedere_dal)}`}
            </p>
          )}
        </div>
        {scrive && (
          <div className="flex gap-2">
            <Link href={`/segnala?giocatore=${g.id}`} className="rounded-lg border border-blu px-4 py-3 font-semibold text-blu hover:bg-blu/5">
              Aggiungi segnalazione
            </Link>
            <Link href={`/giocatori/${g.id}/valuta`} className="bottone">Valuta</Link>
          </div>
        )}
      </section>

      <Avviso ok={ok} errore={errore} />

      {/* Medie delle valutazioni */}
      <section className="rounded-xl border border-linea bg-white p-5">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-2xl font-bold">Valutazioni</h2>
          <span className="text-sm text-grigio">
            {valutazioni.length ? `media di ${valutazioni.length}` : 'ancora nessuna'}
          </span>
        </div>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          {medie.map((a) => (
            <div key={a.chiave}>
              <div className="flex justify-between text-sm">
                <dt className="font-medium">{a.nome}</dt>
                <dd className="font-display text-lg font-bold">{a.media ? a.media.toFixed(1) : '–'}</dd>
              </div>
              <div className="mt-1 h-2 rounded-full bg-carta">
                <div className="h-2 rounded-full bg-blu" style={{ width: `${((a.media ?? 0) / 5) * 100}%` }} />
              </div>
            </div>
          ))}
        </dl>
      </section>

      {/* Prossime gare della sua squadra (caricate nel pannello Gare) */}
      <section className="rounded-xl border border-linea bg-white p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <h2 className="font-display text-2xl font-bold">Prossime gare</h2>
          <span className="text-sm text-grigio">{[g.societa?.nome, categoria].filter(Boolean).join(' · ')}</span>
        </div>
        {!g.societa_id ? (
          <p className="mt-3 text-grigio">Aggiungi la società nei dati del giocatore per vedere le sue gare.</p>
        ) : prossimeGare.length === 0 ? (
          <p className="mt-3 text-grigio">Nessuna gara in programma della sua squadra. Le gare si caricano nel pannello Gare.</p>
        ) : (
          <div className="mt-3 space-y-3">
            {prossimeGare.map((x) => (
              <div key={x.id}>
                <p className="mb-1 text-sm font-semibold first-letter:uppercase">
                  {new Date(x.data_ora).toLocaleDateString('it-IT', { timeZone: 'Europe/Rome', weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
                <GaraCard gara={x} mioId={profilo.id} puoPrenotarsi={puoSegnalare(profilo.ruolo)} />
              </div>
            ))}
          </div>
        )}
      </section>

      <StoricoGiocatore presenze={presenze} />

      <EventiGiocatore
        giocatoreId={g.id}
        eventi={eventi}
        mioId={profilo.id}
        scrive={puoSegnalare(profilo.ruolo)}
        gestore={gestisce(profilo.ruolo)}
        chi={chi}
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
        {/* Storia */}
        <section>
          <h2 className="font-display text-2xl font-bold">Storia</h2>
          {storia.length === 0 ? (
            <p className="mt-3 text-grigio">Ancora nessuna segnalazione.</p>
          ) : (
            <ol className="mt-3 space-y-3">
              {storia.map((e) => {
                if (e.tipo === 'segnalazione') {
                  const s = e.s;
                  return (
                    <li key={`s${s.id}`} className="rounded-xl border border-linea bg-white p-4">
                      <p className="text-sm text-grigio">
                        Segnalazione di {s.autore || !s.squadra ? chi(s.autore) : `Mister ${s.squadra}`} – {dataBreve(s.data)}
                        {s.contesto && ` – ${s.contesto}`}
                        {s.voto && <span className="ml-2 font-semibold text-inchiostro">voto {s.voto}/5</span>}
                      </p>
                      <p className="mt-2 whitespace-pre-line">{s.testo}</p>
                    </li>
                  );
                }
                if (e.tipo === 'valutazione') {
                  const v = e.v;
                  return (
                    <li key={`v${v.id}`} className="rounded-xl border-2 border-blu/30 bg-white p-4">
                      <p className="text-sm text-grigio">
                        Valutazione di {chi(v.autore)} – {dataBreve(v.data)}
                        {v.contesto && ` – ${v.contesto}`}
                      </p>
                      <p className="mt-1 font-display text-xl font-bold">{GIUDIZI[v.giudizio]}</p>
                      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
                        {AREE.map((a) => (
                          <div key={a.chiave}>
                            <dt className="text-grigio">{a.nome}</dt>
                            <dd className="font-semibold">{v[a.chiave]}/5</dd>
                            {v[`${a.chiave}_note`] && <dd className="text-grigio">{v[`${a.chiave}_note`]}</dd>}
                          </div>
                        ))}
                      </dl>
                      {v.commento && <p className="mt-3 whitespace-pre-line">{v.commento}</p>}
                    </li>
                  );
                }
                const c = e.c;
                if (e.tipo === 'creazione') {
                  return (
                    <li key={`n${c.id}`} className="px-4 text-sm text-grigio">
                      Scheda creata da{' '}
                      {c.autore
                        ? chi(c.autore)
                        : g.segnalato_da_squadra
                          ? `Mister ${g.segnalato_da_squadra}`
                          : 'importazione archivio storico'} – {dataBreve(c.created_at)}
                    </li>
                  );
                }
                return (
                  <li key={`c${c.id}`} className="px-4 text-sm text-grigio">
                    {chi(c.autore)} ha spostato da {c.da_stato && STATI[c.da_stato]} a{' '}
                    <strong className="text-inchiostro">{STATI[c.a_stato]}</strong>
                    {c.motivo && ` (${c.motivo})`} – {dataBreve(c.created_at)}
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <aside className="space-y-6">
          {/* Stato */}
          {gestore && (
            <form action={cambiaStato} className="space-y-3 rounded-xl border border-linea bg-white p-4">
              <h2 className="font-display text-xl font-bold">Cambia stato</h2>
              <input type="hidden" name="id" value={g.id} />
              <select name="stato" defaultValue={g.stato} className="campo">
                {Object.entries(STATI).map(([v, e]) => (
                  <option key={v} value={v}>{e}</option>
                ))}
              </select>
              <Etichetta testo="Motivo (se chiuso)">
                <select name="motivo_chiusura" defaultValue={g.motivo_chiusura ?? ''} className="campo">
                  <option value="">–</option>
                  {MOTIVI_CHIUSURA.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </Etichetta>
              <Etichetta testo="Rivedere dal (facoltativo)">
                <input type="date" name="rivedere_dal" defaultValue={g.rivedere_dal ?? ''} className="campo" />
              </Etichetta>
              <button className="bottone w-full">Aggiorna stato</button>
            </form>
          )}

          {/* Contatti */}
          {(scrive || tutto) && (
            <section className="space-y-3 rounded-xl border border-linea bg-white p-4">
              <h2 className="font-display text-xl font-bold">Contatti</h2>
              <p className="text-xs text-grigio">
                Visibili solo ad admin e direttori{tutto ? '' : ' (e a te, per quelli che inserisci)'}.
              </p>
              {elencoContatti.length > 0 && (
                <ul className="divide-y divide-linea text-sm">
                  {elencoContatti.map((c) => (
                    <li key={c.id} className="flex items-start justify-between gap-2 py-2">
                      <span>
                        <span className="font-medium">{c.nome ?? '–'}</span>{' '}
                        <span className="text-grigio">({c.tipo})</span>
                        {c.telefono && (
                          <a href={`tel:${c.telefono}`} className="block text-blu">{c.telefono}</a>
                        )}
                        {c.email && (
                          <a href={`mailto:${c.email}`} className="block text-blu">{c.email}</a>
                        )}
                        {!c.consenso_privacy && <span className="block text-xs text-rosso">Consenso privacy non registrato</span>}
                        <span className="block text-xs text-grigio">Aggiunto da {chi(c.autore)}</span>
                      </span>
                      {scrive && (
                        <form action={eliminaContatto}>
                          <input type="hidden" name="id" value={g.id} />
                          <input type="hidden" name="contatto_id" value={c.id} />
                          <button className="text-xs text-grigio hover:text-rosso" aria-label="Elimina contatto">Elimina</button>
                        </form>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {scrive && (
                <details>
                  <summary className="cursor-pointer text-sm font-semibold text-blu">Aggiungi contatto</summary>
                  <form action={aggiungiContatto} className="mt-3 space-y-3">
                    <input type="hidden" name="id" value={g.id} />
                    <select name="tipo" className="campo" defaultValue="genitore">
                      <option value="genitore">Genitore</option>
                      <option value="giocatore">Giocatore</option>
                      <option value="altro">Altro</option>
                    </select>
                    <input name="nome" placeholder="Nome (es. mamma Laura)" className="campo" />
                    <input name="telefono" type="tel" placeholder="Telefono" className="campo" />
                    <input name="email" type="email" placeholder="Email" className="campo" />
                    <label className="flex items-start gap-2 text-sm">
                      <input type="checkbox" name="consenso" className="mt-1" />
                      La famiglia ha dato il consenso al trattamento dei dati
                    </label>
                    <button className="bottone w-full">Salva contatto</button>
                  </form>
                </details>
              )}
            </section>
          )}

          {/* Dati */}
          {modifica && (
            <details className="rounded-xl border border-linea bg-white p-4">
              <summary className="cursor-pointer font-display text-xl font-bold">Modifica dati</summary>
              <form action={aggiornaGiocatore} className="mt-3 space-y-3">
                <input type="hidden" name="id" value={g.id} />
                <Etichetta testo="Cognome"><input name="cognome" defaultValue={g.cognome ?? ''} className="campo" /></Etichetta>
                <Etichetta testo="Nome"><input name="nome" defaultValue={g.nome ?? ''} className="campo" /></Etichetta>
                <Etichetta testo="Come riconoscerlo"><input name="descrizione" defaultValue={g.descrizione ?? ''} className="campo" /></Etichetta>
                <div className="grid grid-cols-2 gap-3">
                  <Etichetta testo="Annata">
                    <select name="annata" defaultValue={g.annata} className="campo">
                      {annateDisponibili().map((a) => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>
                  </Etichetta>
                  <Etichetta testo="Categoria" aiuto={`Solo se non gioca in ${categoriaDaAnnata(g.annata)}`}>
                    <input name="categoria" defaultValue={g.categoria ?? ''} placeholder={categoriaDaAnnata(g.annata)} className="campo" />
                  </Etichetta>
                  <Etichetta testo="Nato il">
                    <input type="date" name="data_nascita" defaultValue={g.data_nascita ?? ''} className="campo" />
                  </Etichetta>
                  <Etichetta testo="Ruolo">
                    <select name="ruolo" defaultValue={g.ruolo ?? ''} className="campo">
                      <option value="">–</option>
                      {Object.entries(RUOLI_CAMPO).map(([v, e]) => (
                        <option key={v} value={v}>{e}</option>
                      ))}
                    </select>
                  </Etichetta>
                  <Etichetta testo="Piede">
                    <select name="piede" defaultValue={g.piede ?? ''} className="campo">
                      <option value="">–</option>
                      {Object.entries(PIEDI).map(([v, e]) => (
                        <option key={v} value={v}>{e}</option>
                      ))}
                    </select>
                  </Etichetta>
                </div>
                <Etichetta testo="Società">
                  <input name="societa" list="societa-modifica" defaultValue={g.societa?.nome ?? ''} className="campo" autoComplete="off" />
                  <datalist id="societa-modifica">
                    {societa.map((s) => (
                      <option key={s.id} value={s.nome} />
                    ))}
                  </datalist>
                </Etichetta>
                <Etichetta testo="Note interne"><textarea name="note" rows={3} defaultValue={g.note ?? ''} className="campo" /></Etichetta>
                <button className="bottone w-full">Salva dati</button>
              </form>
            </details>
          )}
        </aside>
      </div>
    </div>
  );
}
