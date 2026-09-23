import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getProfilo } from '@/lib/auth';
import { vedeTutto } from '@/lib/ruoli';
import { elencoSocieta } from '@/lib/societa';
import { squadreSeguite } from '@/lib/gare';
import { dataOraBreve, istanteTraOre } from '@/lib/utili';
import { Avviso } from '@/components/Avviso';
import { Etichetta } from '@/components/Etichetta';
import {
  aggiornaCampo, aggiungiSquadraSeguita, eliminaGara, importaGare, rimuoviSquadraSeguita,
} from '../actions';

const ESEMPIO = `27/09/2026;15:30;U13 Provinciali;Cambiaghese;Vibe Ronchese;Comunale Cambiago;Via Indipendenza 1, Cambiago;45.5717, 9.4231
28/09/2026;10:00;U12;Osgb Merate;Cisanese`;

export default async function GestioneGare({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; errore?: string }>;
}) {
  const profilo = (await getProfilo())!;
  if (!vedeTutto(profilo.ruolo)) redirect('/gare');

  const { ok, errore } = await searchParams;
  const supabase = await createClient();
  const [seguite, societa, { data: prossime }] = await Promise.all([
    squadreSeguite(supabase),
    elencoSocieta(supabase),
    supabase
      .from('gare')
      .select('id, data_ora, categoria, casa_nome, trasferta_nome')
      .gte('data_ora', istanteTraOre(0))
      .order('data_ora')
      .limit(60),
  ]);
  const senzaCampo = societa.filter((s) => s.lat === null);

  return (
    <div className="space-y-10">
      <div>
        <Link href="/gare" className="text-sm text-grigio hover:text-blu">‹ Gare da vedere</Link>
        <h1 className="mt-2 font-display text-4xl font-bold">Gestisci gare e squadre</h1>
      </div>

      <Avviso ok={ok} errore={errore} />

      {/* Squadre seguite */}
      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="font-display text-2xl font-bold">Squadre da seguire</h2>
          <p className="text-sm text-grigio">Le loro gare compaiono in evidenza nella pagina Gare.</p>
          {seguite.length === 0 ? (
            <p className="mt-3 text-grigio">Nessuna squadra ancora.</p>
          ) : (
            <ul className="mt-3 divide-y divide-linea rounded-xl border border-linea bg-white">
              {seguite.map((s) => (
                <li key={s.id} className="flex items-start justify-between gap-3 px-4 py-3">
                  <span>
                    <span className="font-semibold">{s.societa?.nome}</span>{' '}
                    <span className="text-grigio">{s.categoria ?? 'tutte le categorie'}</span>
                    {s.motivo && <span className="block text-sm text-grigio">{s.motivo}</span>}
                  </span>
                  <form action={rimuoviSquadraSeguita}>
                    <input type="hidden" name="id" value={s.id} />
                    <button className="text-sm text-grigio hover:text-rosso">Rimuovi</button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </div>

        <form action={aggiungiSquadraSeguita} className="space-y-3 self-start rounded-xl border border-linea bg-white p-4">
          <h3 className="font-display text-xl font-bold">Aggiungi squadra</h3>
          <Etichetta testo="Società *">
            <input name="societa" list="societa-seguite" required className="campo" autoComplete="off" />
            <datalist id="societa-seguite">
              {societa.map((s) => (
                <option key={s.id} value={s.nome} />
              ))}
            </datalist>
          </Etichetta>
          <Etichetta testo="Categoria" aiuto="Scrivila come nelle gare (es. U13 Provinciali). Vuota = tutte.">
            <input name="categoria" className="campo" />
          </Etichetta>
          <Etichetta testo="Perché la seguiamo">
            <input name="motivo" className="campo" placeholder="Es. Due 2013 da rivedere" />
          </Etichetta>
          <button className="bottone w-full">Aggiungi</button>
        </form>
      </section>

      {/* Importazione */}
      <section className="grid gap-6 lg:grid-cols-2">
        <form action={importaGare} className="space-y-3">
          <h2 className="font-display text-2xl font-bold">Aggiungi gare</h2>
          <p className="text-sm text-grigio">
            Una gara per riga, colonne separate da punto e virgola o copiate da Excel. Le ultime tre colonne sono facoltative.
            Se una gara esiste già viene aggiornata.
          </p>
          <textarea name="gare" rows={8} required className="campo font-mono text-sm" placeholder={ESEMPIO} />
          <Etichetta testo="Fonte (facoltativa)">
            <input name="fonte" type="url" className="campo" placeholder="Link al comunicato o a Tuttocampo" />
          </Etichetta>
          <button className="bottone">Salva gare</button>
        </form>

        <div className="rounded-xl bg-white p-4 text-sm">
          <h3 className="font-display text-xl font-bold">Ordine delle colonne</h3>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>Data (27/09/2026)</li>
            <li>Ora (15:30)</li>
            <li>Categoria</li>
            <li>Squadra di casa</li>
            <li>Squadra ospite</li>
            <li>Campo (facoltativo)</li>
            <li>Indirizzo (facoltativo)</li>
            <li>Coordinate (facoltative, da Google Maps)</li>
          </ol>
          <p className="mt-3 text-grigio">
            Senza coordinate, la distanza si calcola dal campo di casa della società, se l’hai inserito qui sotto.
          </p>
        </div>
      </section>

      {/* Prossime gare */}
      <section>
        <h2 className="font-display text-2xl font-bold">Prossime gare inserite</h2>
        {!prossime?.length ? (
          <p className="mt-2 text-grigio">Nessuna gara in programma.</p>
        ) : (
          <ul className="mt-3 divide-y divide-linea rounded-xl border border-linea bg-white text-sm">
            {prossime.map((g) => (
              <li key={g.id} className="flex items-center justify-between gap-3 px-4 py-2">
                <span>
                  <span className="text-grigio">{dataOraBreve(g.data_ora)}</span>{' '}
                  <span className="font-medium">{g.casa_nome} – {g.trasferta_nome}</span>{' '}
                  <span className="text-grigio">{g.categoria}</span>
                </span>
                <form action={eliminaGara}>
                  <input type="hidden" name="id" value={g.id} />
                  <button className="text-grigio hover:text-rosso">Elimina</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Campi delle società */}
      <section>
        <h2 className="font-display text-2xl font-bold">Campi delle società</h2>
        <p className="text-sm text-grigio">
          Inserisci il campo di casa una volta sola: servirà per tutte le gare future.
          Coordinate: su Google Maps tasto destro sul campo, poi clic sui numeri per copiarli.
        </p>
        {senzaCampo.length > 0 && (
          <p className="mt-2 text-sm"><strong>{senzaCampo.length}</strong> società senza coordinate.</p>
        )}
        <div className="mt-3 space-y-2">
          {[...senzaCampo, ...societa.filter((s) => s.lat !== null)].map((s) => (
            <details key={s.id} className="rounded-xl border border-linea bg-white px-4 py-3">
              <summary className="cursor-pointer">
                <span className="font-semibold">{s.nome}</span>{' '}
                <span className="text-sm text-grigio">{s.lat !== null ? s.campo ?? 'coordinate inserite' : 'campo da inserire'}</span>
              </summary>
              <form action={aggiornaCampo} className="mt-3 grid gap-3 sm:grid-cols-4">
                <input type="hidden" name="id" value={s.id} />
                <input name="campo" defaultValue={s.campo ?? ''} placeholder="Nome campo" className="campo" />
                <input name="indirizzo" defaultValue={s.indirizzo ?? ''} placeholder="Indirizzo" className="campo" />
                <input
                  name="coordinate"
                  defaultValue={s.lat !== null ? `${s.lat}, ${s.lon}` : ''}
                  placeholder="45.6977, 9.3120"
                  className="campo"
                />
                <button className="bottone">Salva</button>
              </form>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
