'use client';
// Seconda riga dell'intestazione: le schede dell'area aperta. Scouting: le sue pagine; Società: Squadre, Archivio documenti
// e Storico modifiche (pagine dell'app, tappa 3); Segreteria: Tesserati; Modulistica e Calendario: tutte.
import { usePathname, useSearchParams } from 'next/navigation';
import { Scheda } from '@/components/Scheda';
import type { Ruolo } from '@/lib/ruoli';

export function SchedeArea({ ruolo, segnala }: { ruolo: Ruolo; segnala: boolean; organizza?: boolean }) {
  const percorso = usePathname();
  const squadraScelta = useSearchParams().get('squadra');
  if (percorso.startsWith('/inizio') || percorso.startsWith('/esercitazioni')) return null;   // la Home e le Esercitazioni non hanno schede
  if (percorso.startsWith('/squadra/') || percorso.startsWith('/modulistica/distinta')) {
    // Rosa, Allenamento, Partite (con la Distinta), Statistiche (Dashboard, allenamento, partite), Calendario della squadra
    return (
      <nav className="mx-auto flex max-w-[1000px] gap-1 overflow-x-auto px-3 pt-1.5 [scrollbar-width:none]" aria-label="Schede della squadra">
        <Scheda href={'/squadra/rosa' + (squadraScelta ? '?squadra=' + squadraScelta : '')}>Rosa</Scheda>
        <Scheda href={'/squadra/presenze' + (squadraScelta ? '?squadra=' + squadraScelta : '')} attivaSu={['/squadra/presenze', '/squadra/test', '/squadra/miei-allenamenti']}>Allenamento</Scheda>
        <Scheda href={'/squadra/convocazioni' + (squadraScelta ? '?squadra=' + squadraScelta : '')}
          attivaSu={['/squadra/partita', '/squadra/formazione', '/squadra/piazzati', '/squadra/foglio-gara', '/modulistica/distinta', '/squadra/tabellini']}>Partite</Scheda>
        <Scheda href={'/squadra/dashboard' + (squadraScelta ? '?squadra=' + squadraScelta : '')} attivaSu={['/squadra/statistiche-allenamento', '/squadra/statistiche-partite']}>Statistiche</Scheda>
        <Scheda href={'/squadra/calendario' + (squadraScelta ? '?squadra=' + squadraScelta : '')} attivaSu={['/squadra/campi']}>Calendario</Scheda>
      </nav>
    );
  }
  if (percorso.startsWith('/calendari/') || percorso.startsWith('/modulistica/programma')) {
    // "La mia squadra" è dentro Squadra → Calendario. Qui: Tutte le squadre, Avvisi, Programma gare (PDF delle gare dal–al)
    return (
      <nav className="mx-auto flex max-w-[1000px] gap-1 overflow-x-auto px-3 pt-1.5 [scrollbar-width:none]" aria-label="Schede del calendario">
        <Scheda href="/calendari/tutte">Tutte le squadre</Scheda>
        <Scheda href="/calendari/avvisi">Avvisi</Scheda>
        <Scheda href="/modulistica/programma">Programma gare</Scheda>
      </nav>
    );
  }
  if (percorso.startsWith('/scouting/')) {
    // Scouting dei mister (tappa 3): Segnala e Giocatori della sua annata
    return (
      <nav className="mx-auto flex max-w-[1000px] gap-1 overflow-x-auto px-3 pt-1.5 [scrollbar-width:none]" aria-label="Schede dello scouting">
        <Scheda href="/scouting/segnala">Segnala</Scheda>
        <Scheda href="/scouting/giocatori" attivaSu={['/scouting/valuta']}>Giocatori</Scheda>
      </nav>
    );
  }
  if (percorso.startsWith('/segreteria')) {
    return (
      <nav className="mx-auto flex max-w-[1000px] gap-1 overflow-x-auto px-3 pt-1.5 [scrollbar-width:none]" aria-label="Schede della segreteria">
        <Scheda href="/segreteria">Tesserati</Scheda>
      </nav>
    );
  }
  if (percorso.startsWith('/societa')) {
    return (
      <nav className="mx-auto flex max-w-[1000px] gap-1 overflow-x-auto px-3 pt-1.5 [scrollbar-width:none]" aria-label="Schede della società">
        <Scheda href="/societa/squadre">Squadre</Scheda>
        <Scheda href="/societa/archivio">Archivio documenti</Scheda>
        {ruolo === 'admin' && <Scheda href="/societa/modifiche">Storico modifiche</Scheda>}
      </nav>
    );
  }
  return (
    <nav className="mx-auto flex max-w-[1000px] gap-1 overflow-x-auto px-3 pt-1.5 [scrollbar-width:none]" aria-label="Schede dello scouting">
      <Scheda href="/home">Home</Scheda>
      <Scheda href="/giocatori">Giocatori</Scheda>
      <Scheda href="/gare" attivaSu={['/calendario']}>Gare</Scheda>
      {segnala && <Scheda href="/necessita">Necessità</Scheda>}
      {segnala && <Scheda href="/segnala">Segnala</Scheda>}
      <Scheda href="/profilo">Attività</Scheda>
    </nav>
  );
}
