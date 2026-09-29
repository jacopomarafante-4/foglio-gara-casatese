'use client';
// Riga piccola sotto il titolo dell'intestazione: il nome dell'area aperta (nel Portale è la categoria o "Segreteria")
import { usePathname } from 'next/navigation';

export function NomeArea() {
  const percorso = usePathname();
  return percorso.startsWith('/societa') ? 'Società' : percorso.startsWith('/segreteria') ? 'Segreteria' : 'Scouting';
}
