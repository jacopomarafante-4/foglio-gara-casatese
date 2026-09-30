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
