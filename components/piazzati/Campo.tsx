'use client';
// Campo di un calcio piazzato (era campoSVG/fieldSVG/schemeThumb del Portale): mezzo campo in metri, pedine colorate per compito
// col numero di maglia di chi gioca (o il numero di ruolo), pallone, frecce e scritte. Con `modifica`: si trascinano pedine e
// pallone, un tocco sceglie una pedina, gli strumenti disegnano frecce/linee o scrivono sul campo, un tocco su un segno lo sceglie.
import { useRef, useState } from 'react';
import { YS, VX0, VX1, VY0, VY1, coloreDi, type Pedina, type Schema, type Scritta, type Segno } from '@/lib/piazzati';

export type Strumento = '' | 'arrow' | 'arrow-dash' | 'line' | 'text';
export type SegnoScelto = { tipo: 'draw' | 'mark'; i: number } | null;
const ROSSO = '#C8102E', BLU = '#1F5FA8';

function Terreno() {
  const g = '#2F6B45', Y = (v: number) => v * YS, a = Math.acos(5.5 / 9.15);
  const ax1 = -9.15 * Math.sin(a), ay = Y(11 + 9.15 * Math.cos(a)), ax2 = 9.15 * Math.sin(a);
  return (
    <>
      {Array.from({ length: 10 }, (_, i) => (
        <rect key={i} x={VX0} y={Y(VY0) + (i * (VY1 - VY0) * YS) / 10} width={VX1 - VX0} height={((VY1 - VY0) * YS) / 10} fill={i % 2 ? '#D8E9DD' : '#E3EFE6'} />))}
      <g fill="none" stroke={g} strokeWidth={0.28} strokeLinecap="round">
        <line x1={VX0} y1={0} x2={VX1} y2={0} /><line x1={34} y1={0} x2={34} y2={Y(VY1)} />
        <rect x={-20.16} y={0} width={40.32} height={Y(16.5)} /><rect x={-9.16} y={0} width={18.32} height={Y(5.5)} />
        <rect x={-3.66} y={Y(-2.2)} width={7.32} height={Y(2.2)} />
        <path d={`M ${ax1} ${ay} A 9.15 ${9.15 * YS} 0 0 0 ${ax2} ${ay}`} /><path d={`M 33 0 A 1 ${YS} 0 0 1 34 ${YS}`} />
      </g>
      <circle cx={0} cy={Y(11)} r={0.3} fill={g} />
    </>
  );
}
const Pallone = ({ b }: { b: { x: number; y: number } }) => (
  <g transform={`translate(${b.x} ${b.y * YS})`}>
    <circle r={1.15} fill="#fff" stroke="#15202B" strokeWidth={0.22} /><path d="M0 -.45 L.43 -.14 L.27 .37 L-.27 .37 L-.43 -.14Z" fill="#15202B" />
  </g>
);

export function Campo({ sc, pedine, pallone, segni, scritte, colori, etichetta, modifica = false, piccolo = false, pedinaScelta = null, strumento = '',
  segnoScelto = null, onCambia, onPedina, onSegno, titolo }: {
  sc: Schema; pedine: Pedina[]; pallone: { x: number; y: number }; segni: Segno[]; scritte: Scritta[]; colori: Map<string, string>;
  /** numero sulla pedina (maglia di chi gioca) e se c'è un giocatore */
  etichetta: (t: Pedina) => { testo: string | number; pieno: boolean; aMano?: boolean };
  modifica?: boolean; piccolo?: boolean; pedinaScelta?: string | null; strumento?: Strumento; segnoScelto?: SegnoScelto;
  onCambia?: (s: Schema) => void; onPedina?: (id: string | null) => void; onSegno?: (s: SegnoScelto) => void; titolo?: string;
}) {
  const svg = useRef<SVGSVGElement>(null);
  const [trascina, setTrascina] = useState<{ cosa: 'pedina' | 'pallone' | 'segno'; id?: string; x0: number; y0: number; mosso: boolean; x: number; y: number; bozza?: Segno } | null>(null);
  const mid = `freccia-${sc.id}${piccolo ? '-p' : ''}`;
  const locale = (e: React.PointerEvent) => {
    const s = svg.current!, pt = s.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    const p = pt.matrixTransform(s.getScreenCTM()!.inverse());
    return { x: +Math.max(VX0 + 1, Math.min(VX1 - 0.5, p.x)).toFixed(2), y: +Math.max(VY0 + 0.5, Math.min(VY1 - 1, p.y / YS)).toFixed(2) };
  };
  const giu = (e: React.PointerEvent) => {
    if (!modifica) return;
    const p = locale(e), el = (e.target as Element).closest('[data-cosa]') as HTMLElement | null;
    e.preventDefault();
    if (strumento === 'text') {
      const testo = (window.prompt('Testo da scrivere sul campo:', '') || '').trim();
      if (testo) onCambia?.({ ...sc, marks: [...(sc.marks ?? []), { text: testo, x: p.x, y: p.y }] });
      return;
    }
    svg.current?.setPointerCapture?.(e.pointerId);
    if (strumento) {
      setTrascina({ cosa: 'segno', x0: e.clientX, y0: e.clientY, mosso: false, ...p,
        bozza: { type: strumento.startsWith('arrow') ? 'arrow' : 'line', dashed: strumento.endsWith('dash'), x1: p.x, y1: p.y, x2: p.x, y2: p.y } });
      return;
    }
    const cosa = el?.dataset.cosa;
    if (cosa === 'pedina' || cosa === 'pallone') { setTrascina({ cosa, id: el!.dataset.id, x0: e.clientX, y0: e.clientY, mosso: false, ...p }); return; }
    if (cosa === 'draw' || cosa === 'mark') { onPedina?.(null); onSegno?.({ tipo: cosa, i: +el!.dataset.i! }); return; }
    onPedina?.(null); onSegno?.(null);
  };
  const muovi = (e: React.PointerEvent) => {
    if (!trascina) return;
    const mosso = trascina.mosso || Math.hypot(e.clientX - trascina.x0, e.clientY - trascina.y0) > 5;
    if (!mosso) return;
    const p = locale(e);
    setTrascina({ ...trascina, mosso, ...p, bozza: trascina.bozza && { ...trascina.bozza, x2: p.x, y2: p.y } });
  };
  const su = () => {
    const t = trascina; setTrascina(null);
    if (!t) return;
    if (t.cosa === 'segno') {
      if (t.bozza && t.mosso && Math.hypot(t.bozza.x2 - t.bozza.x1, (t.bozza.y2 - t.bozza.y1) * YS) > 1) onCambia?.({ ...sc, draw: [...(sc.draw ?? []), t.bozza] });
      return;
    }
    if (!t.mosso) { if (t.cosa === 'pedina') { onSegno?.(null); onPedina?.(pedinaScelta === t.id ? null : t.id!); } return; }
    if (t.cosa === 'pallone') onCambia?.({ ...sc, ball: { x: t.x, y: t.y } });
    else onCambia?.({ ...sc, tokens: sc.tokens.map((q) => (q.id === t.id ? { ...q, x: t.x, y: t.y } : q)) });
  };
  const b = trascina?.cosa === 'pallone' && trascina.mosso ? trascina : pallone;

  return (
    <svg ref={svg} viewBox={`${VX0} ${VY0 * YS} ${VX1 - VX0} ${(VY1 - VY0) * YS}`} role="img" aria-label={titolo ?? `Schema ${sc.name}`}
      className={`block w-full select-none ${modifica ? 'touch-none' : ''} ${modifica && strumento ? 'cursor-crosshair' : ''} ${piccolo ? 'rounded-lg' : 'rounded-xl border border-linea'}`}
      onPointerDown={giu} onPointerMove={muovi} onPointerUp={su} onPointerCancel={su}>
      <defs><marker id={mid} markerWidth={3.2} markerHeight={3.2} refX={2.6} refY={1.6} orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L3.2,1.6 L0,3.2 Z" fill={ROSSO} /></marker></defs>
      <Terreno />
      {[...segni, ...(trascina?.bozza && trascina.mosso ? [trascina.bozza] : [])].map((d, i) => {
        const sel = segnoScelto?.tipo === 'draw' && segnoScelto.i === i;
        return (
          <g key={'d' + i}>
            {modifica && i < (sc.draw ?? []).length && <line data-cosa="draw" data-i={i} x1={d.x1} y1={d.y1 * YS} x2={d.x2} y2={d.y2 * YS} stroke="transparent" strokeWidth={1.6} className="cursor-pointer" />}
            <line x1={d.x1} y1={d.y1 * YS} x2={d.x2} y2={d.y2 * YS} stroke={sel ? BLU : ROSSO} strokeWidth={sel ? 0.45 : piccolo ? 0.35 : 0.32} strokeLinecap="round"
              strokeDasharray={d.dashed ? '.9 .7' : undefined} markerEnd={d.type === 'arrow' ? `url(#${mid})` : undefined} pointerEvents="none" />
          </g>);
      })}
      {!piccolo && scritte.map((m, i) => {
        const sel = segnoScelto?.tipo === 'mark' && segnoScelto.i === i;
        return (
          <g key={'m' + i} {...(modifica && i < (sc.marks ?? []).length ? { 'data-cosa': 'mark', 'data-i': i, className: 'cursor-pointer' } : {})}>
            <circle cx={m.x} cy={m.y * YS} r={2.2} fill="transparent" />
            <text x={m.x} y={m.y * YS + 0.6} textAnchor="middle" fontFamily="Barlow, Arial, sans-serif" fontWeight={700} fontSize={2} fill={sel ? BLU : ROSSO} pointerEvents="none">{m.text}</text>
          </g>);
      })}
      <g {...(modifica ? { 'data-cosa': 'pallone', className: 'cursor-grab' } : {})}>
        {modifica && <circle cx={b.x} cy={b.y * YS} r={2.4} fill="transparent" />}<Pallone b={b} />
      </g>
      {pedine.map((t) => {
        const pos = trascina?.cosa === 'pedina' && trascina.id === t.id && trascina.mosso ? trascina : t;
        const col = coloreDi(colori, t);
        if (piccolo) return <circle key={t.id} cx={pos.x} cy={pos.y * YS} r={1.5} fill={col} stroke="#fff" strokeWidth={0.3} />;
        const e = etichetta(t), sel = pedinaScelta === t.id;
        return (
          <g key={t.id} transform={`translate(${pos.x} ${pos.y * YS})`} {...(modifica ? { 'data-cosa': 'pedina', 'data-id': t.id, className: 'cursor-grab' } : {})}>
            <circle r={3} fill="transparent" />
            {sel && <circle r={2.5} fill="none" stroke={BLU} strokeWidth={0.4} />}
            <circle r={1.75} fill={e.pieno ? col : '#fff'} stroke={e.pieno ? '#fff' : col} strokeWidth={0.3} strokeDasharray={e.pieno ? undefined : '.6 .4'} />
            <text y={0.62} textAnchor="middle" fontFamily="Barlow Condensed, Arial Narrow, sans-serif" fontWeight={700} fontSize={1.85} fill={e.pieno ? '#fff' : col}>{e.testo}</text>
            {t.tag && <text y={-2.35} textAnchor="middle" fontFamily="Barlow, Arial, sans-serif" fontWeight={700} fontSize={1.4} fill={ROSSO}>{t.tag}</text>}
            {e.aMano && <text x={1.55} y={-1.15} fontFamily="Barlow, Arial, sans-serif" fontWeight={700} fontSize={1.5} fill={BLU} stroke="#fff" strokeWidth={0.3} paintOrder="stroke">*</text>}
          </g>);
      })}
    </svg>
  );
}
