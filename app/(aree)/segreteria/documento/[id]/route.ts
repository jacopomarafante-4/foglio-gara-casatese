// Segreteria: apre un documento caricato da una famiglia. documento_apri (0051) controlla che chi chiede gestisca la segreteria
// e dice dove sta il file (contenitore "documenti-famiglie"); le righe vecchie hanno il file nel database (documento_scarica, 0033).
import { createClient } from '@/lib/supabase/server';
import { leggiFile } from '@/lib/supabase/file';

const file = (dati: BodyInit, nome: string, mime: string) => new Response(dati, {
  headers: { 'content-type': mime, 'content-disposition': `inline; filename*=UTF-8''${encodeURIComponent(nome)}`, 'cache-control': 'private, no-store',
    'x-content-type-options': 'nosniff' },
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  let { data, error } = await supabase.rpc('documento_apri', { p_id: id });
  if (error && /documento_apri|PGRST202|42883/.test(error.message + error.code)) ({ data, error } = await supabase.rpc('documento_scarica', { p_id: id }));
  if (error || !data) return new Response('Documento non disponibile', { status: 404 });
  const mime = ['image/jpeg', 'image/png', 'application/pdf'].includes(data.mime) ? data.mime : 'application/octet-stream';
  if (data.percorso) {
    try { return file(await leggiFile('documenti-famiglie', data.percorso), data.nome_file, mime); } catch { return new Response('Documento non disponibile', { status: 404 }); }
  }
  if (data.base64) return file(Buffer.from(data.base64 as string, 'base64'), data.nome_file, mime);
  return new Response('Documento non disponibile', { status: 404 });
}
