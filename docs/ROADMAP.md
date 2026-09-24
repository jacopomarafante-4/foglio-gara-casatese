# Roadmap

Documento di progetto: https://claude.ai/code/artifact/ccfafc8e-f622-424e-82c9-9c598bb6bb2c

## Da fare subito (sul tuo Mac)
- [x] `npm install`
- [x] Progetto Supabase (condiviso col Pannello Società), iscrizioni pubbliche disattivate
- [x] Migrazioni 0001, 0002, 0003, 0004 eseguite in ordine
- [ ] Coordinate esatte delle sedi (tabella `sedi`) — per ora quelle approssimative del comune
- [x] Account admin (tuo); account scout/direttore del resto del team ancora da creare
- [ ] Prova completa: segnalazione, valutazione, cambio stato, gara prenotata

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
- [ ] Pubblicazione: GitHub + Vercel
- [ ] PWA installabile (icona sul telefono), export Excel
- [ ] Gestione utenti dall'app (oggi da script o SQL)

## Decisioni prese
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
