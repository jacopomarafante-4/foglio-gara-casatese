// Chi ha fatto una valutazione: iniziali in un cerchio colorato (stesso colore per la stessa persona, sempre),
// nome intero al passaggio del mouse. I mister dal Portale hanno il cerchio col bordo, per riconoscerli.
const COLORI = ['#003DA5', '#C41E3A', '#B8860B', '#6B3FA0', '#0F7C7C', '#A34A1E', '#B8336A', '#35506B', '#5C7F1E', '#1F5FA8'];

export type FirmaValutazione = { chiave: string; nome: string; mister: boolean };

/** Chi firma: account dello staff (nome e cognome) o mister dal Portale ("Mister Rossi · Under 14") */
export function firma(v: {
  autore_id?: string | null; autore_squadra?: string | null;
  autore?: { nome: string | null; cognome: string | null; email?: string } | null;
}): FirmaValutazione {
  if (v.autore) {
    const nome = [v.autore.nome, v.autore.cognome].filter(Boolean).join(' ') || v.autore.email || 'Staff';
    return { chiave: v.autore_id ?? nome, nome, mister: false };
  }
  if (v.autore_squadra) return { chiave: 'm:' + v.autore_squadra, nome: `Mister ${v.autore_squadra}`, mister: true };
  return { chiave: '?', nome: 'Autore non disponibile', mister: false };
}

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
