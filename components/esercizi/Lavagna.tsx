'use client';
// Lavagna di un esercizio (Esercitazioni, 0052): campo rettangolare con le misure dell'esercizio (metri), giocatori delle due squadre,
// jolly e portieri, attrezzi, tracciati (passaggio = freccia piena, corsa = tratteggiata, dribbling = ondulata) e zone.
// Si trascina col dito o col mouse; uno strumento aggiunge un elemento toccando il campo o disegna trascinando.
import { useRef, useState } from 'react';
import type { Elemento, Lavagna as Dati, Tracciato, Zona } from '@/lib/esercizi';

export type Strumento = 'sposta' | 'a' | 'b' | 'jolly' | 'portiere' | 'palla' | 'cinesino' | 'cono' | 'paletto' | 'porta' | 'passaggio' | 'corsa' | 'dribbling' | 'zona';
export const STRUMENTI: { k: Strumento; l: string }[] = [
  { k: 'sposta', l: '✋ Sposta' }, { k: 'a', l: '● Rossoblù' }, { k: 'b', l: '● Avversari' }, { k: 'jolly', l: '● Jolly' }, { k: 'portiere', l: '● Portiere' },
  { k: 'palla', l: '⚽ Palla' }, { k: 'cinesino', l: '▲ Cinesino' }, { k: 'cono', l: '▲ Cono' }, { k: 'paletto', l: '| Paletto' }, { k: 'porta', l: '⊓ Porticina' },
  { k: 'passaggio', l: '→ Passaggio' }, { k: 'corsa', l: '⇢ Corsa' }, { k: 'dribbling', l: '〰 Dribbling' }, { k: 'zona', l: '▭ Zona' },
];
const COLORI = { a: '#003DA5', b: '#C41E3A', jolly: '#D4AF37', portiere: '#15202B' } as const;
const ERBA = '#2F6B45', ROSSO = '#C8102E';
const nuovoId = (p: string) => p + Math.random().toString(36).slice(2, 9);
type Scelto = { tipo: 'elemento' | 'tracciato' | 'zona'; id: string } | null;

/** Percorso ondulato da (x1,y1) a (x2,y2): il dribbling */
function onda(x1: number, y1: number, x2: number, y2: number, a: number) {
  const L = Math.hypot(x2 - x1, y2 - y1), n = Math.max(2, Math.round(L / (a * 3))), ux = (x2 - x1) / L, uy = (y2 - y1) / L;
  let d = `M ${x1} ${y1}`;
  for (let i = 1; i <= n * 4; i++) {
    const t = (i / (n * 4)) * L * 0.92, s = Math.sin((i / 4) * Math.PI) * a * (i < n * 4 ? 1 : 0);
    d += ` L ${x1 + ux * t - uy * s} ${y1 + uy * t + ux * s}`;
  }
  return d + ` L ${x2} ${y2}`;
}

export function Lavagna({ dati, lunghezza, larghezza, onCambia, strumento, scelto, onScegli, soloVista = false }: {
  dati: Dati; lunghezza: number; larghezza: number; onCambia?: (d: Dati) => void; strumento?: Strumento; scelto?: Scelto;
  onScegli?: (s: Scelto) => void; soloVista?: boolean;
}) {
  const L = Math.max(5, lunghezza || 30), W = Math.max(5, larghezza || 20), M = Math.max(2.5, Math.max(L, W) / 12);
  const r = Math.max(0.7, Math.min(2.2, Math.max(L, W) / 40));   // grandezza dei simboli in metri
  const svg = useRef<SVGSVGElement>(null);
  const [trascina, setTrascina] = useState<{ cosa: 'elemento' | 'disegno'; id?: string; x0: number; y0: number; x: number; y: number; mosso: boolean } | null>(null);
  const elementi = dati.elementi ?? [], tracciati = dati.tracciati ?? [], zone = dati.zone ?? [];
  const punto = (e: React.PointerEvent) => {
    const s = svg.current!, p = s.createSVGPoint(); p.x = e.clientX; p.y = e.clientY;
    const q = p.matrixTransform(s.getScreenCTM()!.inverse());
    return { x: +Math.max(-M + 0.5, Math.min(L + M - 0.5, q.x)).toFixed(2), y: +Math.max(-M + 0.5, Math.min(W + M - 0.5, q.y)).toFixed(2) };
  };
  const cambia = (d: Partial<Dati>) => onCambia?.({ ...dati, ...d });

  function giu(e: React.PointerEvent) {
    if (soloVista || !onCambia) return;
    const p = punto(e), el = (e.target as Element).closest('[data-cosa]') as HTMLElement | null;
    e.preventDefault();
    svg.current?.setPointerCapture?.(e.pointerId);
    const s = strumento ?? 'sposta';
    if (['passaggio', 'corsa', 'dribbling', 'zona'].includes(s)) { setTrascina({ cosa: 'disegno', x0: p.x, y0: p.y, x: p.x, y: p.y, mosso: false }); return; }
    if (s === 'sposta') {
      if (el?.dataset.cosa === 'elemento') { onScegli?.({ tipo: 'elemento', id: el.dataset.id! }); setTrascina({ cosa: 'elemento', id: el.dataset.id, x0: p.x, y0: p.y, x: p.x, y: p.y, mosso: false }); }
      else if (el?.dataset.cosa === 'tracciato' || el?.dataset.cosa === 'zona') onScegli?.({ tipo: el.dataset.cosa, id: el.dataset.id! });
      else onScegli?.(null);
      return;
    }
    // aggiunge un elemento dove si tocca
    const squadra = ['a', 'b', 'jolly', 'portiere'].includes(s) ? (s as Elemento['squadra']) : undefined;
    const quanti = elementi.filter((x) => x.tipo === 'giocatore' && x.squadra === squadra).length;
    const nuovo: Elemento = squadra ? { id: nuovoId('e'), tipo: 'giocatore', squadra, x: p.x, y: p.y, n: squadra === 'portiere' ? 'P' : squadra === 'jolly' ? 'J' : String(quanti + 1) }
      : { id: nuovoId('e'), tipo: s as Elemento['tipo'], x: p.x, y: p.y };
    cambia({ elementi: [...elementi, nuovo] });
    onScegli?.({ tipo: 'elemento', id: nuovo.id });
  }
  function muovi(e: React.PointerEvent) {
    if (!trascina) return;
    const p = punto(e), mosso = trascina.mosso || Math.hypot(p.x - trascina.x0, p.y - trascina.y0) > r * 0.3;
    setTrascina({ ...trascina, ...p, mosso });
  }
  function su() {
    const t = trascina; setTrascina(null);
    if (!t || !t.mosso) return;
    if (t.cosa === 'elemento') { cambia({ elementi: elementi.map((x) => (x.id === t.id ? { ...x, x: t.x, y: t.y } : x)) }); return; }
    const s = strumento!;
    if (s === 'zona') {
      const z: Zona = { id: nuovoId('z'), x: Math.min(t.x0, t.x), y: Math.min(t.y0, t.y), w: Math.abs(t.x - t.x0), h: Math.abs(t.y - t.y0) };
      if (z.w > 0.5 && z.h > 0.5) { cambia({ zone: [...zone, z] }); onScegli?.({ tipo: 'zona', id: z.id }); }
      return;
    }
    if (Math.hypot(t.x - t.x0, t.y - t.y0) < r) return;
    const tr: Tracciato = { id: nuovoId('t'), tipo: s as Tracciato['tipo'], x1: t.x0, y1: t.y0, x2: t.x, y2: t.y };
    cambia({ tracciati: [...tracciati, tr] });
    onScegli?.({ tipo: 'tracciato', id: tr.id });
  }

  const pos = (x: Elemento) => (trascina?.cosa === 'elemento' && trascina.id === x.id && trascina.mosso ? trascina : x);
  const bozza = trascina?.cosa === 'disegno' && trascina.mosso ? trascina : null;
  const sel = (tipo: string, id: string) => scelto?.tipo === tipo && scelto.id === id;
  const freccia = 'url(#freccia-esercizio)';
  const linea = (t: Pick<Tracciato, 'tipo' | 'x1' | 'y1' | 'x2' | 'y2'>, attivo: boolean) => {
    const colore = attivo ? '#1F5FA8' : t.tipo === 'passaggio' ? '#15202B' : ROSSO, sp = r * 0.18;
    return t.tipo === 'dribbling'
      ? <path d={onda(t.x1, t.y1, t.x2, t.y2, r * 0.35)} fill="none" stroke={colore} strokeWidth={sp} markerEnd={freccia} pointerEvents="none" />
      : <line x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke={colore} strokeWidth={sp} strokeDasharray={t.tipo === 'corsa' ? `${r * 0.6} ${r * 0.4}` : undefined}
        markerEnd={freccia} pointerEvents="none" />;
  };

  return (
    <svg ref={svg} viewBox={`${-M} ${-M} ${L + 2 * M} ${W + 2 * M}`} role="img" aria-label={`Lavagna ${L} per ${W} metri`}
      className={`block w-full select-none rounded-xl border border-linea bg-[#E3EFE6] ${soloVista ? '' : 'touch-none'} ${strumento && strumento !== 'sposta' ? 'cursor-crosshair' : ''}`}
      onPointerDown={giu} onPointerMove={muovi} onPointerUp={su} onPointerCancel={su}>
      <defs>
        <marker id="freccia-esercizio" markerWidth="4" markerHeight="4" refX="3.2" refY="2" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L4,2 L0,4 Z" fill="context-stroke" /></marker>
      </defs>
      {Array.from({ length: 8 }, (_, i) => <rect key={i} x={(i * L) / 8} y={0} width={L / 8} height={W} fill={i % 2 ? '#D8E9DD' : '#E3EFE6'} />)}
      <rect x={0} y={0} width={L} height={W} fill="none" stroke={ERBA} strokeWidth={Math.max(0.12, r * 0.12)} />
      <text x={L / 2} y={W + M * 0.85} textAnchor="middle" fontSize={Math.max(1, r * 0.9)} fill={ERBA} fontFamily="Barlow, Arial, sans-serif" fontWeight={600}>{L} m</text>
      <text x={-M * 0.55} y={W / 2} textAnchor="middle" fontSize={Math.max(1, r * 0.9)} fill={ERBA} fontFamily="Barlow, Arial, sans-serif" fontWeight={600}
        transform={`rotate(-90 ${-M * 0.55} ${W / 2})`}>{W} m</text>
      {zone.map((z) => (
        <rect key={z.id} data-cosa="zona" data-id={z.id} x={z.x} y={z.y} width={z.w} height={z.h} fill="rgba(212,175,55,0.22)"
          stroke={sel('zona', z.id) ? '#1F5FA8' : '#D4AF37'} strokeWidth={r * 0.12} strokeDasharray={`${r * 0.5} ${r * 0.3}`} />
      ))}
      {bozza && strumento === 'zona' && <rect x={Math.min(bozza.x0, bozza.x)} y={Math.min(bozza.y0, bozza.y)} width={Math.abs(bozza.x - bozza.x0)} height={Math.abs(bozza.y - bozza.y0)}
        fill="rgba(212,175,55,0.22)" stroke="#D4AF37" strokeWidth={r * 0.12} />}
      {tracciati.map((t) => (
        <g key={t.id}>
          {!soloVista && <line data-cosa="tracciato" data-id={t.id} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke="transparent" strokeWidth={r * 1.2} />}
          {linea(t, sel('tracciato', t.id))}
        </g>
      ))}
      {bozza && strumento && strumento !== 'zona' && linea({ tipo: strumento as Tracciato['tipo'], x1: bozza.x0, y1: bozza.y0, x2: bozza.x, y2: bozza.y }, false)}
      {elementi.map((x) => {
        const p = pos(x), attivo = sel('elemento', x.id);
        const anello = attivo ? <circle r={r * 1.45} fill="none" stroke="#1F5FA8" strokeWidth={r * 0.15} /> : null;
        let forma: React.ReactNode;
        if (x.tipo === 'giocatore') {
          const c = COLORI[x.squadra ?? 'a'];
          forma = <><circle r={r} fill={c} stroke="#fff" strokeWidth={r * 0.14} />
            <text y={r * 0.36} textAnchor="middle" fontSize={r * 1.05} fontWeight={700} fill={x.squadra === 'jolly' ? '#15202B' : '#fff'} fontFamily="Barlow Condensed, Arial Narrow, sans-serif">{x.n ?? ''}</text></>;
        } else if (x.tipo === 'palla') forma = <><circle r={r * 0.55} fill="#fff" stroke="#15202B" strokeWidth={r * 0.1} /><circle r={r * 0.2} fill="#15202B" /></>;
        else if (x.tipo === 'cinesino') forma = <path d={`M ${-r * 0.55} ${r * 0.35} L 0 ${-r * 0.4} L ${r * 0.55} ${r * 0.35} Z`} fill="#F59E0B" stroke="#B45309" strokeWidth={r * 0.06} />;
        else if (x.tipo === 'cono') forma = <path d={`M ${-r * 0.5} ${r * 0.6} L 0 ${-r * 0.9} L ${r * 0.5} ${r * 0.6} Z`} fill="#EA580C" stroke="#fff" strokeWidth={r * 0.08} />;
        else if (x.tipo === 'paletto') forma = <><line x1={0} y1={r * 0.9} x2={0} y2={-r * 0.9} stroke="#C8102E" strokeWidth={r * 0.22} /><circle cy={-r * 0.9} r={r * 0.18} fill="#C8102E" /></>;
        else forma = <path d={`M ${-r * 1.4} ${r * 0.5} L ${-r * 1.4} ${-r * 0.5} L ${r * 1.4} ${-r * 0.5} L ${r * 1.4} ${r * 0.5}`} fill="none" stroke="#15202B" strokeWidth={r * 0.2} />;
        return (
          <g key={x.id} transform={`translate(${p.x} ${p.y})`} {...(!soloVista ? { 'data-cosa': 'elemento', 'data-id': x.id, className: 'cursor-grab' } : {})}>
            <circle r={r * 1.4} fill="transparent" />{anello}{forma}
          </g>
        );
      })}
    </svg>
  );
}
