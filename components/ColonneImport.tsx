'use client';
// Scelta delle colonne di un file da importare (lib/import-tabella.ts): per ogni dato, quale colonna del file lo contiene.
// Le colonne sono già indovinate dal nome; "—" = non c'è.
import type { CampoImport } from '@/lib/import-tabella';

export function ColonneImport({ intestazione, campi, colonne, onChange, esempio }: {
  intestazione: string[]; campi: CampoImport[]; colonne: Record<string, number>; onChange: (c: Record<string, number>) => void; esempio?: string[];
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {campi.map((c) => (
        <label key={c.k} className="block">
          <span className="mb-1 block text-sm font-semibold text-grigio">{c.etichetta}{c.obbligatorio ? ' *' : ''}</span>
          <select className="campo" value={colonne[c.k] ?? -1} onChange={(e) => onChange({ ...colonne, [c.k]: +e.target.value })}>
            <option value={-1}>— non c&apos;è</option>
            {intestazione.map((h, i) => <option key={i} value={i}>{h || `Colonna ${i + 1}`}{esempio?.[i] ? ` (es. ${esempio[i].slice(0, 24)})` : ''}</option>)}
          </select>
        </label>
      ))}
    </div>
  );
}
