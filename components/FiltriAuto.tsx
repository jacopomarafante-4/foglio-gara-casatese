'use client';
// Modulo dei filtri: si applica da solo appena si sceglie (tendine e caselle) o con Invio (ricerca), senza ricaricare tutta la pagina
// (navigazione dell'app: "Indietro" torna ai filtri di prima subito)
import { usePathname, useRouter } from 'next/navigation';

export function FiltriAuto({ children, className }: { children: React.ReactNode; className?: string }) {
  const router = useRouter(), percorso = usePathname();
  const vai = (f: HTMLFormElement) => {
    const q = new URLSearchParams();
    for (const [k, v] of new FormData(f)) if (typeof v === 'string' && v.trim()) q.set(k, v.trim());
    router.push(q.size ? `${percorso}?${q}` : percorso);
  };
  return (
    <form method="GET" className={className}
      onSubmit={(e) => { e.preventDefault(); vai(e.currentTarget); }}
      onChange={(e) => { const t = e.target as unknown as HTMLInputElement; if (t.tagName === 'SELECT' || t.type === 'checkbox') vai(e.currentTarget); }}>
      {children}
    </form>
  );
}
