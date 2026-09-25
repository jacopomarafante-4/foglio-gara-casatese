'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { elencoSocieta, trovaOCreaSocieta } from '@/lib/societa';
import { istanteItaliano, leggiCoordinate, testo } from '@/lib/utili';

const GESTIONE = '/gare/gestione';

function esito(msg: { ok?: string; errore?: string }): never {
  const [k, v] = msg.errore ? ['errore', msg.errore] : ['ok', msg.ok ?? ''];
  redirect(`${GESTIONE}?${k}=${encodeURIComponent(v)}`);
}

// ---- Prenotazioni: "ci vado io" -----------------------------------------

export async function prenotaGara(formData: FormData) {
  const garaId = testo(formData, 'gara_id');
  if (!garaId) return;
  const supabase = await createClient();
  await supabase.from('gare_osservatori').insert({ gara_id: garaId });
  revalidatePath('/gare');
  revalidatePath('/home');
}

export async function annullaPrenotazione(formData: FormData) {
  const garaId = testo(formData, 'gara_id');
  if (!garaId) return;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('gare_osservatori').delete().eq('gara_id', garaId).eq('profilo_id', user.id);
  revalidatePath('/gare');
  revalidatePath('/home');
}

// ---- Squadre da seguire --------------------------------------------------

export async function aggiungiSquadraSeguita(formData: FormData) {
  const nome = testo(formData, 'societa');
  if (!nome) esito({ errore: 'Indica la società.' });

  const supabase = await createClient();
  const societa = await trovaOCreaSocieta(supabase, await elencoSocieta(supabase), nome);
  if (!societa) esito({ errore: 'Società non salvata.' });

  const { error } = await supabase.from('squadre_seguite').insert({
    societa_id: societa.id,
    categoria: testo(formData, 'categoria'),
    motivo: testo(formData, 'motivo'),
  });
  if (error?.code === '23505') esito({ errore: `${societa.nome} è già tra le squadre seguite per questa categoria.` });
  if (error) esito({ errore: `Non salvata: ${error.message}` });
  esito({ ok: `${societa.nome} aggiunta alle squadre seguite.` });
}

export async function rimuoviSquadraSeguita(formData: FormData) {
  const id = testo(formData, 'id');
  const supabase = await createClient();
  const { error } = await supabase.from('squadre_seguite').delete().eq('id', id);
  if (error) esito({ errore: `Non rimossa: ${error.message}` });
  esito({ ok: 'Squadra rimossa.' });
}

// ---- Importazione gare (incolla da Excel, Tuttocampo, comunicati) --------

export async function importaGare(formData: FormData) {
  const incollato = String(formData.get('gare') ?? '');
  const fonte = testo(formData, 'fonte');
  const righe = incollato.split(/\r?\n/).map((r) => r.trim()).filter(Boolean);
  if (righe.length === 0) esito({ errore: 'Incolla almeno una gara.' });

  const supabase = await createClient();
  const societa = await elencoSocieta(supabase);
  const daSalvare: Record<string, unknown>[] = [];
  const scartate: string[] = [];

  for (const [i, riga] of righe.entries()) {
    if (riga.startsWith('#') || /^data\b/i.test(riga)) continue; // commenti e intestazioni
    const c = (riga.includes('\t') ? riga.split('\t') : riga.split(';')).map((x) => x.trim());
    const [data, ora, categoria, casa, trasferta, campo, indirizzo, coordinate] = c;

    const quando = data && ora ? istanteItaliano(data, ora) : null;
    if (!quando || !categoria || !casa || !trasferta) {
      scartate.push(`riga ${i + 1}`);
      continue;
    }

    const casaS = await trovaOCreaSocieta(supabase, societa, casa);
    const trasfertaS = await trovaOCreaSocieta(supabase, societa, trasferta);
    const coord = leggiCoordinate(coordinate ?? null);

    daSalvare.push({
      data_ora: quando,
      categoria,
      casa_nome: casaS?.nome ?? casa,
      trasferta_nome: trasfertaS?.nome ?? trasferta,
      casa_id: casaS?.id ?? null,
      trasferta_id: trasfertaS?.id ?? null,
      campo: campo || casaS?.campo || null,
      indirizzo: indirizzo || casaS?.indirizzo || null,
      lat: coord?.lat ?? null,
      lon: coord?.lon ?? null,
      fonte,
    });
  }

  if (daSalvare.length) {
    const { error } = await supabase
      .from('gare')
      .upsert(daSalvare, { onConflict: 'data_ora,categoria,casa_nome,trasferta_nome' });
    if (error) esito({ errore: `Gare non salvate: ${error.message}` });
  }

  const extra = scartate.length
    ? ` Scartate ${scartate.length} (${scartate.slice(0, 5).join(', ')}${scartate.length > 5 ? '…' : ''}): controlla data, ora, categoria e squadre.`
    : '';
  esito({ ok: `Gare salvate: ${daSalvare.length}.${extra}` });
}

export async function eliminaGara(formData: FormData) {
  const id = testo(formData, 'id');
  const supabase = await createClient();
  const { error } = await supabase.from('gare').delete().eq('id', id);
  if (error) esito({ errore: `Gara non eliminata: ${error.message}` });
  esito({ ok: 'Gara eliminata.' });
}

// ---- Campo di casa di una società (per calcolare le distanze) ------------

export async function aggiornaCampo(formData: FormData) {
  const id = testo(formData, 'id');
  const coordinate = testo(formData, 'coordinate');
  const coord = leggiCoordinate(coordinate);
  if (coordinate && !coord) esito({ errore: 'Coordinate non valide. Esempio: 45.6977, 9.3120' });

  const supabase = await createClient();
  const { error } = await supabase
    .from('societa')
    .update({
      campo: testo(formData, 'campo'),
      indirizzo: testo(formData, 'indirizzo'),
      lat: coord?.lat ?? null,
      lon: coord?.lon ?? null,
    })
    .eq('id', id);
  if (error) esito({ errore: `Campo non salvato: ${error.message}` });
  esito({ ok: 'Campo aggiornato.' });
}
