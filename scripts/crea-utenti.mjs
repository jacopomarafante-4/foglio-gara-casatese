// =====================================================================
// Scouting Hub · Crea gli account del team
// Uso (dalla cartella del progetto):
//   npm run crea-utenti
// Legge scripts/utenti.json, crea gli account con password temporanea
// e imposta il ruolo. Se un utente esiste già, lo salta.
// =====================================================================
import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('❌ Mancano NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const RUOLI = ['admin', 'direttore', 'scout', 'mister'];

// Password temporanea leggibile: 10 caratteri + simbolo
function passwordTemporanea() {
  return randomBytes(8).toString('base64url').slice(0, 10) + '!';
}

const utenti = JSON.parse(await readFile(new URL('./utenti.json', import.meta.url), 'utf8'));
const risultati = [];

for (const u of utenti) {
  const email = u.email.trim().toLowerCase();

  if (!RUOLI.includes(u.ruolo)) {
    console.error(`⚠️  ${email}: ruolo "${u.ruolo}" non valido, saltato`);
    continue;
  }

  const password = passwordTemporanea();
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nome: u.nome, cognome: u.cognome },
    app_metadata: { ruolo: u.ruolo },
  });

  if (error) {
    const giaEsiste = /already|registered|exists/i.test(error.message);
    console.log(giaEsiste ? `↷  ${email}: esiste già, saltato` : `❌ ${email}: ${error.message}`);
    continue;
  }

  // Sicurezza extra: allinea il ruolo nel profilo (il trigger l'ha già creato)
  const { error: errProfilo } = await supabase
    .from('profiles')
    .update({ ruolo: u.ruolo, annate: u.annate ?? [] })
    .eq('id', data.user.id);

  if (errProfilo) console.error(`⚠️  ${email}: profilo non aggiornato (${errProfilo.message})`);

  risultati.push({ nome: `${u.nome} ${u.cognome}`, email, ruolo: u.ruolo, password });
  console.log(`✅ ${email} creato come ${u.ruolo}`);
}

if (risultati.length) {
  console.log('\nPassword temporanee da consegnare di persona (poi le cambiano al primo accesso):');
  console.table(risultati);
}
