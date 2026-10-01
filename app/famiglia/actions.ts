'use server';
// Famiglie: le sole scritture permesse, col PIN della tessera (funzioni 0031 e 0033, che ricontrollano tutto nel database)
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { annullaRiga, caricaFile } from '@/lib/supabase/file';
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
  const supabase = await createClient();
  const dati = { p_pin: fam.pin, p_tipo: d.tipo, p_rata: d.rata, p_descrizione: d.descrizione, p_nome_file: d.nome, p_mime: d.mime };
  // 0051: il database controlla il PIN e registra il documento; il file va nel contenitore "documenti-famiglie"
  const { data, error: e1 } = await supabase.rpc('famiglia_registra', { ...dati, p_dimensione: d.file.size });
  if (!e1 && data?.percorso) {
    try { await caricaFile('documenti-famiglie', data.percorso, d.file, d.mime); }
    catch { await annullaRiga('documenti_tesserati', data.id); return { ok: false, errore: 'Documento non caricato: riprova.' }; }
  } else if (e1 && !/famiglia_registra|PGRST202|42883/.test(e1.message + e1.code)) {
    return { ok: false, errore: e1.message || 'Documento non caricato: riprova.' };
  } else {
    // migrazione 0051 non ancora eseguita: come prima, il file nel database
    const base64 = Buffer.from(await d.file.arrayBuffer()).toString('base64');
    const { error } = await supabase.rpc('famiglia_carica', { ...dati, p_base64: base64 });
    if (error) return { ok: false, errore: error.message || 'Documento non caricato: riprova.' };
  }
  revalidatePath('/famiglia/segreteria');
  return { ok: true };
}
