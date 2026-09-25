import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getProfilo } from '@/lib/auth';
import { gestisce, puoSegnalare } from '@/lib/ruoli';
import { arricchisci, giocatoriDellaGara, SELECT_GARA, squadreSeguite, type Gara, type GiocatoreInGara, type Sede } from '@/lib/gare';
import { GaraCard } from '@/components/GaraCard';
import { istanteTraOre } from '@/lib/utili';

export default async function Gare({
  searchParams,
}: {
  searchParams: Promise<{ sede?: string; km?: string; periodo?: string; tutte?: string }>;
}) {
  const filtri = await searchParams;
  const profilo = (await getProfilo())!;
  const supabase = await createClient();

  const km = Math.max(1, Number(filtri.km) || 25);
  const giorni = filtri.periodo === 'tutte' ? null : 7;
  const soloSeguite = filtri.tutte !== '1';

  // Da 3 ore fa (gare appena iniziate) ai prossimi N giorni
  let q = supabase.from('gare').select(SELECT_GARA).gte('data_ora', istanteTraOre(-3)).order('data_ora');
  if (giorni) q = q.lte('data_ora', istanteTraOre(giorni * 24));

  const [{ data: sediData }, seguite, { data: gareData, error }] = await Promise.all([
    supabase.from('sedi').select('id, nome, lat, lon').order('id'),
    squadreSeguite(supabase),
    q,
  ]);

  const sedi = (sediData as Sede[]) ?? [];
  const sede = sedi.find((s) => String(s.id) === filtri.sede) ?? sedi[0] ?? null;

  // Giocatori segnalati delle società che giocano queste gare
  const tutteLeGare = (gareData as unknown as Gara[]) ?? [];
  const idSocieta = [...new Set(tutteLeGare.flatMap((g) => [g.casa_id, g.trasferta_id]).filter((x): x is string => !!x))];
  const { data: giocatoriData } = idSocieta.length
    ? await supabase
        .from('giocatori')
        // `*`: la colonna categoria esiste solo dalla migrazione 0013
        .select('*')
        .in('societa_id', idSocieta)
        .eq('osservato', true)
        .not('stato', 'in', '(chiuso,inserito)')
    : { data: [] };
  const giocatori = (giocatoriData as GiocatoreInGara[] | null) ?? [];

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
            {scoperte > 0 && <> – <strong className="text-inchiostro">{scoperte} senza osservatore</strong></>}
          </p>
        </div>
        {gestisce(profilo.ruolo) && (
          <Link href="/gare/gestione" className="bottone">Gestisci gare e squadre</Link>
        )}
      </div>

      <form method="GET" className="grid grid-cols-2 gap-3 rounded-xl border border-linea bg-white p-4 sm:grid-cols-5">
        <label className="block">
          <span className="mb-1 block text-xs text-grigio">Distanza da</span>
          <select name="sede" defaultValue={sede ? String(sede.id) : ''} className="campo">
            {sedi.map((s) => (
              <option key={s.id} value={s.id}>{s.nome}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-grigio">Entro km</span>
          <input type="number" name="km" min={1} max={200} defaultValue={km} className="campo" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-grigio">Periodo</span>
          <select name="periodo" defaultValue={giorni ? '' : 'tutte'} className="campo">
            <option value="">Prossimi 7 giorni</option>
            <option value="tutte">Tutte le prossime</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-grigio">Squadre</span>
          <select name="tutte" defaultValue={soloSeguite ? '' : '1'} className="campo">
            <option value="">Seguite o con giocatori segnalati</option>
            <option value="1">Tutte le gare</option>
          </select>
        </label>
        <button className="bottone col-span-2 self-end sm:col-span-1">Aggiorna</button>
      </form>

      {error && <p className="text-rosso">Errore nel caricamento: {error.message}</p>}

      {gare.length === 0 ? (
        <div className="rounded-xl border border-dashed border-linea p-10 text-center text-grigio">
          Nessuna gara con questi filtri.
          {gestisce(profilo.ruolo) && (
            <>
              {' '}
              <Link href="/gare/gestione" className="font-medium text-blu underline">Aggiungi le gare</Link>{' '}
              o le squadre da seguire.
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
