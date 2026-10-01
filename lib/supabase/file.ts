// File dei contenitori privati "archivio" (PDF scaricati) e "documenti-famiglie" (0051). È, con app/api/staff/route.ts, l'unico
// punto dell'app che usa la chiave di servizio: SOLO lato server e SOLO dopo che una funzione del database ha controllato chi
// chiede (archivio_registra, famiglia_registra, archivio_apri, documento_apri) e ha restituito il percorso del file.
import { createServiceClient } from '@/lib/supabase/servizio';

export type Contenitore = 'archivio' | 'documenti-famiglie';

export async function caricaFile(contenitore: Contenitore, percorso: string, dati: Blob, tipo: string) {
  const { error } = await createServiceClient().storage.from(contenitore).upload(percorso, dati, { contentType: tipo, upsert: false });
  if (error) throw new Error('File non salvato: ' + error.message);
}
export async function leggiFile(contenitore: Contenitore, percorso: string) {
  const { data, error } = await createServiceClient().storage.from(contenitore).download(percorso);
  if (error || !data) throw new Error('File non trovato');
  return data;
}
export async function togliFile(contenitore: Contenitore, percorso: string) {
  await createServiceClient().storage.from(contenitore).remove([percorso]);
}
/** Riga registrata ma file non salvato: si toglie la riga, così non resta un documento senza file */
export async function annullaRiga(tabella: 'archivio_documenti' | 'documenti_tesserati', id: string) {
  await createServiceClient().from(tabella).delete().eq('id', id);
}
