import Link from 'next/link';
import { annullaPrenotazione, prenotaGara } from '@/app/(app)/gare/actions';
import { StatoBadge } from '@/components/StatoBadge';
import type { GaraArricchita } from '@/lib/gare';

export function GaraCard({
  gara,
  mioId,
  puoPrenotarsi,
}: {
  gara: GaraArricchita;
  mioId: string;
  puoPrenotarsi: boolean;
}) {
  const ora = new Date(gara.data_ora).toLocaleTimeString('it-IT', {
    timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit',
  });
  const seguiteId = new Set(gara.seguite.map((s) => s.societa_id));
  const ciVado = gara.osservatori.some((o) => o.id === mioId);
  const giocatori = gara.giocatori ?? [];
  const scoperta = (gara.seguite.length > 0 || giocatori.length > 0) && gara.osservatori.length === 0;

  return (
    <article
      className={`flex gap-4 rounded-xl border bg-white p-4 ${scoperta ? 'border-oro' : 'border-linea'}`}
    >
      <div className="w-16 shrink-0 text-center">
        <div className="font-display text-2xl font-bold leading-none">{ora}</div>
        <div className="mt-1 text-xs text-grigio">
          {gara.distanza !== null ? `${gara.distanza} km` : 'km ?'}
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm text-grigio">{gara.categoria}</p>
        <h3 className="font-display text-xl font-bold leading-tight">
          <span className={gara.casa_id && seguiteId.has(gara.casa_id) ? 'text-blu' : ''}>{gara.casa_nome}</span>
          {' – '}
          <span className={gara.trasferta_id && seguiteId.has(gara.trasferta_id) ? 'text-blu' : ''}>
            {gara.trasferta_nome}
          </span>
        </h3>

        {(gara.campo || gara.indirizzo) && (
          <p className="mt-1 text-sm text-grigio">
            {gara.mappa ? (
              <a href={gara.mappa} target="_blank" rel="noreferrer" className="underline hover:text-blu">
                {[gara.campo, gara.indirizzo].filter(Boolean).join(', ')}
              </a>
            ) : (
              [gara.campo, gara.indirizzo].filter(Boolean).join(', ')
            )}
          </p>
        )}

        {gara.seguite.map((s) => (
          <p key={s.id} className="mt-2 rounded-md bg-oro/15 px-2 py-1 text-sm">
            <strong>{s.societa?.nome}</strong>
            {s.motivo ? `: ${s.motivo}` : ' è tra le squadre seguite'}
          </p>
        ))}

        {giocatori.length > 0 && (
          <div className="mt-2 rounded-md bg-blu/5 px-2 py-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-grigio">
              {giocatori.length === 1 ? 'Giocatore segnalato' : `${giocatori.length} giocatori segnalati`}
            </p>
            <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
              {giocatori.map((x) => (
                <li key={x.id} className="flex items-center gap-1.5 text-sm">
                  <Link href={`/giocatori/${x.id}`} className="font-semibold hover:text-blu">
                    {[x.cognome, x.nome].filter(Boolean).join(' ') || x.descrizione}
                  </Link>
                  <span className="text-grigio">{x.annata}</span>
                  <StatoBadge stato={x.stato} />
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <p className="text-sm">
            {gara.osservatori.length ? (
              <>Ci va: <strong>{gara.osservatori.map((o) => o.nome).join(', ')}</strong></>
            ) : (
              <span className="text-grigio">Nessun osservatore</span>
            )}
          </p>
          {puoPrenotarsi && (
            <form action={ciVado ? annullaPrenotazione : prenotaGara} className="ml-auto">
              <input type="hidden" name="gara_id" value={gara.id} />
              {ciVado ? (
                <button className="rounded-lg px-3 py-2 text-sm font-semibold text-grigio hover:bg-carta">
                  Non ci vado più
                </button>
              ) : (
                <button className="rounded-lg border border-blu px-3 py-2 text-sm font-semibold text-blu hover:bg-blu/5">
                  Ci vado io
                </button>
              )}
            </form>
          )}
        </div>
      </div>
    </article>
  );
}
