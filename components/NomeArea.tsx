'use client';
// Riga piccola sotto il titolo dell'intestazione: il nome dell'area aperta; per il mister la sua categoria, come nel Portale
import { usePathname } from 'next/navigation';

export function NomeArea({ categoria }: { categoria?: string }) {
  const percorso = usePathname();
  if (categoria) return categoria;
  return percorso.startsWith('/societa') ? 'Società' : percorso.startsWith('/segreteria') ? 'Segreteria'
    : percorso.startsWith('/modulistica') ? 'Modulistica' : percorso.startsWith('/calendari/') ? 'Calendario'
    : percorso.startsWith('/inizio') ? 'Home' : 'Scouting';
}
