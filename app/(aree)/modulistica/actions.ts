'use server';
// Modulistica (tappa 3): copia nell'Archivio documenti di ogni PDF scaricato (0039, come consegnaPdf() del Portale).
// Il mister firma col PIN della sua tessera (resta sul server), lo staff col suo account. Se non riesce, il PDF c'è comunque.
import { getProfilo } from '@/lib/auth';
import { getMister } from '@/lib/mister';
import { createClient } from '@/lib/supabase/server';

export async function archiviaPdf(nome: string, tipo: string, base64: string, squadraId: string | null) {
  const profilo = await getProfilo();
  const mister = profilo ? null : await getMister();
  if (!profilo && !mister) return;
  const supabase = await createClient();
  await supabase.rpc('archivia_documento', {
    p_pin: mister?.pin ?? null, p_nome: nome, p_tipo: tipo, p_squadra_id: mister ? null : squadraId, p_dati: base64,
  });
}
