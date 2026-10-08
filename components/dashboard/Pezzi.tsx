// Pezzi comuni delle dashboard (Home di ogni profilo): fascia blu del club con i numeri grandi e i loro mini-grafici, riquadri con
// titolo e spiegazione. Componenti server, grafici in SVG/CSS senza librerie.
export function Fascia({ titolo, sottotitolo, children }: { titolo: string; sottotitolo?: string; children?: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-blu to-blu-scuro p-4 text-white shadow-lg sm:p-5">
      <h1 className="font-display text-4xl font-bold">{titolo}</h1>
      {sottotitolo && <p className="text-white/80 first-letter:uppercase">{sottotitolo}</p>}
      {children && <div className="mt-4 grid grid-cols-2 gap-2.5 lg:grid-cols-4">{children}</div>}
    </section>
  );
}

export function Riquadro({ titolo, spiegazione, href, children, className = '' }: { titolo: string; spiegazione: string; href?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-linea bg-white p-4 shadow-[0_1px_2px_rgba(14,26,43,.05)] ${className}`}>
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <div><h2 className="font-display text-xl font-bold">{titolo}</h2><p className="text-sm text-grigio">{spiegazione}</p></div>
        {href && <a href={href} className="flex-none text-sm font-semibold text-blu">Apri ›</a>}
      </div>
      {children}
    </section>
  );
}

/** Mini linea bianca per la fascia (valori 0–1) */
export function Sparkline({ valori }: { valori: number[] }) {
  if (valori.length < 2) return <div className="h-8" />;
  const w = 100, h = 30, x = (i: number) => (i * w) / (valori.length - 1), min = Math.min(...valori, 0.6), y = (v: number) => h - 3 - ((v - min) / (1 - min || 1)) * (h - 6);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-8 w-full" aria-hidden>
      <polyline points={valori.map((v, i) => `${x(i)},${y(v)}`).join(' ')} fill="none" stroke="white" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <circle cx={x(valori.length - 1)} cy={y(valori.at(-1)!)} r="3" fill="var(--color-oro)" />
    </svg>
  );
}
/** Mini colonne bianche (segnalazioni per settimana) */
export function Colonne({ valori }: { valori: number[] }) {
  const max = Math.max(1, ...valori);
  return (
    <div className="flex h-8 items-end gap-1" aria-hidden>
      {valori.map((v, i) => <i key={i} className={`flex-1 rounded-t-sm ${i === valori.length - 1 ? 'bg-oro' : 'bg-white/70'}`} style={{ height: `${Math.max(6, (v / max) * 100)}%` }} />)}
    </div>
  );
}
export function NumeroFascia({ titolo, valore, sotto, children }: { titolo: string; valore: React.ReactNode; sotto: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col justify-between rounded-xl bg-white/10 p-3 ring-1 ring-white/15">
      <p className="text-[13px] font-semibold uppercase tracking-wider text-white/80">{titolo}</p>
      <p className="my-1 font-display text-4xl font-bold leading-none">{valore}</p>
      {children}
      <p className="mt-1 text-[13px] leading-snug text-white/80">{sotto}</p>
    </div>
  );
}


/** Barra orizzontale di un valore 0–1, con la soglia tratteggiata */
export function BarraPct({ valore, colore, soglia }: { valore: number | null; colore: string; soglia?: number }) {
  return (
    <span className="relative block h-5 overflow-hidden rounded-md bg-carta">
      <i className="absolute inset-y-0 left-0 rounded-md" style={{ width: `${(valore ?? 0) * 100}%`, background: colore }} />
      {soglia != null && <i className="absolute inset-y-0 border-l-2 border-dashed border-inchiostro/40" style={{ left: `${soglia * 100}%` }} />}
    </span>
  );
}
