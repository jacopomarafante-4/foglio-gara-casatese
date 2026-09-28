// Chi ha fatto una valutazione: iniziali in un cerchio colorato (stesso colore per la stessa persona, sempre),
// nome intero al passaggio del mouse. I mister dal Portale hanno il cerchio col bordo, per riconoscerli.
import { firma, valutatori, SOGLIA_VALUTAZIONI, type FirmaValutazione } from '@/lib/valutazioni';
export { firma, valutatori, SOGLIA_VALUTAZIONI, type FirmaValutazione };

const COLORI = ['#003DA5', '#C41E3A', '#B8860B', '#6B3FA0', '#0F7C7C', '#A34A1E', '#B8336A', '#35506B', '#4A5563', '#1F5FA8'];

function iniziali(nome: string) {
  const parole = nome.replace(/^Mister\s+/i, '').split('·')[0].trim().split(/\s+/).filter(Boolean);
  return ((parole[0]?.[0] ?? '?') + (parole.length > 1 ? parole[parole.length - 1][0] : '')).toUpperCase();
}
function colore(chiave: string) {
  let h = 0;
  for (const c of chiave) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return COLORI[h % COLORI.length];
}

export function Autore({ f, piccolo = false }: { f: FirmaValutazione; piccolo?: boolean }) {
  const c = colore(f.chiave);
  return (
    <span
      title={f.nome}
      aria-label={`Valutazione di ${f.nome}`}
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold ${piccolo ? 'h-6 w-6 text-[10px]' : 'h-8 w-8 text-xs'}`}
      style={f.mister ? { border: `2px solid ${c}`, color: c, background: '#fff' } : { background: c, color: '#fff' }}
    >
      {iniziali(f.nome)}
    </span>
  );
}

/** Più autori affiancati (i più recenti prima), al massimo `max` e poi "+N" */
export function Autori({ firme, max = 3 }: { firme: FirmaValutazione[]; max?: number }) {
  const uniche = firme.filter((f, i) => firme.findIndex((x) => x.chiave === f.chiave) === i);
  return (
    <span className="inline-flex items-center -space-x-1.5">
      {uniche.slice(0, max).map((f) => <span key={f.chiave} className="rounded-full ring-2 ring-white"><Autore f={f} piccolo /></span>)}
      {uniche.length > max && <span className="pl-2.5 text-xs font-semibold text-grigio">+{uniche.length - max}</span>}
    </span>
  );
}

/** Le 3 caselle: iniziali di chi ha valutato, caselle vuote tratteggiate; a 3 su 3 diventano verdi */
export function SlotValutazioni({ firme, piccolo = false }: { firme: FirmaValutazione[]; piccolo?: boolean }) {
  const completo = firme.length >= SOGLIA_VALUTAZIONI;
  const dim = piccolo ? 'h-6 w-6 text-[10px]' : 'h-7 w-7 text-[11px]';
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full p-0.5 ${completo ? 'bg-verde/15 ring-2 ring-verde' : ''}`}
      title={completo ? `${firme.length} persone l'hanno valutato: si può inserire` : `${firme.length} di ${SOGLIA_VALUTAZIONI} valutazioni per l'inserimento`}
      aria-label={`${Math.min(firme.length, SOGLIA_VALUTAZIONI)} valutazioni su ${SOGLIA_VALUTAZIONI}`}
    >
      {Array.from({ length: SOGLIA_VALUTAZIONI }, (_, i) => firme[i]
        ? <Autore key={firme[i].chiave + i} f={firme[i]} piccolo />
        : <span key={'v' + i} className={`inline-flex items-center justify-center rounded-full border-2 border-dashed border-linea text-grigio ${dim}`} aria-hidden="true">·</span>)}
      {firme.length > SOGLIA_VALUTAZIONI && <span className="px-1 text-xs font-semibold text-grigio">+{firme.length - SOGLIA_VALUTAZIONI}</span>}
      {completo && <span className="pr-1.5 text-xs font-bold text-verde" aria-hidden="true">✓</span>}
    </span>
  );
}
