import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getProfilo } from '@/lib/auth';
import { gestisce } from '@/lib/ruoli';
import { elencoSocieta } from '@/lib/societa';
import { squadreSeguite } from '@/lib/gare';
import { dataOraBreve, istanteTraOre, normalizza } from '@/lib/utili';
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
  searchParams: Promise<{ ok?: string; errore?: string; campo?: string }>;
}) {
  const profilo = (await getProfilo())!;
  if (!gestisce(profilo.ruolo)) redirect('/gare');

  const { ok, errore, campo: cercaCampo } = await searchParams;
  const supabase = await createClient();
  const [seguite, societa, { data: prossime }] = await Promise.all([
    squadreSeguite(supabase),
    elencoSocieta(supabase),
    // Solo le gare inserite a mano (quelle dei calendari hanno la chiave)
    supabase
      .from('gare')
      .select('id, data_ora, categoria, casa_nome, trasferta_nome')
      .is('chiave', null)
      .gte('data_ora', istanteTraOre(0))
      .order('data_ora')
      .limit(60),
  ]);
  const senzaCampo = societa.filter((s) => s.lat === null).length;
  const cerca = normalizza(cercaCampo ?? '');
  const trovate = cerca
    ? societa.filter((s) => [s.nome, ...(s.alias ?? [])].some((n) => normalizza(n).includes(cerca))).slice(0, 20)
    : [];

  return (
    <div className="space-y-10">
      <div>
        <Link href="/gare" className="text-sm text-grigio hover:text-blu">‹ Gare da vedere</Link>
        <h1 className="mt-2 font-display text-4xl font-bold">Squadre e gare</h1>
        <p className="mt-1 max-w-2xl text-grigio">
          Le gare dei campionati arrivano già dai calendari ufficiali e dai comunicati. Qui scegli le squadre da seguire,
          aggiungi le gare che nei calendari non ci sono e completi i campi delle società.
        </p>
      </div>

      <Avviso ok={ok} errore={errore} />

      {/* Squadre seguite */}
      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="font-display text-2xl font-bold">Squadre da seguire</h2>
          <p className="text-sm text-grigio">
            Le loro gare compaiono in “Da seguire” nella pagina Gare, anche senza giocatori segnalati.
            Quelle delle squadre con giocatori segnalati ci sono già in automatico.
          </p>
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
          <Etichetta testo="Categoria">
            <select name="categoria" className="campo">
              <option value="">Tutte le categorie</option>
              {['Under 19', 'Under 17', 'Under 16', 'Under 15', 'Under 14', 'Esordienti', 'Pulcini'].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
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
          <h2 className="font-display text-2xl font-bold">Gare fuori calendario</h2>
          <p className="text-sm text-grigio">
            Tornei, amichevoli, Esordienti e Pulcini, campionati di cui non abbiamo il calendario. Una gara per riga,
            colonne separate da punto e virgola o copiate da Excel; le ultime tre sono facoltative.
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
        <h2 className="font-display text-2xl font-bold">Gare inserite a mano</h2>
        <p className="text-sm text-grigio">Le prossime. Quelle dei calendari ufficiali non si eliminano da qui.</p>
        {!prossime?.length ? (
          <p className="mt-2 text-grigio">Nessuna gara inserita a mano in programma.</p>
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
        <p className="mt-2 text-sm">
          <strong>{senzaCampo}</strong> società su {societa.length} senza coordinate: per loro la distanza è “km ?”.
        </p>
        <form method="GET" className="mt-3 flex max-w-lg gap-2">
          <input name="campo" defaultValue={cercaCampo ?? ''} placeholder="Cerca una società" className="campo h-12 py-0" />
          <button className="bottone h-12 px-6">Cerca</button>
        </form>
        {cerca && trovate.length === 0 && <p className="mt-3 text-grigio">Nessuna società trovata.</p>}
        <div className="mt-3 space-y-2">
          {trovate.map((s) => (
            <details key={s.id} open={trovate.length === 1} className="rounded-xl border border-linea bg-white px-4 py-3">
              <summary className="cursor-pointer">
                <span className="font-semibold">{s.nome}</span>{' '}
                <span className="text-sm text-grigio">
                  {s.campo ?? 'campo da inserire'}{s.lat === null ? ' · senza coordinate' : ''}
                </span>
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
