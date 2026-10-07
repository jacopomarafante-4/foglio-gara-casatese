// Calendari Google ↔ Portale, dal pulsante del Calendario (Tutte le squadre) e dal salvataggio di amichevoli ed eventi.
// Chi può: admin e direttori (sessione) e il responsabile organizzativo (PIN nella richiesta dal Portale, o la tessera
// dalle pagine dell'app: lib/mister.ts; squadra con "organizza", 0029).
// Legge e scrive il calendario del Portale con i permessi di chi chiama (RLS / funzioni coach_*): niente chiave di servizio.
// Collegamento con Google: quello fatto dall'app (0049) o l'account di servizio (lib/google-collegato.ts).
// "auto": le pagine del Calendario la chiamano all'apertura; rilegge Google solo se sono passati 30 minuti dall'ultima volta.
import { createClient as clientAnonimo } from '@supabase/supabase-js';
import { getProfilo } from '@/lib/auth';
import { getMister } from '@/lib/mister';
import { createClient } from '@/lib/supabase/server';
import { creaEvento, aggiornaEvento, cancellaEvento, type Calendario, CALENDARI } from '@/lib/google-calendar';
import { statoGoogle } from '@/lib/google-collegato';
import type { SupabaseClient } from '@supabase/supabase-js';
import { applica, calendarioPartita, etaSquadra, partiteDaGoogle, titoloPartita, type Partita, type Squadra } from '@/lib/calendario-google';

type Richiesta =
  | { azione: 'stato'; pin?: string }
  | { azione: 'importa'; pin?: string }
  | { azione: 'auto'; pin?: string }
  | { azione: 'partita'; pin?: string; squadra: string; partita: Partita }
  | { azione: 'evento'; pin?: string; evento: { titolo?: string; tipo?: string; data?: string; inizio?: string; fine?: string; luogo?: string; indirizzo?: string; note?: string; gcal?: string; gcalCal?: Calendario } }
  | { azione: 'cancella'; pin?: string; gcal: string; gcalCal: Calendario };

const errore = (messaggio: string, status = 400) => Response.json({ errore: messaggio }, { status });

/** Accesso ai documenti del Portale con i permessi di chi chiama */
type Accesso = {
  leggi: (path: string) => Promise<Record<string, unknown> | null>; scrivi: (path: string, data: unknown) => Promise<void>;
  db: SupabaseClient; pin?: string;
};
async function accesso(pin?: string): Promise<Accesso | null> {
  if (pin) {
    const db = clientAnonimo(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
    const { data: tm } = await db.rpc('coach_team', { p_pin: pin });
    if (!tm?.organizza) return null;
    return {
      db, pin,
      leggi: async (path) => { const { data, error } = await db.rpc('coach_get', { p_pin: pin, p_path: path }); if (error) throw error; return data; },
      scrivi: async (path, data) => { const { error } = await db.rpc('coach_set', { p_pin: pin, p_path: path, p_data: data }); if (error) throw error; },
    };
  }
  const profilo = await getProfilo();
  if (!profilo) { const mister = await getMister(); return mister ? accesso(mister.pin) : null; }
  if (!profilo.attivo || (profilo.ruolo !== 'admin' && profilo.ruolo !== 'direttore')) return null;
  const db = await createClient();
  return {
    db,
    leggi: async (path) => { const { data, error } = await db.from('docs').select('data').eq('path', path).maybeSingle(); if (error) throw error; return data?.data ?? null; },
    scrivi: async (path, data) => { const { error } = await db.from('docs').upsert({ path, data, updated_at: new Date().toISOString() }); if (error) throw error; },
  };
}

export async function POST(request: Request) {
  let r: Richiesta;
  try { r = await request.json(); } catch { return errore('Richiesta non valida.'); }
  const acc = await accesso(r.pin);
  if (!acc) return errore('Solo admin, direttori e responsabile organizzativo.', 403);
  const stato = await statoGoogle(acc.db, acc.pin);
  if (r.azione === 'stato') return Response.json({ configurato: stato.pronto, collegato: stato.collegato, daScegliere: stato.daScegliere });
  const g = stato.google;
  if (!g) return r.azione === 'auto' ? Response.json({ ok: true, saltato: 'non collegato' })
    : errore('Il collegamento con Google Calendar non è ancora attivo.', 501);

  try {
    const squadre = ((await acc.leggi('shared/teams'))?.items as Squadra[] | undefined ?? []).filter((t) => !t.organizza && !t.vedeTutte);

    if (r.azione === 'auto') {
      const ultima = stato.riga?.ultima_lettura ? Date.parse(stato.riga.ultima_lettura) : 0;
      if (Date.now() - ultima < 30 * 60 * 1000) return Response.json({ ok: true, saltato: 'letto da poco' });
      await acc.db.rpc('google_letto', acc.pin ? { p_pin: acc.pin } : {});   // subito: chi apre insieme non rilegge due volte
    }
    if (r.azione === 'importa' || r.azione === 'auto') {
      const { partite, eventi } = await partiteDaGoogle(g);
      const esito = [];
      for (const team of squadre.filter((t) => etaSquadra(t))) {
        const doc = (await acc.leggi(`calendar/${team.id}`)) ?? {};
        const prima = (doc.matches as Partita[] | undefined) ?? [];
        const { matches, aggiunte, aggiornate, tolte } = applica(team, prima, partite);
        if (aggiunte || aggiornate || tolte) await acc.scrivi(`calendar/${team.id}`, { ...doc, matches });
        esito.push({ squadra: team.category, aggiunte, aggiornate, tolte });
      }
      await acc.db.rpc('google_letto', acc.pin ? { p_pin: acc.pin } : {});
      return Response.json({ ok: true, eventiLetti: eventi, partite: partite.length, squadre: esito });
    }

    if (r.azione === 'partita') {
      const team = squadre.find((t) => t.id === r.squadra), p = r.partita;
      if (!team || !p?.friendly || p.garaId) return errore('Solo le partite non di campionato e i tornei vanno su Google.');
      const cal = calendarioPartita(p);
      if (p.gcal && p.gcalCal && p.gcalCal !== cal) { await cancellaEvento(g, p.gcalCal, p.gcal); p.gcal = undefined; }
      const dati = { titolo: titoloPartita(team, p), data: p.date!, inizio: p.time || undefined, minuti: etaSquadra(team) <= 10 ? 60 : 90,
        luogo: [p.venue, p.address].filter(Boolean).join(', '), descrizione: [p.tipo, p.note, 'Inserito dal Portale'].filter(Boolean).join('\n') };
      if (!p.date) return errore('Manca la data.');
      const gcal = p.gcal ? (await aggiornaEvento(g, cal, p.gcal, dati), p.gcal) : await creaEvento(g, cal, dati);
      return Response.json({ ok: true, gcal, gcalCal: cal });
    }

    if (r.azione === 'evento') {
      const e = r.evento;
      if (!e?.data) return errore('Manca la data.');
      const cal: Calendario = e.luogo === 'merate' ? 'MERATE' : e.luogo === 'cernusco' ? 'CERNUSCO' : 'TRASFERTA';
      if (e.gcal && e.gcalCal && e.gcalCal !== cal) { await cancellaEvento(g, e.gcalCal, e.gcal); e.gcal = undefined; }
      const dati = { titolo: `Evento - ${e.titolo || e.tipo || 'Evento'}`, data: e.data, inizio: e.inizio || undefined, fine: e.fine || undefined, minuti: 120,
        luogo: e.luogo === 'altro' ? e.indirizzo : undefined, descrizione: [e.tipo, e.note, 'Inserito dal Portale'].filter(Boolean).join('\n') };
      const gcal = e.gcal ? (await aggiornaEvento(g, cal, e.gcal, dati), e.gcal) : await creaEvento(g, cal, dati);
      return Response.json({ ok: true, gcal, gcalCal: cal });
    }

    if (r.azione === 'cancella') {
      if (!r.gcal || !CALENDARI.includes(r.gcalCal)) return errore('Evento non indicato.');
      await cancellaEvento(g, r.gcalCal, r.gcal);
      return Response.json({ ok: true });
    }
    return errore('Azione non valida.');
  } catch (e) {
    return errore(e instanceof Error ? e.message : 'Errore con Google Calendar.', 502);
  }
}
