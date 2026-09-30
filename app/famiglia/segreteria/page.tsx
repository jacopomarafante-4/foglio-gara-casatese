// Famiglia → Segreteria: iscrizione, certificato medico, quote e documenti caricati (con lo stato del controllo)
import { getFamiglia } from '@/lib/famiglia';
import { fmtData } from '@/lib/programma';
import { oggiIso } from '@/lib/utili';
import { CaricaDocumento } from '@/components/famiglia/CaricaDocumento';

const TIPI: Record<string, string> = { visita_medica: 'Visita medica', bonifico: 'Contabile di bonifico', altro: 'Altro documento' };
const STATI: Record<string, [string, string]> = { da_controllare: ['Da controllare', 'bg-oro/25'], accettato: ['Accettato', 'bg-verde/15 text-verde'], rifiutato: ['Rifiutato', 'bg-rosso/10 text-rosso'] };

export default async function SegreteriaFamiglia() {
  const { f } = (await getFamiglia())!;
  const d = f.dati ?? {}, quote = d.quote ?? [], oggi = oggiIso();
  const scad = d.certificato_scadenza;
  const giorni = scad ? Math.round((Date.parse(scad + 'T12:00:00Z') - Date.parse(oggi + 'T12:00:00Z')) / 86400000) : null;
  const tessera = (t: string, v: string, sotto?: string, rosso?: boolean) => (
    <div className="rounded-2xl border border-linea bg-white p-4">
      <span className="block font-display text-[13px] font-bold uppercase tracking-wider text-grigio">{t}</span>
      <b className="font-display text-2xl">{v}</b>{sotto && <span className={`block text-sm ${rosso ? 'font-semibold text-rosso' : 'text-grigio'}`}>{sotto}</span>}
    </div>
  );
  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl font-bold">Segreteria</h1>
      <div className="grid gap-3 sm:grid-cols-2">
        {tessera('Iscrizione', d.iscrizione_completa ? '✓ Completata' : 'Da completare', d.documenti_mancanti ? 'Mancano: ' + d.documenti_mancanti : undefined)}
        {tessera('Certificato medico', scad ? 'fino al ' + fmtData(scad) : '—', giorni != null && giorni < 0 ? 'Scaduto' : giorni != null && giorni <= 30 ? 'In scadenza' : undefined, giorni != null && giorni <= 30)}
      </div>
      <section className="rounded-2xl border border-linea bg-white p-4">
        <h2 className="mb-2 font-display text-2xl font-bold">Quote</h2>
        {quote.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead><tr className="text-left text-xs uppercase tracking-wider text-grigio"><th className="py-1.5">Rata</th><th>Importo</th><th>Scadenza</th><th>Stato</th></tr></thead>
              <tbody className="divide-y divide-linea">{quote.map((q, i) => (
                <tr key={i}><td className="py-2 font-semibold">{q.rata}</td><td>{q.importo ? '€ ' + q.importo : ''}</td><td>{q.scadenza ? fmtData(q.scadenza) : ''}</td>
                  <td>{q.pagata ? <span className="text-verde">✓ Pagata</span> : <b>Da pagare</b>}</td></tr>))}</tbody>
            </table>
          </div>
        ) : <p className="text-sm text-grigio">Nessuna rata registrata.</p>}
        <p className="mt-2 text-sm text-grigio">Per dubbi su iscrizione e quote rivolgetevi alla segreteria della società.</p>
      </section>
      <section className="rounded-2xl border border-linea bg-white p-4">
        <h2 className="font-display text-2xl font-bold">Documenti</h2>
        <p className="mb-3 text-sm text-grigio">Caricate qui la visita medica, la contabile del bonifico di una rata o altri documenti richiesti: basta una foto chiara o un PDF. La segreteria li controlla.</p>
        <CaricaDocumento rate={quote.map((q, i) => ({ i, testo: `${q.rata || 'Rata ' + (i + 1)}${q.importo ? ' · € ' + q.importo : ''}`, pagata: q.pagata })).filter((q) => !q.pagata).map(({ i, testo }) => ({ i, testo }))} />
        {(f.documenti ?? []).length > 0 && (
          <ul className="mt-4 divide-y divide-linea">
            {f.documenti.map((x) => (
              <li key={x.id} className="flex items-start justify-between gap-3 py-2 text-sm">
                <span><b>{TIPI[x.tipo] ?? x.tipo}</b>{x.tipo === 'bonifico' && x.rata != null ? ` · ${quote[x.rata]?.rata || 'rata ' + (x.rata + 1)}` : ''}{x.descrizione ? ' · ' + x.descrizione : ''}
                  <span className="block text-grigio">{x.nome_file} · {fmtData(String(x.caricato_il).slice(0, 10))}{x.nota ? ' · ' + x.nota : ''}</span></span>
                <span className={`flex-none rounded-full px-2 py-0.5 text-xs font-semibold ${STATI[x.stato]?.[1] ?? 'bg-carta'}`}>{STATI[x.stato]?.[0] ?? x.stato}</span>
              </li>))}
          </ul>
        )}
      </section>
    </div>
  );
}
