// Scelta della squadra per admin e direttori nelle pagine della Squadra (e simili): un modulo GET con ?squadra=
export function SceltaSquadra({ squadre, scelta }: { squadre: { id: string; name?: string; category?: string }[]; scelta?: string }) {
  if (!squadre.length) return null;
  return (
    <form method="GET" className="flex flex-wrap items-end gap-2">
      <label className="min-w-56 flex-1 sm:max-w-xs">
        <span className="mb-1 block text-sm font-semibold text-grigio">Squadra</span>
        <select name="squadra" defaultValue={scelta} className="campo">
          {squadre.map((s) => <option key={s.id} value={s.id}>{s.category || s.name}</option>)}
        </select>
      </label>
      <button className="bottone">Apri</button>
    </form>
  );
}
