// Seconda riga di schede dentro le pagine della Squadra: Allenamento, Partite, Statistiche. Vanno a capo (niente schede nascoste
// fuori dallo schermo del telefono). Server component: la squadra dello staff resta nei link.
import Link from 'next/link';

function Pillole({ schede, attiva, etichetta, conSquadra }: { schede: [string, string][]; attiva: string; etichetta: string; conSquadra: (h: string) => string }) {
  return (
    <nav className="-mt-2 flex flex-wrap gap-1.5" aria-label={etichetta}>
      {schede.map(([h, l]) => (
        <Link key={h} href={conSquadra(h)} aria-current={attiva === h ? 'page' : undefined}
          className={`whitespace-nowrap rounded-full border px-3 py-1 text-sm font-semibold ${attiva === h ? 'border-blu bg-blu text-white' : 'border-linea bg-white text-inchiostro hover:border-blu'}`}>{l}</Link>
      ))}
    </nav>
  );
}

/** Il Test c'è solo per l'Under 15 */
export function SchedeAllenamento({ attiva, eta, conSquadra }: { attiva: string; eta: number; conSquadra: (h: string) => string }) {
  const schede: [string, string][] = [
    ['/squadra/presenze', 'Presenze'], ...(eta === 15 ? [['/squadra/test', 'Test atletici'] as [string, string]] : []),
    ['/squadra/miei-allenamenti', 'I miei allenamenti 🚧'],
  ];
  return <Pillole schede={schede} attiva={attiva} etichetta="Schede dell’allenamento" conSquadra={conSquadra} />;
}

/** Partite in tre momenti: prima della partita, da stampare, dopo la partita. Attività di base: Convocazioni e Tabellini.
 *  I Campi sono nel Calendario della squadra (SchedeCalendario) */
export function SchedePartite({ attiva, adb, conSquadra }: { attiva: string; adb: boolean; squadraId?: string; staff?: boolean; conSquadra: (h: string) => string }) {
  const gruppi: [string, [string, string][]][] = adb
    ? [['Prima della partita', [['/squadra/convocazioni', 'Convocazioni']]], ['Dopo la partita', [['/squadra/tabellini', 'Tabellini']]]]
    : [
      ['Prima della partita', [['/squadra/partita', 'Dati partita'], ['/squadra/convocazioni', 'Convocazioni'], ['/squadra/formazione', 'Formazione'], ['/squadra/piazzati', 'Piazzati']]],
      ['Da stampare', [['/squadra/foglio-gara', 'Foglio gara'], ['/modulistica/distinta', 'Distinta']]],
      ['Dopo la partita', [['/squadra/tabellini', 'Tabellini']]],
    ];
  return (
    <nav className="-mt-2 flex flex-wrap gap-x-5 gap-y-2" aria-label="Schede delle partite">
      {gruppi.map(([titolo, schede]) => (
        <div key={titolo}>
          <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-grigio">{titolo}</p>
          <div className="flex flex-wrap gap-1.5">
            {schede.map(([h, l]) => (
              <Link key={h} href={conSquadra(h)} aria-current={attiva === h ? 'page' : undefined}
                className={`whitespace-nowrap rounded-full border px-3 py-1 text-sm font-semibold ${attiva === h ? 'border-blu bg-blu text-white' : 'border-linea bg-white text-inchiostro hover:border-blu'}`}>{l}</Link>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

/** Calendario della squadra: le partite e la posizione dei campi */
export function SchedeCalendario({ attiva, conSquadra }: { attiva: string; conSquadra: (h: string) => string }) {
  return <Pillole schede={[['/squadra/calendario', 'Partite'], ['/squadra/campi', 'Campi']]} attiva={attiva} etichetta="Schede del calendario" conSquadra={conSquadra} />;
}

/** Statistiche: Dashboard, poi il dettaglio di allenamento e partite (le partite dell'attività di base sono nei Tabellini) */
export function SchedeStatistiche({ attiva, adb, conSquadra }: { attiva: string; adb: boolean; conSquadra: (h: string) => string }) {
  const schede: [string, string][] = [
    ['/squadra/dashboard', 'Dashboard'], ['/squadra/statistiche-allenamento', 'Allenamento'],
    ...(adb ? [] : [['/squadra/statistiche-partite', 'Partite'] as [string, string]]),
  ];
  return <Pillole schede={schede} attiva={attiva} etichetta="Schede delle statistiche" conSquadra={conSquadra} />;
}
