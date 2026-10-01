// Squadra → Allenamento → Statistiche (nell'app dalla tappa 3), come viewStatAllenamento del Portale: numeri della squadra,
// presenze per giocatore (per motivo di assenza), per mese e tempi dei test, nel periodo scelto (stagione o mese).
import { leggiDocs } from '@/lib/portale-dati';
import { apriSquadra } from '@/lib/pagina-squadra';
import type { Partita } from '@/lib/programma';
import { MOTIVI, SOGLIA_PRESENZE, mesiDelRegistro, pctTesto, presenzePerMese, statisticheAllenamento, tempoCella, type Registro, type Test } from '@/lib/registro';
import { meseDi } from '@/lib/calendario-portale';
import { fmtData } from '@/lib/programma';
import { SceltaSquadra } from '@/components/SceltaSquadra';
import { SchedeAllenamento } from '@/components/squadra/SottoSchede';
import { SceltaPeriodo } from '@/components/squadra/SceltaPeriodo';
import { ReportStatistiche } from '@/components/squadra/ReportStatistiche';
import { ScaricaExcel } from '@/components/ScaricaExcel';
import { fogliAllenamento, nomeFile } from '@/lib/esporta';
import { oggiIso } from '@/lib/utili';

const Numero = ({ v, l, sotto }: { v: React.ReactNode; l: string; sotto?: string }) => (
  <div className="rounded-xl border border-linea bg-white p-3">
    <b className="block font-display text-3xl">{v}</b><span className="text-sm font-semibold">{l}</span>
    {sotto && <small className="block text-grigio">{sotto}</small>}
  </div>
);
const Tabella = ({ children }: { children: React.ReactNode }) => (
  <div className="overflow-x-auto rounded-xl border border-linea bg-white"><table className="w-full text-sm">{children}</table></div>
);
const th = 'px-2 py-1.5 text-left font-semibold text-grigio', nome = 'sticky left-0 bg-white px-2 py-1.5 text-left font-semibold';

export default async function StatisticheAllenamento({ searchParams }: { searchParams: Promise<{ squadra?: string; periodo?: string }> }) {
  const q = await searchParams;
  const { chi, squadre, squadra, eta, conSquadra } = await apriSquadra(q.squadra);
  if (!squadra) return <p className="text-grigio">Nessuna squadra.</p>;
  const id = squadra.id;
  const docs = await leggiDocs(chi, ['roster/' + id, 'registro/' + id, 'calendar/' + id]);
  const reg = (docs['registro/' + id] ?? {}) as Registro & { tests?: Test[] };
  const cal = (docs['calendar/' + id]?.matches ?? []) as Partita[];
  const giocatori = ((docs['roster/' + id]?.players ?? []) as { id: string; name: string }[]).slice().sort((a, b) => a.name.localeCompare(b.name, 'it'));
  const mesi = mesiDelRegistro(reg, [...cal, ...(reg.friendlies ?? [])]);
  const periodo = q.periodo && mesi.includes(q.periodo) ? q.periodo : 'all';
  const s = statisticheAllenamento(reg, giocatori, periodo);
  const { mesi: mesiP, per } = presenzePerMese(reg, giocatori);
  const test = (reg.tests ?? []).slice().sort((a, b) => a.date.localeCompare(b.date));
  const barra = (v: number | null) => v == null ? <span className="text-grigio">—</span> : (
    <span className="flex items-center gap-2"><span className="h-2 w-20 overflow-hidden rounded-full bg-carta">
      <i className={`block h-full ${v < SOGLIA_PRESENZE ? 'bg-rosso' : 'bg-verde'}`} style={{ width: `${Math.round(v * 100)}%` }} /></span><b>{pctTesto(v)}</b></span>
  );

  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl font-bold">Statistiche allenamento · {squadra.name || squadra.category}</h1>
      <SchedeAllenamento attiva="/squadra/statistiche-allenamento" eta={eta} conSquadra={conSquadra} />
      <SceltaSquadra squadre={squadre} scelta={id} />
      {giocatori.length === 0 ? <p className="rounded-xl border border-dashed border-linea p-8 text-center text-grigio">Prima serve la rosa (Squadra → Rosa).</p> : (
        <>
          <SceltaPeriodo mesi={mesi} periodo={periodo} />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Numero v={s.tr.length} l="Allenamenti" sotto={s.presentiMedi != null ? `media ${s.presentiMedi.toFixed(1)} presenti` : undefined} />
            <Numero v={pctTesto(s.media)} l="Presenza media" />
            <Numero v={s.sottoSoglia} l={`Sotto il ${SOGLIA_PRESENZE * 100}%`} sotto={s.sottoSoglia ? 'in rosso nella tabella' : undefined} />
            <Numero v={s.assenze} l="Assenze" sotto={s.infortuni ? `di cui ${s.infortuni} per infortunio` : undefined} />
          </div>
          <ScaricaExcel nome={nomeFile('Allenamenti', squadra.category || squadra.name || '', periodo === 'all' ? oggiIso() : periodo)}
            fogli={fogliAllenamento(reg, giocatori, periodo)} />
          {!!chi.profilo && <ReportStatistiche squadraId={id} squadra={{ name: squadra.name || '', category: squadra.category || '' }} giocatori={giocatori}
            reg={reg} calendario={[...cal, ...(reg.friendlies ?? []).map((f) => ({ ...f, friendly: true }))] as (Partita & { id: string })[]} periodo={periodo} oggi={oggiIso()} />}

          <section className="space-y-2">
            <h2 className="font-display text-2xl font-bold">Presenze per giocatore</h2>
            {s.tr.length ? (
              <>
                <Tabella>
                  <thead className="border-b border-linea"><tr>
                    <th className={th}>Giocatore</th><th className={th} title="Presenze">Pres.</th>
                    {MOTIVI.map((m) => <th key={m.k} className={th} title={`Assenze: ${m.l}`}>{m.l.split(' ')[0]}</th>)}
                    <th className={th} title="Assenze senza motivo indicato">N.i.</th><th className={th}>Presenza</th>
                  </tr></thead>
                  <tbody className="divide-y divide-linea">
                    {s.righe.slice().sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1)).map((r) => (
                      <tr key={r.p.id} className={r.pct != null && r.pct < SOGLIA_PRESENZE ? 'bg-rosso/5' : ''}>
                        <td className={nome}>{r.p.name}</td><td className="px-2">{r.c.P}</td>
                        {MOTIVI.map((m) => <td key={m.k} className="px-2">{r.c[m.k] || ''}</td>)}
                        <td className="px-2">{r.c.A || ''}</td><td className="px-2 py-1.5">{barra(r.pct)}</td>
                      </tr>
                    ))}
                  </tbody>
                </Tabella>
                <p className="text-sm text-grigio">In rosso chi è sotto il {SOGLIA_PRESENZE * 100}% di presenze. Le assenze per infortunio non abbassano la percentuale. N.i. = assenza senza motivo indicato.</p>
              </>
            ) : <p className="text-grigio">Nessun allenamento nel periodo.</p>}
          </section>

          {mesiP.length > 1 && (
            <section className="space-y-2">
              <h2 className="font-display text-2xl font-bold">Presenze per mese</h2>
              <Tabella>
                <thead className="border-b border-linea"><tr><th className={th}>Giocatore</th>{mesiP.map((m) => <th key={m} className={th}>{meseDi(m)}</th>)}</tr></thead>
                <tbody className="divide-y divide-linea">
                  {giocatori.map((p) => (
                    <tr key={p.id}><td className={nome}>{p.name}</td>
                      {mesiP.map((m) => { const o = per[p.id]?.[m]; const v = o && o.tot ? o.P / o.tot : null;
                        return <td key={m} className={`px-2 ${v != null && v < SOGLIA_PRESENZE ? 'font-semibold text-rosso' : ''}`}>{pctTesto(v)}</td>; })}
                    </tr>
                  ))}
                </tbody>
              </Tabella>
            </section>
          )}

          {test.length > 0 && (
            <section className="space-y-2">
              <h2 className="font-display text-2xl font-bold">Test atletici</h2>
              <Tabella>
                <thead className="border-b border-linea"><tr><th className={th}>Giocatore</th>
                  {test.map((t) => <th key={t.id} className={th}>{t.name || 'Test'}<br /><span className="font-normal">{fmtData(t.date).slice(0, 5)}</span></th>)}</tr></thead>
                <tbody className="divide-y divide-linea">
                  {giocatori.map((p) => (
                    <tr key={p.id}><td className={nome}>{p.name}</td>
                      {test.map((t) => <td key={t.id} className="px-2">{tempoCella(t.res?.[p.id]) || <span className="text-grigio">—</span>}</td>)}</tr>
                  ))}
                </tbody>
              </Tabella>
            </section>
          )}
        </>
      )}
    </div>
  );
}
