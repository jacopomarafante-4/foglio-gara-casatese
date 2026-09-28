// Annata con un colore suo: anni vicini hanno colori diversi, così nell'elenco si distinguono a colpo d'occhio.
const COLORI_ANNATA = [
  ['#DCE7FA', '#003DA5'], ['#FBE0E5', '#A3142E'], ['#FBEFCF', '#7A5600'], ['#ECE3F7', '#5B3290'],
  ['#D7F0EE', '#0B6464'], ['#FCE6D6', '#9A4A12'], ['#E3E8EF', '#35506B'], ['#FBE1EE', '#9B2A5E'],
] as const;
export const coloreAnnata = (annata: number) => COLORI_ANNATA[((annata % 8) + 8) % 8];

export function Annata({ annata, grande = false }: { annata: number; grande?: boolean }) {
  const [sfondo, testo] = coloreAnnata(annata);
  return (
    <span className={`inline-block rounded-md font-display font-bold ${grande ? 'px-2 py-0.5 text-lg' : 'px-1.5 py-0.5 text-sm'}`}
      style={{ background: sfondo, color: testo }}>
      {annata}
    </span>
  );
}
