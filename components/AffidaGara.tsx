'use client';
// "Affida a…" sotto ogni gara (admin e direttori): l'elenco dello staff arriva una volta sola per tutta la pagina (StaffGare),
// non ripetuto in ogni partita: la pagina Gare resta leggera anche con un centinaio di partite.
import { createContext, useContext } from 'react';
import { affidaGara } from '@/app/(app)/home/actions';
import type { PersonaStaff } from '@/lib/staff';

const Staff = createContext<PersonaStaff[]>([]);
export function StaffGare({ staff, children }: { staff: PersonaStaff[]; children: React.ReactNode }) {
  return <Staff.Provider value={staff}>{children}</Staff.Provider>;
}
export function AffidaGara({ garaId }: { garaId: string }) {
  const staff = useContext(Staff);
  if (!staff.length) return null;
  return (
    <details className="mt-2">
      <summary className="cursor-pointer text-sm font-semibold text-blu">Affida a…</summary>
      <form action={affidaGara} className="mt-2 flex flex-wrap gap-2">
        <input type="hidden" name="gara_id" value={garaId} />
        <select name="persona" required defaultValue="" className="campo min-w-0 flex-1" aria-label="Affida la partita a">
          <option value="" disabled>Scegli chi ci va</option>
          {staff.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </select>
        <input name="dettagli" placeholder="Cosa guardare (facoltativo)" className="campo min-w-0 flex-1" />
        <button className="bottone">Affida</button>
      </form>
    </details>
  );
}
