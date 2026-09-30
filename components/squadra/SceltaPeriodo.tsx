'use client';
// Periodo delle statistiche: tutta la stagione o un mese (?periodo=2026-09)
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { meseDi } from '@/lib/calendario-portale';

export function SceltaPeriodo({ mesi, periodo }: { mesi: string[]; periodo: string }) {
  const router = useRouter(), percorso = usePathname(), q = useSearchParams();
  return (
    <label className="flex items-center gap-2 text-sm font-semibold text-grigio">Periodo
      <select className="rounded-lg border border-linea bg-white px-2 py-2 text-inchiostro" value={periodo} onChange={(e) => {
        const u = new URLSearchParams(q.toString());
        if (e.target.value === 'all') u.delete('periodo'); else u.set('periodo', e.target.value);
        router.push(`${percorso}?${u}`);
      }}>
        <option value="all">Tutta la stagione</option>
        {mesi.map((m) => <option key={m} value={m}>{meseDi(m)}</option>)}
      </select>
    </label>
  );
}
