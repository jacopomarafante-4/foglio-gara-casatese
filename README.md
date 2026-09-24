# 📋 Portale Academy Casatese Merate

Portale dell'allenatore, multi-squadra: rosa, calendario, gara (foglio gara, convocazioni, formazione, calci piazzati, tabellini), allenamento (presenze, test atletici) e statistiche.

## 🧭 Aree

| Area | Schede |
|---|---|
| Home | prossima partita, allenamento di oggi, cose da fare, numeri della stagione |
| Squadra | Rosa (🧤 portieri), Calendario (campionato + amichevoli) |
| Gara | Partita, Convocazioni, Formazione, Piazzati, Foglio gara PDF, Tabellini |
| Allenamento | Presenze, Test atletici |
| Statistiche | statistiche e report PDF (solo admin) |
| Società (admin) | Squadre, PIN, backup |

La scheda aperta resta nell'indirizzo (`#/formazione`, o `#squadra=PIN/formazione` per i mister): il tasto indietro funziona e si può mandare il link di una sezione.

## 📁 Struttura

```
foglio-gara-casatese/
├── src/
│   ├── index.html              ← Pagina (carica css/ e js/ in ordine)
│   ├── css/portale.css         ← Grafica
│   ├── js/core.js              ← Dati, salvataggio, database, accesso
│   ├── js/schede.js            ← Squadre, rosa, partita, convocazioni, formazione, piazzati
│   ├── js/pdf.js               ← PDF foglio gara e convocazione
│   ├── js/registro.js          ← Presenze, tabellini, test, statistiche, report
│   ├── js/portale.js           ← Aree, Home, calendario
│   ├── js/eventi.js            ← Tocchi, trascinamento, avvio
│   ├── casatese-logo.png       ← Logo società
│   └── figc-sgs-logo.png       ← Logo FIGC / Settore Giovanile
├── docs/
│   └── Foglio_gara_presentazione_Casatese.pdf
├── scripts/
│   ├── patch.py                ← Genera multi-squadra da single-file
│   └── deck_casatese.py        ← Genera PDF presentazione
├── data/
│   ├── seed_shared_teams.json          ← Squadre (Juniores, Allievi)
│   ├── seed_shared_schemes.json        ← Archivio schemi
│   ├── seed_roster_t_jun.json          ← Rosa Juniores
│   ├── seed_roster_t_all.json          ← Rosa Allievi
│   ├── seed_sheet_t_jun.json           ← Foglio gara Juniores
│   └── seed_sheet_t_all.json           ← Foglio gara Allievi
└── README.md
```

## 🚀 Uso

### Come app web standalone
1. Apri `src/index.html` nel browser
2. Il logo viene cercato nella stessa cartella

**Nota:** se il browser blocca il caricamento del logo (CORS), 
fai partire un mini server:
```bash
# Con Python 3
python -m http.server 8000

# Poi apri: http://localhost:8000/src/index.html
```

### Con VSCode
1. Apri questa cartella in VSCode
2. Installa **Live Server** extension (Ritchie's Live Server)
3. Clicca destro su `src/index.html` → "Open with Live Server"
4. Il browser si apre automaticamente con hot-reload

### Ruoli
- **Admin** (tu): PIN amministratore (+ login email fuori da Claude) — crea squadre, gestisce rose, disegna schemi
- **Mister** (collega): apre lo stesso link base e digita il PIN della sua squadra — vede solo la propria rosa e formazione

## 📈 Presenze e statistiche

- **Presenze** (admin e mister): allenamenti (P presente · A assente · G giustificato · INF infortunato), partite (minuti, titolare, gol, cartellini, risultato) e test atletici (tempi mm:ss).
- **Statistiche** (admin e mister, per la propria squadra): % presenze (gli infortuni non abbassano la %), presenze e minuti in partita, presenze per mese, test. Filtro per mese.
- **Report PDF** (solo admin): riepilogo, presenze giorno per giorno, minuti partita per partita, presenze per mese e test.

### 🔒 Sicurezza del database (Supabase)

`supabase/sicurezza.sql` va eseguito una volta nel SQL Editor di Supabase. Dopo:
- **admin** (login Supabase con la sua email): legge e scrive tutto;
- **mister**: nessun accesso diretto alla tabella; l'app passa da funzioni che verificano il PIN e aprono solo i documenti della sua squadra (scrive solo foglio gara e registro presenze);
- **senza PIN**: non si legge niente.

L'app riconosce da sola se il database è già protetto; finché non lo è funziona come prima.
I dati personali dei ragazzi (import presenze) stanno in `private/`, esclusa da git: il repository è pubblico.

## 🛠️ Modifiche al codice

I file in `src/js/` sono script normali (niente build) che condividono le variabili globali: vanno caricati nell'ordine di `index.html`. Dopo una modifica a un file CSS/JS aumenta il `?v=` nei tag di `index.html`, così i telefoni scaricano la versione nuova.

## 📊 Dati

I dati sono salvati in:
- **Browser**: `localStorage` (fallback locale, o se aperto senza connessione a un backend)
- **Cloud**: database Claude quando l'app gira dentro claude.ai, altrimenti Supabase (sincronizzazione in tempo reale) quando pubblicata come sito esterno (es. GitHub Pages)

I file JSON in `data/` sono snapshot di prova.

## 🎨 Personalizzazione

### Colori Casatese
In `src/css/portale.css`:
```css
--grass: #003DA5;      /* Blu ufficiale */
--red: #C41E3A;        /* Rosso ufficiale */
--amber: #D4AF37;      /* Oro ufficiale */
```

### Logo
Sostituisci `src/casatese-logo.png` con il tuo file (consigliato: PNG 1080×1080)

## 📱 Multi-squadra

Aggiungi nuove squadre dalla tab **Squadre** (admin only):
1. Nome squadra (es. "Allievi U16")
2. Categoria (es. "U16")
3. Mister (es. "Collega")
4. PIN squadra, generato automaticamente (es. "4821"), rigenerabile in ogni momento

Condividi col mister il PIN e il link base dell'app: lo digita nella schermata di accesso e entra direttamente nella sua squadra.

## 📄 PDF

Scarica il foglio gara in PDF dalla tab **PDF**:
- Distinta giocatori con numeri
- Formazione disegnata sul campo
- Calci piazzati scelti

## 🔧 Script Python

### `scripts/patch.py`
Trasforma la versione single-file in multi-squadra (già applicato).

```bash
python scripts/patch.py
```

### `scripts/deck_casatese.py`
Rigenerana il PDF di presentazione.

```bash
python scripts/deck_casatese.py
```

Richiede: `reportlab`, `pillow`
```bash
pip install reportlab pillow
```

## 📞 Supporto

- **Dati non salvano?** Controlla la console del browser (F12 → Console)
- **Logo non appare?** Assicurati che `casatese-logo.png` sia nella stessa cartella di `index.html`
- **Il mister non riesce a entrare?** Controlla il PIN squadra nella tab Squadre (puoi rigenerarlo se serve)

## 📅 Prossimi step

- [ ] Inserire rosa con numeri reali
- [ ] Testare link con il collega
- [ ] Raccogliere feedback su UX
- [ ] (Opzionale) Accesso sicuro con login
- [ ] (Opzionale) App mobile
- [ ] (Opzionale) Archivio partite e statistiche

---

**Creato**: 23 settembre 2026  
**Casatese Merate** ⚽
