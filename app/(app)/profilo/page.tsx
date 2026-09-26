import Link from 'next/link';
import { getProfilo } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { ETICHETTA_RUOLO, nomeCompleto } from '@/lib/ruoli';
import { GIUDIZI, type Giudizio } from '@/lib/tipi';
import { dataBreve, dataOraBreve, istanteTraOre } from '@/lib/utili';
import { PasswordForm } from './PasswordForm';

type Giocatore = { id: string; cognome: string | null; nome: string | null; descrizione: string | null; annata: number } | null;
type Segnalazione = { id: string; data: string; contesto: string | null; voto: number | null; giocatore: Giocatore };
type Valutazione = {
  id: string; data: string; tecnica: number; motoria: number; tattica: number; mentale: number; giudizio: Giudizio;
  giocatore: Giocatore;
};
type Prenotazione = {
  gara: { id: string; data_ora: string; ora_da_definire: boolean | null; categoria: string; casa_nome: string; trasferta_nome: string; campo: string | null } | null;
};

const QUANTE = 30;
const nomeDi = (g: Giocatore) => (g ? [g.cognome, g.nome].filter(Boolean).join(' ') || g.descrizione || 'Senza nome' : 'Scheda eliminata');

const COLORI_GIUDIZIO: Record<Giudizio, string> = {
  da_prendere: 'bg-blu text-white',
  da_rivedere: 'bg-oro/25 text-inchiostro',
  non_a_livello: 'bg-rosso/10 text-rosso',
};

/** Le mie attività: gare a cui vado, segnalazioni e valutazioni fatte da me */
export default async function Attivita() {
  const profilo = (await getProfilo())!;
  const supabase = await createClient();
  const GIOCATORE = 'giocatore:giocatori(id, cognome, nome, descrizione, annata)';

  const [seg, val, pren] = await Promise.all([
    supabase.from('segnalazioni').select(`id, data, contesto, voto, ${GIOCATORE}`, { count: 'exact' })
      .eq('autore_id', profilo.id).order('data', { ascending: false }).limit(QUANTE),
    supabase.from('valutazioni').select(`id, data, tecnica, motoria, tattica, mentale, giudizio, ${GIOCATORE}`, { count: 'exact' })
      .eq('autore_id', profilo.id).order('data', { ascending: false }).limit(QUANTE),
    supabase.from('gare_osservatori')
      .select('gara:gare!inner(id, data_ora, ora_da_definire, categoria, casa_nome, trasferta_nome, campo)')
      .eq('profilo_id', profilo.id).gte('gara.data_ora', istanteTraOre(-3)),
  ]);
  const segnalazioni = (seg.data as unknown as Segnalazione[]) ?? [];
  const valutazioni = (val.data as unknown as Valutazione[]) ?? [];
  const gare = ((pren.data as unknown as Prenotazione[]) ?? [])
    .map((p) => p.gara)
    .filter((g): g is NonNullable<Prenotazione['gara']> => !!g)
    .sort((a, b) => a.data_ora.localeCompare(b.data_ora));

  const numeri = [
    { n: gare.length, testo: gare.length === 1 ? 'gara in programma' : 'gare in programma' },
    { n: seg.count ?? segnalazioni.length, testo: 'segnalazioni' },
    { n: val.count ?? valutazioni.length, testo: 'valutazioni' },
  ];

  return (
    <div className="space-y-8">
      <section>
        <h1 className="font-display text-4xl font-bold">{nomeCompleto({ ...profilo, email: '' })}</h1>
        <p className="mt-1 text-grigio">{ETICHETTA_RUOLO[profilo.ruolo]} · le mie attività</p>
        <div className="mt-4 grid grid-cols-3 gap-3 sm:max-w-lg">
          {numeri.map((x) => (
            <div key={x.testo} className="rounded-xl border border-linea bg-white p-3">
              <p className="font-display text-3xl font-bold text-blu">{x.n}</p>
              <p className="text-sm text-grigio">{x.testo}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Gare a cui ho detto "Ci vado io" */}
      <section>
        <h2 className="font-display text-2xl font-bold">Le mie prossime gare</h2>
        {gare.length === 0 ? (
          <p className="mt-2 text-grigio">
            Nessuna. Nella pagina <Link href="/gare" className="font-medium text-blu underline">Gare</Link> tocca
            “Ci vado io” sulle partite che andrai a vedere.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-linea rounded-xl border border-linea bg-white text-sm">
            {gare.map((g) => (
              <li key={g.id}>
                <Link href={`/gare/${g.id}`} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-2.5 hover:bg-carta">
                  <span className="font-semibold first-letter:uppercase">
                    {g.ora_da_definire ? `${dataOraBreve(g.data_ora).split(',')[0]} · ora da definire` : dataOraBreve(g.data_ora)}
                  </span>
                  <span>{g.casa_nome} – {g.trasferta_nome}</span>
                  <span className="text-grigio">{g.categoria}{g.campo ? ` · ${g.campo}` : ''}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Segnalazioni */}
        <section>
          <h2 className="font-display text-2xl font-bold">Le mie segnalazioni</h2>
          {segnalazioni.length === 0 ? (
            <p className="mt-2 text-grigio">
              Ancora nessuna. <Link href="/segnala" className="font-medium text-blu underline">Segnala un giocatore</Link>.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-linea rounded-xl border border-linea bg-white text-sm">
              {segnalazioni.map((s) => (
                <li key={s.id}>
                  <Link href={s.giocatore ? `/giocatori/${s.giocatore.id}` : '#'} className="flex items-center gap-3 px-4 py-2.5 hover:bg-carta">
                    <span className="w-24 shrink-0 text-grigio">{dataBreve(s.data)}</span>
                    <span className="min-w-0 flex-1 truncate">
                      <span className="font-semibold">{nomeDi(s.giocatore)}</span>
                      {s.giocatore && <span className="text-grigio"> · {s.giocatore.annata}</span>}
                      {s.contesto && <span className="text-grigio"> · {s.contesto}</span>}
                    </span>
                    {s.voto && <span className="shrink-0 font-semibold text-blu">{s.voto}/5</span>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {(seg.count ?? 0) > QUANTE && <p className="mt-2 text-sm text-grigio">Le ultime {QUANTE} di {seg.count}.</p>}
        </section>

        {/* Valutazioni */}
        <section>
          <h2 className="font-display text-2xl font-bold">Le mie valutazioni</h2>
          {valutazioni.length === 0 ? (
            <p className="mt-2 text-grigio">Ancora nessuna. Le valutazioni si fanno dalla scheda del giocatore.</p>
          ) : (
            <ul className="mt-3 divide-y divide-linea rounded-xl border border-linea bg-white text-sm">
              {valutazioni.map((v) => (
                <li key={v.id}>
                  <Link href={v.giocatore ? `/giocatori/${v.giocatore.id}` : '#'} className="flex items-center gap-3 px-4 py-2.5 hover:bg-carta">
                    <span className="w-24 shrink-0 text-grigio">{dataBreve(v.data)}</span>
                    <span className="min-w-0 flex-1 truncate">
                      <span className="font-semibold">{nomeDi(v.giocatore)}</span>
                      {v.giocatore && <span className="text-grigio"> · {v.giocatore.annata}</span>}
                    </span>
                    <span className="shrink-0 font-semibold text-blu">
                      {((v.tecnica + v.motoria + v.tattica + v.mentale) / 4).toFixed(1).replace('.', ',')}
                    </span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${COLORI_GIUDIZIO[v.giudizio]}`}>
                      {GIUDIZI[v.giudizio]}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {(val.count ?? 0) > QUANTE && <p className="mt-2 text-sm text-grigio">Le ultime {QUANTE} di {val.count}.</p>}
        </section>
      </div>

      {profilo.ruolo === 'admin' ? (
        <section className="max-w-md">
          <h2 className="font-display text-2xl font-bold">Cambia password</h2>
          <p className="mb-4 mt-1 text-sm text-grigio">Serve solo all’admin, che entra anche con email e password.</p>
          <PasswordForm />
        </section>
      ) : (
        <p className="text-sm text-grigio">
          Entri con il tuo PIN personale. Se lo perdi o vuoi cambiarlo, lo rigenerano l’admin o un direttore, in Società.
        </p>
      )}
    </div>
  );
}
