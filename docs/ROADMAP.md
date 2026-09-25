# Roadmap

Progetto unico: **Portale squadre** (`public/portale/`) + **Scouting Hub** (Next.js), stesso database
Supabase e stessa pagina d'ingresso col PIN.

Documento di progetto: https://claude.ai/code/artifact/ccfafc8e-f622-424e-82c9-9c598bb6bb2c

## Da fare subito (sul tuo Mac)
- [x] `npm install`
- [x] Progetto Supabase (condiviso col Pannello Società), iscrizioni pubbliche disattivate
- [x] Migrazioni 0001, 0002, 0003, 0004 eseguite in ordine
- [ ] Coordinate esatte delle sedi (tabella `sedi`) — per ora quelle approssimative del comune
- [x] Account admin (tuo); account scout/direttore del resto del team ancora da creare
- [ ] Prova completa: segnalazione, valutazione, cambio stato, gara prenotata
- [ ] Migrazione **0006** (accesso col solo PIN per scout/direttori) eseguita nel SQL Editor
- [ ] Migrazione **0007** (i mister segnalano dal Portale: area Scouting) eseguita nel SQL Editor
- [ ] Migrazione **0008** (PIN personali dei mister; PIN del team solo all'admin) eseguita nel SQL Editor
- [ ] Generare i PIN dei mister (Società → Squadre), consegnarli e poi disattivare i PIN di squadra
- [ ] Generare i codici di scout e dirigenti (Società → Scouting e dirigenti)
- [ ] Dirigenti: dare accesso anche al Portale di tutte le squadre? (oggi entrano in Scouting Hub e vedono tutto lo scouting)
- [ ] PIN personale per scout e direttori (`scripts/crea-pin.mjs`, anche con `"ruolo": "direttore"`)
- [ ] Prova l'ingresso unico con un PIN squadra vero e con un PIN personale vero

## Fatto nel codice
- [x] Accesso, ruoli, permessi nel database, cambio password
- [x] Segnalazione rapida con riconoscimento dei giocatori già presenti
- [x] Archivio giocatori con filtri
- [x] Scheda giocatore: storia, medie, stato, contatti protetti, modifica dati
- [x] Valutazione a 4 aree + giudizio finale
- [x] Gare da vedere: squadre seguite, distanza da Casatenovo/Merate, "Ci vado io", importazione incollando

## Prossimi passi
- [x] Importazione dal Google Sheet: script `scripts/import-sheet/importa.mjs`. Importati 453
      giocatori da "GENERALE 2024/2026" + 26 segnalazioni rapide da "A prima vista" (foglio
      "Osservazione" vuoto, nessuna valutazione strutturata da importare). 8 righe scartate
      per anno di nascita mancante (elenco stampato dallo script, da inserire a mano). NOTE
      25/26 tradotte in stato/motivo di chiusura con una mappatura di ~60 frasi distinte:
      da controllare a campione, specie le chiusure (`chiuso`) — testo originale sempre
      conservato in `giocatori.note` per verifica.
- [ ] Unione di due schede doppie (per i responsabili) — utile subito: nel foglio importato
      c'erano quasi-doppioni con refusi (es. "Ilyass"/"Ilyasse Omari") non uniti in automatico
      per prudenza (rischio di unire persone diverse)
- [ ] Eventi: open day e provini con presenze ed esito
- [ ] Vista a colonne per stato (kanban) per i responsabili
- [ ] Lettura automatica delle gare da comunicati PDF / Tuttocampo
- [ ] Pubblicazione su Vercel (vedi README): variabili `NEXT_PUBLIC_SUPABASE_URL`,
      `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `PIN_ADMIN` (già caricate);
      poi mandare ai mister il nuovo indirizzo e spegnere GitHub Pages
- [ ] **Messaggi interni** tra i profili (vedi sotto)
- [ ] PWA installabile (icona sul telefono), export Excel
- [ ] Gestione utenti dall'app (oggi da script o SQL)

## Messaggi interni (da fare)
Messaggi tra le persone del club dentro l'app, stile email/SMS (non chat istantanea):
- **Posta** in entrambi i pannelli: in arrivo, inviati, "scrivi"; pallino con i non letti.
- Messaggio = mittente, destinatari, oggetto facoltativo, testo, data, letto sì/no. Risposta
  che resta nella stessa conversazione. Niente realtime: si aggiorna aprendo la posta.
- **Destinatari**: persone con account (admin, direttori, scout) e **squadre** (i mister entrano
  col PIN della squadra, quindi il "profilo" del mister è la squadra); più "tutto lo staff".
- Permessi nel database (RLS): ognuno legge solo i messaggi che ha mandato o ricevuto; i mister
  passano da funzioni col PIN come per i documenti del Portale (`coach_*`).
- Regola: niente dati sensibili dei ragazzi nei messaggi (salute, famiglia); per i giocatori
  si mette il link alla scheda.
- Più avanti, facoltativo: avviso via email/notifica quando arriva un messaggio.

## Decisioni prese
- **App unica** (settembre 2026): il Portale squadre (ex repo `foglio-gara-casatese`, JS senza
  build) vive in `public/portale/` dentro l'app Next.js di Scouting Hub. Stessa grafica.
  Riscriverlo in React si può fare più avanti, pezzo per pezzo.
- **Accesso**: una sola pagina d'ingresso (`/`) con il solo PIN. PIN squadra → Portale (mister);
  PIN personale → Scouting Hub (scout, direttori); PIN admin → poi email e password.
  Niente accesso automatico: si rimette il PIN chiudendo il browser e comunque dopo 6 ore
  (`ORE_ACCESSO` in `lib/supabase/durata.ts` e `public/portale/js/core.js`).
- **Scala voti**: resta 1–5 (già implementata ovunque; più veloce da compilare da telefono a bordo campo).
- **Posizioni**: restano i 4 ruoli base (portiere, difensore, centrocampista, attaccante); si
  passa alle linee 1°–3° solo se il gruppo lo chiede esplicitamente più avanti. Nota: nel foglio
  "A prima vista" alcune segnalazioni recenti usano già "1°/2°/3° linea" — segno che sul campo
  la distinzione a volte serve; mappata verso i 4 ruoli base in fase di importazione.
- **Conservazione dati giocatori chiusi**: nessuna cancellazione automatica per ora. Politica
  di massima: rivedere una volta l'anno i profili "chiuso" da più di 24 mesi e valutare se
  anonimizzare i contatti famiglia (nome/telefono in `contatti`), mantenendo lo storico
  scouting in forma aggregata. Da automatizzare quando servirà davvero (vedi sotto).
- **Database condiviso col Pannello Società**: stesso progetto Supabase (stesso `auth.users`,
  login unico per lo staff), tabelle separate — nessuna collisione di nomi al momento.
  Ruoli rinominati in `direttore`/`scout` (ex responsabile/osservatore) per coerenza col resto
  del club; i mister hanno account ma **non accedono** a Scouting Hub (bloccati nel layout).

## Prossime domande aperte
- Automatizzare la revisione/anonimizzazione annuale dei giocatori chiusi da tempo?
- Se il Pannello Società introduce ruoli propri, va tenuto un solo campo `ruolo` per utente
  o serve un ruolo per app (oggi `profiles.ruolo` vale solo per Scouting Hub)?
