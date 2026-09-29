'use client';
// Domande facoltative di segnalazione e valutazione: pulsanti grandi da telefono, si tocca per scegliere e di nuovo per togliere
// (niente pulsante "–"). Il valore va nel form con un campo nascosto: vuoto = non risposto.
import { useState } from 'react';

const SCALA: [string, string][] = [1, 2, 3, 4, 5].map((n) => [String(n), String(n)]);

export function SceltaRapida({
  nome,
  etichetta,
  voci = SCALA,
  toni,
  stretta = false,
}: {
  nome: string;
  etichetta: string;
  voci?: [string, string][];
  /** classi per la voce scelta (es. impressione: blu, oro, rosso); di base blu */
  toni?: Record<string, string>;
  /** pulsanti quadrati affiancati (voti 1–5 nelle righe) */
  stretta?: boolean;
}) {
  const [valore, setValore] = useState('');
  return (
    <div role="radiogroup" aria-label={etichetta} className={`flex ${stretta ? 'gap-1' : 'gap-1.5'}`}>
      <input type="hidden" name={nome} value={valore} />
      {voci.map(([v, e]) => {
        const scelto = valore === v;
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={scelto}
            onClick={() => setValore(scelto ? '' : v)}
            className={`rounded-lg border font-display font-bold transition focus-visible:outline focus-visible:outline-3 focus-visible:outline-oro ${
              stretta ? 'h-11 w-10 shrink-0 text-lg' : 'min-h-11 min-w-0 flex-1 px-2 py-2 text-base'
            } ${scelto ? (toni?.[v] ?? 'border-blu bg-blu text-white') : 'border-linea bg-white text-inchiostro hover:border-blu'}`}
          >
            {e}
          </button>
        );
      })}
    </div>
  );
}
