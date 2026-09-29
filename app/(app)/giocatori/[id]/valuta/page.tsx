import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getProfilo } from '@/lib/auth';
import { puoSegnalare } from '@/lib/ruoli';
import { DETTAGLI_VALUTAZIONE, GIUDIZI } from '@/lib/tipi';
import { oggiIso } from '@/lib/utili';
import { Avviso } from '@/components/Avviso';
import { Etichetta } from '@/components/Etichetta';
import { Voto } from '@/components/Voto';
import { salvaValutazione } from '../../actions';

export default async function Valuta({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ errore?: string; gia?: string; nota?: string; contesto?: string; data?: string }>;
}) {
  const { id } = await params;
  // gia=1: arriva da una segnalazione di un giocatore già in lista (quello che si era scritto va nel commento)
  const { errore, gia, nota, contesto, data } = await searchParams;
  const profilo = (await getProfilo())!;
  if (!puoSegnalare(profilo.ruolo)) redirect(`/giocatori/${id}`);

  const supabase = await createClient();
  const { data: g } = await supabase
    .from('giocatori')
    .select('id, cognome, nome, descrizione, annata')
    .eq('id', id)
    .maybeSingle();
  if (!g) notFound();

  const titolo = [g.cognome, g.nome].filter(Boolean).join(' ') || g.descrizione;

  return (
    <div className="max-w-2xl">
      <Link href={`/giocatori/${g.id}`} className="text-sm text-grigio hover:text-blu">‹ {titolo}</Link>
      <h1 className="mt-2 font-display text-4xl font-bold">Valutazione</h1>
      <p className="text-grigio">{titolo} – {g.annata}</p>

      <form action={salvaValutazione} className="mt-6 space-y-6">
        <Avviso errore={errore} />
        {gia && (
          <p className="rounded-xl border-l-4 border-oro bg-carta p-4 text-sm">
            <b>{titolo} è già in lista.</b> Invece di una nuova segnalazione, compila la valutazione: quello che avevi scritto è già
            nel commento finale.
          </p>
        )}
        <input type="hidden" name="id" value={g.id} />


        <fieldset className="space-y-3 rounded-xl border border-linea bg-white p-4">
          <legend className="px-1 font-display text-2xl font-bold">Nel dettaglio <span className="text-base font-normal text-grigio">(facoltativo)</span></legend>
          <p className="-mt-2 text-sm text-grigio">Da 1 a 5; lascia &quot;–&quot; su quello che non hai visto.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {DETTAGLI_VALUTAZIONE.map((d) => (
              <div key={d.chiave}>
                <span className="block text-sm font-semibold">{d.nome}</span>
                <span className="mb-1 block text-xs text-grigio">{d.aiuto}</span>
                <Voto nome={d.chiave} facoltativo />
              </div>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-3 rounded-xl border border-linea bg-white p-4">
          <legend className="px-1 font-display text-2xl font-bold">Giudizio finale</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {Object.entries(GIUDIZI).map(([v, e]) => (
              <label key={v}>
                <input type="radio" name="giudizio" value={v} required className="peer sr-only" />
                <span className="block cursor-pointer rounded-lg border border-linea px-3 py-3 text-center font-semibold peer-checked:border-blu peer-checked:bg-blu peer-checked:text-white peer-focus-visible:outline peer-focus-visible:outline-3 peer-focus-visible:outline-oro">
                  {e}
                </span>
              </label>
            ))}
          </div>
          <textarea name="commento" rows={4} placeholder="Commento finale" className="campo" defaultValue={nota ?? ''} />
        </fieldset>

        <div className="grid grid-cols-[1fr_auto] gap-3">
          <Etichetta testo="Partita o occasione">
            <input name="contesto" className="campo" placeholder="Es. Open day, amichevole…" defaultValue={contesto ?? ''} />
          </Etichetta>
          <Etichetta testo="Data">
            <input type="date" name="data" defaultValue={data || oggiIso()} className="campo" />
          </Etichetta>
        </div>

        <button className="bottone w-full">Salva valutazione</button>
      </form>
    </div>
  );
}
