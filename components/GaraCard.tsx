import Link from 'next/link';
import { annullaPrenotazione, prenotaGara } from '@/app/(app)/gare/actions';
import { affidaGara } from '@/app/(app)/home/actions';
import type { PersonaStaff } from '@/lib/staff';
import { StatoBadge } from '@/components/StatoBadge';
import type { GaraArricchita } from '@/lib/gare';

export function GaraCard({
  gara,
  mioId,
  puoPrenotarsi,
  allegati,
  staff,
}: {
  gara: GaraArricchita;
  mioId: string;
  puoPrenotarsi: boolean;
  /** Distinte caricate con "Aggiungi partita" (link temporanei) */
  allegati?: { nome: string; url: string }[];
  /** Solo per admin e direttori: a chi affidare la partita */
  staff?: PersonaStaff[];
}) {
  const ora = gara.ora_da_definire
    ? null
    : new Date(gara.data_ora).toLocaleTimeString('it-IT', { timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit' });
  const stato =
    gara.stato === 'confermata' ? { testo: `Confermata · ${gara.comunicato ?? 'comunicato'}`, classe: 'bg-blu/10 text-blu' }
    : gara.stato === 'variata' ? { testo: `Variata · ${gara.comunicato ?? 'comunicato'}`, classe: 'bg-oro/20 text-inchiostro' }
    : gara.stato === 'calendario' ? { testo: 'Da calendario', classe: 'bg-carta text-grigio' }
    : null;
  const seguiteId = new Set(gara.seguite.map((s) => s.societa_id));
  const ciVado = gara.osservatori.some((o) => o.id === mioId);
  const giocatori = gara.giocatori ?? [];
  const scoperta = (gara.seguite.length > 0 || giocatori.length > 0) && gara.osservatori.length === 0;

  return (
    <article
      className={`flex gap-4 rounded-xl border bg-white p-4 ${scoperta ? 'border-oro' : 'border-linea'}`}
    >
      <div className="w-16 shrink-0 text-center">
        {ora ? (
          <div className="font-display text-2xl font-bold leading-none">{ora}</div>
        ) : (
          <div className="text-xs font-semibold leading-tight text-grigio">ora da definire</div>
        )}
        <div className="mt-1 text-xs text-grigio">
          {gara.distanza !== null ? `${gara.distanza} km` : 'km ?'}
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-2 text-sm text-grigio">
          <span>
            {gara.categoria}
            {gara.girone && ` · girone ${gara.girone}`}
            {gara.giornata && ` · ${gara.giornata}ª giornata`}
          </span>
          {stato && <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${stato.classe}`}>{stato.testo}</span>}
        </p>
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

        {allegati && allegati.length > 0 && (
          <p className="mt-2 flex flex-wrap gap-2 text-sm">
            {allegati.map((a, i) => (
              <a key={a.url} href={a.url} target="_blank" rel="noreferrer" className="rounded-full bg-carta px-3 py-1 hover:text-blu">
                📎 {allegati.length > 1 ? `Distinta ${i + 1}` : 'Distinta'}
              </a>
            ))}
          </p>
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

        {staff && staff.length > 0 && (
          <details className="mt-2">
            <summary className="cursor-pointer text-sm font-semibold text-blu">Affida a…</summary>
            <form action={affidaGara} className="mt-2 flex flex-wrap gap-2">
              <input type="hidden" name="gara_id" value={gara.id} />
              <select name="persona" required defaultValue="" className="campo min-w-0 flex-1" aria-label="Affida la partita a">
                <option value="" disabled>Scegli chi ci va</option>
                {staff.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
              <input name="dettagli" placeholder="Cosa guardare (facoltativo)" className="campo min-w-0 flex-1" />
              <button className="bottone">Affida</button>
            </form>
          </details>
        )}
      </div>
    </article>
  );
}
