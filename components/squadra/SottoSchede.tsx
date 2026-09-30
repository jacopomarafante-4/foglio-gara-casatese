// Seconda riga di schede dentro le pagine della Squadra (come #subtabs del Portale): per ora quelle dell'Allenamento.
// Il Test c'è solo per l'Under 15 (SOLO_U15 del Portale). Server component: la squadra dello staff resta nei link.
import Link from 'next/link';

export function SchedeAllenamento({ attiva, eta, conSquadra }: { attiva: string; eta: number; conSquadra: (h: string) => string }) {
  const schede = [
    ['/squadra/presenze', 'Presenze'], ['/squadra/miei-allenamenti', 'I miei allenamenti 🚧'],
    ...(eta === 15 ? [['/squadra/test', 'Test atletici']] : []), ['/squadra/statistiche-allenamento', 'Statistiche'],
  ];
  return (
    <nav className="-mt-2 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]" aria-label="Schede dell’allenamento">
      {schede.map(([h, l]) => (
        <Link key={h} href={conSquadra(h)} aria-current={attiva === h ? 'page' : undefined}
          className={`whitespace-nowrap rounded-full border px-3 py-1 text-sm font-semibold ${attiva === h ? 'border-blu bg-blu text-white' : 'border-linea bg-white text-inchiostro hover:border-blu'}`}>{l}</Link>
      ))}
    </nav>
  );
}

/** Partite, tutte nell'app: Dati partita, Convocazioni, Formazione, Piazzati, Foglio gara, Tabellini, Statistiche e Campi.
 *  Attività di base: solo Convocazioni e Tabellini (SOLO_AGONISTICA del Portale) */
export function SchedePartite({ attiva, adb, conSquadra }: { attiva: string; adb: boolean; squadraId?: string; staff?: boolean; conSquadra: (h: string) => string }) {
  const schede: [string, string][] = [
    ...(adb ? [] : [['/squadra/partita', 'Dati partita'] as [string, string]]),
    ['/squadra/convocazioni', 'Convocazioni'],
    ...(adb ? [] : [['/squadra/formazione', 'Formazione'], ['/squadra/piazzati', 'Piazzati'], ['/squadra/foglio-gara', 'Foglio gara']] as [string, string][]),
    ['/squadra/tabellini', 'Tabellini'],
    ...(adb ? [] : [['/squadra/statistiche-partite', 'Statistiche'], ['/squadra/campi', 'Campi']] as [string, string][]),
  ];
  return (
    <nav className="-mt-2 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]" aria-label="Schede delle partite">
      {schede.map(([h, l]) => (
        <Link key={h} href={conSquadra(h)} aria-current={attiva === h ? 'page' : undefined}
          className={`whitespace-nowrap rounded-full border px-3 py-1 text-sm font-semibold ${attiva === h ? 'border-blu bg-blu text-white' : 'border-linea bg-white text-inchiostro hover:border-blu'}`}>{l}</Link>
      ))}
    </nav>
  );
}
