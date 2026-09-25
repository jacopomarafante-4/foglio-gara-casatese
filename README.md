# Academy Casatese Merate

Un'unica app web per il settore giovanile, con due pannelli:

- **Portale squadre**: rosa, calendario, gara (foglio gara, convocazioni, formazione, calci
  piazzati, tabellini), allenamento (presenze, test atletici) e statistiche. Per i mister e l'admin.
- **Scouting Hub**: segnalazioni dal campo, report a 4 aree (Tecnica, Motoria, Tattica, Mentale),
  pipeline dei giocatori, gare da vedere. Per scout, direttori e admin.

Stack: **Next.js 16 + Supabase + Tailwind CSS**, pubblicata su **Vercel**.
Il Portale squadre è JavaScript senza build dentro `public/portale/`.

---

## Accesso: una pagina, un PIN

Tutti entrano da `/` digitando **solo il PIN**. Il PIN dice chi sei:

| PIN | Dove si entra |
|---|---|
| PIN della **squadra** (4 cifre, dalla scheda Squadre del Portale) | Portale squadre, come mister di quella squadra |
| PIN **personale** (6 cifre, creato con `scripts/crea-pin.mjs`) | Scouting Hub (scout e direttori) |
| PIN **admin** (variabile `PIN_ADMIN`) | poi email e password → Portale squadre; da `/` si sceglie anche Scouting Hub |

Niente accesso automatico: il PIN si rimette quando si chiude il browser (per i mister anche
chiudendo la scheda) e comunque dopo **6 ore** (`ORE_ACCESSO`).

## Cosa c'è

### Portale squadre
| Area | Schede |
|---|---|
| Home | prossima partita, allenamento di oggi, cose da fare, numeri della stagione |
| Squadra | Rosa (🧤 portieri), Calendario (campionato + amichevoli) |
| Gara | Partita, Convocazioni, Formazione, Piazzati, Foglio gara PDF |
| Allenamento | Presenze, Test atletici |
| Statistiche | Allenamento (presenze, per mese, test), Partite (minuti, gol, gol subiti); report PDF solo admin |
| Società (admin) | Squadre, PIN, backup |

La scheda aperta resta nell'indirizzo (`/portale/#/formazione`): il tasto indietro funziona.

### Scouting Hub
- **Segnala**: segnalazione rapida da telefono; il nome è facoltativo ("N.8, biondo").
- **Giocatori**: archivio con ricerca e filtri; scheda con storia, medie delle 4 aree, stato,
  contatti famiglia protetti.
- **Valutazione**: report a 4 aree con voto 1–5, note e giudizio finale.
- **Pipeline**: Segnalato → Da rivedere → Contattato → Invitato → In prova → Inserito, oppure Chiuso.
- **Gare da vedere**: gare dei prossimi 7 giorni vicino a Casatenovo/Merate, "Ci vado io".

## Cosa ti serve
- Mac con **Node.js 20.9 o più recente** (`node -v`)
- **VSCode**
- Il progetto **Supabase** del club (uno solo per tutta l'app)

## Avvio sul Mac

```bash
npm install
```

Crea `.env.local` copiando `.env.local.example` e compila:

```
NEXT_PUBLIC_SUPABASE_URL=...        # Supabase → Project Settings → API
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...       # segreta: solo per gli script, mai nel codice né su GitHub
PIN_ADMIN=...                       # PIN amministratore della pagina d'ingresso
```

```bash
npm run dev
```

Apri http://localhost:3000 e digita il PIN.

## Database (Supabase → SQL Editor)
Da eseguire **una volta**, in ordine (incolla tutto il file → **Run**):
1. `supabase/sicurezza.sql` — protegge i documenti del Portale (admin via login, mister via PIN)
2. `supabase/migrations/0001_…` → `0006_…` — tabelle e permessi di Scouting Hub e accesso col PIN

Ogni nuova modifica al database = un nuovo file numerato in `supabase/migrations/`.

## Account
- **Admin**: Authentication → Users → Add user (spunta Auto Confirm), poi
  `update public.profiles set ruolo = 'admin' where email = 'tua@email.it';`
- **Scout e direttori**: elenco in un file JSON (`[{ nome, cognome, email, ruolo }]`, l'email
  può essere segnaposto), poi `node --env-file=.env.local scripts/crea-pin.mjs file.json`.
  Lo script stampa i PIN: consegnali di persona. Admin e direttori li rivedono nella Home di Scouting Hub.
- **Mister**: nessun account. Usano il PIN della squadra (Portale → Società → Squadre).

## Pubblicazione su Vercel
1. vercel.com → **Add New… → Project** → importa il repository GitHub `foglio-gara-casatese`.
2. **Environment Variables**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `PIN_ADMIN` (scegline uno **nuovo**: il vecchio PIN del Portale è scritto nel codice pubblico).
   **Non** serve `SUPABASE_SERVICE_ROLE_KEY`.
3. **Deploy**. Da lì ogni `git push` su `main` ripubblica da solo.
4. Manda ai mister e allo staff il nuovo indirizzo. Quando tutti usano quello, spegni GitHub Pages
   (GitHub → Settings → Pages → None).

## Comandi utili

| Comando | A cosa serve |
| --- | --- |
| `npm run dev` | Avvia l'app sul Mac |
| `npm run typecheck` | Controlla errori nel codice |
| `npm run lint` | Controlla lo stile del codice |
| `npm run build` | Prova la versione di produzione |
| `npm run crea-utenti` | Crea account con password da `scripts/utenti.json` |
| `npm run deck` | Rigenera il PDF di presentazione (Python: `pip install reportlab pillow`) |

## Struttura delle cartelle

```
app/
  page.tsx, AccessoForm.tsx   pagina d'ingresso (PIN) e scelta pannello per l'admin
  (app)/                      Scouting Hub, pagine protette: home, segnala, giocatori, gare, profilo
  auth/actions.ts             accesso col PIN, uscita, cambio password
public/portale/               Portale squadre (index.html, css/, js/, loghi): script senza build
components/                   pezzi di interfaccia di Scouting Hub
lib/
  supabase/                   collegamento al database, sessione, durata dell'accesso
  ruoli.ts, tipi.ts, utili.ts ruoli e pannelli, stati, date, distanze
supabase/
  sicurezza.sql               permessi dei documenti del Portale
  migrations/                 modifiche al database di Scouting Hub, in ordine
scripts/                      script da lanciare dal Mac (utenti, PIN, import, presentazione)
data/                         dati di prova del Portale (niente dati reali)
docs/                         ROADMAP e presentazione
proxy.ts                      protegge le pagine e porta /portale a /portale/
```

## Modifiche al Portale squadre
I file in `public/portale/js/` sono script normali che condividono le variabili globali: vanno
caricati nell'ordine di `index.html`. Dopo una modifica a un file CSS/JS aumenta il `?v=` nel
tag corrispondente di `public/portale/index.html`, così i telefoni scaricano la versione nuova.
Colori e caratteri sono gli stessi di Scouting Hub (`app/globals.css`).

## Privacy
Il repository è **pubblico**. I dati personali dei ragazzi e delle famiglie non vanno mai su git:
stanno nel database, oppure in `private/` e `scripts/import-sheet/dati/` (esclusi da git).
