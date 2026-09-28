// Segno "contatto presente": verde se nel database c'è almeno un contatto del giocatore (0037), grigio se no.
export function ContattoFlag({ presente, breve = false }: { presente: boolean; breve?: boolean }) {
  const testo = presente ? 'Contatto presente' : 'Nessun contatto';
  return (
    <span
      title={presente ? 'Nel database c’è un contatto della famiglia (lo vedono admin e direttori)' : 'Nessun contatto nel database'}
      aria-label={testo}
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
        presente ? 'bg-verde text-white' : 'border border-linea text-grigio'}`}
    >
      <span aria-hidden="true">☎</span>{breve ? null : testo}
    </span>
  );
}
