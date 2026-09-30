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

/** Partite: Foglio gara ancora nel Portale (#/s:<squadra>/… per lo staff); Dati partita, Convocazioni,
 *  Formazione, Piazzati, Tabellini, Statistiche e Campi nell'app. Attività di base: solo Convocazioni e Tabellini (SOLO_AGONISTICA del Portale) */
export function SchedePartite({ attiva, adb, squadraId, staff, conSquadra }: { attiva: string; adb: boolean; squadraId: string; staff: boolean; conSquadra: (h: string) => string }) {
  const portale = (t: string) => `/portale/#/${staff ? 's:' + squadraId + '/' : ''}${t}`;
  const schede: [string, string, boolean][] = [
    ...(adb ? [] : [['/squadra/partita', 'Dati partita', true] as [string, string, boolean]]),
    ['/squadra/convocazioni', 'Convocazioni', true],
    ...(adb ? [] : [['/squadra/formazione', 'Formazione', true], ['/squadra/piazzati', 'Piazzati', true], [portale('pdf'), 'Foglio gara', false]] as [string, string, boolean][]),
    ['/squadra/tabellini', 'Tabellini', true],
    ...(adb ? [] : [['/squadra/statistiche-partite', 'Statistiche', true], ['/squadra/campi', 'Campi', true]] as [string, string, boolean][]),
  ];
  return (
    <nav className="-mt-2 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]" aria-label="Schede delle partite">
      {schede.map(([h, l, app]) => {
        const cls = `whitespace-nowrap rounded-full border px-3 py-1 text-sm font-semibold ${attiva === h ? 'border-blu bg-blu text-white' : 'border-linea bg-white text-inchiostro hover:border-blu'}`;
        return app ? <Link key={h} href={conSquadra(h)} aria-current={attiva === h ? 'page' : undefined} className={cls}>{l}</Link>
          : <a key={h} href={h} className={cls}>{l}</a>;
      })}
    </nav>
  );
}
