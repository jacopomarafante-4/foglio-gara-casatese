// Archivio documenti: scarica un PDF (archivio_scarica controlla che chi chiede sia admin o direttore)
import { createClient } from '@/lib/supabase/server';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: doc }, { data: base64, error }] = await Promise.all([
    supabase.from('archivio_documenti').select('nome').eq('id', id).maybeSingle(),
    supabase.rpc('archivio_scarica', { p_id: id }),
  ]);
  if (error || !base64 || !doc) return new Response('Documento non disponibile', { status: 404 });
  return new Response(Buffer.from(base64 as string, 'base64'), {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `attachment; filename*=UTF-8''${encodeURIComponent(doc.nome)}`,
      'cache-control': 'private, no-store',
    },
  });
}
