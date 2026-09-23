# Scouting Hub

Web app del team scouting: segnalazioni dal campo, report di valutazione a 4 aree
(Tecnica, Motoria, Tattica, Mentale) e pipeline dei giocatori, al posto del Google Sheet.

Stack: **Next.js 16 + Supabase + Tailwind CSS**, sviluppato in VSCode, pubblicato su Vercel.

---

## Cosa c'è già

- **Accesso e ruoli**: login, pagine protette, ruoli admin / responsabile / osservatore / mister,
  cambio password, script per creare gli account del team.
- **Segnala**: segnalazione rapida da telefono. Il nome è facoltativo ("N.8, biondo");
  se il giocatore esiste già (stesso cognome, nome e annata) la segnalazione si aggiunge alla sua scheda.
- **Giocatori**: archivio con ricerca e filtri (annata, ruolo, stato, società).
- **Scheda giocatore**: storia di segnalazioni, valutazioni e cambi di stato; medie delle 4 aree;
  contatti famiglia protetti; modifica dati.
- **Valutazione**: report a 4 aree (Tecnica, Motoria, Tattica, Mentale) con voto 1–5, note e giudizio finale.
- **Pipeline**: Segnalato → Da rivedere → Contattato → Invitato → In prova → Inserito, oppure Chiuso con motivo.
- **Gare da vedere**: squadre da seguire, gare dei prossimi 7 giorni entro X km da Casatenovo o Merate,
  "Ci vado io" per non andare in due allo stesso campo. Le gare si incollano da Excel o dai comunicati.
- **Home**: le mie gare, ultime segnalazioni, numeri dell'archivio, elenco del team.

## Cosa ti serve

- Mac con **Node.js 20.9 o più recente** (verifica con `node -v`; se manca: nodejs.org, versione LTS)
- **VSCode**
- Account gratuito su **supabase.com**
- (Più avanti) account **GitHub** e **Vercel** per pubblicarla online

---

## Avvio passo passo

### 1. Apri il progetto
Estrai lo zip, apri la cartella `scouting-hub` in VSCode, poi nel Terminale (Terminale → Nuovo terminale):

```bash
npm install
```

### 2. Crea il progetto Supabase
1. Su supabase.com → New project. Regione: **Central EU (Frankfurt)**.
2. Authentication → Sign In / Providers → **disattiva "Allow new users to sign up"**
   (gli account li crei solo tu).
3. SQL Editor → esegui **in ordine**, uno alla volta (incolla tutto il file → **Run**):
   - `supabase/migrations/0001_profili_e_ruoli.sql`
   - `supabase/migrations/0002_giocatori_e_segnalazioni.sql`
   - `supabase/migrations/0003_gare_weekend.sql`
4. (Consigliato) Table Editor → tabella `sedi`: correggi le coordinate di Casatenovo e Merate
   con quelle esatte dei vostri campi.

### 3. Collega le chiavi
Duplica `.env.local.example`, rinominalo `.env.local` e incolla i valori da
Project Settings → API (URL, anon key, service role key).

> La **service role key** è segreta: resta solo nel tuo `.env.local`, mai su GitHub o nel codice.

### 4. Crea il tuo account admin
1. Authentication → Users → Add user → Create new user (spunta **Auto Confirm User**).
2. SQL Editor:
   ```sql
   update public.profiles set ruolo = 'admin' where email = 'tua@email.it';
   ```

### 5. Crea gli account del team
Modifica `scripts/utenti.json` con nomi ed email veri, poi:

```bash
npm run crea-utenti
```

Lo script stampa le password temporanee: consegnale di persona.
Ognuno la cambia dalla pagina **Profilo** al primo accesso.

### 6. Avvia l'app
```bash
npm run dev
```
Apri http://localhost:3000 e accedi.

---

## Comandi utili

| Comando | A cosa serve |
| --- | --- |
| `npm run dev` | Avvia l'app sul tuo Mac |
| `npm run crea-utenti` | Crea gli account elencati in `scripts/utenti.json` |
| `npm run typecheck` | Controlla errori nel codice |
| `npm run lint` | Controlla lo stile del codice |
| `npm run build` | Prova la versione di produzione |

## Struttura delle cartelle

```
app/
  login/                  pagina di accesso
  (app)/                  pagine protette (serve il login)
    home/                 home
    segnala/              segnalazione rapida + salvataggio
    giocatori/            archivio, scheda [id], valutazione [id]/valuta
    gare/                 gare da vedere + gestione (squadre, importazione, campi)
    profilo/              profilo + cambio password
  auth/actions.ts         login, logout, cambio password
components/               pezzi di interfaccia riutilizzabili
lib/
  supabase/               collegamento al database
  auth.ts                 profilo dell'utente loggato
  ruoli.ts                ruoli e permessi lato app
  tipi.ts                 stati, ruoli in campo, aree di valutazione
  utili.ts                date, coordinate, distanze, pulizia testi
  societa.ts              ricerca società anche con nomi diversi
  gare.ts                 distanze e squadre seguite nelle gare
supabase/migrations/ modifiche al database, in ordine numerico
scripts/            script da lanciare dal Mac (import, utenti)
docs/ROADMAP.md     cosa manca, sprint per sprint
proxy.ts            protegge le pagine: senza login si torna al login
```

## Ruoli

| Ruolo | Vede tutto | Contatti famiglie | Gestisce utenti |
| --- | --- | --- | --- |
| admin | sì | sì | sì |
| responsabile | sì, e cambia gli stati e gestisce le gare | sì | no |
| osservatore | tutte le schede; segnala, valuta, si prenota alle gare | solo quelli che inserisce | no |
| mister | solo le proprie annate, in sola lettura | no | no |

Per le annate di un mister:
```sql
update public.profiles set ruolo = 'mister', annate = '{2013,2014}' where email = 'mister@email.it';
```

Per cambiare il ruolo di qualcuno (da SQL Editor):
```sql
update public.profiles set ruolo = 'responsabile' where email = 'nome@email.it';
```

## Gare: come inserirle

Pagina **Gare → Gestisci gare e squadre** (solo admin e responsabili):

1. **Squadre da seguire**: società (e categoria) che vi interessano, con il motivo.
2. **Aggiungi gare**: incolla una gara per riga, colonne separate da `;` oppure copiate da Excel:
   `data;ora;categoria;casa;ospite;campo;indirizzo;coordinate` (le ultime tre facoltative).
3. **Campi delle società**: inserisci una volta le coordinate del campo di casa;
   da lì in poi tutte le gare di quella società avranno la distanza.

Distanze in linea d'aria. La lettura automatica dei comunicati PDF o di Tuttocampo è in roadmap.
