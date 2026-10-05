'use client';
// Barra delle aree dell'app, con le icone di ICONE_AREE (lib/condivisi.ts).
// Le aree già portate nell'app (Scouting, Società → archivio e storico, Segreteria) si aprono qui; le altre aprono il Portale.
import { usePathname } from 'next/navigation';
import type { Ruolo } from '@/lib/ruoli';
import { ICONE_AREE } from '@/lib/condivisi';

const AREE = [
  { k: 'home', etichetta: 'Home', href: '/inizio' },
  { k: 'calendario', etichetta: 'Calendario', href: '/calendari/tutte' },   // "La mia squadra" è dentro Squadra
  { k: 'squadra', etichetta: 'Squadra', href: '/squadra/rosa' },
  { k: 'modulistica', etichetta: 'Modulistica', href: '/modulistica/distinta' },   // l'organizzativo (senza distinta) va al Programma
  { k: 'segreteria', etichetta: 'Segreteria', href: '/segreteria' },
  { k: 'scouting', etichetta: 'Scouting', href: '/home' },
  { k: 'societa', etichetta: 'Società', href: '/societa/squadre' },
  { k: 'esercitazioni', etichetta: 'Esercitazioni', href: '/esercitazioni' },   // lavori in corso: per ora solo l'admin
];

/** Come allowedAreas() del Portale: admin e direttori vedono tutte le aree, la segreteria solo la sua; i mister niente
 *  Segreteria né Società, e il loro Scouting è /scouting (Segnala, Giocatori della loro annata); l'organizzativo niente Squadra né
 *  Scouting. Gli scout hanno solo lo Scouting, quindi niente barra.
 *  `nienteSquadre` = direttore con squadre assegnate (0053) ma nessuna (es. chi segue solo la Segreteria): niente area Squadra.
 *  `nienteSegreteria` = direttore senza il permesso vedeSegreteria (0055): niente area Segreteria. */
export function Aree({ ruolo, organizza = false, nienteSquadre = false, nienteSegreteria = false }: {
  ruolo: Ruolo; organizza?: boolean; nienteSquadre?: boolean; nienteSegreteria?: boolean;
}) {
  const percorso = usePathname();
  if (ruolo === 'scout') return null;
  const aree = ruolo === 'segreteria' ? AREE.filter((a) => a.k === 'segreteria')
    : ruolo === 'mister' ? AREE.filter((a) => a.k !== 'segreteria' && a.k !== 'societa' && !(organizza && (a.k === 'squadra' || a.k === 'scouting')))
      .map((a) => (a.k === 'scouting' ? { ...a, href: '/scouting/segnala' } : a))
    : AREE;
  // Esercitazioni: lavori in corso, per ora solo l'admin (anche il database le nasconde agli altri, 0052)
  const visibili = aree.filter((a) => (a.k !== 'esercitazioni' || ruolo === 'admin') && (a.k !== 'squadra' || !nienteSquadre)
    && (a.k !== 'segreteria' || !nienteSegreteria));
  const corrente = percorso.startsWith('/esercitazioni') ? 'esercitazioni' : percorso.startsWith('/societa') ? 'societa' : percorso.startsWith('/segreteria') ? 'segreteria'
    : percorso.startsWith('/modulistica') ? 'modulistica' : percorso.startsWith('/calendari/') ? 'calendario'
    : percorso.startsWith('/inizio') ? 'home' : percorso.startsWith('/squadra/') ? 'squadra' : 'scouting';
  return (
    <nav aria-label="Aree del portale" className="mx-auto flex max-w-[1000px] gap-1 overflow-x-auto px-3 pb-2.5 [scrollbar-width:none]">
      {visibili.map((a) => {
        const attiva = a.k === corrente;
        return (
          <a
            key={a.k}
            href={a.href}
            aria-current={attiva ? 'page' : undefined}
            className={`flex flex-none items-center gap-2 whitespace-nowrap rounded-md px-3 py-[7px] text-[15px] font-semibold max-sm:gap-1.5 max-sm:px-2 max-sm:text-sm ${
              attiva ? 'bg-white/15 text-white' : 'text-white/85 hover:bg-white/10'
            }`}
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth={attiva ? 2.3 : 1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden
              className="max-sm:size-[18px]" dangerouslySetInnerHTML={{ __html: ICONE_AREE[a.k] }} />
            {a.etichetta}
          </a>
        );
      })}
    </nav>
  );
}
