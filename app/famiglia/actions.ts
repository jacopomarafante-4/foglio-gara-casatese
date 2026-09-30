'use server';
// Famiglie: le sole scritture permesse, col PIN della tessera (funzioni 0031 e 0033, che ricontrollano tutto nel database)
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getFamiglia } from '@/lib/famiglia';

type Esito = { ok: boolean; errore?: string };
const fuori: Esito = { ok: false, errore: 'Accesso scaduto: rimetti il PIN.' };

/** "Ci sarà" / "Non ci sarà" per una partita (chiave come nelle Convocazioni) */
export async function rispondi(partita: string, risposta: 'si' | 'no'): Promise<Esito> {
  const fam = await getFamiglia();
  if (!fam) return fuori;
  const { error } = await (await createClient()).rpc('famiglia_rispondi', { p_pin: fam.pin, p_partita: partita, p_risposta: risposta, p_nota: '' });
  if (error) return { ok: false, errore: 'Risposta non mandata: riprova.' };
  revalidatePath('/famiglia');
  return { ok: true };
}

const CAMPI = ['genitore1_nome', 'genitore1_tel', 'genitore1_email', 'genitore2_nome', 'genitore2_tel', 'genitore2_email', 'taglia_divisa', 'taglia_tuta'] as const;
/** Contatti dei genitori e taglie */
export async function salvaContatti(dati: Record<string, string>): Promise<Esito> {
  const fam = await getFamiglia();
  if (!fam) return fuori;
  const pulito = Object.fromEntries(CAMPI.map((k) => [k, String(dati[k] ?? '').trim()]));
  const { error } = await (await createClient()).rpc('famiglia_contatti', { p_pin: fam.pin, p_dati: pulito });
  if (error) return { ok: false, errore: 'Non salvato: riprova.' };
  revalidatePath('/famiglia/anagrafica');
  return { ok: true };
}

/** Documento (visita medica, contabile di una rata, altro): il file arriva già ridotto dal browser, in base64 */
export async function caricaDocumento(d: { tipo: string; rata: number | null; descrizione: string; nome: string; mime: string; file: Blob }): Promise<Esito> {
  const fam = await getFamiglia();
  if (!fam) return fuori;
  if (!['visita_medica', 'bonifico', 'altro'].includes(d.tipo)) return { ok: false, errore: 'Tipo di documento non valido.' };
  if (!['image/jpeg', 'application/pdf'].includes(d.mime)) return { ok: false, errore: 'Carica una foto o un PDF.' };
  if (!(d.file instanceof Blob) || d.file.size > 4 * 1024 * 1024) return { ok: false, errore: 'Il file è troppo grande (massimo 4 MB).' };
  const base64 = Buffer.from(await d.file.arrayBuffer()).toString('base64');
  const { error } = await (await createClient()).rpc('famiglia_carica', { p_pin: fam.pin, p_tipo: d.tipo, p_rata: d.rata,
    p_descrizione: d.descrizione, p_nome_file: d.nome, p_mime: d.mime, p_base64: base64 });
  if (error) return { ok: false, errore: error.message || 'Documento non caricato: riprova.' };
  revalidatePath('/famiglia/segreteria');
  return { ok: true };
}
