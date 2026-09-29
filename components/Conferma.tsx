'use client';
// Pulsante che chiede conferma prima di un'azione che non si annulla (eliminare, ripristinare): se si risponde no, il form non parte
export function Conferma({ domanda, className, children }: { domanda: string; className?: string; children: React.ReactNode }) {
  return (
    <button className={className} onClick={(e) => { if (!confirm(domanda)) e.preventDefault(); }}>
      {children}
    </button>
  );
}
