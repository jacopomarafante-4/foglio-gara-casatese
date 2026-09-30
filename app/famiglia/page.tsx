// Famiglia → Home: certificato medico in scadenza, convocazioni (con "ci sarà / non ci sarà"), avvisi della società
import { getFamiglia, chiavePartita, type Convocazione } from '@/lib/famiglia';
import { fmtData, giorno } from '@/lib/programma';
import { ETICHETTE_CONVOCAZIONE } from '@/lib/calendario-portale';
import { oggiIso } from '@/lib/utili';
import { traQuanto } from '@/lib/home';
import { Risposta } from '@/components/famiglia/Risposta';

/** Ritrovo: quello scritto dal mister, se no 75 minuti prima dell'inizio (come nel foglio convocazioni) */
const ritrovo = (c: Convocazione) => {
  if (c.meetTime) return c.meetTime;
  const [h, m] = (c.time || '').split(':').map(Number);
  if (Number.isNaN(h)) return '';
  const t = h * 60 + (m || 0) - 75;
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
};
const maps = (c: Convocazione) => c.ll ? 'https://www.google.com/maps/dir/?api=1&destination=' + c.ll
  : c.venue || c.address ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent([c.venue, c.address].filter(Boolean).join(', ')) : '';

export default async function HomeFamiglia() {
  const { f } = (await getFamiglia())!;
  const oggi = oggiIso(), cat = f.squadra?.category || 'Academy';
  const conv = (f.convocazioni ?? []).filter((c) => c.date && c.date >= oggi).sort((a, b) => (a.date! + (a.time || '')).localeCompare(b.date! + (b.time || '')));
  const prossima = (f.calendario ?? []).filter((m) => m.date && m.date >= oggi).sort((a, b) => (a.date! + (a.time || '')).localeCompare(b.date! + (b.time || '')))[0];
  const scad = f.dati?.certificato_scadenza;
  const giorni = scad ? Math.round((Date.parse(scad + 'T12:00:00Z') - Date.parse(oggi + 'T12:00:00Z')) / 86400000) : null;
  const avvisi = (f.avvisi ?? []).slice().sort((a, b) => (b.data || '').localeCompare(a.data || '')).slice(0, 3);
  return (
    <div className="space-y-3">
      <div>
        <h1 className="font-display text-4xl font-bold">{f.ragazzo?.nome}</h1>
        <p className="text-grigio">{cat}</p>
      </div>
      {giorni != null && giorni <= 30 && (
        <section className={`rounded-2xl border p-4 ${giorni < 0 ? 'border-rosso bg-rosso/10' : 'border-oro bg-oro/15'}`}>
          <b>{giorni < 0 ? 'Certificato medico scaduto' : 'Certificato medico in scadenza'}</b>
          <p className="text-sm">{giorni < 0 ? `Era valido fino al ${fmtData(scad)}: senza certificato il ragazzo non può giocare. Portatelo in segreteria.`
            : `Scade il ${fmtData(scad)} (${traQuanto(oggi, scad)}): prenotate la visita.`}</p>
        </section>
      )}
      {conv.length ? conv.map((c) => {
        const con = c.stato === 'CON', r = ritrovo(c), link = maps(c);
        return (
          <section key={chiavePartita(c)} className={`rounded-2xl border border-linea bg-white p-4 ${con ? '' : 'opacity-80'}`} style={{ borderLeft: `5px solid ${con ? '#003da5' : '#d8dfe8'}` }}>
            <h2 className="flex items-center justify-between gap-2 font-display text-[13px] font-bold uppercase tracking-wider text-grigio">
              {con ? 'Convocato' : ETICHETTE_CONVOCAZIONE[c.stato ?? ''] || 'Non convocato'}
              <span className="rounded-full bg-blu/10 px-2 py-1 font-display text-[13px] normal-case tracking-normal text-blu">{traQuanto(oggi, c.date)}</span>
            </h2>
            <p className="mt-1 text-sm font-semibold first-letter:uppercase">{giorno(c.date)} {fmtData(c.date)}{c.time ? ' · inizio ' + c.time : ''}</p>
            <p className="my-1 font-display text-3xl font-bold leading-tight">{c.home ? `${cat} – ${c.opponent || ''}` : `${c.opponent || ''} – ${cat}`}</p>
            {con ? (
              <>
                {r && <p className="text-sm"><b>Ritrovo alle {r}</b>{c.meetAddress ? ' a ' + c.meetAddress : ''}</p>}
                <p className="text-sm text-grigio">{[c.venue, c.address].filter(Boolean).join(', ')}</p>
                {link && <a className="mt-1 inline-block text-sm font-semibold text-blu" href={link} target="_blank" rel="noopener">📍 Apri in Google Maps</a>}
                {c.note && <p className="mt-1 whitespace-pre-line text-sm">{c.note}</p>}
                <Risposta partita={chiavePartita(c)} iniziale={f.risposte?.[chiavePartita(c)]?.risposta} />
              </>
            ) : <p className="text-sm text-grigio">Per questa partita non è convocato.</p>}
          </section>
        );
      }) : (
        <section className="rounded-2xl border border-linea bg-white p-4">
          <h2 className="font-display text-[13px] font-bold uppercase tracking-wider text-grigio">Convocazioni</h2>
          <p className="mt-1 text-sm text-grigio">Nessuna convocazione per ora.{prossima ? ` Prossima partita della squadra: ${giorno(prossima.date)} ${fmtData(prossima.date)} · ${prossima.opponent || ''}.` : ''}</p>
        </section>
      )}
      {avvisi.length > 0 && (
        <section className="rounded-2xl border border-linea bg-white p-4" style={{ borderLeft: '5px solid #6B3FA0' }}>
          <h2 className="mb-2 font-display text-[13px] font-bold uppercase tracking-wider text-grigio">Avvisi della società</h2>
          <div className="space-y-2">{avvisi.map((a) => (
            <div key={a.id} className="rounded-lg bg-carta p-2.5">
              <p className="text-sm text-grigio">{fmtData(a.data)}</p>{a.titolo && <b className="block">{a.titolo}</b>}
              <p className="whitespace-pre-line">{a.testo}</p>
            </div>))}</div>
        </section>
      )}
    </div>
  );
}
