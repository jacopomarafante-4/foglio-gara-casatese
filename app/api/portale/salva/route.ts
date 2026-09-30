// Portale: il direttore che è anche mister (0050) salva foglio gara e registro delle sue squadre. Il server usa la tessera
// (PIN mai nella pagina) e coach_salva, coi permessi del mister; risponde come salva_doc ({ ok, versione } o la scheda più recente).
import { chiEntra } from '@/lib/portale-dati';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  let r: { path?: string; data?: unknown; versione?: number | null };
  try { r = await request.json(); } catch { return Response.json({ errore: 'Richiesta non valida.' }, { status: 400 }); }
  const squadra = String(r.path ?? '').match(/^(?:sheet|registro)\/([\w-]+)$/)?.[1];
  const chi = await chiEntra();
  const mister = chi.misterDi;
  if (!squadra || !mister?.squadre.some((t) => t.id === squadra)) return Response.json({ errore: 'Non sei il mister di questa squadra.' }, { status: 403 });
  const { data, error } = await (await createClient(squadra)).rpc('coach_salva', { p_pin: mister.pin, p_path: r.path, p_data: r.data, p_versione: r.versione ?? null });
  if (error) return Response.json({ errore: error.message }, { status: 400 });
  return Response.json(data);
}
