// Righe del calendario come nel Portale (rigaPartita, listaCalendario): colorate col calendario (Merate, Cernusco,
// Trasferta), raggruppate per mese; sotto la riga, se serve, la scheda di modifica o i portieri (children).
import { CALENDARI } from '@/lib/condivisi';
import { calendario, fmtData, giorno, type Impegno, type SquadraCal } from '@/lib/programma';
import { meseDi, nomePartita, squadreTesto, tipoPartita } from '@/lib/calendario-portale';

export function Legenda() {
  return (
    <div className="flex flex-wrap gap-3 text-[13px] font-bold text-grigio">
      {Object.values(CALENDARI).map((c) => (
        <span key={c.nome} className="inline-flex items-center gap-1.5"><span className="size-[11px] rounded-[3px]" style={{ background: c.colore }} />{c.nome}</span>
      ))}
    </div>
  );
}

const Etichetta = ({ children, scura = false, viola = false }: { children: React.ReactNode; scura?: boolean; viola?: boolean }) => (
  <span className={`mr-1 inline-block rounded-full border px-[7px] py-px text-xs font-bold ${
    viola ? 'border-[#6B3FA0] bg-[#6B3FA0] text-white' : scura ? 'border-inchiostro bg-inchiostro text-white' : 'border-linea bg-carta text-inchiostro'}`}>{children}</span>
);

function statoUfficiale(m: Impegno) {
  if (m.stato === 'confermata') return `Confermata${m.comunicato ? ' · ' + m.comunicato : ''}`;
  if (m.stato === 'variata') return `Variata${m.comunicato ? ' · ' + m.comunicato : ''}`;
  if (m.stato === 'calendario') return 'Da calendario';
  return '';
}

export function RigaPartita({ m, tutte, conData, mia, nomeSquadra, squadre, children }: {
  m: Impegno; tutte: boolean; conData: boolean; mia?: boolean; nomeSquadra?: string; squadre: SquadraCal[]; children?: React.ReactNode;
}) {
  const cal = CALENDARI[calendario(m)];
  const note = m.evento
    ? [m.venue, m.fine ? 'fino alle ' + m.fine : '', squadreTesto(m.evento.squadre, squadre), m.note]
    : [m.home ? `In casa a ${cal.nome}` : 'Trasferta', m.home ? '' : m.venue, conData ? '' : tipoPartita(m), m.note];
  const stato = conData && !m.friendly && !m.evento ? statoUfficiale(m) : '';
  return (
    <div className="flex gap-3 border-l-4 py-2.5 pl-2.5" style={{ borderColor: cal.colore, background: mia ? `color-mix(in srgb, ${cal.colore} 12%, transparent)` : undefined }}>
      <div className="w-14 shrink-0 text-sm">
        <b className="block">{giorno(m.date)}{conData && m.date ? ' ' + fmtData(m.date).slice(0, 5) : ''}</b>
        <span className="text-grigio">{m.time ? m.time.padStart(5, '0') : 'ora ?'}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-display text-lg font-semibold leading-tight">
          {nomePartita(m, tutte, nomeSquadra)}
          {mia && tutte && <span className="ml-1 font-sans text-xs font-semibold text-grigio">· la tua squadra</span>}
        </p>
        <p className="text-sm text-grigio">
          {m.evento ? <Etichetta viola>{m.tipo}</Etichetta> : conData && <Etichetta scura={!!m.friendly}>{m.friendly ? m.tipo || 'Amichevole' : 'Campionato'}</Etichetta>}
          {note.filter(Boolean).join(' · ')}
        </p>
        {stato && <p className={`text-sm text-grigio ${m.stato === 'variata' ? 'font-bold' : ''}`}>{stato}</p>}
        {children}
      </div>
    </div>
  );
}

/** Elenco raggruppato per mese; `riga` disegna ogni impegno */
export function ElencoMesi({ ms, riga }: { ms: Impegno[]; riga: (m: Impegno) => React.ReactNode }) {
  return (
    <ul className="rounded-xl border border-linea bg-white px-3">
      {ms.map((m, i) => {
        const mm = (m.date || '').slice(0, 7), testa = i === 0 || (ms[i - 1].date || '').slice(0, 7) !== mm;
        return (
          <li key={`${m.team?.id ?? 'ev'}|${m.id}|${i}`} className={i && !testa ? 'border-t border-linea' : ''}>
            {testa && <p className="pb-1 pt-4 font-display text-[13px] font-bold uppercase tracking-wider text-grigio">{mm ? meseDi(mm) : 'Senza data'}</p>}
            {riga(m)}
          </li>
        );
      })}
    </ul>
  );
}

