import type { Ruolo } from '@/lib/ruoli';

// Barra delle aree del Portale (stesse icone di public/portale/js/portale.js): lo Scouting è
// un'area come le altre. Le altre aree aprono il Portale sulla scheda giusta.
const ICONE: Record<string, React.ReactNode> = {
  home: <><path d="M3 11.5 12 4l9 7.5" /><path d="M5.5 10v10h13V10" /><path d="M10 20v-6h4v6" /></>,
  squadra: <><circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.6 2.7-6 6-6s6 2.4 6 6" /><circle cx="17" cy="9" r="2.5" /><path d="M16.5 14.2c2.6.3 4.5 2.4 4.5 5.8" /></>,
  gara: <><circle cx="12" cy="12" r="9" /><path d="m12 7.5 4 2.9-1.5 4.8h-5L8 10.4z" /><path d="M12 3v4.5M21 10.4l-5 0M17.3 19.3l-2.8-4.1M6.7 19.3l2.8-4.1M3 10.4l5 0" /></>,
  allenamento: <><circle cx="13.5" cy="4.5" r="2" /><path d="m9 21 2.5-6 2.5 2.5V21" /><path d="M6 12.5 9 9l4 1.5 2.5 3.5H19" /><path d="m11.5 15-2-3" /></>,
  statistiche: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  scouting: <><circle cx="6.5" cy="15.5" r="3.5" /><circle cx="17.5" cy="15.5" r="3.5" /><path d="M10 15.5h4M4 13l2.5-8h3l1 5.5M20 13l-2.5-8h-3l-1 5.5" /></>,
  societa: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>,
};

const AREE = [
  { k: 'home', etichetta: 'Home', href: '/portale/#/home' },
  { k: 'squadra', etichetta: 'Squadra', href: '/portale/#/rosa' },
  { k: 'gara', etichetta: 'Gara', href: '/portale/#/partita' },
  { k: 'allenamento', etichetta: 'Allenamento', href: '/portale/#/allenamenti' },
  { k: 'statistiche', etichetta: 'Statistiche', href: '/portale/#/statallen' },
  { k: 'scouting', etichetta: 'Scouting', href: '/home' },
  { k: 'societa', etichetta: 'Società', href: '/portale/#/squadre', soloAdmin: true },
];

/** Admin e dirigenti vedono tutte le aree; gli scout hanno solo lo Scouting, quindi niente barra */
export function Aree({ ruolo }: { ruolo: Ruolo }) {
  if (ruolo !== 'admin' && ruolo !== 'direttore') return null;
  return (
    <nav aria-label="Aree del portale" className="mx-auto flex max-w-[1000px] gap-1 overflow-x-auto px-3 pb-2.5 [scrollbar-width:none]">
      {AREE.filter((a) => !a.soloAdmin || ruolo === 'admin').map((a) => {
        const attiva = a.k === 'scouting';
        return (
          <a
            key={a.k}
            href={a.href}
            aria-current={attiva ? 'page' : undefined}
            className={`flex flex-none items-center gap-2 whitespace-nowrap rounded-md px-3 py-[7px] text-[15px] font-semibold max-sm:gap-1.5 max-sm:px-2 max-sm:text-sm ${
              attiva ? 'bg-white/15 text-white' : 'text-white/85 hover:bg-white/10'
            }`}
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth={attiva ? 2.3 : 1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="max-sm:size-[18px]">
              {ICONE[a.k]}
            </svg>
            {a.etichetta}
          </a>
        );
      })}
    </nav>
  );
}
