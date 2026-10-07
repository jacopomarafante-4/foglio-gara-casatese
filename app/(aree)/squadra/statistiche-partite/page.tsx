// Squadra → Partite → Statistiche (nell'app dalla tappa 3), come viewStatPartite del Portale: partite giocate, gol, marcatori,
// porta inviolata e tabella dei giocatori (presenze, minuti, % sui minuti disponibili, media, gol, subiti), nel periodo scelto.
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { leggiDocs } from '@/lib/portale-dati';
import { apriSquadra } from '@/lib/pagina-squadra';
import { oggiIso } from '@/lib/utili';
import type { Partita } from '@/lib/programma';
import { mesiDelRegistro, pctTesto, statistichePartite, type Registro, type Test } from '@/lib/registro';
import { SceltaSquadra } from '@/components/SceltaSquadra';
import { SchedeStatistiche } from '@/components/squadra/SottoSchede';
import { SceltaPeriodo } from '@/components/squadra/SceltaPeriodo';
import { ReportStatistiche } from '@/components/squadra/ReportStatistiche';
import { ScaricaExcel } from '@/components/ScaricaExcel';
import { fogliPartite, nomeFile } from '@/lib/esporta';

const Numero = ({ v, l, sotto }: { v: React.ReactNode; l: string; sotto?: string }) => (
  <div className="rounded-xl border border-linea bg-white p-3"><b className="block font-display text-3xl">{v}</b><span className="text-sm font-semibold">{l}</span>
    {sotto && <small className="block text-grigio">{sotto}</small>}</div>
);

export default async function StatistichePartite({ searchParams }: { searchParams: Promise<{ squadra?: string; periodo?: string }> }) {
  const q = await searchParams;
  const { chi, squadre, squadra, eta, conSquadra } = await apriSquadra(q.squadra);
  if (!squadra) return <p className="text-grigio">Nessuna squadra.</p>;
  if (eta <= 13) redirect(conSquadra('/squadra/tabellini'));   // attività di base: le statistiche sono nei Tabellini
  const id = squadra.id;
  const docs = await leggiDocs(chi, ['roster/' + id, 'registro/' + id, 'calendar/' + id]);
  const reg = (docs['registro/' + id] ?? {}) as Registro & { tests?: Test[] };
  const giocatori = ((docs['roster/' + id]?.players ?? []) as { id: string; name: string }[]).slice().sort((a, b) => a.name.localeCompare(b.name, 'it'));
  const calendario = [...((docs['calendar/' + id]?.matches ?? []) as (Partita & { id: string })[]), ...(reg.friendlies ?? []).map((f) => ({ ...f, friendly: true }))];
  const mesi = mesiDelRegistro(reg, calendario);
  const periodo = q.periodo && mesi.includes(q.periodo) ? q.periodo : 'all';
  const s = statistichePartite(reg, giocatori, calendario, periodo);
  const portieri = reg.gk ?? [];
  const th = 'px-2 py-1.5 text-left font-semibold text-grigio';

  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl font-bold">Statistiche partite</h1>
      <SchedeStatistiche attiva="/squadra/statistiche-partite" adb={false} conSquadra={conSquadra} />
      <SceltaSquadra squadre={squadre} scelta={id} />
      {giocatori.length === 0 ? <p className="rounded-xl border border-dashed border-linea p-8 text-center text-grigio">Prima serve la rosa (Squadra → Rosa).</p> : (
        <>
          <SceltaPeriodo mesi={mesi} periodo={periodo} />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Numero v={s.gm.length} l="Partite giocate" sotto={s.nNoti ? `${s.v}V ${s.n}N ${s.p}P` : undefined} />
            <Numero v={s.nNoti ? `${s.gf}-${s.gs}` : '—'} l="Gol fatti-subiti" sotto={s.nNoti ? `${(s.gf / s.nNoti).toFixed(1)} - ${(s.gs / s.nNoti).toFixed(1)} a partita` : 'segna i gol nei tabellini'} />
            <Numero v={s.marcatori} l="Marcatori diversi" />
            <Numero v={s.nNoti ? s.inviolata : '—'} l="Porta inviolata" />
          </div>
          <ScaricaExcel nome={nomeFile('Partite', squadra.category || squadra.name || '', periodo === 'all' ? oggiIso() : periodo)}
            fogli={fogliPartite(reg, giocatori, calendario, periodo)} />
          {!!chi.profilo && <ReportStatistiche squadraId={id} squadra={{ name: squadra.name || '', category: squadra.category || '' }} giocatori={giocatori}
            reg={reg} calendario={calendario} periodo={periodo} oggi={oggiIso()} />}
          <section className="space-y-2">
            <h2 className="font-display text-2xl font-bold">Giocatori</h2>
            {s.gm.length ? (
              <div className="overflow-x-auto rounded-xl border border-linea bg-white">
                <table className="w-full text-sm">
                  <thead className="border-b border-linea"><tr>
                    <th className={th}>Giocatore</th><th className={th} title="Partite giocate (almeno 1 minuto)">Pres.</th><th className={th}>Minuti</th>
                    <th className={th} title="Minuti giocati sul totale disponibile">% min</th><th className={th} title="Minuti medi a partita giocata">Media</th>
                    <th className={th}>Gol</th><th className={th} title="Gol subiti da portiere">Subiti 🧤</th>
                  </tr></thead>
                  <tbody className="divide-y divide-linea">
                    {s.righe.slice().sort((a, b) => b.min - a.min).map((r) => (
                      <tr key={r.p.id}>
                        <td className="px-2 py-1.5 font-semibold">{portieri.includes(r.p.id) && '🧤 '}{r.p.name}</td><td className="px-2">{r.pres}</td>
                        <td className="px-2">{r.min}&apos;</td><td className="px-2">{pctTesto(r.pctMin)}</td>
                        <td className="px-2">{r.media != null ? Math.round(r.media) + "'" : '—'}</td><td className="px-2">{r.gol || ''}</td><td className="px-2">{r.inPorta ? r.gc : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="text-grigio">Nessuna partita giocata nel periodo.</p>}
          </section>
          <p className="text-sm text-grigio">I tabellini delle partite (minuti, gol, gol subiti) si compilano in{' '}
            <Link className="font-semibold text-blu" href={conSquadra('/squadra/tabellini')}>Partite → Tabellini</Link>.</p>
        </>
      )}
    </div>
  );
}
