@AGENTS.md

# Academy Casatese Merate — contesto per Claude

App web unica del settore giovanile di calcio (Brianza), con due pannelli:
- **Portale squadre** (`public/portale/`): rosa, calendario, foglio gara, convocazioni, formazione,
  presenze, statistiche. Per mister (PIN della squadra) e admin.
- **Scouting Hub** (Next.js, `app/`): segnalazioni dal campo, report a 4 aree
  (Tecnica, Motoria, Tattica, Mentale), pipeline dei giocatori. Per scout, direttori, admin.

Repository **pubblico**: niente dati personali dei ragazzi su git (`private/`,
`scripts/import-sheet/dati/` sono esclusi).

## Accesso (pagina `/`, `app/auth/actions.ts` → `accedi`)
Un solo campo PIN per tutti: PIN squadra → `/portale/#squadra=PIN` (mister); PIN personale
(`email_per_pin()`, migrazione 0006; il PIN è la password dell'account) → Scouting Hub;
`PIN_ADMIN` (variabile solo server) → poi email e password → Portale.
Niente accesso automatico: cookie di sessione e massimo `ORE_ACCESSO` ore dal login
(`lib/supabase/durata.ts`, stesso valore in `public/portale/js/core.js`). Uscite sempre
`signOut({ scope: 'local' })`, per non chiudere la sessione sugli altri dispositivi.

## Portale squadre (`public/portale/`)
- JavaScript classico senza build, variabili globali condivise, caricato nell'ordine di
  `index.html`; ESLint lo ignora. Dopo ogni modifica a CSS/JS aumenta il `?v=` in `index.html`.
- Servito su `/portale/` (la barra finale serve ai percorsi relativi: `next.config.ts` + `proxy.ts`),
  fuori dal controllo login del proxy.
- Dati: tabella `docs` a chiave/valore (`shared/teams`, `roster/<squadra>`, …), permessi in
  `supabase/sicurezza.sql`: admin per email, mister solo via funzioni `coach_*` col PIN.
- Squadre: `coaches: [{id, name, code}]` = mister con PIN personale (Società → Squadre, solo admin);
  `code` sulla squadra = vecchio PIN condiviso, valido finché l'admin non lo disattiva. `coach` = testo riassuntivo.
  `coach_team()` non restituisce mai PIN.
- Società (la modifica solo l'admin, i direttori la vedono): squadre con i mister, poi "Scouting" (scout) e "Direttori"
  mostrati come squadre, ognuno col suo PIN. Account e PIN di scout/direttori via `POST /api/staff` (solo admin)
  (crea, pin, nome, stato): il codice è la password dell'account, salvato anche in `codici_accesso`.
- Barra delle aree sempre in alto nell'intestazione (anche da telefono), sotto le schede dell'area.
- Lo Scouting (pagine Next) è un'area del Portale: stessa intestazione (`app/(app)/layout.tsx`, `components/Aree.tsx`,
  `components/Scheda.tsx`); nel Portale l'area "Scouting" di admin e dirigenti porta a `/home`.
- Direttori nel Portale: vedono tutte le squadre e Società in sola lettura (`readOnly()` in `core.js`: `save()` non scrive
  e ricarica il dato vero, campi `readonly`, pulsanti di gestione nascosti con `.ro`); nel database `docs` solo in lettura (0011).
  La sessione vale per il Portale se è dell'admin (`ADMIN_EMAIL`) o di un direttore (`staffRole`).
- `IN_APP_UNICA` (percorso `/portale/`): legge la sessione dagli stessi cookie di `@supabase/ssr`
  (`cookieStorage` in `core.js`), il PIN del mister sta in `sessionStorage` e non nell'indirizzo,
  senza accesso valido torna a `/`. Fuori da `/portale/` (solo prove in locale: GitHub Pages è spento) usa ancora la sua schermata: PIN squadra
  per i mister, email e password per l'admin. Nessun PIN admin nel codice (repository pubblico).
- Colori e caratteri uguali a `app/globals.css`; il verde resta solo per il campo e "presente".

## Chi sviluppa
L'utente sviluppa da solo con Claude, in VSCode, su Mac. Spiega i passaggi in italiano,
in modo semplice e concreto; indica sempre in quale file va ogni modifica e i comandi da lanciare.

## Stack
- Next.js 16 (App Router, TypeScript). Il middleware si chiama `proxy.ts`.
  Prima di usare API Next.js controlla la documentazione in `node_modules/next/dist/docs/`.
- Supabase: database Postgres, login, storage. Client in `lib/supabase/` (`server.ts` per server, `client.ts` per browser).
- Tailwind CSS v4: colori e font del club definiti in `app/globals.css` (`bg-blu`, `text-oro`, `font-display`…).
- Pubblicazione: Vercel, variabili `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `PIN_ADMIN`.
- Server Actions per i form (vedi `app/auth/actions.ts`), `useActionState` nei componenti client.

## Regole
- Permessi SEMPRE nel database con Row Level Security; l'interfaccia li rispecchia soltanto.
  Funzioni SQL disponibili: `mio_ruolo()`, `vede_tutto()`, `is_admin()`.
- Ogni modifica al database = un nuovo file in `supabase/migrations/` con numero progressivo
  (`0002_...sql`); mai modificare una migrazione già eseguita.
- I contatti delle famiglie (quasi tutti minorenni) vanno in una tabella separata leggibile solo
  da admin e responsabile. Nessun dato non tecnico o sensibile nelle note.
- La service role key si usa negli script in `scripts/` e, nell'app, SOLO in `app/api/staff/route.ts`
  (via `lib/supabase/servizio.ts`, dopo aver verificato che chi chiama è l'admin). Mai nel browser.
- Testi dell'interfaccia in italiano, frasi brevi, verbi chiari ("Salva report", non "Invia").
- Mobile first: gli osservatori usano l'app dal telefono a bordo campo.

## Ruoli
`admin`, `direttore` (a capo di squadre e scout: vede tutto, Portale, Società e Scouting, ma **non modifica niente**),
`scout`, `mister` (tipo `public.ruolo`, tabella `profiles`). In `lib/ruoli.ts`: `vedeTutto()` = leggere tutto
(admin, direttori), `gestisce()` = modificare stati, gare, dati di tutti nello Scouting (solo admin), `puoSegnalare()` = admin e scout.
Solo admin/direttore/scout accedono a Scouting Hub (`puoAccedere()` in `lib/ruoli.ts`,
controllato in `app/(app)/layout.tsx`); `pannelloIniziale()` sceglie dove si arriva dopo il PIN.
I mister non hanno account personali: entrano nel Portale col PIN della squadra. `direttore` = ex "responsabile" (vede tutto, gestisce stati e gare),
`scout` = ex "osservatore" (segnala e valuta). Rinominati in 0004; se aggiungi
codice che confronta stringhe di ruolo, usa i nomi nuovi.

## Modello dati (supabase/migrations)
- 0001: `profiles` (ruolo, annate, attivo) + funzioni `mio_ruolo()`, `vede_tutto()`, `is_admin()`, `imposta_ruolo()`
- 0002: `societa` (con `alias`), `giocatori` (cognome O descrizione obbligatori, `stato`),
  `contatti` (protetti), `segnalazioni`, `valutazioni` (4 aree 1–5), `storico_stati` (trigger);
  funzioni `puo_segnalare()`, `puo_vedere_annata()`; solo admin/direttori cambiano `stato` (trigger)
- 0003: `sedi`, `squadre_seguite`, `gare` (casa/trasferta + coordinate), `gare_osservatori`
- 0004: rinomina ruoli `responsabile`→`direttore`, `osservatore`→`scout`; blocco app dei mister
- 0005: `codici_accesso` (PIN degli account personali; dalla 0008 leggibili solo dall'admin)
- 0006: `email_per_pin()` per l'accesso col solo PIN
- 0007: segnalazioni dei mister dal Portale: `coach_segnala()`, `coach_societa()`, `mister_for_pin()`,
  colonne `segnalazioni.squadra` e `giocatori.segnalato_da_squadra` (firma "<mister> · <categoria>")
- 0008: PIN personali dei mister (`team_for_pin`, `coach_team` riscritte); `codici_accesso` leggibile solo dall'admin
- 0009: direttori in sola lettura nello Scouting (`puo_segnalare()` senza direttore, scritture di gestione solo `is_admin()`)
- 0010: direttori leggono e scrivono `docs` (Portale) e vedono `codici_accesso`; tolta `dirigente_get()`
- 0011: direttori solo in lettura su `docs` (Portale)

## Convenzioni del codice
- Form = Server Action che, a fine lavoro, fa `redirect` con `?ok=` o `?errore=` (mostrati da `<Avviso>`).
- Società sempre tramite `trovaOCreaSocieta()` (lib/societa.ts), mai insert diretti: evita i doppioni.
- Date e ore sempre in fuso `Europe/Rome` (`istanteItaliano`, `dataOraBreve` in lib/utili.ts);
  per "adesso" nei componenti server usa `istanteTraOre()` (la regola di lint vieta `Date.now()` nel render).
- Tipi SQL ↔ TypeScript allineati in `lib/tipi.ts`: se aggiungi uno stato, aggiornalo in entrambi.

## Stato
Vedi `docs/ROADMAP.md`.
