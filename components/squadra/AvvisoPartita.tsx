// Formazione e Foglio gara lavorano sul foglio della partita (sheet/<squadra>): qui si vede di quale partita è e, se non è la
// prossima del calendario, un avviso con il link a Dati partita (dove "Usa questa" la cambia).
import Link from 'next/link';
import type { Partita } from '@/lib/programma';
import { fmtData, giorno } from '@/lib/programma';
import { inOrdine } from '@/lib/calendario-portale';
import { stessaPartitaFoglio, type FoglioPartita } from '@/lib/foglio';

export function AvvisoPartita({ foglio, calendario, oggi, linkDati }: { foglio: FoglioPartita; calendario: (Partita & { id: string })[]; oggi: string; linkDati: string }) {
  const prossima = inOrdine(calendario.filter((m) => m.date && m.date >= oggi))[0];
  const quando = (d?: string) => (d ? `${giorno(d)} ${fmtData(d).slice(0, 5)}` : '');
  if (!foglio.opponent && !foglio.date) {
    return <p className="rounded-xl border border-dashed border-linea bg-white p-3 text-sm">Nessuna partita scelta: <Link className="font-semibold text-blu" href={linkDati}>sceglila in Dati partita ›</Link></p>;
  }
  const giusta = !prossima || stessaPartitaFoglio(foglio, prossima);
  return (
    <div className={`rounded-xl border bg-white p-3 text-sm ${giusta ? 'border-linea' : 'border-rosso/40 bg-rosso/5'}`}>
      <p><span className="text-grigio">Partita: </span><b>{foglio.opponent || 'Avversario'}</b>{foglio.date && <span className="text-grigio"> · {quando(foglio.date)}</span>}</p>
      {!giusta && prossima && (
        <p className="mt-1 font-semibold text-rosso">
          Non è la prossima ({prossima.opponent || 'partita'}, {quando(prossima.date)}): <Link className="underline" href={linkDati}>cambiala in Dati partita ›</Link>
        </p>
      )}
    </div>
  );
}
