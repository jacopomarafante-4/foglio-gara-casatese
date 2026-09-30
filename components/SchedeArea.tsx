'use client';
// Seconda riga dell'intestazione: le schede dell'area aperta. Scouting: le sue pagine; Società: Squadre (nel Portale),
// Archivio documenti e Storico modifiche (pagine dell'app, tappa 3); Segreteria: Tesserati; Modulistica e Calendario: tutte.
import { usePathname, useSearchParams } from 'next/navigation';
import { Scheda } from '@/components/Scheda';
import type { Ruolo } from '@/lib/ruoli';

export function SchedeArea({ ruolo, segnala, organizza = false }: { ruolo: Ruolo; segnala: boolean; organizza?: boolean }) {
  const percorso = usePathname();
  const nelPortale = 'whitespace-nowrap border-b-[3px] border-transparent px-3 pb-2.5 pt-2 font-display text-lg font-semibold text-grigio hover:text-inchiostro';
  const squadraScelta = useSearchParams().get('squadra');
  if (percorso.startsWith('/inizio')) return null;   // la Home non ha schede
  if (percorso.startsWith('/squadra/')) {
    // Rosa, Allenamento e Partite nell'app (le schede delle Partite ancora nel Portale sono nella barra della pagina)
    return (
      <nav className="mx-auto flex max-w-[1000px] gap-1 overflow-x-auto px-3 pt-1.5 [scrollbar-width:none]" aria-label="Schede della squadra">
        <Scheda href={'/squadra/rosa' + (squadraScelta ? '?squadra=' + squadraScelta : '')}>Rosa</Scheda>
        <Scheda href={'/squadra/presenze' + (squadraScelta ? '?squadra=' + squadraScelta : '')} attivaSu={['/squadra/presenze', '/squadra/test', '/squadra/statistiche-allenamento', '/squadra/miei-allenamenti']}>Allenamento</Scheda>
        <Scheda href={'/squadra/convocazioni' + (squadraScelta ? '?squadra=' + squadraScelta : '')}
          attivaSu={['/squadra/partita', '/squadra/tabellini', '/squadra/statistiche-partite', '/squadra/campi']}>Partite</Scheda>
      </nav>
    );
  }
  if (percorso.startsWith('/calendari/')) {
    // La mia squadra (non per l'organizzativo), Tutte le squadre, Avvisi (admin, direttori, organizzativo)
    return (
      <nav className="mx-auto flex max-w-[1000px] gap-1 overflow-x-auto px-3 pt-1.5 [scrollbar-width:none]" aria-label="Schede del calendario">
        {!organizza && <Scheda href="/calendari/squadra">La mia squadra</Scheda>}
        <Scheda href="/calendari/tutte">Tutte le squadre</Scheda>
        {(organizza || ruolo === 'admin' || ruolo === 'direttore') && <Scheda href="/calendari/avvisi">Avvisi</Scheda>}
      </nav>
    );
  }
  if (percorso.startsWith('/modulistica')) {
    // Tutta nell'app (tappa 3); la Distinta non serve all'organizzativo
    return (
      <nav className="mx-auto flex max-w-[1000px] gap-1 overflow-x-auto px-3 pt-1.5 [scrollbar-width:none]" aria-label="Schede della modulistica">
        {!organizza && <Scheda href="/modulistica/distinta">Distinta</Scheda>}
        <Scheda href="/modulistica/programma">Programma gare</Scheda>
        <Scheda href="/modulistica/comunicazione">Comunicazione</Scheda>
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
        <a href="/portale/#/squadre" className={nelPortale}>Squadre</a>
        <Scheda href="/societa/archivio">Archivio documenti</Scheda>
        {ruolo === 'admin' && <Scheda href="/societa/modifiche">Storico modifiche</Scheda>}
      </nav>
    );
  }
  return (
    <nav className="mx-auto flex max-w-[1000px] gap-1 overflow-x-auto px-3 pt-1.5 [scrollbar-width:none]" aria-label="Schede dello scouting">
      <Scheda href="/home">Home</Scheda>
      <Scheda href="/giocatori">Giocatori</Scheda>
      <Scheda href="/gare">Gare</Scheda>
      {segnala && <Scheda href="/calendario">Calendario</Scheda>}
      {segnala && <Scheda href="/necessita">Necessità</Scheda>}
      {segnala && <Scheda href="/segnala">Segnala</Scheda>}
      <Scheda href="/profilo">Attività</Scheda>
    </nav>
  );
}
