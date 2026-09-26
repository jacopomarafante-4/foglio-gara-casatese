import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getProfilo } from '@/lib/auth';
import { gestisce, puoSegnalare } from '@/lib/ruoli';
import { arricchisci, giocatoriDellaGara, SELECT_GARA, squadreSeguite, type Gara, type GiocatoreInGara, type Sede } from '@/lib/gare';
import { GaraCard } from '@/components/GaraCard';
import { istanteTraOre } from '@/lib/utili';

const CATEGORIE = ['Under 19', 'Under 17', 'Under 16', 'Under 15', 'Under 14'];
const LIMITE = 1000;

export default async function Gare({
  searchParams,
}: {
  searchParams: Promise<{ sede?: string; km?: string; periodo?: string; tutte?: string; categoria?: string }>;
}) {
  const filtri = await searchParams;
  const profilo = (await getProfilo())!;
  const supabase = await createClient();

  const km = Math.max(1, Number(filtri.km) || 25);
  const giorni = filtri.periodo === 'tutte' ? null : 7;
  const soloSeguite = filtri.tutte !== '1';

  const categoria = CATEGORIE.includes(filtri.categoria ?? '') ? filtri.categoria! : '';

  // Prima le società che interessano: squadre seguite e società dei giocatori segnalati ancora aperti.
  // Con i calendari le gare sono migliaia: si caricano solo quelle che servono.
  const [{ data: sediData }, seguite, { data: giocatoriData }] = await Promise.all([
    supabase.from('sedi').select('id, nome, lat, lon').order('id'),
    squadreSeguite(supabase),
    supabase
      .from('giocatori')
      // `*`: la colonna categoria esiste solo dalla migrazione 0013
      .select('*')
      .not('societa_id', 'is', null)
      .eq('osservato', true)
      .not('stato', 'in', '(inserito,da_non_inserire)'),
  ]);
  const giocatori = (giocatoriData as GiocatoreInGara[] | null) ?? [];
  const interessano = [...new Set([
    ...seguite.filter((s) => s.attiva).map((s) => s.societa_id),
    ...giocatori.map((g) => g.societa_id).filter((x): x is string => !!x),
  ])];

  // Da 3 ore fa (gare appena iniziate) ai prossimi N giorni
  let q = supabase.from('gare').select(SELECT_GARA).gte('data_ora', istanteTraOre(-3)).order('data_ora').limit(LIMITE);
  if (giorni) q = q.lte('data_ora', istanteTraOre(giorni * 24));
  if (categoria) q = q.ilike('categoria', `${categoria}%`);
  if (soloSeguite) {
    const elenco = interessano.join(',');
    q = q.or(`casa_id.in.(${elenco}),trasferta_id.in.(${elenco})`);
  }
  const { data: gareData, error } = soloSeguite && !interessano.length ? { data: [], error: null } : await q;

  const sedi = (sediData as Sede[]) ?? [];
  const sede = sedi.find((s) => String(s.id) === filtri.sede) ?? sedi[0] ?? null;
  const tutteLeGare = (gareData as unknown as Gara[]) ?? [];

  const gare = tutteLeGare
    .map((g) => ({ ...arricchisci(g, sede, seguite), giocatori: giocatoriDellaGara(g, giocatori) }))
    .filter((g) => !soloSeguite || g.seguite.length > 0 || g.giocatori.length > 0)
    .filter((g) => g.distanza === null || g.distanza <= km);

  // Raggruppate per giorno
  const perGiorno = new Map<string, typeof gare>();
  for (const g of gare) {
    const giorno = new Date(g.data_ora).toLocaleDateString('it-IT', {
      timeZone: 'Europe/Rome', weekday: 'long', day: 'numeric', month: 'long',
    });
    perGiorno.set(giorno, [...(perGiorno.get(giorno) ?? []), g]);
  }
  const scoperte = gare.filter((g) => (g.seguite.length > 0 || g.giocatori.length > 0) && g.osservatori.length === 0).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl font-bold">Gare da vedere</h1>
          <p className="text-grigio">
            {gare.length} gare
            {tutteLeGare.length === LIMITE && ' (le prime mille: restringi i filtri)'}
            {scoperte > 0 && <> – <strong className="text-inchiostro">{scoperte} senza osservatore</strong></>}
          </p>
        </div>
        {gestisce(profilo.ruolo) && (
          <Link href="/gare/gestione" className="bottone">Squadre e gare</Link>
        )}
      </div>

      {/* Filtri: tutti alti uguali (h-12), testi corti per non essere tagliati */}
      <form method="GET" className="grid grid-cols-2 items-end gap-3 rounded-xl border border-linea bg-white p-4 sm:grid-cols-3 lg:grid-cols-[repeat(5,minmax(0,1fr))_auto]">
        <label className="block">
          <span className="mb-1 block text-xs text-grigio">Distanza da</span>
          <select name="sede" defaultValue={sede ? String(sede.id) : ''} className="campo h-12 py-0">
            {sedi.map((s) => (
              <option key={s.id} value={s.id}>{s.nome}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-grigio">Entro km</span>
          <input type="number" name="km" min={1} max={200} defaultValue={km} className="campo h-12 py-0" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-grigio">Periodo</span>
          <select name="periodo" defaultValue={giorni ? '' : 'tutte'} className="campo h-12 py-0">
            <option value="">7 giorni</option>
            <option value="tutte">Tutte</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-grigio" title="Squadre seguite o con giocatori segnalati">Gare</span>
          <select name="tutte" defaultValue={soloSeguite ? '' : '1'} className="campo h-12 py-0">
            <option value="">Da seguire</option>
            <option value="1">Tutte</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-grigio">Categoria</span>
          <select name="categoria" defaultValue={categoria} className="campo h-12 py-0">
            <option value="">Tutte</option>
            {CATEGORIE.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
        <button className="bottone col-span-2 h-12 px-6 sm:col-span-1">Aggiorna</button>
      </form>
      <p className="-mt-3 text-xs text-grigio">
        “Da seguire” = gare delle squadre seguite o con giocatori segnalati.
      </p>

      {error && <p className="text-rosso">Errore nel caricamento: {error.message}</p>}

      {gare.length === 0 ? (
        <div className="rounded-xl border border-dashed border-linea p-10 text-center text-grigio">
          Nessuna gara con questi filtri.
          {gestisce(profilo.ruolo) && (
            <>
              {' '}
              <Link href="/gare/gestione" className="font-medium text-blu underline">Aggiungi squadre da seguire</Link>{' '}
              o gare fuori calendario.
            </>
          )}
        </div>
      ) : (
        [...perGiorno].map(([giorno, lista]) => (
          <section key={giorno}>
            <h2 className="mb-3 font-display text-2xl font-bold first-letter:uppercase">{giorno}</h2>
            <div className="space-y-3">
              {lista.map((g) => (
                <GaraCard key={g.id} gara={g} mioId={profilo.id} puoPrenotarsi={puoSegnalare(profilo.ruolo)} />
              ))}
            </div>
          </section>
        ))
      )}

      <p className="text-xs text-grigio">
        Distanze in linea d’aria dal centro scelto. Le gare senza coordinate del campo sono sempre mostrate con “km ?”.
      </p>
    </div>
  );
}
