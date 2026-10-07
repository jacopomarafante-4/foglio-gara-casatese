// Grafici della dashboard in SVG, senza librerie: riquadro con sigla e spiegazione, ciambella con tabella, linea nel tempo, barre
import type { Sigla } from '@/lib/statistiche';
import { SIGLE } from '@/lib/statistiche';

export const COLORI = ['#003da5', '#c41e3a', '#d4af37', '#2e7d4f', '#6b3fa0', '#4a596c', '#0e7c86'];

/** Numero grande con sigla, nome e la spiegazione minima sotto */
export function Riquadro({ sigla, nome, valore, spiegazione, attivo = true }: { sigla?: Sigla; nome?: string; valore: React.ReactNode; spiegazione?: string; attivo?: boolean }) {
  const s = sigla ? SIGLE[sigla] : null;
  return (
    <div className={`rounded-xl border border-linea bg-white p-3 ${attivo ? '' : 'border-dashed bg-carta'}`}>
      <p className="flex items-baseline justify-between gap-2">
        <span className="font-semibold">{sigla && <b className="mr-1.5 font-display text-blu">{sigla}</b>}{nome ?? s?.nome}</span>
        <b className={`font-display text-3xl ${attivo ? '' : 'text-base text-grigio'}`}>{attivo ? valore : 'da attivare'}</b>
      </p>
      <p className="mt-1 text-sm text-grigio">{spiegazione ?? s?.spiegazione}</p>
    </div>
  );
}

/** Ciambella con la tabella accanto (voce, valore, %); le voci a zero restano in tabella ma non nel cerchio */
export function Ciambella({ voci, unita = '' }: { voci: { l: string; n: number }[]; unita?: string }) {
  const tot = voci.reduce((a, v) => a + v.n, 0);
  const r = 40, giro = 2 * Math.PI * r;
  let fatto = 0;
  return (
    <div className="grid items-center gap-4 sm:grid-cols-[1fr_auto]">
      <table className="w-full text-sm">
        <thead className="border-b border-linea"><tr className="text-left text-grigio"><th className="py-1.5">Voce</th><th>{unita || 'Numero'}</th><th>%</th></tr></thead>
        <tbody className="divide-y divide-linea">
          {voci.map((v, i) => (
            <tr key={v.l}><td className="py-1.5"><i className="mr-2 inline-block size-3 rounded-sm align-middle" style={{ background: COLORI[i % COLORI.length] }} />{v.l}</td>
              <td>{v.n}</td><td>{tot ? ((v.n / tot) * 100).toFixed(1) + '%' : '—'}</td></tr>
          ))}
        </tbody>
      </table>
      <svg viewBox="0 0 100 100" className="mx-auto size-40" role="img" aria-label={voci.map((v) => `${v.l} ${v.n}`).join(', ')}>
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--color-linea)" strokeWidth="14" />
        {tot > 0 && voci.map((v, i) => {
          const tratto = (v.n / tot) * giro, el = (
            <circle key={v.l} cx="50" cy="50" r={r} fill="none" stroke={COLORI[i % COLORI.length]} strokeWidth="14"
              strokeDasharray={`${tratto} ${giro - tratto}`} strokeDashoffset={-fatto} transform="rotate(-90 50 50)" />
          );
          fatto += tratto;
          return v.n ? el : null;
        })}
        <text x="50" y="54" textAnchor="middle" className="fill-inchiostro font-display text-[14px] font-bold">{tot}</text>
      </svg>
    </div>
  );
}

/** Linea nel tempo (valori 0–1), con una soglia tratteggiata e le date sotto */
export function Linea({ punti, soglia }: { punti: { data: string; pct: number | null }[]; soglia?: number }) {
  const validi = punti.filter((p): p is { data: string; pct: number } => p.pct != null);
  if (validi.length < 2) return <p className="text-sm text-grigio">Servono almeno due allenamenti con le presenze segnate.</p>;
  const w = 600, h = 180, sx = 36, sy = 12, gx = (i: number) => sx + (i * (w - sx - 10)) / (validi.length - 1), gy = (v: number) => h - 24 - v * (h - 24 - sy);
  const giorno = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
  const etichette = [...new Set([0, Math.floor((validi.length - 1) / 2), validi.length - 1])];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full" role="img" aria-label={validi.map((p) => `${giorno(p.data)} ${Math.round(p.pct * 100)}%`).join(', ')}>
      {[0, 0.25, 0.5, 0.75, 1].map((v) => (
        <g key={v}><line x1={sx} x2={w - 10} y1={gy(v)} y2={gy(v)} stroke="var(--color-linea)" />
          <text x={sx - 6} y={gy(v) + 4} textAnchor="end" className="fill-grigio text-[11px]">{v * 100}%</text></g>
      ))}
      {soglia != null && <line x1={sx} x2={w - 10} y1={gy(soglia)} y2={gy(soglia)} stroke="var(--color-rosso)" strokeDasharray="5 4" />}
      <polyline points={validi.map((p, i) => `${gx(i)},${gy(p.pct)}`).join(' ')} fill="none" stroke="var(--color-blu)" strokeWidth="2.5" strokeLinejoin="round" />
      {validi.map((p, i) => <circle key={i} cx={gx(i)} cy={gy(p.pct)} r="3.5" className="fill-blu"><title>{`${giorno(p.data)}: ${Math.round(p.pct * 100)}%`}</title></circle>)}
      {etichette.map((i) => <text key={i} x={gx(i)} y={h - 6} textAnchor={i === validi.length - 1 ? "end" : i === 0 ? "start" : "middle"} className="fill-grigio text-[11px]">{giorno(validi[i].data)}</text>)}
    </svg>
  );
}

/** Barre orizzontali (una per voce), lunghezza proporzionale al massimo */
export function Barre({ voci, unita }: { voci: { l: string; n: number; sotto?: string }[]; unita: string }) {
  const max = Math.max(1, ...voci.map((v) => v.n));
  return (
    <ul className="space-y-1.5">
      {voci.map((v) => (
        <li key={v.l} className="grid grid-cols-[9rem_1fr] items-center gap-2 text-sm sm:grid-cols-[12rem_1fr]">
          <span className="truncate font-semibold" title={v.l}>{v.l}</span>
          <span className="flex items-center gap-2">
            <i className="block h-4 rounded-r bg-blu" style={{ width: `${(v.n / max) * 100}%`, minWidth: v.n ? 2 : 0 }} />
            <span className="whitespace-nowrap text-grigio">{v.n}{unita}{v.sotto ? ` · ${v.sotto}` : ''}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
