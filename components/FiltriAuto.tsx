'use client';
// Modulo dei filtri che si applica da solo appena si sceglie (tendine) o si conferma (ricerca: Invio o uscendo dal campo)
export function FiltriAuto({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <form method="GET" className={className} onChange={(e) => {
      const t = e.target as HTMLElement;
      if (t.tagName === 'SELECT') e.currentTarget.requestSubmit();
    }}>
      {children}
    </form>
  );
}
