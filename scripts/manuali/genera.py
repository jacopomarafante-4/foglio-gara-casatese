"""Genera i 4 manuali (HTML → PDF con Chrome): generale, mister, scout, direttori."""
from pathlib import Path

QUI = Path(__file__).parent
IMG = QUI / 'img'
ROOT = Path('/Users/jm4/Progetto ACM/foglio-gara-casatese')
FONT = ROOT / 'node_modules/@fontsource'
LOGO = ROOT / 'public/portale/casatese-logo.png'
SITO = 'academy-casatese.vercel.app'
DATA = '28 settembre 2026'
VERSIONE = 2

CSS = f"""
@font-face{{font-family:Barlow;font-weight:400;src:url('file://{FONT}/barlow/files/barlow-latin-400-normal.woff2')}}
@font-face{{font-family:Barlow;font-weight:600;src:url('file://{FONT}/barlow/files/barlow-latin-600-normal.woff2')}}
@font-face{{font-family:'Barlow Condensed';font-weight:600;src:url('file://{FONT}/barlow-condensed/files/barlow-condensed-latin-600-normal.woff2')}}
@font-face{{font-family:'Barlow Condensed';font-weight:700;src:url('file://{FONT}/barlow-condensed/files/barlow-condensed-latin-700-normal.woff2')}}
@page{{size:A4;margin:16mm 16mm 18mm}}
:root{{--blu:#003da5;--oro:#d4af37;--rosso:#c41e3a;--ink:#0e1a2b;--grigio:#5b6b80;--linea:#d8dfe8;--carta:#f5f7fa;--verde:#2f6b45}}
*{{box-sizing:border-box}}
body{{margin:0;font-family:Barlow,sans-serif;font-size:11.2pt;line-height:1.5;color:var(--ink)}}
h1,h2,h3{{font-family:'Barlow Condensed',Barlow,sans-serif;line-height:1.1}}
h2{{font-size:21pt;color:#fff;background:var(--blu);margin:0 0 4mm;padding:3mm 5mm;border-radius:2.5mm;
  border-bottom:1.4mm solid var(--oro);break-after:avoid}}
h3{{font-size:14pt;color:var(--blu);margin:5mm 0 1.8mm;padding-left:3mm;border-left:1.2mm solid var(--oro);break-after:avoid}}
p{{margin:0 0 2.3mm}} ul,ol{{margin:0 0 3mm;padding-left:5.5mm}} li{{margin:0 0 1.1mm}}
/* I capitoli scorrono uno dopo l'altro (niente pagina nuova per ognuno: niente pagine mezze vuote) */
section{{break-before:auto;margin-top:10mm}}
.cover{{break-after:page}}
.indice{{margin-bottom:2mm}}
.indice h2{{margin-bottom:6mm}}
.indice ol{{list-style:none;padding:0;columns:1}}
.indice li{{display:flex;align-items:baseline;gap:3mm;padding:2.6mm 0;border-bottom:.3mm solid var(--linea);font-size:13pt;
  font-family:'Barlow Condensed';font-weight:600}}
.indice li b{{display:inline-grid;place-items:center;min-width:8mm;height:8mm;border-radius:50%;background:var(--blu);color:#fff;font-size:11pt}}
.indice .intro{{margin-top:8mm;font-size:11pt;color:var(--grigio)}}
/* Copertina a pagina intera (senza margini), come la pagina d'ingresso del sito: blu con le linee del campo */
@page copertina{{margin:0}}
.cover{{page:copertina;width:210mm;height:297mm;position:relative;overflow:hidden;color:#fff;
  background:radial-gradient(120% 80% at 80% 0%,#1a56c4 0%,var(--blu) 45%,#002a73 100%);display:flex;flex-direction:column;padding:22mm 20mm 18mm}}
.cover .campo{{position:absolute;inset:0;width:100%;height:100%;opacity:.09}}
.cover > *:not(.campo){{position:relative}}
.cover .stemma{{width:34mm;height:34mm;background:#fff;border-radius:6mm;padding:2.5mm;box-shadow:0 2mm 8mm rgba(0,0,0,.25)}}
.cover .club{{margin-top:9mm;font-family:'Barlow Condensed';font-weight:700;font-size:14pt;letter-spacing:.18em;text-transform:uppercase;color:var(--oro)}}
.cover h1{{font-size:50pt;margin:2mm 0 4mm;line-height:1}}
.cover .sub{{font-size:15pt;line-height:1.35;max-width:150mm;opacity:.95}}
.stripe{{display:flex;height:2.6mm;width:120mm;margin-top:10mm;border-radius:1.3mm;overflow:hidden}} .stripe i{{display:block}}
.cover .scheda{{margin-top:auto;background:#fff;color:var(--ink);border-radius:5mm;padding:7mm 8mm;display:grid;grid-template-columns:1fr 1fr;gap:4mm 8mm;
  box-shadow:0 3mm 10mm rgba(0,0,0,.25)}}
.cover .scheda div span{{display:block;font-family:'Barlow Condensed';font-weight:700;font-size:10pt;letter-spacing:.06em;text-transform:uppercase;color:var(--grigio)}}
.cover .scheda div b{{font-size:12pt}}
.cover .scheda .piena{{grid-column:1 / -1;font-size:9.5pt;color:var(--grigio);border-top:.3mm solid var(--linea);padding-top:3mm}}
table{{width:100%;border-collapse:collapse;margin:1mm 0 4mm;font-size:10pt}}
tr:nth-child(even) td{{background:var(--carta)}}
th{{text-align:left;font-family:'Barlow Condensed';font-size:10.5pt;color:#fff;background:var(--blu);padding:1.5mm 2.2mm}}
td{{padding:1.3mm 2.2mm;border-bottom:.25mm solid var(--linea);vertical-align:top}}
tr{{break-inside:avoid}}
.box{{border-left:1.2mm solid var(--oro);background:var(--carta);padding:2.6mm 3.6mm;margin:3mm 0;border-radius:0 2mm 2mm 0;break-inside:avoid}}
.box.rosso{{border-left-color:var(--rosso)}} .box.blu{{border-left-color:var(--blu)}}
.box b.t{{display:block;font-family:'Barlow Condensed';font-size:12pt;margin-bottom:1mm}}
.si,.no{{display:grid;grid-template-columns:1fr 1fr;gap:5mm}}
.col h3{{margin-top:0}}
.ok li::marker{{content:'✓  ';color:var(--verde);font-weight:700}}
.ko li::marker{{content:'✕  ';color:var(--rosso);font-weight:700}}
.fig{{display:grid;grid-template-columns:60mm 1fr;gap:7mm;align-items:start;margin:3mm 0 5mm;break-inside:avoid}}
.fig img{{width:60mm;border:.4mm solid var(--linea);border-radius:4mm;box-shadow:0 1.5mm 5mm rgba(0,30,80,.15)}}
.fig.stretta img{{max-height:118mm;object-fit:cover;object-position:top}}
.duo{{display:grid;grid-template-columns:1fr 1fr;gap:5mm;margin:2mm 0 4mm;break-inside:avoid}}
.duo img{{width:100%;border:.3mm solid var(--linea);border-radius:3mm;max-height:105mm;object-fit:cover;object-position:top}}
.cap{{font-size:9.2pt;color:var(--grigio);margin-top:1.5mm;text-align:center;font-style:italic}}
.passi{{counter-reset:p;list-style:none;padding-left:0}}
.passi li{{counter-increment:p;padding-left:8mm;position:relative}}
.passi li::before{{content:counter(p);position:absolute;left:0;top:.3mm;width:5.2mm;height:5.2mm;border-radius:50%;background:var(--blu);color:#fff;font-family:'Barlow Condensed';font-weight:700;font-size:9pt;display:grid;place-items:center}}
.k{{font-family:'Barlow Condensed';font-weight:700;background:var(--carta);border:.3mm solid var(--linea);border-radius:1.2mm;padding:0 1.4mm;white-space:nowrap}}
.small{{font-size:8.8pt;color:var(--grigio)}}
"""


def img(nome, cap='', stretta=True):
    return f'<img src="file://{IMG / (nome + ".png")}" alt="">' + (f'<div class="cap">{cap}</div>' if cap else '')


def fig(nome, testo, cap=''):
    return f'<div class="fig stretta"><div>{img(nome, cap)}</div><div>{testo}</div></div>'


def duo(a, ca, b, cb):
    return f'<div class="duo"><div>{img(a, ca)}</div><div>{img(b, cb)}</div></div>'


CAMPO_SVG = """<svg class="campo" viewBox="0 0 680 1050" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
<g fill="none" stroke="#fff" stroke-width="4"><rect x="20" y="20" width="640" height="1010" rx="6"/><line x1="20" y1="525" x2="660" y2="525"/>
<circle cx="340" cy="525" r="92"/><rect x="138" y="20" width="404" height="165"/><rect x="248" y="20" width="184" height="55"/>
<rect x="138" y="865" width="404" height="165"/><rect x="248" y="975" width="184" height="55"/>
<path d="M 266 185 A 92 92 0 0 0 414 185"/><path d="M 266 865 A 92 92 0 0 1 414 865"/></g><circle cx="340" cy="525" r="6" fill="#fff"/></svg>"""


def copertina(titolo, sotto, per):
    return f"""<div class="cover">{CAMPO_SVG}<img class="stemma" src="file://{LOGO}" alt="">
    <div class="club">Academy Casatese Merate</div>
    <h1>{titolo}</h1><div class="sub">{sotto}</div>
    <div class="stripe"><i style="flex:6;background:#fff"></i><i style="flex:1;background:var(--oro)"></i><i style="flex:2;background:var(--rosso)"></i></div>
    <div class="scheda"><div><span>Per</span><b>{per}</b></div><div><span>Indirizzo dell'app</span><b>{SITO}</b></div>
    <div><span>Versione</span><b>{VERSIONE} · {DATA}</b></div><div><span>Accesso</span><b>Col tuo PIN personale</b></div>
    <p class="piena">Documento per lo staff dell'Academy Casatese Merate. Le schermate usano dati di esempio: nomi e numeri sono inventati.</p></div></div>"""


ACCESSO = f"""
<h3>Come si entra</h3>
<ol class="passi">
<li>Apri <b>{SITO}</b> dal browser del telefono, del tablet o del computer.</li>
<li>Scrivi il tuo <b>PIN personale</b> e tocca <span class="k">Entra</span>. Il PIN dice all'app chi sei e ti porta nella tua area.</li>
<li>Per uscire tocca <span class="k">Esci</span> in alto, accanto al tuo nome.</li>
</ol>
<div class="box blu"><b class="t">Niente accesso automatico</b>
Il PIN si rimette ogni volta che riapri l'app: quando chiudi il browser e comunque dopo 6 ore dall'ultimo accesso.
È voluto: se perdi il telefono, nessuno trova l'app già aperta.</div>
"""

REGOLE = """
<h3>Il tuo PIN</h3>
<ul>
<li>È <b>personale</b>: non si presta, non si scrive nei gruppi, non si manda per messaggio a nessuno.</li>
<li>Se pensi che qualcuno lo conosca, o lo hai dimenticato, chiedi all'amministratore un <b>PIN nuovo</b>: quello vecchio smette subito di funzionare.</li>
<li>Se sbagli il PIN più volte, o se qualcuno sta provando PIN a caso, l'app blocca gli ingressi per qualche minuto e scrive
"Troppi PIN sbagliati": aspetta e riprova.</li>
</ul>
<h3>I dati dei ragazzi</h3>
<ul>
<li>Nell'app ci sono dati di <b>minorenni</b>: nomi, date di nascita, valutazioni, presenze, contatti delle famiglie.
Si usano solo per l'attività del settore giovanile.</li>
<li><b>Non</b> si fanno screenshot da girare in chat, <b>non</b> si inoltrano elenchi, valutazioni o contatti a chi non è dello staff.</li>
<li>Nelle note si scrivono solo cose <b>tecniche e sportive</b>. Mai informazioni su salute, famiglia, scuola,
situazioni personali, e mai giudizi offensivi.</li>
<li>Su un telefono o computer usato da altri tocca sempre <span class="k">Esci</span> quando hai finito.
Tieni il telefono protetto da codice o impronta.</li>
</ul>
"""


def pagina(titolo, corpo):
    # Indice dopo la copertina: i titoli dei capitoli (h2)
    import re
    capitoli = re.findall(r'<h2>(.*?)</h2>', corpo)
    voci = ''.join(f'<li><b>{m.group(1)}</b>{m.group(2)}</li>' if (m := re.match(r'(\d+)\.\s*(.*)', c)) else f'<li>{c}</li>' for c in capitoli)
    indice = f'<div class="indice"><h2>Indice</h2><ol>{voci}</ol><p class="intro">Le schermate usano dati di esempio: nomi e numeri sono inventati.</p></div>'
    fine = corpo.find('</p></div></div>', corpo.find('class="scheda"')) + len('</p></div></div>')
    corpo = corpo[:fine] + indice + corpo[fine:]
    return f'<!doctype html><html lang="it"><head><meta charset="utf-8"><title>{titolo}</title><style>{CSS}</style></head><body>{corpo}</body></html>'


# ---------------------------------------------------------------- GENERALE
generale = copertina('Manuale generale', "Portale squadre e Scouting: come funziona l'app, chi fa cosa, regole per tutti",
                     'tutto lo staff: direttori, mister, scout') + f"""
<section>
<h2>1. Cos'è l'app</h2>
<p>È l'app del settore giovanile dell'Academy Casatese Merate. Un solo indirizzo, <b>{SITO}</b>, con due parti:</p>
<ul>
<li><b>Portale squadre</b>: la vita di ogni squadra. Rosa, calendario, convocazioni, formazione, calci piazzati,
foglio gara in PDF, presenze agli allenamenti, test atletici, statistiche.</li>
<li><b>Scouting</b>: i ragazzi osservati di altre società. Segnalazioni dal campo, valutazioni, eventi (open day, provini),
gare da andare a vedere, storico delle squadre in cui hanno giocato.</li>
</ul>
<p>Funziona dal browser, senza installare niente: telefono, tablet o computer. È pensata soprattutto per il telefono.</p>
{fig('s-pin', ACCESSO + '<p class="small">Chi ha più ruoli usa comunque un solo PIN, quello che gli ha dato l’amministratore.</p>', 'La pagina d’ingresso: solo il PIN.')}
</section>

<section>
<h2>2. Chi fa cosa</h2>
<table>
<tr><th style="width:18%">Ruolo</th><th style="width:25%">Dove entra</th><th>Cosa vede e cosa può fare</th></tr>
<tr><td><b>Amministratore</b></td><td>Portale, Società e Scouting</td><td>Gestisce tutto: squadre, rose, calendari, schemi, PIN di tutti,
stati dei giocatori osservati, gare da vedere, importazione delle distinte. In <b>Società → Storico modifiche</b> vede le versioni
precedenti di ogni scheda del Portale (30 giorni) e le <b>ripristina</b>.</td></tr>
<tr><td><b>Direttore</b></td><td>Portale (tutte le squadre), Società, Scouting</td><td><b>Squadre: vede tutto, non modifica.</b>
<b>Società e Scouting: modifica come l'amministratore</b> (squadre, mister, scout, direttori e PIN; segnala, valuta,
cambia gli stati, gestisce gare e doppioni).
Vede anche PIN e contatti delle famiglie.</td></tr>
<tr><td><b>Mister</b></td><td>Portale, solo la sua squadra</td><td>Prepara le partite (convocazioni, formazione, foglio gara), segna presenze,
test e tabellini, guarda le statistiche, segnala giocatori allo scouting e vede i giocatori osservati della sua annata
(con segnalazioni e valutazioni, senza contatti).</td></tr>
<tr><td><b>Preparatori dei portieri</b></td><td>Portale: la loro squadra e, in sola lettura, tutte le altre</td><td>Segnano
le presenze dei loro allenamenti; guardano rosa, calendario, gara, presenze e statistiche di ogni squadra senza modificarle;
segnalano giocatori allo scouting e in Scouting → Giocatori vedono i portieri osservati di tutte le annate. Ognuno ha le sue
categorie di portieri (in Società, "Portieri di: Under"): in Home e in Calendario → I miei portieri vede solo le partite di
quelle categorie; in Tutte le squadre vede tutto. Sotto ogni partita ci sono i portieri di quella squadra con lo stato
della convocazione (convocato, non convocato, infortunato… o "da convocare"); in I miei portieri il menu Portiere mostra
solo le partite di un portiere.</td></tr>
<tr><td><b>Responsabile organizzativo</b></td><td>Portale: Home, Calendario (con gli Avvisi)</td><td>Vede il calendario di tutte
le squadre (vista Giorno per campo: Merate, Cernusco, Trasferta), aggiunge e modifica amichevoli e tornei di ogni squadra (le partite
di campionato no: vale il calendario ufficiale), gestisce gli <b>eventi</b> della società (tornei organizzati, open day, feste,
riunioni) e pubblica <b>avvisi</b> per una o più squadre, che si leggono nell'app. Non vede rose né dati dei ragazzi.</td></tr>
<tr><td><b>Segreteria</b></td><td>Portale: Segreteria</td><td>Anagrafica dei tesserati, contatti dei genitori, certificati medici,
taglie, iscrizioni e quote; genera il PIN di ogni famiglia e stampa il foglio PIN da consegnare. Non vede lo Scouting né le squadre.</td></tr>
<tr><td><b>Famiglia</b></td><td>Portale, solo il proprio figlio</td><td>Vede le convocazioni del figlio (ora, ritrovo, campo) e risponde
"ci sarà / non ci sarà", il calendario della squadra, gli avvisi, l'anagrafica (aggiorna contatti e taglie), iscrizione, certificato e
quote. <b>Carica documenti</b>: visita medica, contabile del bonifico di una rata, altri documenti (foto o PDF).</td></tr>
<tr><td><b>Scout</b></td><td>Scouting</td><td>Segnala e valuta giocatori, registra open day e provini, sceglie le gare da vedere.
Non cambia lo stato dei giocatori e non vede il Portale.</td></tr>
</table>
<h3>Come è fatta ogni pagina</h3>
{fig('p-home', '''<ul>
<li><b>Intestazione blu</b>: il nome dell'app, il tuo ruolo (<span class="k">MISTER</span>, <span class="k">SCOUT</span>,
<span class="k">DIRETTORE</span>…), il tuo nome o la tua squadra, e <span class="k">Esci</span>.</li>
<li><b>Barra delle aree</b>, sempre in alto: Home, Calendario, Squadra, Scouting, Società.
Ognuno vede solo le aree che gli servono. Se non ci stanno tutte, la barra scorre di lato.</li>
<li><b>Schede</b>, sotto la striscia colorata: le parti dell'area aperta. In <b>Squadra</b>: Rosa, Allenamento, Partite,
Statistiche, Calendario; sotto, nella pagina, le loro schede (per esempio in Partite: Dati partita, Convocazioni, Formazione,
Piazzati (prima della partita), Foglio gara, Distinta (da stampare), Tabellini (dopo la partita); in Statistiche: Dashboard,
Allenamento, Partite).</li>
<li>Il <b>logo</b> in alto riporta sempre alla Home.</li>
</ul>''', 'La Home di un mister.')}
</section>

<section>
<h2>3. Regole per tutti e responsabilità</h2>
{REGOLE}
<h3>Dati giusti e aggiornati</h3>
<ul>
<li>L'app vale quanto i dati che contiene: inseriscili <b>subito</b> (lo stesso giorno) e <b>con cura</b>.</li>
<li>Se trovi un errore che non puoi correggere tu (un ragazzo nella squadra sbagliata, un nome scritto male,
una partita mancante) scrivilo all'amministratore.</li>
<li>Le modifiche si salvano da sole: in alto compare <i>Salvataggio…</i> e poi <i>Salvato</i>. Aspetta <i>Salvato</i>
prima di chiudere, soprattutto con una connessione debole.</li>
</ul>
<div class="box rosso"><b class="t">In sintesi</b>PIN personale e segreto · dati dei ragazzi solo nell'app, mai in chat ·
note solo tecniche · <span class="k">Esci</span> sui dispositivi condivisi · errori all'amministratore.</div>
</section>

<section>
<h2>4. Consigli pratici</h2>
<h3>Mettere l'app sulla schermata Home del telefono</h3>
<ul>
<li><b>iPhone (Safari)</b>: apri {SITO} → tasto <span class="k">Condividi</span> → <span class="k">Aggiungi alla schermata Home</span>.</li>
<li><b>Android (Chrome)</b>: apri {SITO} → menu <span class="k">⋮</span> → <span class="k">Aggiungi a schermata Home</span>.</li>
</ul>
<p>Compare un'icona come quella di un'app; il PIN si chiede comunque ogni volta.</p>
<h3>Problemi frequenti</h3>
<table>
<tr><th style="width:36%">Cosa succede</th><th>Cosa fare</th></tr>
<tr><td>"PIN non riconosciuto"</td><td>Controlla le cifre. Se è giusto, forse è stato rigenerato: chiedi il PIN nuovo all'amministratore.</td></tr>
<tr><td>"Troppi PIN sbagliati: riprova tra qualche minuto"</td><td>Protezione contro chi prova PIN a caso. Aspetta qualche minuto e riprova.</td></tr>
<tr><td>Mi chiede di nuovo il PIN</td><td>Normale: succede dopo 6 ore, se hai chiuso il browser, o se hai toccato Esci.</td></tr>
<tr><td>Vedo la versione vecchia o qualcosa non si muove</td><td>Ricarica la pagina (trascina giù sul telefono, o il tasto ricarica del browser).</td></tr>
<tr><td>"Senza rete: salvato sul telefono" (o la striscia gialla in alto)</td><td>Nessun problema: presenze, tabellini e le altre modifiche restano sul telefono e partono da sole quando torna la rete, anche se chiudi e riapri l'app. Non serve rifarle.</td></tr>
<tr><td>Senza rete premo Salva su una segnalazione o valutazione</td><td>Il modulo non parte e avvisa: quello che hai scritto è salvato sul telefono ("Bozza ritrovata" se riapri la pagina). Premi di nuovo Salva quando torna la rete.</td></tr>
<tr><td>Non vedo un'area o un pulsante</td><td>Probabilmente il tuo ruolo non lo prevede (vedi il capitolo 2 e il manuale del tuo ruolo).</td></tr>
</table>
</section>

<section>
<h2>5. Parole dell'app</h2>
<h3>Stati di un giocatore osservato (Scouting)</h3>
<table><tr><th style="width:22%">Stato</th><th>Significato</th></tr>
<tr><td>Nel database</td><td>È in archivio (per esempio da una distinta o dalle rose) ma nessuno l'ha ancora segnalato.</td></tr>
<tr><td>Segnalato</td><td>Qualcuno l'ha visto e segnalato: è da seguire.</td></tr>
<tr><td>Osservato</td><td>L'hanno valutato almeno 3 persone diverse: ci passa da solo alla terza valutazione.</td></tr>
<tr><td>Esito positivo</td><td>Adeguato alla nostra linea tecnica. Per inserirlo deve essere d'accordo anche lui con la famiglia.</td></tr>
<tr><td>Esito rimandato</td><td>Interessante: va rivisto prima di decidere.</td></tr>
<tr><td>Esito negativo</td><td>Non adeguato ora (il motivo va nelle note). Resta in archivio.</td></tr>
<tr><td>Inserito</td><td>Esito positivo e d'accordo ragazzo e famiglia: entra nell'Academy.</td></tr></table>
<p class="small">I giocatori dell'Academy Casatese Merate non compaiono nell'archivio: si vedono scegliendo
"Tutti i giocatori" (o l'Academy come società).</p>
<p class="small">Lo stato lo cambiano solo l'amministratore e i direttori.</p>
<h3>Categorie per anno di nascita (stagione 2026/27)</h3>
<table><tr><th>Nati nel</th><th>Categoria</th><th>Nati nel</th><th>Categoria</th></tr>
<tr><td>2008 – 2009</td><td>Juniores</td><td>2014 – 2015</td><td>Esordienti</td></tr>
<tr><td>2010</td><td>Under 17</td><td>2016 – 2017</td><td>Pulcini</td></tr>
<tr><td>2011</td><td>Under 16</td><td>2018 – 2019</td><td>Primi calci</td></tr>
<tr><td>2012</td><td>Under 15</td><td>2020 e dopo</td><td>Piccoli amici</td></tr>
<tr><td>2013</td><td>Under 14</td><td></td><td></td></tr></table>
<p class="small">La stagione cambia il 1° luglio: dal 1° luglio 2027 ogni annata sale di una categoria.</p>
<h3>Altre parole</h3>
<ul>
<li><b>Osservato / da distinta</b>: nello Scouting ci sono anche ragazzi letti dalle distinte di gara ma mai osservati
("da distinta"). Di norma sono nascosti; diventano "osservati" alla prima segnalazione.</li>
<li><b>Distinta</b>: l'elenco ufficiale dei giocatori di una partita. Serve a ricostruire squadre e partite di ogni ragazzo.</li>
<li><b>Tabellino</b>: minuti giocati, gol e cartellini di ogni giocatore in una partita.</li>
</ul>
<div class="box"><b class="t">I manuali per ruolo</b>Oltre a questo, c'è un manuale per i mister, uno per gli scout e uno per i direttori:
spiegano passo per passo le funzioni del proprio ruolo.</div>
</section>
"""

# ---------------------------------------------------------------- MISTER
mister = copertina('Manuale del mister', 'Portale squadre: preparare le partite, segnare presenze e tabellini, segnalare giocatori',
                   'i mister delle squadre dell’Academy') + f"""
<section>
<h2>1. In breve</h2>
<div class="si">
<div class="col"><h3>Puoi</h3><ul class="ok">
<li>Vedere la tua squadra: rosa, calendario, statistiche</li>
<li>Preparare le partite: dati della gara, convocazioni, formazione, calci piazzati</li>
<li>Scaricare il foglio gara e la convocazione in PDF</li>
<li>Scaricare in Excel rosa, presenze, statistiche delle partite e calendario (<span class="k">Scarica Excel</span>)</li>
<li>Segnare le presenze agli allenamenti e i test atletici</li>
<li>Compilare i tabellini: minuti, gol, gol subiti, cartellini</li>
<li>Aggiungere amichevoli al calendario</li>
<li>Segnalare un giocatore allo scouting</li></ul></div>
<div class="col"><h3>Non puoi</h3><ul class="ko">
<li>Aggiungere o togliere giocatori dalla rosa</li>
<li>Cambiare le partite ufficiali del calendario</li>
<li>Creare o cambiare gli schemi comuni dei calci piazzati</li>
<li>Vedere le altre squadre (solo il loro calendario)</li>
<li>Vedere l'archivio scouting delle altre annate e i contatti delle famiglie</li>
<li>Scaricare il report PDF delle statistiche (lo fa la società)</li></ul></div>
</div>
{ACCESSO}
<p>Con il tuo PIN entri direttamente nella tua squadra. Se avete più mister, ognuno ha il suo PIN.</p>
</section>

<section>
<h2>2. Le tue responsabilità</h2>
<ul>
<li><b>Prima di ogni partita</b>: dati della gara, convocazioni (con orario e luogo del ritrovo), formazione e panchina.
Scarica il foglio gara in PDF.</li>
<li><b>Dopo ogni allenamento</b>, lo stesso giorno: presenze, con il motivo delle assenze.</li>
<li><b>Dopo ogni partita</b>: tabellino con minuti e gol, e il risultato. Le statistiche della squadra si calcolano da qui.</li>
<li><b>Rosa</b>: se un ragazzo arriva, se ne va o ha il nome sbagliato, avvisa la società: la rosa la aggiorna l'amministratore.</li>
<li><b>Riservatezza</b>: presenze, infortuni e valutazioni dei ragazzi restano nell'app e nello staff.</li>
</ul>
{REGOLE}
</section>

<section>
<h2>3. Home e Calendario</h2>
{fig('p-home', '''<h3>Home</h3><ul>
<li><b>Prossima partita</b> in grande: giorno, ora, avversario, campo e quanti giorni mancano, con i pulsanti
<span class="k">Convocazioni</span>, <span class="k">Prepara la gara</span> e <span class="k">Campo</span> (Google Maps).
Se le famiglie hanno già risposto alla convocazione, vedi quanti ci saranno e quanti no.</li>
<li><b>Avvisi della società</b> (se ci sono): cambi campo o orario, eventi, comunicazioni per la tua squadra.</li>
<li><b>Da fare</b>: per prima cosa le presenze dell'allenamento di oggi, poi tabellini da compilare, gol da inserire,
portieri da segnare. Tocca una riga per andarci; se è tutto a posto compare una spunta verde.</li>
<li><b>Prossimi impegni</b> delle tre settimane dopo, e l'<b>ultimo risultato</b> con i marcatori.</li>
<li><b>Stagione</b> (vinte, pari, perse e gol) e <b>Presenze</b> (media e andamento mese per mese): tocca per le statistiche complete.</li>
</ul>''', 'Home')}
<h3>Calendario → La mia squadra</h3>
<p>Un solo elenco con le partite da giocare fino a fine stagione: campionato, altre partite e tornei, ognuna con la sua
<b>etichetta</b> (Campionato, Partita, Torneo). Colori come nei calendari Google: <b>verde acqua</b> in casa a Merate, <b>arancione</b>
in casa a Cernusco, <b>verde</b> in trasferta. <span class="k">+ Aggiungi partita</span>, in cima, ne aggiunge una: si apre subito
"Modifica partita" per data, ora, avversario e campo (lo stesso per cambiarla o eliminarla dopo). Le partite già giocate sono
nello <b>Storico</b>, in fondo alla pagina: toccalo per aprirlo.</p>
<h3>Calendario → Tutte le squadre</h3>
<p>Le partite da giocare di tutta la società, con la tua evidenziata; il menu <b>Categoria</b> ne mostra una sola. La vista
<b>Giorno</b> è come Google Calendar: una colonna per Merate, Cernusco e Trasferta, le ore in verticale, le frecce ‹ › per
cambiare giorno; tocca una partita per i dettagli. <b>Elenco</b> le mostra tutte in fila.</p>
</section>

<section>
<h2>4. Squadra → Partite: prepararla</h2>
<p><b>Attività di base</b> (da Under 13 in giù): in Partite ci sono solo <b>Convocazioni</b> e <b>Tabellini</b>, senza
foglio gara. Nelle convocazioni in alto trovi le <b>partite del weekend già proposte</b>: tocca <span class="k">Aggiungi alla
convocazione</span> (o aggiungile tutte). Nei tabellini segni chi era <b>presente</b> o <b>assente</b> a ogni partita
(c'è anche "Tutti presenti") e, se vuoi, il <b>risultato a tempi</b>: scegli 3, 4 o 5 tempi e scrivi per ognuno i gol nostri e
loro; sotto compare il riepilogo (tempi vinti, pari, persi e gol), che si vede anche nella colonna della partita; in alto, nella stessa scheda, le statistiche: partite giocate, presenti a partita, chi non è
mai stato presente.</p>
<h3>Dati partita</h3>
<p>I dati della gara per il foglio gara: avversario, data, ora, campo, categoria, capitano e vicecapitano, note. In alto ci sono
tutte le partite della squadra nel weekend: tocca <span class="k">Usa questa</span> su quella da preparare e i campi si
compilano da soli; quella scelta è segnata "✓ Nel foglio gara".</p>
{fig('p-convocazioni', '''<h3>Convocazioni</h3><ol class="passi">
<li><b>Attività di base</b> (da Under 13 in giù): la convocazione PDF è
quella della società (data, indirizzo, orari, avversario, <b>mister presente</b>, note e l'elenco dei convocati).
Nelle convocazioni puoi mettere <b>da 1 a 4 partite</b> (+ Aggiungi partita), ognuna scelta dal calendario o scritta a mano,
con i <b>suoi convocati</b>: tocchi i nomi, e chi è già in un'altra partita è segnato. Il PDF è un unico foglio
orizzontale, come quello della società: una colonna per partita, con i dati e i soli convocati (senza motivi per gli altri).</li>
<li><b>Campo di gioco</b>: è scritto esattamente come nel calendario ufficiale o nell'ultimo comunicato, con l'indirizzo,
e si aggiorna da solo se un comunicato lo cambia. Il segnaposto 📍 apre Google Maps; con 📌 puoi salvare il punto esatto
del cancello, che vale per tutte le partite su quel campo.</li>
<li><b>Ritrovo</b>: l'orario si propone da solo; scrivi l'indirizzo solo se vi trovate altrove (es. al centro sportivo per
partire insieme). Se lo lasci vuoto, nella convocazione c'è "Al campo di gioco".</li>
<li>Per ogni giocatore scegli lo stato: <span class="k">CON</span> convocato, <span class="k">NC</span> non convocato,
<span class="k">INF</span> infortunato, <span class="k">SQL</span> squalificato, <span class="k">ND</span> non disponibile.</li>
<li>In fondo tocca <span class="k">Scarica convocazione PDF</span>: il foglio da mandare a ragazzi e famiglie.</li></ol>''', 'Convocazioni')}
</section>

<section>
<h2>5. Squadra → Partite: la formazione</h2>
{duo('p-formazione-campo', 'Il campo: modulo, posizioni, × per togliere', 'p-formazione-elenco', 'Tocchi una posizione: scegli chi metterci')}
<p>La pagina è fatta come il foglio gara PDF, da sinistra a destra: <b>Titolari e Panchina</b>, il <b>campo</b>,
e a destra <b>modulo, capitano, vice, calci piazzati e note</b>. Dal telefono le tre parti sono una sotto l'altra.</p>
<ol class="passi">
<li>A destra scegli il <b>modulo</b> (per esempio 1-4-2-3-1).</li>
<li><b>Tocca una posizione sul campo</b>: si apre l'elenco dei giocatori; tocca chi vuoi mettere lì.
Se la posizione è occupata puoi anche <span class="k">Togli dal campo</span>.</li>
<li>In alternativa, nei <b>Disponibili</b> tocca un giocatore per metterlo nella <b>prossima posizione libera</b>, oppure
<b>trascinalo</b> su una posizione; <span class="k">Panchina</span> lo mette in panchina.</li>
<li>La <span class="k">×</span> toglie un giocatore dal campo o dalla panchina.</li>
<li>A destra scegli <b>capitano</b> e <b>vice</b>, e scrivi le <b>note</b> per la squadra: finiscono nel PDF.</li>
<li>Trascinando la casella di una posizione la sposti leggermente sul campo; <span class="k">Ripristina posizioni modulo</span> la rimette a posto.</li></ol>
<p class="small">Il numero grande è quello della partita; il numerino in alto è il ruolo usato negli schemi dei calci piazzati.</p>
</section>

<section>
<h2>6. Squadra → Partite: piazzati e foglio gara</h2>
{fig('p-piazzati', '''<h3>Piazzati</h3>
<p>Due gruppi: <b>I miei schemi</b> (della tua squadra, i preferiti ★ in cima) e i <b>Modelli della società</b> (li cura la società,
li vedono tutte le squadre). In alto il filtro: Tutti, A favore, A sfavore, Scelti.</p><ul>
<li>Tocca uno schema per <b>sceglierlo per la partita</b>: va nel foglio gara.</li>
<li>Aprendo uno schema vedi <b>la sua pagina del foglio gara</b>, uguale al PDF: intestazione con la partita, campo, indicazioni
sotto il campo, riquadro Compiti. Si scrive direttamente sul foglio.</li>
<li>Su un <b>modello della società</b> puoi cambiare le <b>indicazioni</b> sotto il campo e i <b>nomi dei compiti</b>: valgono solo per
questa partita e finiscono nel PDF, il modello resta com'è. Per spostare pedine e frecce, o tenere le modifiche anche per le
prossime partite, tocca <span class="k">Usa come modello</span>: ne fai una copia tua, già scelta per la partita. Oppure
<span class="k">+ Nuovo schema vuoto</span>.</li>
<li><b>Nei tuoi schemi</b>: a sinistra il campo, a destra il riquadro <b>Compiti</b>. In alto nome e <b>comando</b> (la
chiamata, es. "Braccia alzate"); nel riquadro <b>A favore / A sfavore</b>. Con <b>✋ Sposta</b> trascini pedine e pallone;
Freccia, Tratteggiata, Linea e Testo per disegnare (freccia piena = palla, tratteggiata = movimento); tocca un segno per
cancellarlo. Sotto il campo la nota.</li>
<li><b>Nel riquadro Compiti</b>: tocca il <b>nome di un compito</b> per rinominarlo, il <b>+</b> accanto per aggiungere una pedina a
quel compito, <span class="k">+ Nuovo compito</span> per crearne un altro. Ogni riga è una pedina: scegli il <b>giocatore</b> (di
partenza chi gioca con quel numero in formazione; vale per la partita). <b>Tocca una pedina</b> (sul campo o nella riga) per
cambiarne numero, compito ed etichetta, o toglierla; si illumina anche sul campo. Se lo stesso giocatore è in due pedine compare
un avviso rosso.</li>
<li>La ★ mette o toglie uno schema dai preferiti. Tutto si salva da solo.</li></ul>''', 'Piazzati')}
{fig('p-pdf', '''<h3>Foglio gara PDF</h3>
<p>Anteprima e <span class="k">Scarica PDF</span>: prima pagina con distinta e formazione, poi una pagina per ogni schema selezionato.
La <b>convocazione</b> si scarica invece dalla scheda Convocazioni.</p>
<p>Se hai cambiato qualcosa, tocca <span class="k">Aggiorna anteprima</span>.</p>''', 'Foglio gara PDF')}
</section>

<section>
<h2>7. Squadra → Allenamento</h2>
{fig('p-presenze', '''<h3>Presenze</h3><ol class="passi">
<li>Tocca <span class="k">+ Allenamento di oggi</span> (o apri un'altra data).</li>
<li>Per ogni ragazzo: <span class="k">Presente</span> o <span class="k">Assente</span>; se assente, scegli il <b>motivo</b>
(malattia, infortunio, scuola / studio, motivi familiari, ingiustificata). <span class="k">Tutti presenti</span> li segna tutti in un colpo.</li>
<li>Se serve, una nota sulla seduta (solo tecnica).</li></ol>
<p>Gli infortuni non abbassano la percentuale di presenza del ragazzo.</p>
<p><b>Preparatori dei portieri</b>: nella vostra squadra i portieri sono divisi per preparatore, secondo le categorie che ognuno
ha in Società ("Portieri di: Under"). Accanto al nome c'è la categoria (es. U15). Entrando vedete i vostri portieri:
<span class="k">Tutti presenti</span> e un allenamento nuovo riguardano solo loro. <span class="k">Tutti i portieri</span> mostra
tutti i gruppi; in "Altri portieri" chi non è in nessuna categoria o ha il nome scritto diverso nella rosa della sua squadra.</p>
<h3>Test atletici (solo Under 15)</h3>
<p><span class="k">+ Nuovo test</span>, poi i tempi di ognuno come <b>minuti:secondi</b> (es. 12:51). Una parola diversa
(es. "non svolto") resta come nota.</p>
<h3>Statistiche (scheda Statistiche → Allenamento)</h3>
<p>Percentuali di presenza per giocatore e per mese, risultati dei test. In rosso chi è sotto il 75%. La <b>Dashboard</b>
(Squadra → Statistiche) riassume tutto con i grafici; sotto ogni sigla (TAR, TMR, SMM…) c'è la sua spiegazione.</p>
<h3>I miei allenamenti 🚧</h3>
<p>In arrivo: qui potrai preparare e ritrovare le tue sedute (esercizi, obiettivi, durata, materiale). Per ora la scheda
mostra "Lavori in corso".</p>''', 'Presenze')}
</section>

<section>
<h2>8. Squadra → Partite: tabellini e statistiche</h2>
<h3>Moduli da stampare</h3>
<p>Su carta intestata:</p><ul>
<li><b>Distinta</b> (Squadra → Partite → Distinta), per tornei e amichevoli omologate: tipo, manifestazione, data e luogo; spunta i giocatori (con numero, data di
nascita e tessera: quello che lasci vuoto si scrive a penna), allenatore e dirigenti con il documento, note.
<span class="k">Scarica distinta PDF</span> prepara il foglio con le righe per le firme.</li>
<li><b>Programma gare</b> (Calendario → Programma gare): scegli il periodo (<b>dal</b>–<b>al</b>) e, se vuoi, le squadre; vedi partite ed eventi; il PDF è in ordine di <b>categoria</b> (dalla più grande) e, nella stessa categoria, di giorno e ora; con <span class="k">Scarica programma PDF</span> lo stampi.</li>
<li><b>Comunicazione</b> (Calendario → Avvisi): un modello (o testo libero), titolo, testo e firma; <span class="k">Scarica PDF</span>.</li></ul>
<p><b>Archivio</b>: ogni PDF che scarichi dal Portale (convocazioni, fogli gara, report, distinte, programmi, comunicazioni) ne lascia
una copia in <b>Società → Archivio documenti</b>, con chi l'ha scaricato e quando. Lo vedono admin e direttori.</p>
<p><b>Nessuna modifica persa.</b> Se due persone cambiano la stessa scheda nello stesso momento (per esempio il mister segna le
presenze mentre un direttore aggiorna il calendario), il Portale unisce le due modifiche: restano tutte e due. Solo se cambiano
proprio la stessa cosa vale l'ultima. In basso compare "Salvato, insieme alle modifiche di un altro".</p>
<p>In Convocazioni (accanto a <span class="k">Scarica convocazione PDF</span>), Distinta e Foglio gara la casella <b>Mostra la categoria nel PDF</b> decide se stampare la
categoria (es. "Under 14 - Provinciale").</p>
<h3>Tabellini</h3><ol class="passi">
<li>Nella tabella dei tabellini tocca una partita.</li>
<li>Segna chi ha giocato, i <b>minuti</b>, i <b>gol</b>, i cartellini, e i <b>gol subiti</b> dei portieri.</li>
<li>Inserisci il risultato.</li></ol>
<p><span class="k">+ Amichevole</span> aggiunge un'amichevole: finisce anche nel calendario.</p>
<h3>Statistiche (Squadra → Statistiche → Partite)</h3>
<p>Partite giocate, gol fatti e subiti, marcatori, e per ogni giocatore presenze e minuti.</p>
<h3>Campi (dal 📌 nelle Convocazioni)</h3>
<p>I campi delle vostre partite: con 📌 salvi il punto esatto del cancello, così il link di Google Maps nelle convocazioni
porta dritto lì.</p>
</section>

<section>
<h2>9. Squadra → Rosa</h2>
{fig('p-rosa', '''<h3>Squadra → Rosa</h3>
<p>L'elenco dei giocatori, inserito dalla società. Il numero è quello della prossima partita, che assegni in Formazione.
Il <b>ruolo</b> di ogni giocatore lo scegli tu: da Under 13 in su portiere, difensore, centrocampista o attaccante;
da Under 12 in giù portiere o giocatore di movimento. Per i portieri potrai inserire i gol subiti nelle partite.</p>
<p>Tocca il guanto <b>🧤</b> per segnare chi fa il portiere: servono per i gol subiti nelle statistiche.</p>''', 'Rosa')}

</section>

<section>
<h2>10. Scouting: segnalare un giocatore</h2>
{fig('p-segnala', '''<p>Hai visto un ragazzo interessante (in una partita contro di voi, a un torneo…)? Mandalo allo scouting del club
dall'area <b>Scouting</b>.</p><p>Il modulo è diviso in 5 blocchi numerati, da compilare dall'alto in basso. Servono solo le voci con *; ogni scelta si
toglie toccandola di nuovo. Il pulsante <span class="k">Invia allo scouting</span> resta sempre in fondo allo schermo.</p><ol class="passi">
<li><b>Chi è</b>: annata (obbligatoria), <b>portiere o giocatore di movimento</b> (obbligatorio; se è di movimento, la linea: prima = difesa, seconda = centrocampo, terza = attacco), cognome e nome oppure <b>come riconoscerlo</b> ("N.8, biondo, mancino"), società.</li>
<li><b>Prima impressione</b>: positiva, da rivedere o negativa, e il piede preferito.</li>
<li><b>Cosa hai visto</b> (obbligatorio): la parte più importante, solo aspetti tecnici e sportivi.</li>
<li><b>Voti</b> da 1 a 5, solo su quello che hai visto: Tecnica, Motoria, Tattica, Mentale (con <b>+ Aggiungi una nota</b>), statura, forza.</li>
<li><b>Dove e quando</b>: partita o occasione, data.</li></ol>
<p>La segnalazione arriva firmata con il tuo nome e la tua squadra.</p>
<div class="box"><b class="t">È già segnalato? Lo valuti</b>Mentre scrivi annata e cognome, se il ragazzo è già nell'archivio dello scouting si apre la finestra
<b>"Già in lista. Vuoi valutare?"</b>: tocca <span class="k">Sì, valuta</span> (o "No, è un altro giocatore"). Anche inviando, se è
già in lista la segnalazione non si salva: si apre la <b>Valutazione</b>. Se vuoi dai i voti del dettaglio (spunti, guida della palla, ricezione…), scegli il
giudizio finale (Da prendere, Da rivedere, Non a livello) e tocca <span class="k">Salva valutazione</span>. Quello che avevi scritto
è già nel commento finale. La valutazione arriva firmata con il tuo nome e la tua squadra.</div>
<h3>Scouting → Giocatori</h3>
<p>I giocatori osservati dallo scouting della <b>tua annata</b> (non quelli dell'Academy), divisi per stato, ognuno col suo
colore: Segnalato, Osservato, Esito positivo, rimandato, negativo, Inserito. Ogni stato si può sempre cambiare. In alto cerchi per nome o società e filtri per
stato e ruolo. Ogni riga dice ruolo, società, quante segnalazioni e valutazioni ha, l'ultimo giudizio e, a destra, la media
dei voti per area più recenti. Sotto il nome, in colonne, gli ultimi voti per area, dati in una segnalazione o in una vecchia valutazione (<b>TEC</b> tecnica, <b>MOT</b> motoria,
<b>TAT</b> tattica, <b>MEN</b> mentale: blu i voti alti, oro il 3, arancione e rosso i bassi) e <b>SEGN</b>, quante
segnalazioni ha. Tocca un nome per vedere le 4 aree come barre da 1 a 5 e le segnalazioni; col pulsante
<span class="k">Valuta</span> lo valuti tu (stesso modulo della valutazione). I contatti delle famiglie non si vedono.</p>''', 'Segnala un giocatore')}
</section>
"""

# ---------------------------------------------------------------- SCOUT
scout = copertina('Manuale dello scout', 'Scouting: segnalare, valutare, seguire i giocatori e le gare da vedere',
                  'gli scout dell’Academy') + f"""
<section>
<h2>1. In breve</h2>
<div class="si">
<div class="col"><h3>Puoi</h3><ul class="ok">
<li>Segnalare un giocatore, anche senza sapere il nome</li>
<li>Dare i voti per area (Tecnica, Motoria, Tattica, Mentale) già nella segnalazione, e poi valutarlo</li>
<li>Registrare open day, provini e allenamenti di prova, con presenza ed esito</li>
<li>Consultare l'archivio, le schede, lo storico delle squadre e le prossime gare di ogni ragazzo</li>
<li>Scegliere le gare da vedere con "Ci vado io"</li>
<li>Prendere un <b>incarico</b> dalla Home ("Me ne occupo io"), o trovare quelli che ti hanno affidato, e segnarlo fatto con com'è andata</li>
<li>Aggiungere i contatti della famiglia</li>
<li>Modificare i dati dei giocatori che hai segnalato tu</li></ul></div>
<div class="col"><h3>Non puoi</h3><ul class="ko">
<li>Cambiare lo stato di un giocatore (segnalato, osservato, esito, inserito)</li>
<li>Inserire o modificare le gare e le squadre da seguire</li>
<li>Vedere i contatti inseriti da altri</li>
<li>Unire schede doppie</li>
<li>Entrare nel Portale squadre</li>
<li>Vedere i PIN</li></ul></div>
</div>
{ACCESSO}
<p>Con il tuo PIN entri nello Scouting. Le schede in alto sono: <b>Home</b>, <b>Giocatori</b>, <b>Gare</b>, <b>Segnala</b>, <b>Attività</b>.</p>
</section>

<section>
<h2>2. Le tue responsabilità</h2>
<ul>
<li><b>Segnalazioni fedeli</b>: scrivi quello che hai visto, con aspetti tecnici e sportivi. Niente giudizi offensivi,
niente informazioni personali (salute, famiglia, scuola).</li>
<li><b>Segnala subito</b>, lo stesso giorno: il ricordo è fresco e il resto del team lo sa.</li>
<li><b>Niente doppioni</b>: prima di segnalare cerca il ragazzo in <b>Giocatori</b>; se c'è, usa
<span class="k">Aggiungi segnalazione</span> dalla sua scheda. L'app riconosce comunque stesso cognome, nome e annata.</li>
<li><b>"Ci vado io"</b>: usalo per le gare a cui vai, così non si va in due allo stesso campo, e toglilo se cambi idea.</li>
<li><b>Contatti delle famiglie</b>: si possono condividere tra lo staff dell'Academy (mister, scout, direttori), che è tutto
tesserato. Per contattare società, famiglie o ragazzi segui le indicazioni del direttore e della società.</li>
<li><b>Discrezione</b> a bordo campo e fuori: le valutazioni restano nello staff.</li>
</ul>
{REGOLE}
</section>

<section>
<h2>3. Segnalare un giocatore</h2>
{fig('s-segnala', '''<p>Dalla scheda <b>Segnala</b> (o dal riquadro blu in Home):</p><ol class="passi">
<li><b>Chi è</b>: annata (obbligatoria), <b>portiere o giocatore di movimento</b> (obbligatorio; se è di movimento, la linea: prima = difesa, seconda = centrocampo, terza = attacco), cognome e nome; se non li sai, <b>Come riconoscerlo</b> ("N.8, biondo, mancino");
società (scegli dall'elenco mentre scrivi; se è nuova, la aggiungo io).</li>
<li><b>Prima impressione</b> (positiva, da rivedere, negativa) e <b>piede preferito</b>: due tocchi.</li>
<li><b>Cosa hai visto</b>: il cuore della segnalazione.</li>
<li><b>Voti</b> (facoltativi) da 1 a 5: Tecnica, Motoria, Tattica, Mentale (ognuna con <b>+ Aggiungi una nota</b>), statura, forza.
Vota solo quello che hai visto; una scelta si toglie toccandola di nuovo.</li>
<li><b>Dove e quando</b>: partita o occasione, data.</li>
<li><span class="k">Salva segnalazione</span> (sempre in fondo allo schermo): si apre la scheda del giocatore.</li></ol>
<div class="box"><b class="t">È già in lista? Si valuta</b>Mentre scrivi annata e cognome si apre la finestra <b>"Già in lista. Vuoi
valutare?"</b> con i ragazzi già in archivio (anche con il cognome scritto un po' diverso): <span class="k">Sì, valuta</span> apre subito la
<b>Valutazione</b> (voti facoltativi in 5 aree: tecnica, tattica, fisico, mentale, extra; in fondo il giudizio), con quello che avevi scritto già nel commento. Anche inviando, se è lo stesso
(cognome, nome e annata) la segnalazione <b>non</b> si salva e si apre la valutazione. Nella scheda di un giocatore già in lista c'è
solo <span class="k">Valuta</span>.</div>''', 'Segnala un giocatore')}
</section>

<section>
<h2>4. La scheda del giocatore</h2>
{fig('s-scheda', '''<ul>
<li><b>In alto</b>: nome, stato, annata, ruolo, piede, società e <b>squadra</b> (società · categoria, es. "Under 14 - 2013").
<span class="k">Aggiungi segnalazione</span> e <span class="k">Valuta</span>.</li>
<li><b>Voti per area</b>: le medie delle 4 aree, da tutte le segnalazioni e valutazioni che le hanno; sotto, lo <b>storico valutazioni</b>: una riga per valutazione (data, chi, i 4 voti,
media e giudizio) con ↑ o ↓ se è meglio o peggio della precedente; tocca la riga per note e commento.</li>
<li><b>Prossime gare</b>: le partite della sua squadra caricate in Gare, con ora, campo e mappa, e "Ci vado io".</li>
<li><b>Carriera</b>: le società in cui ha giocato, stagione per stagione. Ogni cambio di società resta scritto (chi, da quando,
nota); accanto ci sono le stagioni lette dalle distinte. <span class="k">Cambia società</span> (admin, direttori e scout, anche sui
giocatori segnalati da altri) e <span class="k">Aggiungi una stagione passata</span>. La società non si cambia più da Modifica dati.</li>
<li><b>Squadre e partite</b>: lo storico dalle distinte. Il <b>percorso</b> tra le società e, per ogni stagione, squadra,
categoria, partite, numero di maglia.</li>
<li><b>Eventi</b>: open day, provini, allenamenti di prova.</li>
<li><b>Storia</b>: tutte le segnalazioni, valutazioni e cambi di stato, con autore e data.</li>
<li><b>Contatti</b> (vedi i tuoi) e <b>Modifica dati</b> (solo per i giocatori che hai segnalato tu). Il segno verde
<b>☎ Contatto presente</b> (accanto al nome, anche nell'elenco Giocatori e nelle Necessità) dice che nel database c'è già un
contatto della famiglia, anche se non lo vedi: chiedilo a un direttore invece di cercarlo di nuovo.</li></ul>''', 'Scheda del giocatore')}
</section>

<section>
<h2>5. Valutare ed eventi</h2>
{fig('s-valuta', '''<h3>Valutazione</h3><ol class="passi">
<li>Dalla scheda tocca <span class="k">Valuta</span>.</li>
<li><b>1 · Partita e ruolo</b>: partita o occasione, data e ruolo, che cambia con l'età: fino ai <b>Pulcini</b> solo portiere o
di movimento; <b>Esordienti</b> (Under 12-13) portiere o la linea (prima, seconda, terza: obbligatoria); dall'<b>Under 14</b> il
<b>ruolo preciso</b> dall'elenco (portiere, difensore centrale, terzino, esterno di centrocampo, mediano, mezzala, trequartista, ala,
punta). Aggiorna anche il ruolo nella scheda del giocatore.</li>
<li><b>2–6 · Le 5 aree</b>, voti da 1 a 5 tutti facoltativi (vota solo quello che hai visto): <b>Tecnica</b> (guida della palla, ricezione, trasmissione, calciata, colpo di testa), <b>Tattica</b> (marcamento, smarcamento,
contrasto, dribbling), <b>Fisico</b> (velocità, accelerazione, agilità, reattività), <b>Mentale</b> (spunti, estro e coraggio; concentrazione,
motivazione), <b>Extra</b> (famiglia, potenziale, livello attuale).</li>
<li><b>7 · Giudizio</b> (obbligatorio, in fondo): da prendere (blu), da rivedere (oro), non a livello (rosso), e <b>il tuo giudizio</b>
scritto con parole tue.</li>
<li><span class="k">Salva valutazione</span>.</li></ol>
<h3>Eventi</h3>
<p>Nella scheda, sezione <b>Eventi</b> → <span class="k">Aggiungi evento</span>: tipo (open day, provino, allenamento di prova,
altro), data, presenza, esito, note. Dopo l'evento aggiorna presenza ed esito con <b>Aggiorna presenza ed esito</b>.</p>''', 'Valutazione')}
</section>

<section>
<h2>Calendario delle nostre squadre</h2>
<p>Nella scheda <b>Calendario</b> ci sono le partite di tutte le squadre dell'Academy, di tutte le annate, con i colori del
app: <b>verde acqua</b> in casa a Merate, <b>arancione</b> in casa a Cernusco, <b>verde</b> in trasferta. Scegli il periodo (questo weekend,
prossime 2 settimane, fino a fine stagione) e, se vuoi, una sola squadra. Per ogni partita: ora, avversario, campionato o
amichevole, campo.</p>
</section>

<section>
<h2>Necessità della società</h2>
<p>Nella scheda <b>Necessità</b> ci sono i giocatori che la società sta cercando (annata, ruolo, piede, priorità e note),
scritti dai direttori. Sotto ogni richiesta vedi i ragazzi già in archivio che rientrano, con stato, media dell'ultima
valutazione e giudizio: tocca un nome per aprire la scheda. "Da verificare" sono quelli con ruolo o piede non ancora
indicato: se li vedi, completali. Se nessuno rientra, è lì che serve cercare sui campi.</p>
</section>

<section>
<h2>6. Gare da vedere</h2>
{fig('s-gare', '''<ul>
<li>Le gare dei prossimi giorni, dalla più vicina, con la <b>distanza</b> da metà strada tra Merate e Cernusco Lombardone
(in linea d'aria, con il 10% di tolleranza sul limite di km).</li>
<li><b>Filtri</b>: entro quanti km, periodo (7 giorni o tutte), <b>AdB</b> (Esordienti, Pulcini, Primi calci, Piccoli amici)
e/o <b>Agonistica</b> (dall'Under 14), <b>anno di nascita</b> (dal 2008 al 2021: le gare della categoria in cui gioca quell'annata).
Le squadre seguite e i giocatori segnalati restano evidenziati dentro ogni gara.</li>
<li><b>Società</b>: scrivi il nome (o sceglilo dai suggerimenti) e premi Invio: solo le gare di quella società, in casa o in trasferta.</li>
<li><b>Stellina ☆</b>: tocca la stellina su una gara o su un giocatore per metterlo nei tuoi <b>preferiti</b> (★). Con <b>★ Solo preferite</b>
(Gare) o "Quali giocatori → ★ Solo i miei preferiti" (Giocatori) vedi solo quelli. Ognuno vede i suoi.</li>
<li><b>Incarichi</b>: restano aperti finché non li chiudi, al massimo fino a 72 ore dopo l'inizio dell'evento.</li>
<li><b>Aggiungi partita</b>: una partita vista (anche fuori calendario: tornei, amichevoli, Esordienti, Pulcini) con le
<b>foto o i PDF delle distinte</b> e i <b>giocatori visti</b>, tutto in una pagina. Se la partita è già nei calendari si usa
quella. Le distinte restano private: le vedono admin, direttori e chi le ha caricate (📎 sulla gara).</li>
<li><b>Ogni partita si apre</b> toccandone il nome (in Gare, in Home "Le mie gare", in Attività): dati, chi ci va, giocatori
visti in quella partita e distinte. Chi l'ha inserita e i direttori possono <b>modificarla</b>, aggiungere o togliere distinte
ed eliminarla (solo quelle inserite a mano).</li>
<li>Le gare vengono dai <b>calendari ufficiali</b> dei gironi. <b>Da calendario</b> = data, ora e campo previsti, ancora da
verificare; <b>Confermata · C.U. n. …</b> = confermata dal comunicato ufficiale; <b>Variata · C.U. n. …</b> = data, ora o campo
cambiati dal comunicato. Controlla sempre prima di partire.</li>
<li>Sotto ogni partita i <b>giocatori segnalati</b> che giocano in quelle squadre: tocca il nome per la scheda.</li>
<li>Bordo giallo = gara interessante <b>senza nessun osservatore</b>.</li>
<li><span class="k">Ci vado io</span> ti segna sulla gara; <span class="k">Non ci vado più</span> ti toglie.
Le tue gare le ritrovi in Home, in <b>Le mie gare</b>.</li></ul>''', 'Gare da vedere')}
<h2 style="margin-top:6mm">7. Archivio giocatori</h2>
<ul>
<li><b>Giocatori</b>: cerca per nome o descrizione, filtra per annata, ruolo, stato, società.
Di norma vedi i ragazzi <b>osservati</b>; con "Anche solo da distinta" vedi anche quelli letti dalle distinte e mai osservati.</li>
<li><b>Schede</b> in cima all'elenco: Tutti · Segnalati · Osservati · Esito (con positivo, rimandato, negativo) · Inseriti · Nel database, ognuna col numero dei ragazzi. Gli altri filtri valgono dentro la scheda scelta.</li>
<li><b>Attività</b>: le tue prossime gare ("Ci vado io"), le tue segnalazioni e valutazioni, con i totali. Il PIN, se lo perdi, lo rigenerano l'amministratore o un direttore.</li>
</ul>
</section>
"""

# ---------------------------------------------------------------- DIRETTORI
direttori = copertina('Manuale del direttore', 'Squadre in lettura, Società e Scouting completi.',
                      'i direttori dell’Academy') + f"""
<section>
<h2>1. In breve</h2>
<div class="box blu"><b class="t">Squadre in lettura, Società e Scouting completi</b>
Nelle squadre controlli: vedi rose, partite, presenze e statistiche di tutte, ma le modifiche le fanno i mister e
l'amministratore. In <b>Società</b> e nello <b>Scouting</b> invece lavori come l'amministratore: squadre, mister,
scout, direttori e PIN; segnalazioni, valutazioni, stati, gare e schede doppie. Vedi anche i contatti delle famiglie.</div>
<div class="si">
<div class="col"><h3>Puoi</h3><ul class="ok">
<li>Aprire il Portale di <b>tutte le squadre</b>: rosa, calendario, convocazioni, formazioni, presenze, statistiche (anche in Excel, <span class="k">Scarica Excel</span>)</li>
<li>In <b>Società</b>: creare e togliere squadre, aggiungere mister, scout e direttori, generare e rigenerare i PIN</li>
<li>Nella <b>Home</b>: il weekend di tutte le squadre, i risultati degli ultimi giorni, cosa c'è da sistemare (tabellini,
presenze basse), lo scouting della settimana e la stagione squadra per squadra; <span class="k">Apri ›</span> per la Home di una squadra</li>
<li>Se sei <b>anche mister</b>: entri col tuo PIN da direttore e in alto scegli <span class="k">Direttore</span> o
<span class="k">Mister …</span>; da mister vedi e modifichi solo la tua squadra, come ogni mister</li>
<li>Nello <b>Scouting</b>: segnalare, valutare, cambiare gli stati, gestire gare e squadre seguite,
unire le schede doppie, segnarti su una gara ("Ci vado io")</li>
<li>Importare un <b>calendario ufficiale</b> (PDF della LND o della delegazione) in Calendario → Tutte le squadre</li></ul></div>
<div class="col"><h3>Non puoi</h3><ul class="ko">
<li>Modificare rose, calendari, partite, convocazioni, formazioni, presenze, test e schemi delle squadre</li></ul></div>
</div>
{ACCESSO}
<p>Con il tuo PIN entri nel <b>Portale</b>; lo Scouting è l'area <b>Scouting</b> nella barra in alto.
Nelle schede delle squadre i campi si leggono ma non si scrivono (in alto: DIRETTORE · SOLA LETTURA);
in Società e nello Scouting hai gli stessi pulsanti dell'amministratore.</p>
</section>

<section>
<h2>2. Le tue responsabilità</h2>
<ul>
<li><b>Riservatezza</b>: i PIN non si comunicano a nessuno, se non alla persona interessata, quando la aggiungi o le
rigeneri il PIN. I contatti delle famiglie si condividono solo all'interno dello staff dell'Academy.</li>
<li><b>Controllo</b>: verifica che le squadre tengano aggiornati convocazioni, presenze e tabellini, e che lo scouting segnali
e valuti con regolarità e qualità.</li>
<li><b>Decisioni</b>: le decisioni sui giocatori osservati (contattare, invitare, inserire, chiudere) le registri tu
nello Scouting, cambiando lo stato; quelle sulle squadre comunicale all'amministratore.</li>
<li><b>Sicurezza</b>: se sospetti che un PIN sia finito in mani sbagliate, avvisa subito l'amministratore.</li>
</ul>
{REGOLE}
</section>

<section>
<h2>3. Il Portale delle squadre</h2>
{fig('p-home', '''<ol class="passi">
<li>In alto, accanto a <b>Squadra</b>, scegli la squadra dal menu.</li>
<li>Usa le aree come un mister: <b>Home</b> (weekend, da fare, riepilogo), <b>Calendario</b> (la squadra, tutte le squadre),
<b>Squadra</b>: Rosa, Allenamento (presenze, test, statistiche) e Partite (dati partita, convocazioni, formazione, piazzati,
foglio gara, tabellini, statistiche, campi).</li>
<li>La sezione <b>Da fare</b> in Home mostra cosa manca: tabellini da compilare, gol da inserire.</li></ol>
<p><b>Anteprima</b>: con "Guarda l'app come" vedi esattamente cosa vede il mister di una squadra.</p>''', 'La Home di una squadra')}
<h3>Calendario ufficiale (PDF)</h3>
<p>In Calendario → Tutte le squadre tocca <span class="k">Importa calendario ufficiale (PDF)</span> e scegli il PDF del campionato
(quello con le giornate e l'elenco dei campi). Controlla la <b>categoria</b> proposta (es. "Under 15 Provinciali Lecco"): dà il nome
alle gare e sceglie la nostra squadra. L'anteprima mostra i gironi, quante gare sono nuove, le nostre partite e i nomi da
controllare; poi <span class="k">Importa</span>. Le gare vanno nello Scouting e le nostre partite nel calendario della squadra, con
data, ora e campo ufficiali. Le gare già confermate o variate da un comunicato non si toccano; reimportare lo stesso PDF non crea
doppioni.</p>
<h3>Società</h3>
<p>Le schede delle <b>squadre</b> con i loro mister, poi <b>Scouting</b> (gli scout) e <b>Direttori</b>, ognuno con il suo PIN.
Puoi aggiungere o togliere squadre e persone, cambiare i nomi, generare, rigenerare o disattivare i PIN e sospendere un account.
Nella squadra dei <b>preparatori dei portieri</b>, sotto ogni preparatore, il campo <b>Portieri di: Under</b> (es. 15, 14, 11)
dice di quali categorie segue i portieri: in Home e nel suo calendario vede solo quelle partite.
In <b>Nome e categoria</b> di una squadra due caselle la rendono speciale: <b>Preparatori dei portieri</b> (vedono tutte le squadre
in sola lettura) e <b>Responsabile organizzativo</b> (calendari di tutte le squadre, eventi e avvisi). Chi entra col PIN di un
mister di quella squadra ha quei poteri.</p>
<h3>Segreteria e famiglie</h3>
<p>Nell'area <b>Segreteria</b> scegli la squadra: per ogni ragazzo data di nascita, numero, genitori, certificato medico, taglie,
iscrizione (con i documenti mancanti), rate delle quote e note della segreteria (la famiglia non le vede). I filtri in alto
mostrano chi ha il certificato da sistemare, l'iscrizione incompleta, rate da pagare o nessun PIN. <span class="k">Genera PIN</span>
crea il PIN della famiglia; <span class="k">Foglio PIN (PDF)</span> stampa il biglietto da consegnare a mano (con
<span class="k">Stampa i PIN della squadra</span> quelli di tutta la squadra, 8 per pagina, da ritagliare). In
<b>Società → Segreteria</b> si crea l'account (e il PIN) di chi lavora in segreteria. Il mister vede nelle Convocazioni le
risposte delle famiglie ("famiglia: ci sarà / non ci sarà").</p>
<p><b>Documenti delle famiglie</b>: nella scheda del ragazzo, "Documenti caricati dalla famiglia" (visita medica, contabile di
bonifico, altro). <span class="k">Apri</span> per vederlo, <span class="k">Accetta</span> o <span class="k">Rifiuta</span> (con una
nota che la famiglia legge). Accettando un bonifico la rata diventa pagata; accettando una visita si scrive la nuova scadenza del
certificato. Il filtro "Documenti da controllare" mostra chi ne ha di nuovi.</p>
<h3>Eventi e avvisi</h3>
<p>Gli eventi stanno nel calendario: in <b>Calendario → Tutte le squadre</b> tocca <span class="k">+ Nuovo evento</span> (titolo, tipo,
data, orari, luogo, squadre coinvolte: nessuna = tutta la società) e si apre "Modifica evento" sulla sua riga; per cambiarlo più avanti
basta aprire lo stesso "Modifica evento" nell'elenco o nel dettaglio della vista Giorno. Gli eventi compaiono nel calendario di tutti e
nella vista Giorno, nella colonna del campo. In <b>Calendario → Avvisi</b> scegli
le squadre e un modello (cambio campo, cambio orario, evento, libero), completa il testo e <span class="k">Pubblica avviso</span>:
compare nell'app, nella Home dei mister e delle famiglie di quelle squadre, per due settimane. <span class="k">Scarica PDF</span>
(o "Scarica come PDF" mentre lo scrivi) lo prepara su carta intestata della società, da stampare o allegare.
I direttori, come l'organizzativo, possono modificare calendario, eventi e avvisi.</p>
<p><b>Google Calendar</b>: amichevoli, tornei ed eventi creati o cambiati qui vanno da soli anche nei calendari Google della società
(Merate, Cernusco o Trasferta, secondo il campo); eliminandoli qui spariscono anche da Google. <span class="k">↻ Aggiorna da Google</span>,
in fondo a <b>Tutte le squadre</b>, porta nell'app quello che è stato scritto direttamente su Google. Il campionato resta sempre
quello del calendario ufficiale.</p>
</section>

<section>
<h2>4. Lo Scouting</h2>
{fig('s-scheda', '''<ul>
<li><b>Giocatori</b>: archivio con ricerca e filtri; "Anche solo da distinta" mostra anche i ragazzi letti dalle distinte.
Per ogni giocatore: anno, ruolo, stato, squadra, valutazione (o il pulsante <b>Valuta</b>) e prossima gara. Da computer
si ordina cliccando l'intestazione di una colonna (di nuovo per invertire); da telefono con "Ordina per" nei filtri.
Le <b>schede</b> in cima (Segnalati, Osservati, Esito, Inseriti, Nel database) mostrano il percorso dei giocatori.</li>
<li><b>Scheda</b>: squadra e categoria, prossime gare, medie delle valutazioni, storico squadre e partite (con il percorso tra
le società), eventi, storia completa, <b>contatti della famiglia</b>.</li>
<li><b>Gare</b>: le gare da vedere con i giocatori segnalati di ogni partita e chi ci va.</li>
<li><b>Segnalazione</b>: oltre a cosa hai visto, alcune domande facoltative tutte nello stesso stile (una scelta si toglie toccandola di nuovo):
<b>piede preferito</b> (destro, sinistro, entrambi), <b>prima impressione</b> (positiva, da rivedere, negativa), statura e forza da 1 a 5, e i <b>voti per area</b> (Tecnica, Motoria, Tattica, Mentale, con note).
Nell'elenco Giocatori: <b>ruolo</b>, <b>piede</b>, <b>Segnalazione</b> (prima impressione dell'ultima segnalazione e voto globale =
media dei voti per area delle segnalazioni; si ordina toccando l'intestazione e si filtra con "Ogni impressione") e <b>Valutazioni</b>
(le 3 caselle e il giudizio dell'ultima). <b>Valutazione</b>: voti facoltativi in 5 aree, <b>Tecnica</b> (guida della palla, ricezione, trasmissione, calciata, colpo di testa), <b>Tattica</b> (marcamento, smarcamento,
contrasto, dribbling), <b>Fisico</b> (velocità, accelerazione, agilità, reattività), <b>Mentale</b> (spunti, estro e coraggio; concentrazione,
motivazione), <b>Extra</b> (famiglia, potenziale, livello attuale), e in fondo il giudizio con il testo. Si vedono nella storia e nello storico valutazioni della scheda.</li>
<li><b>Tre valutazioni</b>: ogni giocatore ha <b>3 caselle</b> con le iniziali delle persone che l'hanno valutato. Servono 3 persone
diverse per passarlo a <b>Inserito</b>: a 3 su 3 caselle e riga diventano <b>verdi</b> ✓. Ogni <b>annata</b> ha il suo colore e
l'elenco è diviso per annata (dalla più giovane), finché non scegli un altro ordine.</li>
<li><b>Valutazioni nominali</b>: accanto a ogni valutazione ci sono le <b>iniziali</b> di chi l'ha fatta in un cerchio colorato
(sempre lo stesso colore per la stessa persona; i mister dal Portale hanno il cerchio col bordo). Nella scheda, nello storico
valutazioni, admin e direttori possono <span class="k">Elimina questa valutazione</span>.</li>
<li><b>Calendario</b>: le partite di tutte le nostre squadre (tutte le annate) con i colori del Portale, per periodo e squadra.
Lo vedono anche gli scout.</li>
<li><b>Necessità</b>: che giocatori cerca la società. <span class="k">+ Nuova necessità</span> (admin e direttori): cosa cerchiamo,
annata (anche più di una), ruolo, piede, priorità e note. Sotto ogni richiesta ci sono i giocatori già in archivio che rientrano
(non dell'Academy, né inseriti né scartati), prima i "Da prendere", poi per media; a parte, "Da verificare", quelli con ruolo o
piede non indicato. <span class="k">Chiudi (trovato)</span> la sposta tra le chiuse. Gli scout le vedono, così sanno cosa cercare.</li>
<li><b>Home</b>: incarichi, numeri dell'archivio per stato e ultime segnalazioni.</li>
<li><b>Incarichi</b>: in Home scrivi cosa c'è da fare (una squadra da vedere, un torneo da supervisionare, una partita),
con società, categoria, data e dettagli. Direttori e scout lo prendono con "Me ne occupo io", così nessuno va in due;
chi l'ha preso lo lascia o lo segna fatto con l'esito. Tu puoi anche liberarlo, chiuderlo o eliminarlo.</li>
<li><b>Affidare</b>: con "Affida a" scegli tu chi se ne occupa (uno scout o un altro direttore), già quando crei l'incarico
o dopo. Puoi affidare anche una <b>partita</b> (in Gare, "Affida a…" sotto la gara: la persona risulta anche su "Ci va") o un
<b>giocatore</b> (nella sua scheda, "Affida a…"). L'incarico compare in Home con chi l'ha affidato.</li>
<li>Come l'amministratore puoi <b>segnalare</b>, <b>valutare</b>, <b>cambiare lo stato</b> (nella scheda del giocatore), <b>gestire le gare</b> e unire le <b>schede doppie</b>.</li></ul>''', 'Scheda di un giocatore')}
<div class="box"><b class="t">Glossario e regole</b>Stati dei giocatori, categorie per anno di nascita e regole sui dati sono nel
<b>Manuale generale</b>.</div>
</section>
"""

MANUALI = {
    'Manuale_generale': ('Manuale generale', generale),
    'Manuale_mister': ('Manuale del mister', mister),
    'Manuale_scout': ('Manuale dello scout', scout),
    'Manuale_direttori': ('Manuale del direttore', direttori),
}
for file, (titolo, corpo) in MANUALI.items():
    (QUI / f'{file}.html').write_text(pagina(titolo, corpo), encoding='utf-8')
print('HTML scritti:', ', '.join(MANUALI))
