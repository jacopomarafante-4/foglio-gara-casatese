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
- `IN_APP_UNICA` (percorso `/portale/`): legge la sessione dagli stessi cookie di `@supabase/ssr`
  (`cookieStorage` in `core.js`), il PIN del mister sta in `sessionStorage` e non nell'indirizzo,
  senza accesso valido torna a `/`. Fuori (vecchio GitHub Pages) usa ancora il suo accesso a PIN.
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
- La service role key si usa solo negli script in `scripts/`, mai nel codice dell'app.
- Testi dell'interfaccia in italiano, frasi brevi, verbi chiari ("Salva report", non "Invia").
- Mobile first: gli osservatori usano l'app dal telefono a bordo campo.

## Ruoli
`admin`, `direttore`, `scout`, `mister` (tipo `public.ruolo`, tabella `profiles`).
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
- 0005: `codici_accesso` (PIN degli account personali, leggibili da admin/direttori)
- 0006: `email_per_pin()` per l'accesso col solo PIN
- 0007: segnalazioni dei mister dal Portale: `coach_segnala()`, `coach_societa()` (col PIN squadra),
  colonne `segnalazioni.squadra` e `giocatori.segnalato_da_squadra` (autore = "Mister <squadra>")

## Convenzioni del codice
- Form = Server Action che, a fine lavoro, fa `redirect` con `?ok=` o `?errore=` (mostrati da `<Avviso>`).
- Società sempre tramite `trovaOCreaSocieta()` (lib/societa.ts), mai insert diretti: evita i doppioni.
- Date e ore sempre in fuso `Europe/Rome` (`istanteItaliano`, `dataOraBreve` in lib/utili.ts);
  per "adesso" nei componenti server usa `istanteTraOre()` (la regola di lint vieta `Date.now()` nel render).
- Tipi SQL ↔ TypeScript allineati in `lib/tipi.ts`: se aggiungi uno stato, aggiornalo in entrambi.

## Stato
Vedi `docs/ROADMAP.md`.
