import Link from 'next/link';

/** Scelta della vista dell'archivio: elenco o colonne per stato (+ doppioni per l'admin) */
export function VistaGiocatori({ attiva, admin }: { attiva: 'elenco' | 'stati'; admin: boolean }) {
  const voce = (href: string, testo: string, on: boolean) => (
    <Link
      href={href}
      aria-current={on ? 'page' : undefined}
      className={`rounded-md px-3 py-1.5 text-sm font-semibold ${on ? 'bg-white text-inchiostro shadow-sm' : 'text-grigio hover:text-inchiostro'}`}
    >
      {testo}
    </Link>
  );
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex rounded-lg bg-linea/60 p-1">
        {voce('/giocatori', 'Elenco', attiva === 'elenco')}
        {voce('/giocatori/stati', 'Per stato', attiva === 'stati')}
      </div>
      {admin && (
        <Link href="/giocatori/doppioni" className="rounded-lg border border-linea px-3 py-2 text-sm font-semibold hover:border-blu">
          Possibili doppioni
        </Link>
      )}
    </div>
  );
}
