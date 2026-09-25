// Gestione di scout e direttori dal Portale (Società), per admin e direttori:
// crea l'account, genera o rigenera il codice personale (= password dell'account),
// cambia il nome, sospende o riattiva. Il Portale chiama POST /api/staff con la sessione di chi è entrato.
import { randomInt } from 'node:crypto';
import { getProfilo } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/servizio';
import { maiuscoleIniziali, normalizza } from '@/lib/utili';

type Richiesta =
  | { azione: 'crea'; nome: string; ruolo: string }
  | { azione: 'pin'; id: string }
  | { azione: 'nome'; id: string; nome: string }
  | { azione: 'stato'; id: string; attivo: boolean };

const RUOLI_STAFF = ['scout', 'direttore'];

const errore = (messaggio: string, status = 400) => Response.json({ errore: messaggio }, { status });

/** "Mario Rossi" → { nome: "Mario", cognome: "Rossi" } */
function dividiNome(s: string) {
  const parti = (maiuscoleIniziali(s.trim().replace(/\s+/g, ' ')) ?? '').split(' ');
  return { nome: parti[0] || null, cognome: parti.slice(1).join(' ') || null };
}

type Servizio = ReturnType<typeof createServiceClient>;

/** Codice di 6 cifre non ancora usato da nessuno (né uguale al PIN admin) */
async function nuovoCodice(db: Servizio) {
  for (let i = 0; i < 20; i++) {
    const pin = String(randomInt(100000, 1000000));
    if (pin === process.env.PIN_ADMIN) continue;
    const { data } = await db.from('codici_accesso').select('id').eq('pin', pin).maybeSingle();
    if (!data) return pin;
  }
  throw new Error('Nessun codice libero trovato');
}

/** Solo scout e direttori: l'admin non si gestisce da qui */
async function staffEsistente(db: Servizio, id: string) {
  const { data } = await db.from('profiles').select('id, nome, cognome, ruolo').eq('id', id).maybeSingle();
  return data && RUOLI_STAFF.includes(data.ruolo) ? data : null;
}

export async function POST(request: Request) {
  const profilo = await getProfilo();
  if (!profilo || !profilo.attivo || (profilo.ruolo !== 'admin' && profilo.ruolo !== 'direttore'))
    return errore('Solo admin e direttori.', 403);

  let r: Richiesta;
  try {
    r = await request.json();
  } catch {
    return errore('Richiesta non valida.');
  }
  const db = createServiceClient();

  if (r.azione === 'crea') {
    if (!RUOLI_STAFF.includes(r.ruolo)) return errore('Ruolo non valido.');
    const { nome, cognome } = dividiNome(String(r.nome ?? ''));
    if (!nome) return errore('Scrivi nome e cognome.');
    const pin = await nuovoCodice(db);
    // Email segnaposto: si entra solo col codice, l'email non serve a nessuno
    const email = `${normalizza(`${nome}${cognome ?? ''}`) || 'staff'}-${randomInt(1000, 10000)}@staff.academy.test`;
    const { data, error } = await db.auth.admin.createUser({
      email,
      password: pin,
      email_confirm: true,
      user_metadata: { nome, cognome },
      app_metadata: { ruolo: r.ruolo },
    });
    if (error || !data.user) return errore(`Account non creato: ${error?.message ?? 'errore sconosciuto'}`, 500);
    await db.from('profiles').update({ ruolo: r.ruolo, nome, cognome }).eq('id', data.user.id);
    await db.from('codici_accesso').insert({ profilo_id: data.user.id, pin, nota: [nome, cognome].filter(Boolean).join(' ') });
    return Response.json({ ok: true, id: data.user.id, pin });
  }

  const persona = await staffEsistente(db, String(r.id ?? ''));
  if (!persona) return errore('Persona non trovata.', 404);

  if (r.azione === 'pin') {
    const pin = await nuovoCodice(db);
    const { error } = await db.auth.admin.updateUserById(persona.id, { password: pin });
    if (error) return errore(`Codice non cambiato: ${error.message}`, 500);
    await db.from('codici_accesso').upsert(
      { profilo_id: persona.id, pin, nota: [persona.nome, persona.cognome].filter(Boolean).join(' ') },
      { onConflict: 'profilo_id' },
    );
    return Response.json({ ok: true, pin });
  }

  if (r.azione === 'nome') {
    const { nome, cognome } = dividiNome(String(r.nome ?? ''));
    if (!nome) return errore('Scrivi nome e cognome.');
    await db.from('profiles').update({ nome, cognome }).eq('id', persona.id);
    await db.from('codici_accesso').update({ nota: [nome, cognome].filter(Boolean).join(' ') }).eq('profilo_id', persona.id);
    return Response.json({ ok: true });
  }

  if (r.azione === 'stato') {
    if (persona.id === profilo.id) return errore('Non puoi sospendere te stesso.');
    await db.from('profiles').update({ attivo: Boolean(r.attivo) }).eq('id', persona.id);
    return Response.json({ ok: true });
  }

  return errore('Azione sconosciuta.');
}
