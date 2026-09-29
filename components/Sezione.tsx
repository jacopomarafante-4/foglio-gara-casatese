// Moduli di segnalazione e valutazione: blocchi numerati nell'ordine in cui si compilano, e riga compatta per un voto 1–5.
import { SceltaRapida } from '@/components/SceltaRapida';

export function Sezione({
  n,
  titolo,
  sotto,
  facoltativo = false,
  children,
}: {
  n: number;
  titolo: string;
  sotto?: string;
  facoltativo?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-linea bg-white p-4 sm:p-5" aria-labelledby={`sezione-${n}`}>
      <header className="mb-4 flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blu font-display text-base font-bold text-white" aria-hidden="true">{n}</span>
        <div>
          <h2 id={`sezione-${n}`} className="font-display text-xl font-bold leading-8">
            {titolo}
            {facoltativo && <span className="ml-2 rounded-full bg-carta px-2 py-0.5 align-middle font-sans text-xs font-medium text-grigio">facoltativo</span>}
          </h2>
          {sotto && <p className="text-sm text-grigio">{sotto}</p>}
        </div>
      </header>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

/** Una voce da votare: nome e aiuto a sinistra, 1–5 a destra; con `nota` si apre una nota sotto */
export function RigaVoto({ nome, titolo, aiuto, nota = false }: { nome: string; titolo: string; aiuto?: string; nota?: boolean }) {
  return (
    <div className="border-t border-linea pt-3 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="min-w-32 flex-1">
          <span className="block font-semibold">{titolo}</span>
          {aiuto && <span className="block text-xs text-grigio">{aiuto}</span>}
        </div>
        <SceltaRapida nome={nome} etichetta={titolo} stretta />
      </div>
      {nota && (
        <details className="group mt-1">
          <summary className="inline-block cursor-pointer list-none py-1 text-sm font-semibold text-blu">
            <span className="group-open:hidden">+ Aggiungi una nota</span><span className="hidden group-open:inline">Nota</span>
          </summary>
          <textarea name={`${nome}_note`} rows={2} className="campo mt-1" placeholder={`Cosa hai notato sulla ${titolo.toLowerCase()}`} />
        </details>
      )}
    </div>
  );
}

/** Pulsante di salvataggio sempre visibile in fondo allo schermo */
export function BarraSalva({ testo, nota }: { testo: string; nota?: string }) {
  return (
    <div className="sticky bottom-0 z-10 -mx-4 border-t border-linea bg-white/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border">
      <button type="submit" className="bottone w-full">{testo}</button>
      {nota && <p className="mt-1 text-center text-xs text-grigio">{nota}</p>}
    </div>
  );
}
