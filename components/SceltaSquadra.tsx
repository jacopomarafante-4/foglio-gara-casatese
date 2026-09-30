// Scelta della squadra nelle pagine della Squadra (e simili): per admin, direttori e preparatori un modulo GET con ?squadra=;
// per un mister con più squadre (un PIN, 0050) il modulo passa da /api/squadra, che ricorda la scelta (cookie) e torna qui
import { chiEntra } from '@/lib/portale-dati';

export async function SceltaSquadra({ squadre, scelta }: { squadre: { id: string; name?: string; category?: string }[]; scelta?: string }) {
  if (!squadre.length) return null;
  const chi = await chiEntra();
  const perMister = !!chi.mister && !chi.mister.squadra.vedeTutte;
  return (
    <form method="GET" action={perMister ? '/api/squadra' : undefined} className="flex flex-wrap items-end gap-2">
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
