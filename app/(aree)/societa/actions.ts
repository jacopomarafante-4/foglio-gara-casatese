'use server';
// Società (tappa 3 dell'app unica): archivio documenti ed elenco delle versioni del Portale. Permessi nel database (RLS e funzioni).
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { togliFile } from '@/lib/supabase/file';

/** Archivio: elimina un documento (solo admin, policy "archivio: eliminazione") */
export async function eliminaDocumento(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  const supabase = await createClient();
  const { data: riga } = await supabase.from('archivio_documenti').select('percorso').eq('id', id).maybeSingle();
  const { error, count } = await supabase.from('archivio_documenti').delete({ count: 'exact' }).eq('id', id);
  // eliminata dal database (l'admin, RLS): si toglie anche il file dal contenitore (0051)
  if (!error && count && riga?.percorso) await togliFile('archivio', riga.percorso).catch(() => null);
  if (error || !count) redirect(`/societa/archivio?errore=${encodeURIComponent(error?.message ?? 'Non eliminato: solo l’admin elimina i documenti.')}`);
  revalidatePath('/societa/archivio');
  redirect('/societa/archivio?ok=Documento eliminato');
}

/** Storico modifiche: rimette una versione precedente di una scheda del Portale (ripristina_doc, solo admin) */
export async function ripristinaVersione(formData: FormData) {
  const id = Number(formData.get('id'));
  const path = String(formData.get('path') ?? '');
  const supabase = await createClient();
  const { error } = await supabase.rpc('ripristina_doc', { p_storico: id });
  if (error) redirect(`/societa/modifiche?errore=${encodeURIComponent('Ripristino non riuscito: ' + error.message)}`);
  revalidatePath('/societa/modifiche');
  redirect(`/societa/modifiche?ok=${encodeURIComponent('Versione ripristinata')}&aperta=${encodeURIComponent(path)}`);
}
