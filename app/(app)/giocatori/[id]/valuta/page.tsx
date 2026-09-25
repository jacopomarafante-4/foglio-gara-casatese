import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getProfilo } from '@/lib/auth';
import { puoSegnalare } from '@/lib/ruoli';
import { AREE, GIUDIZI } from '@/lib/tipi';
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
  searchParams: Promise<{ errore?: string }>;
}) {
  const { id } = await params;
  const { errore } = await searchParams;
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
        <input type="hidden" name="id" value={g.id} />

        {AREE.map((a) => (
          <fieldset key={a.chiave} className="space-y-3 rounded-xl border border-linea bg-white p-4">
            <legend className="px-1 font-display text-2xl font-bold">{a.nome}</legend>
            <p className="-mt-2 text-sm text-grigio">{a.aiuto}</p>
            <Voto nome={a.chiave} obbligatorio />
            <textarea name={`${a.chiave}_note`} rows={2} placeholder="Note (facoltative)" className="campo" />
          </fieldset>
        ))}

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
          <textarea name="commento" rows={4} placeholder="Commento finale" className="campo" />
        </fieldset>

        <div className="grid grid-cols-[1fr_auto] gap-3">
          <Etichetta testo="Partita o occasione">
            <input name="contesto" className="campo" placeholder="Es. Open day, amichevole…" />
          </Etichetta>
          <Etichetta testo="Data">
            <input type="date" name="data" defaultValue={oggiIso()} className="campo" />
          </Etichetta>
        </div>

        <button className="bottone w-full">Salva valutazione</button>
      </form>
    </div>
  );
}
