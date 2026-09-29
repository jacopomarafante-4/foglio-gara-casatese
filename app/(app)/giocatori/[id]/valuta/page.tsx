import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getProfilo } from '@/lib/auth';
import { puoSegnalare } from '@/lib/ruoli';
import { DETTAGLI_VALUTAZIONE, GIUDIZI, GRUPPI_VALUTAZIONE } from '@/lib/tipi';
import { oggiIso } from '@/lib/utili';
import { Avviso } from '@/components/Avviso';
import { Etichetta } from '@/components/Etichetta';
import { BarraSalva, RigaVoto, Sezione } from '@/components/Sezione';
import { salvaValutazione } from '../../actions';

const TONI_GIUDIZIO: Record<string, string> = {
  da_prendere: 'peer-checked:border-blu peer-checked:bg-blu peer-checked:text-white',
  da_rivedere: 'peer-checked:border-oro peer-checked:bg-oro peer-checked:text-inchiostro',
  non_a_livello: 'peer-checked:border-rosso peer-checked:bg-rosso peer-checked:text-white',
};

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

      <form action={salvaValutazione} className="mt-6 space-y-4">
        <Avviso errore={errore} />
        {gia && (
          <p className="rounded-xl border-l-4 border-oro bg-carta p-4 text-sm">
            <b>{titolo} è già in lista.</b> Invece di una nuova segnalazione, compila la valutazione: quello che avevi scritto è già
            nel commento.
          </p>
        )}
        <input type="hidden" name="id" value={g.id} />

        <Sezione n={1} titolo="Giudizio *" sotto="La tua conclusione su questo ragazzo.">
          <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Giudizio">
            {Object.entries(GIUDIZI).map(([v, e]) => (
              <label key={v}>
                <input type="radio" name="giudizio" value={v} required className="peer sr-only" />
                <span className={`block min-h-11 cursor-pointer rounded-lg border border-linea bg-white px-3 py-3 text-center font-semibold hover:border-blu peer-focus-visible:outline peer-focus-visible:outline-3 peer-focus-visible:outline-oro ${TONI_GIUDIZIO[v]}`}>
                  {e}
                </span>
              </label>
            ))}
          </div>
          <Etichetta testo="Perché">
            <textarea name="commento" rows={4} className="campo" defaultValue={nota ?? ''} placeholder="Punti di forza, cosa migliorare, cosa rivedere la prossima volta…" />
          </Etichetta>
        </Sezione>

        <Sezione n={2} titolo="Nel dettaglio" sotto="Da 1 (debole) a 5 (ottimo). Vota solo quello che hai visto; tocca di nuovo per togliere." facoltativo>
          {GRUPPI_VALUTAZIONE.map((gr) => (
            <div key={gr}>
              <h3 className="mb-1 border-b-2 border-blu/15 pb-1 font-display text-sm font-bold uppercase tracking-wide text-blu">{gr}</h3>
              <div className="space-y-3">
                {DETTAGLI_VALUTAZIONE.filter((d) => d.gruppo === gr).map((d) => <RigaVoto key={d.chiave} nome={d.chiave} titolo={d.nome} aiuto={d.aiuto} />)}
              </div>
            </div>
          ))}
        </Sezione>

        <Sezione n={3} titolo="Dove e quando">
          <div className="grid grid-cols-[1fr_auto] gap-3">
            <Etichetta testo="Partita o occasione">
              <input name="contesto" className="campo" placeholder="Es. Open day, amichevole…" defaultValue={contesto ?? ''} />
            </Etichetta>
            <Etichetta testo="Data">
              <input type="date" name="data" defaultValue={data || oggiIso()} className="campo" />
            </Etichetta>
          </div>
        </Sezione>

        <BarraSalva testo="Salva valutazione" nota="* obbligatorio: il giudizio" />
      </form>
    </div>
  );
}
