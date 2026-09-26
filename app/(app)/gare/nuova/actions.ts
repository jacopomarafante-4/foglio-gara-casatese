'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getProfilo } from '@/lib/auth';
import { puoSegnalare } from '@/lib/ruoli';
import { elencoSocieta, trovaOCreaSocieta } from '@/lib/societa';
import { trovaOCreaGiocatore } from '@/lib/giocatori';
import { RUOLI_CAMPO, valoreValido } from '@/lib/tipi';
import { istanteItaliano, maiuscoleIniziali, testo } from '@/lib/utili';

export type EsitoPartita = { errore?: string; garaId?: string; messaggio?: string };

const lista = (fd: FormData, k: string) => fd.getAll(k).map((v) => String(v ?? '').trim());

/** "Aggiungi partita": la gara (o quella già in calendario, se c'è) e le segnalazioni dei giocatori visti.
 *  Le distinte (foto/PDF) le carica poi il browser direttamente nel contenitore privato, con l'id della gara. */
export async function salvaPartita(fd: FormData): Promise<EsitoPartita> {
  const profilo = await getProfilo();
  if (!profilo || !puoSegnalare(profilo.ruolo)) return { errore: 'Non puoi aggiungere partite.' };

  const data = testo(fd, 'data');
  const ora = testo(fd, 'ora');
  const categoria = testo(fd, 'categoria');
  const casa = testo(fd, 'casa');
  const trasferta = testo(fd, 'trasferta');
  if (!data || !categoria || !casa || !trasferta) return { errore: 'Servono data, categoria e le due squadre.' };
  const quando = istanteItaliano(data, ora ?? '12:00');
  if (!quando) return { errore: 'Data o ora non valide.' };

  const supabase = await createClient();
  const societa = await elencoSocieta(supabase);
  const casaS = await trovaOCreaSocieta(supabase, societa, casa);
  const trasfertaS = await trovaOCreaSocieta(supabase, societa, trasferta);
  if (!casaS || !trasfertaS) return { errore: 'Squadre non salvate.' };

  // La partita c'è già (calendari o inserita da un altro)? Stesse squadre, stesso giorno
  const giorno = istanteItaliano(data, '00:00')!;
  const fine = new Date(new Date(giorno).getTime() + 24 * 3600 * 1000).toISOString();
  const { data: esistenti } = await supabase
    .from('gare')
    .select('id')
    .eq('casa_id', casaS.id)
    .eq('trasferta_id', trasfertaS.id)
    .gte('data_ora', giorno)
    .lt('data_ora', fine)
    .limit(1);
  let garaId = esistenti?.[0]?.id as string | undefined;
  const giaInCalendario = !!garaId;
  if (!garaId) {
    const { data: nuova, error } = await supabase
      .from('gare')
      .insert({
        data_ora: quando,
        ora_da_definire: !ora,
        categoria,
        casa_nome: casaS.nome,
        trasferta_nome: trasfertaS.nome,
        casa_id: casaS.id,
        trasferta_id: trasfertaS.id,
        campo: testo(fd, 'campo') || casaS.campo || null,
        indirizzo: casaS.indirizzo || null,
        fonte: 'Inserita a mano',
      })
      .select('id')
      .single();
    if (error || !nuova) return { errore: `Partita non salvata: ${error?.message ?? 'errore sconosciuto'}` };
    garaId = nuova.id;
  }

  // Segnalazioni: una per riga compilata
  const [squadre, numeri, cognomi, nomi, annate, ruoli, testi, voti] =
    ['s_squadra', 's_numero', 's_cognome', 's_nome', 's_annata', 's_ruolo', 's_testo', 's_voto'].map((k) => lista(fd, k));
  const contesto = `${casaS.nome} – ${trasfertaS.nome}, ${categoria}`;
  const dataIso = quando.slice(0, 10);
  let fatte = 0;
  const problemi: string[] = [];
  for (let i = 0; i < cognomi.length; i++) {
    const cognome = maiuscoleIniziali(cognomi[i] || null);
    const nome = maiuscoleIniziali(nomi[i] || null);
    const numero = numeri[i];
    if (!cognome && !nome && !numero && !testi[i]) continue; // riga vuota
    const chi = cognome || nome || `n. ${numero}`;
    const annata = Number(annate[i]);
    if (!Number.isInteger(annata) || annata < 1990) { problemi.push(`${chi}: manca l'annata`); continue; }
    if (!testi[i]) { problemi.push(`${chi}: scrivi cosa hai visto`); continue; }
    const squadra = squadre[i] === 'trasferta' ? trasfertaS : casaS;
    const descrizione = cognome ? null : [numero ? `N. ${numero}` : null, nome, squadra.nome].filter(Boolean).join(' · ');
    const g = await trovaOCreaGiocatore(supabase, {
      cognome, nome: cognome ? nome : null, descrizione, annata,
      ruolo: valoreValido(RUOLI_CAMPO, ruoli[i]), societaId: squadra.id,
    });
    if (!g.id) { problemi.push(`${chi}: ${g.errore}`); continue; }
    const voto = Number(voti[i]);
    const { error } = await supabase.from('segnalazioni').insert({
      giocatore_id: g.id,
      gara_id: garaId,
      testo: testi[i],
      voto: voto >= 1 && voto <= 5 ? voto : null,
      contesto: numero ? `${contesto} · n. ${numero}` : contesto,
      data: dataIso,
    });
    if (error) problemi.push(`${chi}: ${error.message}`);
    else fatte++;
  }

  revalidatePath('/gare');
  const parti = [
    giaInCalendario ? 'Partita già in calendario: aggiunto tutto lì.' : 'Partita salvata.',
    fatte ? `${fatte} ${fatte === 1 ? 'segnalazione' : 'segnalazioni'}.` : '',
    problemi.length ? `Da rivedere: ${problemi.join('; ')}.` : '',
  ];
  return { garaId, messaggio: parti.filter(Boolean).join(' ') };
}
