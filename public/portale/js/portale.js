/* Portale Academy Casatese Merate · Portale: aree e sotto-schede, indirizzo della pagina, Home, Calendario.
   I file si caricano in ordine (vedi index.html) e condividono le stesse variabili globali. */
/* ---------- Portale: aree, sotto-schede, indirizzo della pagina ---------- */
/* L'indirizzo tiene la scheda aperta (#/formazione, oppure #squadra=PIN/formazione per i mister):
   il tasto indietro del telefono torna alla scheda precedente e si può mandare il link a una sezione. */
const AREA_ICONS = ICONE_AREE;   // icone comuni con lo Scouting (condivisi.js)
/* Aree: Home, Calendario, Squadra, Scouting, Società. Squadra ha tre sottopannelli (gruppi): Rosa, Allenamento e Partite,
   ognuno con le sue schede (seconda riga, #subtabs) e le sue statistiche */
const GRUPPI_SQUADRA = [
  {k:'rosa', label:'Rosa', tabs:['rosa']},
  {k:'allenamento', label:'Allenamento', tabs:['allenamenti','mieiallenamenti','test','statallen']},
  {k:'partite', label:'Partite', tabs:['partita','convocazioni','formazione','piazzati','pdf','tabellini','statpartite','campi']}
];
const AREAS = [
  {k:'home', label:'Home', tabs:['home']},
  {k:'calendario', label:'Calendario', tabs:['calendario','calendariotutte','avvisi']},
  {k:'squadra', label:'Squadra', tabs:GRUPPI_SQUADRA.flatMap(g => g.tabs), gruppi:GRUPPI_SQUADRA},
  /* Moduli da stampare su carta intestata: distinta, programma gare, comunicazione (modulistica.js) */
  {k:'modulistica', label:'Modulistica', tabs:['distinta','programma','comunicazione']},
  {k:'scouting', label:'Scouting', tabs:['segnala','giocatori'], coach:true},
  {k:'segreteria', label:'Segreteria', tabs:['tesserati'], admin:true},
  {k:'societa', label:'Società', tabs:['squadre','archivio','modifiche'], admin:true}
];
const TAB_NAMES = {home:'Home', rosa:'Rosa', calendario:'La mia squadra', calendariotutte:'Tutte le squadre', partita:'Dati partita',
  convocazioni:'Convocazioni', formazione:'Formazione', piazzati:'Piazzati', pdf:'Foglio gara', tabellini:'Tabellini',
  statallen:'Statistiche', statpartite:'Statistiche', campi:'Campi', allenamenti:'Presenze', test:'Test atletici', squadre:'Squadre',
  segnala:'Segnala un giocatore', giocatori:'Giocatori', avvisi:'Avvisi', tesserati:'Tesserati',
  mieiallenamenti:'I miei allenamenti 🚧', programma:'Programma gare', distinta:'Distinta', comunicazione:'Comunicazione', archivio:'Archivio documenti', modifiche:'Storico modifiche'};
/* nomi delle schede di versioni precedenti (link salvati) */
const TAB_ALIASES = {statistiche:'statallen', registro:'allenamenti', eventi:'calendariotutte'};
const gruppoDi = t => GRUPPI_SQUADRA.find(g => g.tabs.includes(t));
const gruppoLast = {};
const areaLast = {};
/* Scouting: solo per i mister (l'admin ha Scouting Hub completo) */
/* L'organizzativo non ha Squadra né Scouting; la segreteria solo la sua area */
const allowedAreas = () => isSegreteria() ? AREAS.filter(a => a.k==='segreteria')
  : AREAS.filter(a => (!a.admin || isAdmin()) && (!a.coach || !isAdmin()) && !(isOrg() && (a.k==='squadra' || a.k==='scouting')));
/* Attività di base (da Under 13 in giù): niente foglio gara (dati partita, formazione, piazzati, PDF) né campi;
   in Squadra → Partite restano Convocazioni e Tabellini (presenza sì/no, con le statistiche nella stessa scheda) */
const SOLO_AGONISTICA = ['partita','formazione','piazzati','pdf','campi','statpartite'];
/* Test atletici: solo per l'Under 15 */
const SOLO_U15 = ['test'];
const tabsDi = a => a.tabs.filter(t => !(isAdb() && SOLO_AGONISTICA.includes(t)) && !(SOLO_U15.includes(t) && etaSquadra() !== 15)
  && !(isOrg() && (t==='calendario' || t==='distinta'))
  /* Avvisi: li scrivono admin, direttori (in lettura) e organizzativo; i mister li vedono in Home */
  && !(t==='avvisi' && !isAdmin() && !isOrg())
  /* Storico delle schede (0048): solo l'admin, che può ripristinare */
  && !(t==='modifiche' && (!isAdmin() || isDirettore())));
function allowedTabs(){ return allowedAreas().flatMap(tabsDi); }
const areaOf = t => AREAS.find(a => a.tabs.includes(t)) || AREAS[0];
/* Indirizzi, anche aperti dalle pagine dell'app (tappa 3): #/<scheda>, #/<scheda>/<id> = allenamento o partita da aprire,
   #/s:<squadra>/<scheda>… = squadra da aprire (admin, direttori, preparatori) */
const rotta = () => { const m = (location.hash||'').match(/\/(?:s:([\w-]+)\/)?(\w+)(?:\/([\w-]+))?$/); return m ? {squadra:m[1]||null, scheda:m[2], id:m[3]||null} : {}; };
function routeTab(){ const r = rotta(); const t = r.scheda && (TAB_ALIASES[r.scheda] || r.scheda); return t && TAB_NAMES[t] ? t : null; }
/* prima di subscribeTeam: la squadra scelta nell'app; dopo: l'allenamento o la partita da aprire */
function squadraDaRotta(){ const s = rotta().squadra; if(s && S.teams.some(t => t.id===s) && (!hashLocked || squadraPropria)) impostaCurTeam(s); }
function apriDaRotta(){ const {id} = rotta(); if(!id) return; if(tab==='allenamenti') impostaOpenTrainingId(id); else if(tab==='tabellini') impostaOpenGameId(id); }
const startTab = () => routeTab() || 'home';
function writeRoute(push){
  const pin = ((location.hash||'').match(/squadra=([\w-]+)/)||[])[1];
  const h = '#' + (pin ? 'squadra=' + pin : '') + '/' + tab;
  if(location.hash !== h) history[push ? 'pushState' : 'replaceState'](null, '', h);
}
/* Schede già portate nell'app (tappa 3 dell'app unica, NELL_APP in lib/condivisi.ts): nel sito si aprono lì, stessa intestazione e stessa barra */
/* admin e direttori: la squadra aperta passa alla pagina dell'app (?squadra=), i mister hanno sempre la loro */
const indirizzoApp = t => {
  const q = new URLSearchParams(), id = rotta().id;
  if(!hashLocked && curTeam) q.set('squadra', curTeam);
  if(id && t === 'allenamenti') q.set('allenamento', id);   // #/allenamenti/<id> → allenamento da aprire
  if(id && t === 'test') q.set('test', id);
  if(id && t === 'tabellini') q.set('partita', id);
  return NELL_APP[t] + (q.toString() ? '?' + q : '');
};
function goTab(t){
  if(!allowedTabs().includes(t)) t = 'home';
  if(NELL_APP[t] && IN_APP_UNICA){ location.assign(indirizzoApp(t)); return; }
  impostaTab(t); areaLast[areaOf(t).k] = t; if(gruppoDi(t)) gruppoLast[gruppoDi(t).k] = t;
  impostaSelectedPlayer(null); impostaSlotPick(null); if(t!=='piazzati') impostaOpenSchemeId(null);
  impostaOpenTrainingId(impostaOpenGameId(impostaOpenTestId(null)));
  writeRoute(true); render(); window.scrollTo(0,0);
}
window.addEventListener('popstate', () => {
  const t = routeTab();
  if(t && allowedTabs().includes(t) && t !== tab){ impostaTab(t); impostaOpenTrainingId(impostaOpenGameId(impostaOpenTestId(null))); render(); window.scrollTo(0,0); }
});
function renderNav(){
  const cur = areaOf(tab);
  const icon = k => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${AREA_ICONS[k]}</svg>`;
  /* Admin e direttori: l'area Scouting apre lo Scouting (pagine Next.js), allo stesso posto nella barra */
  const scoutingLink = IN_APP_UNICA && isAdmin() ? `<a class="areabtn" href="/home">${icon('scouting')}<span>Scouting</span></a>` : '';
  const aree = allowedAreas();
  $('#areanav').innerHTML = aree.map(a => `<button class="areabtn" data-area="${a.k}" aria-current="${a===cur?'page':'false'}">
      ${icon(a.k)}<span>${a.label}</span></button>`).join('');
  if(scoutingLink){ const soc = $('#areanav [data-area="societa"]'); if(soc) soc.insertAdjacentHTML('beforebegin', scoutingLink); else $('#areanav').insertAdjacentHTML('beforeend', scoutingLink); }
  $('#areanav').classList.remove('hidden');
  const schede = tabsDi(cur), ok = new Set(schede);
  let sotto = [];
  if(cur.gruppi){
    /* Squadra: prima riga i sottopannelli, seconda riga le schede del sottopannello aperto */
    const gruppi = cur.gruppi.map(g => ({...g, tabs:g.tabs.filter(t => ok.has(t))})).filter(g => g.tabs.length);
    const aperto = gruppi.find(g => g.tabs.includes(tab)) || gruppi[0];
    $('#tabs').innerHTML = gruppi.map(g => `<button class="tab" role="tab" data-tab="${g.tabs.includes(gruppoLast[g.k]) ? gruppoLast[g.k] : g.tabs[0]}" aria-selected="${g===aperto}">${g.label}</button>`).join('');
    $('#tabs').classList.remove('hidden');
    sotto = aperto && aperto.tabs.length > 1 ? aperto.tabs : [];
  } else {
    $('#tabs').innerHTML = schede.length > 1 ? schede.map(k => `<button class="tab" role="tab" data-tab="${k}" aria-selected="${k===tab}">${k==='calendario' && perPortieri() ? 'I miei portieri' : TAB_NAMES[k]}</button>`).join('') : '';
    $('#tabs').classList.toggle('hidden', schede.length <= 1);
  }
  $('#subtabs').innerHTML = sotto.map(k => `<button class="subtab" data-tab="${k}" aria-current="${k===tab}">${TAB_NAMES[k]}</button>`).join('');
  $('#subtabs').classList.toggle('hidden', !sotto.length);
}

/* ---------- Home ---------- */
function daysUntil(d){ const a = new Date(todayISO()+'T12:00:00'), b = new Date(d+'T12:00:00'); return Math.round((b-a)/86400000); }
/* ---------- Calendari di tutte le squadre (Calendario → "Tutte le squadre") ----------
   Mister: funzione coach_calendari (0027, solo nome, categoria e partite); admin e direttori leggono i documenti.
   Si ricaricano al massimo ogni minuto; se non si possono leggere resta il calendario della propria squadra. */
let tuttiCal = null, tuttiCalAt = 0, tuttiCalInCorso = false;
async function caricaTuttiCal(){
  if(tuttiCalInCorso || Date.now() - tuttiCalAt < 60000) return;
  tuttiCalInCorso = true;
  try{
    if(coachPin){
      const { data, error } = await supabaseClient.rpc('coach_calendari', { p_pin: coachPin });
      if(error) throw error;
      tuttiCal = data || [];
    } else if(db){
      tuttiCal = await Promise.all(S.teams.map(async t => {
        const snap = await db.doc('calendar/'+t.id).get();
        return {id:t.id, name:t.name, category:t.category, matches:(snap.exists && snap.data()?.matches) || []};
      }));
    }
  }catch(e){ /* funzione non ancora nel database o rete assente: solo la propria squadra */ }
  tuttiCalAt = Date.now(); tuttiCalInCorso = false;
  if(tab==='calendariotutte' || (squadraPropria && (tab==='home' || tab==='calendario')) || (isOrg() && tab==='home')) render();
}
/* Partite di tutte le squadre, ognuna con la sua squadra (la propria dai dati aperti, amichevoli del mister comprese) */
function partiteTutte(){
  const mie = allCalendar().map(m => ({...m, team:TEAM()}));
  const altre = (tuttiCal || []).filter(t => t.id !== curTeam).flatMap(t => (t.matches || []).map(m => ({...m, team:t})));
  return [...mie, ...altre, ...eventiTutti()].sort((a,b) => ((a.date||'')+(a.time||'').padStart(5,'0')).localeCompare((b.date||'')+(b.time||'').padStart(5,'0')));
}
/* Preparatori dei portieri, nella propria squadra: gli impegni sono le partite delle categorie dei loro portieri
   (c.eta del preparatore entrato, impostate in Società; se mancano, tutte le squadre) */
const perPortieri = () => !!squadraPropria && curTeam === squadraPropria;
function etaPortieri(){
  const t = S.teams.find(x => x.id === squadraPropria), c = (t?.coaches||[]).find(x => x.name && x.name === misterName);
  return Array.isArray(c?.eta) && c.eta.length ? c.eta : null;
}
function impegni(){
  if(!perPortieri()) return allCalendar().concat(eventiPer(curTeam));
  caricaTuttiCal();
  const eta = etaPortieri();
  return partiteTutte().filter(m => m.team?.id !== squadraPropria && (!eta || eta.includes(etaSquadra(m.team))));
}
/* Portieri delle squadre dei preparatori: per ogni partita chi sono e se il mister li ha convocati.
   Dati letti in sola lettura (0028): rosa, registro (portieri = registro.gk) e foglio gara/convocazioni di ogni squadra. */
let portieriDati = null, portieriAt = 0, portieriInCorso = false, portiereScelto = '';
async function caricaPortieri(){
  if(!perPortieri() || !db || portieriInCorso || Date.now() - portieriAt < 60000) return;
  portieriInCorso = true;
  const eta = etaPortieri(), out = {};
  const leggi = p => db.doc(p).get().then(s => s.exists ? s.data() : null).catch(() => null);
  for(const t of S.teams.filter(t => t.id !== squadraPropria && (!eta || eta.includes(etaSquadra(t))))){
    const [r, g, sh] = await Promise.all([leggi('roster/'+t.id), leggi('registro/'+t.id), leggi('sheet/'+t.id)]);
    out[t.id] = {team: t, gk: (g?.gk || []).map(id => (r?.players || []).find(p => p.id === id)).filter(Boolean), sheet: sh || {}};
  }
  portieriDati = out; portieriAt = Date.now(); portieriInCorso = false;
  if(tab==='home' || tab==='calendario') render();
}
const stessaPartita = (x, m) => (x.calId && x.calId === m.id) || (x.date === m.date && (x.opponent||'').trim().toLowerCase() === (m.opponent||'').trim().toLowerCase());
/* Stato del portiere per la partita: CON/NC/INF/SQL/ND dalla convocazione, '' se il mister non l'ha ancora fatta */
function statoPortiere(m, pid){
  const sh = portieriDati?.[m.team?.id]?.sheet || {};
  const pa = (sh.adb?.partite || []).find(x => stessaPartita(x, m));
  if(pa) return (pa.conv || []).includes(pid) ? 'CON' : 'NC';
  if(sh.date && stessaPartita(sh, m)) return (sh.callup || {})[pid] || '';
  return '';
}
function chipsPortieri(m){
  caricaPortieri();
  const gk = (portieriDati?.[m.team?.id]?.gk || []).filter(p => !portiereScelto || p.id === portiereScelto);
  if(!gk.length) return '';
  return `<div class="gkchips">${gk.map(p => { const st = statoPortiere(m, p.id);
    return `<span class="gkchip st-${st || 'da'}">🧤 ${esc(p.name)} · ${st ? CALLUP_LABELS[st].toLowerCase() : 'da convocare'}</span>`; }).join('')}</div>`;
}
/* I tre calendari della società, ognuno col suo colore (regole comuni con lo Scouting: CALENDARI, calendarioDi in condivisi.js) */
const CAL_NOMI = Object.fromEntries(Object.entries(CALENDARI).map(([k, c]) => [k, c.nome]));
const calDi = calendarioDi;
const legendaCal = () => `<div class="calleg">${Object.entries(CAL_NOMI).map(([k,n]) => `<span class="cal-${k}">${n}</span>`).join('')}</div>`;
const siglaSquadra = t => { const e = etaSquadra(t); return e < 99 ? 'U' + e : (t?.name || ''); };
/* Nelle liste di tutte le squadre: "U11 · Fc Milanese" (casa o trasferta la dice il colore) */
const nomePartita = (m, tutte) => m.evento ? m.opponent : tutte ? `${siglaSquadra(m.team)} · ${m.opponent||'Avversario'}`
  : (m.home ? `${teamLabel()} - ${m.opponent||'Avversario'}` : `${m.opponent||'Avversario'} - ${teamLabel()}`);
/* Una riga di partita colorata col suo calendario */
const rigaPartita = (m, tutte, conData) => `<li class="cal-${calDi(m)}${tutte && m.team?.id===curTeam ? ' mia' : ''}">
    <div class="wkwhen"><b>${weekday(m.date)}${conData ? ' '+fmtDate(m.date).slice(0,5) : ''}</b><span>${esc(m.time ? m.time.padStart(5,'0') : 'ora ?')}</span></div>
    <div><div class="wkmatch">${esc(nomePartita(m, tutte))}</div>
      <div class="note">${m.evento ? `<span class="tipochip ev">${esc(m.tipo)}</span> ${[m.venue, m.fine ? 'fino alle '+m.fine : '', squadreTesto(m.evento.squadre), m.note].filter(Boolean).map(esc).join(' · ')}`
        : `${conData ? `<span class="tipochip${m.friendly ? ' am' : ''}">${esc(m.friendly ? (m.tipo || 'Amichevole') : 'Campionato')}</span> ` : ''}${[m.home ? `In casa a ${CAL_NOMI[calDi(m)]}` : 'Trasferta', m.home ? '' : m.venue, conData ? '' : tipoPartita(m), m.note].filter(Boolean).map(esc).join(' · ')}`}</div>
      ${conData && !m.friendly ? calStato(m) : ''}${perPortieri() ? chipsPortieri(m) : ''}</div>
  </li>`;
/* Sabato e domenica della settimana in corso (da lunedì a domenica) */
function weekendISO(){
  const d = new Date(todayISO()+'T12:00:00'), sab = new Date(d);
  sab.setDate(d.getDate() + 5 - (d.getDay()+6)%7);
  const dom = new Date(sab); dom.setDate(sab.getDate()+1);
  const iso = x => `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`;
  return [iso(sab), iso(dom)];
}
/* Amichevoli e tornei (dai calendari Google: scripts/import-calendari/google.mjs, o aggiunte dal mister) */
const tipoPartita = m => m.friendly ? (m.tipo || 'Amichevole') : '';
const whenTxt = d => { const n = daysUntil(d); return n===0 ? 'oggi' : n===1 ? 'domani' : n>1 ? `tra ${n} giorni` : `${-n} giorni fa`; };
/* Home: nell'app dalla tappa 3 (/inizio, NELL_APP). Qui restano i pulsanti "vai a" delle schede (data-hgo) */
document.addEventListener('click', e => {
  const b = e.target.closest('[data-hgo]'); if(!b || !curTeam) return;
  goTab(b.dataset.hgo);
});

/* Posizione esatta dei campi: nell'app (/squadra/campi) */

/* ---------- Calendario: La mia squadra, Tutte le squadre ---------- */
/* Partite collegate ai calendari ufficiali (scripts/import-calendari/portale.mjs): "da calendario"
   finché un comunicato non le conferma o varia */
function calStato(m){
  if(m.stato==='confermata') return `<span class="note">Confermata${m.comunicato?' · '+esc(m.comunicato):''}</span>`;
  if(m.stato==='variata') return `<span class="note"><b>Variata</b>${m.comunicato?' · '+esc(m.comunicato):''}</span>`;
  if(m.stato==='calendario') return '<span class="note">Da calendario</span>';
  if(m.friendly) return `<span class="note">${[tipoPartita(m), m.note].filter(Boolean).map(esc).join(' · ')}</span>`;
  return '';
}
/* Righe del calendario raggruppate per mese, colorate per calendario (Merate, Cernusco, Trasferta) */
function listaCalendario(ms, tutte, extra){
  let mese = '';
  return ms.map(m => {
    const mm = (m.date||'').slice(0,7), testa = mm !== mese ? `<li class="calmese">${mm ? monthLabel(mm) : 'Senza data'}</li>` : '';
    mese = mm;
    const riga = rigaPartita(m, tutte, true), agg = extra ? extra(m) : '';
    return testa + (agg ? riga.replace(/<\/div>\s*<\/li>\s*$/, agg + '</div></li>') : riga);
  }).join('');
}
let frAperta = null;   // amichevole appena aggiunta (o in modifica): il suo "Modifica" resta aperto
const inOrdine = ms => ms.slice().sort((a,b) => ((a.date||'')+(a.time||'').padStart(5,'0')).localeCompare((b.date||'')+(b.time||'').padStart(5,'0')));
/* Nel calendario solo le partite da giocare; quelle giocate vanno nello storico, solo della propria squadra */
const daGiocare = m => !m.date || m.date >= todayISO();
/* Calendario (La mia squadra, Tutte le squadre, Avvisi): nell'app dalla tappa 3, /calendari/… (NELL_APP).
   Qui restano le righe e gli elenchi usati da Home e famiglie. */
/* Campi: nell'app dalla tappa 3 (/squadra/campi) */

/* ---------- Allenamento / Gara: pagine del registro ---------- */
function registroPage(title, body, hint){
  if(!S.players.length) return `<section class="panel"><h2>${title}</h2><p class="empty">Prima serve la rosa (Squadra → Rosa).</p></section>`;
  return `<section class="panel"><h2>${title} · ${esc(TEAM()?.name||'')}</h2>${hint?`<p class="hint">${hint}</p>`:''}${body}</section>`;
}

/* ---------- Scouting dei mister (Segnala, Giocatori, Valuta): nell'app dalla tappa 3, /scouting/… (NELL_APP) ---------- */

/* Variabili di questo file cambiate anche da altri file: si cambiano solo da qui (passo verso i moduli) */
function impostaFrAperta(v){ return (frAperta = v); }
function impostaTuttiCalAt(v){ return (tuttiCalAt = v); }
