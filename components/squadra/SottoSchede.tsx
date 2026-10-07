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

/** Partite, nell'ordine in cui si preparano: Dati partita, Convocazioni, Formazione, Piazzati, Foglio gara, Distinta; dopo la
 *  partita Tabellini; Campi. Attività di base: solo Convocazioni e Tabellini */
export function SchedePartite({ attiva, adb, conSquadra }: { attiva: string; adb: boolean; squadraId?: string; staff?: boolean; conSquadra: (h: string) => string }) {
  const schede: [string, string][] = adb ? [['/squadra/convocazioni', 'Convocazioni'], ['/squadra/tabellini', 'Tabellini']] : [
    ['/squadra/partita', 'Dati partita'], ['/squadra/convocazioni', 'Convocazioni'], ['/squadra/formazione', 'Formazione'],
    ['/squadra/piazzati', 'Piazzati'], ['/squadra/foglio-gara', 'Foglio gara'], ['/modulistica/distinta', 'Distinta'],
    ['/squadra/tabellini', 'Tabellini'], ['/squadra/campi', 'Campi'],
  ];
  return <Pillole schede={schede} attiva={attiva} etichetta="Schede delle partite" conSquadra={conSquadra} />;
}

/** Statistiche: Dashboard, poi il dettaglio di allenamento e partite (le partite dell'attività di base sono nei Tabellini) */
export function SchedeStatistiche({ attiva, adb, conSquadra }: { attiva: string; adb: boolean; conSquadra: (h: string) => string }) {
  const schede: [string, string][] = [
    ['/squadra/dashboard', 'Dashboard'], ['/squadra/statistiche-allenamento', 'Allenamento'],
    ...(adb ? [] : [['/squadra/statistiche-partite', 'Partite'] as [string, string]]),
  ];
  return <Pillole schede={schede} attiva={attiva} etichetta="Schede delle statistiche" conSquadra={conSquadra} />;
}
