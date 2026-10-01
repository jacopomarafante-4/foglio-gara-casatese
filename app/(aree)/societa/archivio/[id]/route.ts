// Archivio documenti: scarica un PDF. archivio_apri (0051) controlla che chi chiede sia admin o direttore e dice dove sta il file
// (contenitore "archivio"); le righe vecchie hanno il PDF nel database (archivio_scarica, 0039).
import { createClient } from '@/lib/supabase/server';
import { leggiFile } from '@/lib/supabase/file';

const pdf = (dati: BodyInit, nome: string) => new Response(dati, {
  headers: { 'content-type': 'application/pdf', 'content-disposition': `attachment; filename*=UTF-8''${encodeURIComponent(nome)}`, 'cache-control': 'private, no-store' },
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('archivio_apri', { p_id: id });
  if (!error && data) {
    if (data.percorso) {
      try { return pdf(await leggiFile('archivio', data.percorso), data.nome); } catch { return new Response('Documento non disponibile', { status: 404 }); }
    }
    if (data.base64) return pdf(Buffer.from(data.base64 as string, 'base64'), data.nome);
    return new Response('Documento non disponibile', { status: 404 });
  }
  // migrazione 0051 non ancora eseguita: come prima
  const [{ data: doc }, { data: base64, error: e2 }] = await Promise.all([
    supabase.from('archivio_documenti').select('nome').eq('id', id).maybeSingle(),
    supabase.rpc('archivio_scarica', { p_id: id }),
  ]);
  if (e2 || !base64 || !doc) return new Response('Documento non disponibile', { status: 404 });
  return pdf(Buffer.from(base64 as string, 'base64'), doc.nome);
}
