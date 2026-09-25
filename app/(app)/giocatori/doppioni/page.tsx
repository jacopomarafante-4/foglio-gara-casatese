import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getProfilo } from '@/lib/auth';
import { gestisce } from '@/lib/ruoli';
import { createClient } from '@/lib/supabase/server';
import { chiaveCoppia, trovaDoppioni, type Candidato } from '@/lib/doppioni';
import { RUOLI_CAMPO, type RuoloCampo, type StatoGiocatore } from '@/lib/tipi';
import { Avviso } from '@/components/Avviso';
import { StatoBadge } from '@/components/StatoBadge';
import { segnaPersoneDiverse, unisciGiocatori } from '../actions';

type Scheda = Candidato & {
  ruolo: RuoloCampo | null;
  stato: StatoGiocatore;
  societa: { nome: string } | null;
  segnalazioni: { count: number }[];
  valutazioni: { count: number }[];
  contatti: { count: number }[];
};

const nomeDi = (g: Scheda) => [g.cognome, g.nome].filter(Boolean).join(' ') || g.descrizione || 'Senza nome';
const conta = (g: Scheda) =>
  (g.segnalazioni[0]?.count ?? 0) + (g.valutazioni[0]?.count ?? 0) + (g.contatti[0]?.count ?? 0);
/** Quanti dati ha una scheda: si consiglia di tenere la più completa */
const completezza = (g: Scheda) =>
  conta(g) * 3 + [g.cognome, g.nome, g.ruolo, g.societa_id].filter(Boolean).length;

/** Possibili schede doppie dello stesso giocatore: le unisce solo l'admin */
export default async function Doppioni({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; errore?: string }>;
}) {
  const profilo = (await getProfilo())!;
  if (!gestisce(profilo.ruolo)) redirect('/giocatori');
  const { ok, errore } = await searchParams;
  const supabase = await createClient();

  const [{ data }, { data: esclusi }] = await Promise.all([
    supabase
      .from('giocatori')
      .select('id, cognome, nome, descrizione, annata, societa_id, ruolo, stato, societa(nome), segnalazioni(count), valutazioni(count), contatti(count)'),
    supabase.from('doppioni_esclusi').select('a, b'),
  ]);
  const giocatori = (data as unknown as Scheda[]) ?? [];
  const coppie = trovaDoppioni(
    giocatori,
    new Set(((esclusi as { a: string; b: string }[] | null) ?? []).map((e) => chiaveCoppia(e.a, e.b))),
  ) as { a: Scheda; b: Scheda; motivo: string }[];

  return (
    <div className="space-y-6">
      <Link href="/giocatori" className="text-sm text-grigio hover:text-blu">‹ Tutti i giocatori</Link>
      <div>
        <h1 className="font-display text-4xl font-bold">Possibili doppioni</h1>
        <p className="mt-1 max-w-2xl text-grigio">
          Schede che sembrano lo stesso giocatore (stessa annata, nomi quasi uguali o invertiti). Unendole, segnalazioni,
          valutazioni, contatti ed eventi finiscono in una scheda sola. L’unione non si può annullare: controlla bene.
        </p>
      </div>

      <Avviso ok={ok} errore={errore} />

      {coppie.length === 0 ? (
        <div className="rounded-xl border border-dashed border-linea p-10 text-center text-grigio">
          Nessun possibile doppione. 👍
        </div>
      ) : (
        <ul className="space-y-4">
          {coppie.map(({ a, b, motivo }) => {
            const consigliata = completezza(a) >= completezza(b) ? a.id : b.id;
            return (
              <li key={chiaveCoppia(a.id, b.id)} className="rounded-xl border border-linea bg-white p-4">
                <p className="text-sm font-semibold text-grigio">{motivo}</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {[a, b].map((g) => {
                    const altra = g.id === a.id ? b : a;
                    return (
                      <div key={g.id} className={`rounded-lg border p-3 ${g.id === consigliata ? 'border-blu' : 'border-linea'}`}>
                        <div className="flex flex-wrap items-center gap-2">
                          <Link href={`/giocatori/${g.id}`} className="font-display text-xl font-bold hover:text-blu">
                            {nomeDi(g)}
                          </Link>
                          <StatoBadge stato={g.stato} />
                        </div>
                        <p className="text-sm text-grigio">
                          {[g.annata, g.ruolo && RUOLI_CAMPO[g.ruolo], g.societa?.nome].filter(Boolean).join(' – ')}
                        </p>
                        {g.cognome && g.descrizione && <p className="text-sm italic text-grigio">{g.descrizione}</p>}
                        <p className="mt-1 text-sm">
                          {g.segnalazioni[0]?.count ?? 0} segnalazioni · {g.valutazioni[0]?.count ?? 0} valutazioni ·{' '}
                          {g.contatti[0]?.count ?? 0} contatti
                        </p>
                        <details className="mt-2">
                          <summary className="cursor-pointer text-sm font-semibold text-blu">
                            Tieni questa{g.id === consigliata ? ' (consigliata: più completa)' : ''}
                          </summary>
                          <form action={unisciGiocatori} className="mt-2 space-y-2">
                            <input type="hidden" name="tieni" value={g.id} />
                            <input type="hidden" name="togli" value={altra.id} />
                            <p className="text-xs text-grigio">
                              Resta “{nomeDi(g)}”; “{nomeDi(altra)}” viene cancellata e tutto passa qui. Non si può annullare.
                            </p>
                            <button className="bottone w-full">Conferma: unisci in questa</button>
                          </form>
                        </details>
                      </div>
                    );
                  })}
                </div>
                <form action={segnaPersoneDiverse} className="mt-3">
                  <input type="hidden" name="a" value={a.id} />
                  <input type="hidden" name="b" value={b.id} />
                  <button className="text-sm font-medium text-grigio underline hover:text-inchiostro">
                    Sono persone diverse: non proporle più
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
