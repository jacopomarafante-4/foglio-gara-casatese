// Annata con un colore suo: anni vicini hanno colori diversi, così nell'elenco si distinguono a colpo d'occhio.
import { coloreAnnata } from '@/lib/condivisi';   // stessi colori nel Portale
export { coloreAnnata };

export function Annata({ annata, grande = false }: { annata: number; grande?: boolean }) {
  const [sfondo, testo] = coloreAnnata(annata);
  return (
    <span className={`inline-block rounded-md font-display font-bold ${grande ? 'px-2 py-0.5 text-lg' : 'px-1.5 py-0.5 text-sm'}`}
      style={{ background: sfondo, color: testo }}>
      {annata}
    </span>
  );
}
