/* Portale Academy Casatese Merate · Portale: aree e sotto-schede, indirizzo della pagina, Home, Calendario.
   I file si caricano in ordine (vedi index.html) e condividono le stesse variabili globali. */
/* ---------- Portale: aree, sotto-schede, indirizzo della pagina ---------- */
/* L'indirizzo tiene la scheda aperta (#/formazione, oppure #squadra=PIN/formazione per i mister):
   il tasto indietro del telefono torna alla scheda precedente e si può mandare il link a una sezione. */
const AREA_ICONS = {
  home:'<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10"/><path d="M10 20v-6h4v6"/>',
  calendario:'<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="M8 14h2M14 14h2M8 17h2"/>',
  eventi:'<path d="M4 10v4l11 5V5L4 10z"/><path d="M15 9a3 3 0 0 1 0 6"/><path d="M7 14.5 8 20h3l-1-4.5"/>',
  segreteria:'<rect x="4" y="3.5" width="16" height="17" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  squadra:'<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.6 2.7-6 6-6s6 2.4 6 6"/><circle cx="17" cy="9" r="2.5"/><path d="M16.5 14.2c2.6.3 4.5 2.4 4.5 5.8"/>',
  gara:'<circle cx="12" cy="12" r="9"/><path d="m12 7.5 4 2.9-1.5 4.8h-5L8 10.4z"/><path d="M12 3v4.5M21 10.4l-5 0M17.3 19.3l-2.8-4.1M6.7 19.3l2.8-4.1M3 10.4l5 0"/>',
  allenamento:'<circle cx="13.5" cy="4.5" r="2"/><path d="m9 21 2.5-6 2.5 2.5V21"/><path d="M6 12.5 9 9l4 1.5 2.5 3.5H19"/><path d="m11.5 15-2-3"/>',
  statistiche:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  modulistica:'<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/>',
  scouting:'<circle cx="6.5" cy="15.5" r="3.5"/><circle cx="17.5" cy="15.5" r="3.5"/><path d="M10 15.5h4M4 13l2.5-8h3l1 5.5M20 13l-2.5-8h-3l-1 5.5"/>',
  societa:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'
};
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
  {k:'societa', label:'Società', tabs:['squadre','archivio'], admin:true}
];
const TAB_NAMES = {home:'Home', rosa:'Rosa', calendario:'La mia squadra', calendariotutte:'Tutte le squadre', partita:'Dati partita',
  convocazioni:'Convocazioni', formazione:'Formazione', piazzati:'Piazzati', pdf:'Foglio gara', tabellini:'Tabellini',
  statallen:'Statistiche', statpartite:'Statistiche', campi:'Campi', allenamenti:'Presenze', test:'Test atletici', squadre:'Squadre',
  segnala:'Segnala un giocatore', giocatori:'Giocatori', avvisi:'Avvisi', tesserati:'Tesserati',
  mieiallenamenti:'I miei allenamenti 🚧', programma:'Programma gare', distinta:'Distinta', comunicazione:'Comunicazione', archivio:'Archivio documenti'};
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
  && !(t==='avvisi' && !isAdmin() && !isOrg()));
function allowedTabs(){ return allowedAreas().flatMap(tabsDi); }
const areaOf = t => AREAS.find(a => a.tabs.includes(t)) || AREAS[0];
function routeTab(){ const m = (location.hash||'').match(/\/(\w+)$/); const t = m && (TAB_ALIASES[m[1]] || m[1]); return t && TAB_NAMES[t] ? t : null; }
const startTab = () => routeTab() || 'home';
function writeRoute(push){
  const pin = ((location.hash||'').match(/squadra=([\w-]+)/)||[])[1];
  const h = '#' + (pin ? 'squadra=' + pin : '') + '/' + tab;
  if(location.hash !== h) history[push ? 'pushState' : 'replaceState'](null, '', h);
}
function goTab(t){
  if(!allowedTabs().includes(t)) t = 'home';
  tab = t; areaLast[areaOf(t).k] = t; if(gruppoDi(t)) gruppoLast[gruppoDi(t).k] = t;
  selectedPlayer = null; slotPick = null; if(t!=='piazzati') openSchemeId = null;
  openTrainingId = openGameId = openTestId = null;
  writeRoute(true); render(); window.scrollTo(0,0);
}
window.addEventListener('popstate', () => {
  const t = routeTab();
  if(t && allowedTabs().includes(t) && t !== tab){ tab = t; openTrainingId = openGameId = openTestId = null; render(); window.scrollTo(0,0); }
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
/* I tre calendari della società, ognuno col suo colore: campo di Merate, campo di Cernusco, trasferta */
const CAL_NOMI = {merate:'Merate', cernusco:'Cernusco', trasferta:'Trasferta'};
const calDi = m => m.evento ? ({merate:'merate', cernusco:'cernusco'}[m.luogo] || 'trasferta')
  : !m.home ? 'trasferta' : /MERATE/i.test(m.venue || '') ? 'merate' : 'cernusco';
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
function homeTodo(){
  const today = todayISO(), items = [];
  const noReason = S.reg.trainings.reduce((a,t) => a + Object.values(t.att||{}).filter(v => v==='A').length, 0);
  if(noReason) items.push({txt:`${noReason} assenz${noReason===1?'a':'e'} senza motivo negli allenamenti`, go:'allenamenti'});
  const cal = allCalendar().filter(m => m.date && m.date < today).sort((a,b) => b.date.localeCompare(a.date));
  cal.forEach(m => {
    const g = S.reg.games.find(x => x.calId===m.id);
    if(!g || !gamePlayed(g)) items.push({txt:`${isAdb() ? 'Presenze da segnare' : 'Tabellino da compilare'}: ${m.opponent||'partita'} (${fmtDate(m.date).slice(0,5)})`, go:'opencal:'+m.id});
    else if(!isAdb() && !gameScore(g)) items.push({txt:`Gol da inserire: ${m.opponent||'partita'} (${fmtDate(m.date).slice(0,5)})`, go:'opengm:'+g.id});
  });
  /* Attività di base: niente gol né portieri nei tabellini */
  if(!isAdb() && S.players.length && !(S.reg.gk||[]).length) items.push({txt:'Segna i portieri con 🧤 nella Rosa', go:'rosa'});
  return items;
}
function viewHome(){
  if(isOrg()) return viewHomeOrg();
  if(!curTeam) return `<section class="panel"><h2>Benvenuto</h2><p class="empty">Nessuna squadra. Creane una in Società → Squadre.</p></section>`;
  const T0 = TEAM(), nm = nextMatch(), today = todayISO();
  const trToday = S.reg.trainings.find(t => t.date===today);
  const {team, gm} = computeStats();
  const todo = homeTodo(), maxTodo = 6;
  const s = S.sheet, sheetIsNext = nm && s.date===nm.date && (s.opponent||'').trim().toLowerCase()===(nm.opponent||'').trim().toLowerCase();
  /* Anteprima: gli impegni della squadra di sabato e domenica di questa settimana (campionato, amichevoli e tornei),
     colorati per calendario. Le altre partite e le altre squadre sono nell'area Calendario */
  const [sab, dom] = weekendISO(), wk = impegni().filter(m => m.date===sab || m.date===dom)
    .sort((a,b) => (a.date+(a.time||'').padStart(5,'0')).localeCompare(b.date+(b.time||'').padStart(5,'0')));
  const matchCard = `<div class="hcard hmatch hwide">
      <div class="hlabel">Weekend · sab ${fmtDate(sab).slice(0,5)} e dom ${fmtDate(dom).slice(0,5)}</div>
      ${wk.length ? `${legendaCal()}<ul class="wklist">${wk.map(m => rigaPartita(m, perPortieri())).join('')}</ul>`
        : `<p class="note">Nessun impegno questo weekend.${nm ? ` Prossima partita: ${weekday(nm.date)} ${fmtDate(nm.date)} · ${esc(nm.opponent||'')} (${whenTxt(nm.date)}).` : ''}</p>`}
      ${nm ? `<div class="row" style="margin-top:12px">${isAdb() ? '' : `<button class="btn primary small" data-hgo="prep">${sheetIsNext ? 'Apri la gara' : 'Prepara la gara'}</button>`}<button class="btn ${isAdb() ? 'primary ' : ''}small" data-hgo="conv">Convocazioni</button><button class="btn small" data-hgo="calendario">Calendario</button></div>`
        : '<div class="row" style="margin-top:12px"><button class="btn small" data-hgo="calendario">Apri il calendario</button></div>'}
    </div>`;
  /* Da fare: prima le presenze di oggi, poi tabellini e gol mancanti, portieri */
  const presenzeOggi = trToday
    ? (() => { const v = S.players.map(p => attOf(trToday, p.id)); return `<li><button data-hgo="tr:${trToday.id}"><span class="tdtxt">Presenze di oggi: <b>${v.filter(x=>x==='P').length} presenti</b>, ${v.filter(isAbs).length} assenti</span><span aria-hidden="true">›</span></button></li>`; })()
    : `<li><button data-hgo="trnew" class="tdprimo"><span class="tdtxt">Segna le presenze dell'allenamento di oggi</span><span aria-hidden="true">›</span></button></li>`;
  const todoCard = `<div class="hcard"><div class="hlabel">Da fare</div>
    <ul class="todo">${presenzeOggi}${todo.slice(0,maxTodo).map(i => `<li><button data-hgo="${i.go}"><span class="tdtxt">${esc(i.txt)}</span><span aria-hidden="true">›</span></button></li>`).join('')}</ul>
    ${todo.length>maxTodo?`<p class="note">…e altre ${todo.length-maxTodo}</p>`:''}${!todo.length ? '<p class="note" style="margin-top:6px">Tabellini e gol in ordine ✓</p>' : ''}</div>`;
  /* Riepilogo della stagione: allenamento e partite, con i link alle statistiche */
  const numCard = `<div class="hcard"><div class="hlabel">Riepilogo stagione</div>
    <div class="hriep">
      <button class="hriepbox" data-hgo="stat:allenamento"><span class="hriepttl">Allenamento</span>
        <span><b>${team.nT}</b> allenamenti</span><span><b>${pctTxt(team.avgPct)}</b> presenza media</span>
        <span><b>${team.low}</b> sotto il ${LOW_ATT*100}%</span><span class="hrieplink">Statistiche ›</span></button>
      ${isAdb() ? `<button class="hriepbox" data-hgo="stat:partite"><span class="hriepttl">Partite</span>
        <span><b>${team.nG}</b> giocate</span>
        <span><b>${team.nG ? (gm.reduce((a,g) => a + Object.values(g.pl||{}).filter(played).length, 0) / team.nG).toFixed(1) : '—'}</b> presenti a partita</span>
        <span class="hrieplink">Tabellini ›</span></button>`
      : `<button class="hriepbox" data-hgo="stat:partite"><span class="hriepttl">Partite</span>
        <span><b>${team.nG}</b> giocate${team.nScored ? ` · ${team.w}V ${team.d}N ${team.l}P` : ''}</span>
        <span><b>${team.nScored ? `${team.gf}-${team.ga}` : '—'}</b> gol fatti-subiti</span>
        <span><b>${team.nScored ? gm.map(gameScore).filter(x => x && x.ga===0).length : '—'}</b> porta inviolata</span><span class="hrieplink">Statistiche ›</span></button>`}
    </div></div>`;
  /* Avvisi della società per questa squadra (ultimi 14 giorni) */
  const avvisi = avvisiSquadra(curTeam);
  const avvisiCard = avvisi.length ? `<div class="hcard hwide havvisi"><div class="hlabel">Avvisi della società</div>
    ${avvisi.slice(0,3).map(a => `<div class="gval gseg avviso"><div class="note">${fmtDate(a.data)}${a.autore ? ' · '+esc(a.autore) : ''}</div>${a.titolo ? `<b>${esc(a.titolo)}</b>` : ''}<p class="gtxt" style="white-space:pre-line">${esc(a.testo)}</p></div>`).join('')}</div>` : '';
  return `<section class="hhead"><h2>${esc(T0?.name||'')}</h2><p class="note">${esc(T0?.category||'')}${coachNames(T0)?' · Mister '+esc(coachNames(T0)):''}</p></section>
    <div class="hgrid">${avvisiCard}${matchCard}${todoCard}${numCard}</div>`;
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-hgo]'); if(!b || !curTeam) return;
  const [k, id] = b.dataset.hgo.split(':');
  if(k==='prep' || k==='conv'){
    const nm = nextMatch(), s = S.sheet;
    if(nm && !(s.date===nm.date && (s.opponent||'').trim().toLowerCase()===(nm.opponent||'').trim().toLowerCase())){
      s.opponent = nm.opponent||''; s.date = nm.date||''; s.time = nm.time||''; s.venue = nm.venue||''; s.address = nm.address||''; s.venueLL = nm.ll||''; s.home = !!nm.home; s.convType = nm.friendly ? 'Amichevole' : 'Campionato'; save('sheet');
    }
    goTab(k==='prep' ? 'partita' : 'convocazioni'); return;
  }
  if(k==='trnew'){
    goTab('allenamenti');
    let tr = S.reg.trainings.find(t => t.date===todayISO());
    if(!tr){ tr = {id:uid('tr'), date:todayISO(), note:'', att:Object.fromEntries(S.players.map(p => [p.id,'P']))}; S.reg.trainings.push(tr); save('registro'); }
    openTrainingId = tr.id; render(); return;
  }
  if(k==='tr'){ goTab('allenamenti'); openTrainingId = id; render(); return; }
  if(k==='opencal'){
    goTab('tabellini');
    const m = allCalendar().find(x => x.id===id); if(!m) return;
    let g = S.reg.games.find(x => x.calId===m.id);
    if(!g){ g = {id:uid('gm'), calId:m.id, date:m.date, opponent:m.opponent||'', home:!!m.home, comp:m.friendly?'Amichevole':'Campionato', dur:DEFAULT_DUR, og:'', pl:{}}; S.reg.games.push(g); save('registro'); }
    openGameId = g.id; render(); return;
  }
  if(k==='opengm'){ goTab('tabellini'); openGameId = id; render(); return; }
  if(k==='stat'){ goTab(id==='partite' ? (isAdb() ? 'tabellini' : 'statpartite') : 'statallen'); return; }
  goTab(k);
});

/* ---------- Posizione esatta dei campi (salvata nel registro: la può impostare anche il mister) ---------- */
document.addEventListener('click', e => {
  const b = e.target.closest('[data-pinedit],[data-pinsave],[data-pindel],[data-pincancel]'); if(!b || !curTeam) return;
  if(b.dataset.pinedit){ pinEditing = venueKey(b.dataset.pinedit); render(); $('#pin_in')?.focus(); return; }
  if(b.dataset.pincancel){ pinEditing = null; render(); return; }
  const R = S.reg; R.venues ||= {};
  if(b.dataset.pindel){ delete R.venues[venueKey(b.dataset.pindel)]; pinEditing = null; save('registro'); render(); return; }
  const v = b.dataset.pinsave, raw = ($('#pin_in')?.value || '').trim(), ll = parseLL(raw);
  if(ll) R.venues[venueKey(v)] = {name:v, ll};
  else if(/^https?:\/\/\S+$/.test(raw)) R.venues[venueKey(v)] = {name:v, url:raw};
  else { setStatus('Coordinate non riconosciute'); $('#pin_in')?.focus(); return; }
  pinEditing = null; save('registro'); render(); setStatus('Posizione del campo salvata');
});
document.addEventListener('change', e => { if(e.target.id==='cv_meetaddr') render(); });
document.addEventListener('keydown', e => { if(e.target.id==='pin_in' && e.key==='Enter'){ e.preventDefault(); document.querySelector('[data-pinsave]')?.click(); } });

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
/* Uscendo da un campo dell'amichevole la riga si aggiorna (titolo, data, ordine) */
document.addEventListener('change', e => {
  if(!e.target.dataset?.frid || tab !== 'calendario') return;
  frAperta = e.target.dataset.frid; setTimeout(render, 0);
});
const inOrdine = ms => ms.slice().sort((a,b) => ((a.date||'')+(a.time||'').padStart(5,'0')).localeCompare((b.date||'')+(b.time||'').padStart(5,'0')));
/* Nel calendario solo le partite da giocare; quelle giocate vanno nello storico, solo della propria squadra */
const daGiocare = m => !m.date || m.date >= todayISO();
function viewStorico(){
  const giocate = inOrdine(allCalendar().filter(m => !daGiocare(m))).reverse();
  if(!giocate.length) return '';
  return `<details class="storico"><summary>Storico · ${giocate.length} ${giocate.length===1 ? 'partita giocata' : 'partite giocate'}</summary>
    <ul class="wklist callist">${listaCalendario(giocate, false)}</ul></details>`;
}
/* ---------- Vista a giornata (come Google Calendar): una colonna per calendario, ore in verticale ----------
   Si conosce solo l'inizio della gara: il blocco dura in modo indicativo 60' (fino a U10), 75' (U11–U13), 90' (dopo). */
let calVista = 'giorno', calGiorno = null, calScelta = null, calCategoria = '';
const CG_ORA = 56;                                   // pixel per ora
const minuti = t => { const [h, m] = (t||'').split(':').map(Number); return h*60 + (m||0); };
const durataPartita = m => { if(m.evento) return Math.max(minuti(m.fine) - minuti(m.time), 0) || 120;
  const e = etaSquadra(m.team); return e <= 10 ? 60 : e <= 13 ? 75 : 90; };
const giornoLungo = d => new Date(d+'T12:00:00').toLocaleDateString('it-IT', {weekday:'long', day:'numeric', month:'long'});
/* Partite che si accavallano nella stessa colonna: affiancate, come in Google Calendar */
function corsie(evs){
  evs.sort((a,b) => a.inizio - b.inizio || b.fine - a.fine);
  let gruppo = [], fineGruppo = -1;
  const chiudi = () => { const n = Math.max(...gruppo.map(e => e.corsia)) + 1; gruppo.forEach(e => e.corsie = n); gruppo = []; };
  for(const e of evs){
    if(gruppo.length && e.inizio >= fineGruppo) chiudi();
    const occupate = gruppo.filter(x => x.fine > e.inizio).map(x => x.corsia);
    e.corsia = 0; while(occupate.includes(e.corsia)) e.corsia++;
    gruppo.push(e); fineGruppo = Math.max(fineGruppo, e.fine);
  }
  if(gruppo.length) chiudi();
  return evs;
}
function vistaGiorno(ms){
  const giorni = [...new Set(ms.map(m => m.date).filter(Boolean))].sort();
  /* Si parte dal giorno della prossima partita della propria squadra */
  const nm = nextMatch();
  if(!giorni.includes(calGiorno)) calGiorno = nm && giorni.includes(nm.date) ? nm.date : giorni[0];
  const i = giorni.indexOf(calGiorno), delGiorno = ms.filter(m => m.date === calGiorno);
  const conOra = delGiorno.filter(m => /^\d{1,2}:\d{2}$/.test(m.time||'')), senzaOra = delGiorno.filter(m => !conOra.includes(m));
  const evs = conOra.map(m => ({m, cal:calDi(m), inizio:minuti(m.time), fine:minuti(m.time) + durataPartita(m)}));
  const h0 = Math.min(...evs.map(e => Math.floor(e.inizio/60)), 9), h1 = Math.max(...evs.map(e => Math.ceil(e.fine/60)), h0 + 4);
  const px = min => (min - h0*60) / 60 * CG_ORA;
  const colonna = k => corsie(evs.filter(e => e.cal === k)).map(e => {
    const {m} = e, mia = m.team?.id === curTeam, chiave = `${m.team?.id}|${m.id}`;
    return `<div class="cg-ev${mia ? ' mia' : ''}${m.evento ? ' evento' : ''}${chiave===calScelta ? ' scelta' : ''}" role="button" tabindex="0" data-calev="${esc(chiave)}" style="top:${px(e.inizio)}px;height:${px(e.fine) - px(e.inizio) - 2}px;left:calc(${e.corsia}/${e.corsie}*100%);width:calc(100%/${e.corsie} - 3px)"
        title="${esc(`${m.time} ${siglaSquadra(m.team)} · ${m.opponent||''}${m.venue ? ' · '+m.venue : ''}${m.note ? ' · '+m.note : ''}`)}">
      <b>${m.evento ? '📣 '+esc(m.opponent) : `${esc(siglaSquadra(m.team))} · ${esc(m.opponent||'Avversario')}`}</b><span>${esc(m.time.padStart(5,'0'))}${k==='trasferta' && m.venue ? ' · '+esc(m.venue) : ''}</span></div>`;
  }).join('');
  const ore = Array.from({length: h1 - h0}, (_, k) => `<span style="top:${k*CG_ORA}px">${String(h0+k).padStart(2,'0')}:00</span>`).join('');
  return `<div class="cg-nav">
      <button class="iconbtn" data-calday="${giorni[i-1]||''}" aria-label="Giorno prima" ${i>0 ? '' : 'disabled'}>‹</button>
      <b>${esc(giornoLungo(calGiorno))}</b>
      <button class="iconbtn" data-calday="${giorni[i+1]||''}" aria-label="Giorno dopo" ${i<giorni.length-1 ? '' : 'disabled'}>›</button>
    </div>
    ${senzaOra.length ? `<p class="note cg-senzaora">Ora da definire: ${senzaOra.map(m => `<span class="cal-${calDi(m)}">${esc(siglaSquadra(m.team))} · ${esc(m.opponent||'')}</span>`).join(' ')}</p>` : ''}
    <div class="cg">
      <div class="cg-testa"><span></span>${Object.entries(CAL_NOMI).map(([k,n]) => `<span class="cal-${k}">${n}</span>`).join('')}</div>
      <div class="cg-corpo" style="height:${(h1-h0)*CG_ORA}px">
        <div class="cg-ore">${ore}</div>
        ${Object.keys(CAL_NOMI).map(k => `<div class="cg-col cal-${k}">${colonna(k)}</div>`).join('')}
      </div>
    </div>
    ${(() => { const m = delGiorno.find(x => `${x.team?.id}|${x.id}` === calScelta); return m ? `<ul class="wklist callist cg-dettaglio">${listaCalendario([m], true, modificaPartitaSquadra).replace(/<li class="calmese">.*?<\/li>/, '')}</ul>` : ''; })()}
    <p class="note">Tocca una partita per i dettagli. Durata dei blocchi indicativa: si conosce l'ora d'inizio della partita.</p>`;
}
document.addEventListener('change', e => {
  if(e.target.dataset?.gkscelto){ portiereScelto = e.target.value; render(); return; }
  if(!e.target.dataset?.calcat) return;
  calCategoria = e.target.value; calGiorno = null; calScelta = null; render();
});
document.addEventListener('click', e => {
  const b = e.target.closest('[data-calday],[data-calvista],[data-calev]'); if(!b) return;
  if(b.dataset.calvista){ calVista = b.dataset.calvista; render(); return; }
  if(b.dataset.calev){ calScelta = calScelta === b.dataset.calev ? null : b.dataset.calev; render(); return; }
  if(b.dataset.calday){ calGiorno = b.dataset.calday; calScelta = null; render(); }
});
function viewCalendario(){
  const A = isAdmin(), sigla = siglaSquadra(TEAM());
  const scelta = `<div class="row" style="justify-content:flex-end;margin-bottom:10px">${legendaCal()}</div>`;
  if(tab === 'calendariotutte'){
    caricaTuttiCal();
    /* Filtro per categoria: tutte, oppure una sola squadra */
    const squadre = (tuttiCal || S.teams).filter(t => !t.organizza && (t.id === curTeam || (t.matches || []).length));
    if(calCategoria && !squadre.some(t => t.id === calCategoria)) calCategoria = '';
    const ms = partiteTutte().filter(daGiocare).filter(m => !calCategoria || m.team?.id === calCategoria
      || (m.evento && (!(m.evento.squadre||[]).length || m.evento.squadre.includes(calCategoria))));
    const filtro = `<label class="note" for="cal_cat">Categoria</label> <select id="cal_cat" data-calcat="1"><option value="">Tutte le categorie</option>${
      squadre.map(t => `<option value="${esc(t.id)}" ${t.id===calCategoria?'selected':''}>${esc(t.category || t.name)}</option>`).join('')}</select>`;
    const vista = `<div class="seg" role="group" aria-label="Vista"><button data-calvista="giorno" aria-pressed="${calVista==='giorno'}">Giorno</button><button data-calvista="elenco" aria-pressed="${calVista==='elenco'}">Elenco</button></div>`;
    return `<section class="panel">
      <h2>Calendario · tutte le squadre</h2>
      ${scelta}
      <div class="row" style="justify-content:space-between;margin-bottom:8px">
        <p class="hint" style="margin:0">Le partite da giocare di tutte le squadre, fino a fine stagione. La tua squadra è evidenziata.</p>${vista}</div>
      <div class="row" style="margin-bottom:8px;gap:8px">${filtro}</div>
      ${tuttiCal ? '' : '<p class="note">Carico le altre squadre…</p>'}
      ${!ms.length ? '<p class="empty">Nessuna partita in programma.</p>'
        : calVista==='giorno' ? vistaGiorno(ms) : `<ul class="wklist callist">${listaCalendario(ms, true, modificaPartitaSquadra)}</ul>`}
      ${puoOrganizzare() ? `<div class="row" style="margin-top:12px;gap:8px"><label class="note" for="tc_squadra">Nuova amichevole per</label>
        <select id="tc_squadra">${(tuttiCal || []).filter(t => !t.organizza && !t.vedeTutte).map(t => `<option value="${esc(t.id)}" ${t.id===calCategoria?'selected':''}>${esc(t.category||t.name)}</option>`).join('')}</select>
        <button class="btn small" data-tcadd="1">+ Aggiungi amichevole</button>
        <button class="btn small primary" data-evadd="1">+ Nuovo evento</button></div>${barraGoogle()}` : ''}
    </section>`;
  }
  const tuttiGk = perPortieri() ? Object.values(portieriDati || {}).flatMap(d => d.gk.map(p => ({...p, team: d.team}))) : [];
  if(portiereScelto && !tuttiGk.some(p => p.id === portiereScelto)) portiereScelto = '';
  const squadraGk = tuttiGk.find(p => p.id === portiereScelto)?.team?.id;
  const prossime = inOrdine(impegni().filter(daGiocare).filter(m => !squadraGk || m.team?.id === squadraGk));
  const filtroGk = tuttiGk.length ? `<div class="row" style="margin-bottom:8px;gap:8px"><label class="note" for="gk_scelto">Portiere</label>
    <select id="gk_scelto" data-gkscelto="1"><option value="">Tutti i miei portieri</option>${tuttiGk.map(p => `<option value="${esc(p.id)}" ${p.id===portiereScelto?'selected':''}>${esc(p.name)} · ${esc(siglaSquadra(p.team))}</option>`).join('')}</select></div>` : '';
  /* Un solo elenco: campionato, amichevoli e tornei, ognuno con la sua etichetta. Si modificano dalla riga:
     le partite ufficiali solo l'admin, le amichevoli aggiunte dalla squadra anche il mister */
  const amichevoleMia = m => (S.reg.friendlies || []).some(f => f.id === m.id);
  const modifica = m => {
    if(amichevoleMia(m)) return `<details class="fredit" ${m.id===frAperta ? 'open' : ''}><summary>Modifica amichevole</summary>
      <div class="grid">
        <div><label class="f">Data</label><input type="date" data-frid="${m.id}" data-frf="date" value="${esc(m.date||'')}"></div>
        <div><label class="f">Ora</label><input type="time" data-frid="${m.id}" data-frf="time" value="${esc(m.time||'')}"></div>
        <div><label class="f">Avversario</label><input data-frid="${m.id}" data-frf="opponent" value="${esc(m.opponent||'')}" placeholder="Avversario"></div>
        <div><label class="f">Campo</label><input data-frid="${m.id}" data-frf="venue" value="${esc(m.venue||'')}" placeholder="Campo"></div>
      </div>
      <div class="row" style="margin-top:8px;justify-content:space-between">
        <label class="row" style="gap:6px"><input type="checkbox" data-frid="${m.id}" data-frf="home" ${m.home?'checked':''}> In casa</label>
        <button class="btn small ghost danger" data-frdel="${m.id}">Elimina amichevole</button>
      </div></details>`;
    if(A && S.calendar.some(x => x.id === m.id)) return `<details class="fredit"><summary>Modifica</summary>
      <div class="grid">
        <div><label class="f">Data</label><input type="date" data-calf="date" data-calid="${m.id}" value="${esc(m.date||'')}"></div>
        <div><label class="f">Ora</label><input type="time" data-calf="time" data-calid="${m.id}" value="${esc(m.time||'')}"></div>
        <div><label class="f">Avversario</label><input data-calf="opponent" data-calid="${m.id}" value="${esc(m.opponent||'')}" placeholder="Avversario"></div>
        <div><label class="f">Campo</label><input data-calf="venue" data-calid="${m.id}" value="${esc(m.venue||'')}" placeholder="Campo"></div>
      </div>
      <div class="row" style="margin-top:8px;justify-content:space-between">
        <label class="row" style="gap:6px"><input type="checkbox" data-calf="home" data-calid="${m.id}" ${m.home?'checked':''}> In casa</label>
        <button class="btn small ghost danger" data-caldel="${m.id}">Elimina partita</button>
      </div></details>`;
    return '';
  };
  const official = `<ul class="wklist callist">${listaCalendario(prossime, perPortieri(), modifica)}</ul>`;
  return `<section class="panel">
    <h2>Calendario · ${perPortieri() ? `i tuoi portieri${etaPortieri() ? ' · ' + etaPortieri().map(e => 'U'+e).join(', ') : ''}` : esc(sigla)}</h2>
    ${scelta}
    <p class="hint">${perPortieri() ? 'Le partite da giocare delle categorie dei tuoi portieri (le assegna la società). Tutta la società è in "Tutte le squadre".'
      : `Tutte le partite da giocare fino a fine stagione: campionato, amichevoli e tornei, ognuna con la sua etichetta. ${A ? 'Tocca "Modifica" per cambiarne una.' : 'Le amichevoli che aggiungi tu si cambiano da "Modifica amichevole".'} Le partite già giocate sono nello storico, in fondo.`}</p>
    ${filtroGk}
    ${prossime.length ? official : '<p class="empty">Nessuna partita da giocare.</p>'}
    ${perPortieri() ? '' : `<div class="row" style="margin-top:10px">${isDirettore() ? '' : '<button class="btn small" data-act="fradd">+ Aggiungi amichevole</button>'}${A ? '<button class="btn small ghost" data-act="caladd">+ Partita ufficiale</button>' : ''}</div>`}
    ${viewStorico()}
  </section>
`;
}
/* Squadra → Allenamento → I miei allenamenti: in programma (lavori in corso) */
function viewMieiAllenamenti(){
  return `<section class="panel lavori">
    <div class="lavori-icona" aria-hidden="true">🚧</div>
    <h2>I miei allenamenti</h2>
    <p class="lavori-tag">Lavori in corso</p>
    <p class="hint">Qui potrai preparare e ritrovare le tue sedute: esercizi, obiettivi, durata, materiale, e riusarle durante la stagione.
    La funzione è in programma e arriverà nei prossimi aggiornamenti.</p>
    <p class="note">Nel frattempo le presenze si segnano in <button class="linkbtn" data-tab="allenamenti">Presenze</button>.</p>
  </section>`;
}
/* Squadra → Campi: posizione esatta dei campi per il link di Google Maps */
function viewCampi(){
  return viewVenues() || `<section class="panel"><h2>Campi</h2><p class="empty">Nessun campo: i campi arrivano dalle partite del calendario.</p></section>`;
}

function viewVenues(){
  const vs = [...new Set(allCalendar().map(m => (m.venue||'').trim()).filter(Boolean))].sort((a,b) => a.localeCompare(b,'it'));
  if(!vs.length) return '';
  const n = vs.filter(v => venuePin(v)).length;
  return `<section class="panel">
    <h2>Campi · posizione per Google Maps</h2>
    <p class="hint">Con la posizione esatta salvata, il link di convocazioni e foglio convocazione porta dritto al cancello. ${n} campi su ${vs.length} impostati.</p>
    <div class="reglist">${vs.map(v => `<div class="regrow venuerow"><div><b>${esc(v)}</b><div><a class="mapslink" href="${esc(venueUrl(v))}" target="_blank" rel="noopener">📍 Prova il link</a></div>${pinBox(v)}</div></div>`).join('')}</div>
  </section>`;
}

/* ---------- Allenamento / Gara: pagine del registro ---------- */
function registroPage(title, body, hint){
  if(!S.players.length) return `<section class="panel"><h2>${title}</h2><p class="empty">Prima serve la rosa (Squadra → Rosa).</p></section>`;
  return `<section class="panel"><h2>${title} · ${esc(TEAM()?.name||'')}</h2>${hint?`<p class="hint">${hint}</p>`:''}${body}</section>`;
}

/* ---------- Scouting: il mister segnala un giocatore allo scouting del club ----------
   Passa dalla funzione coach_segnala (col PIN della squadra, migrazione 0007): il mister
   manda la segnalazione ma non vede l'archivio. La bozza resta in segDraft mentre si scrive,
   così gli aggiornamenti che ridisegnano la pagina non cancellano niente. */
/* ---------- Scouting → Giocatori: gli osservati dell'annata della squadra (coach_giocatori, 0028) ----------
   Scheda base, segnalazioni e valutazioni; mai i contatti delle famiglie. */
let giocatoriAnnata = null, giocatoriErrore = '', giocatoriCerca = '';
const STATI_SCOUTING = {in_lista:'In lista', in_osservazione:'In osservazione', da_rivedere:'Da rivedere', inserito:'Inserito', da_non_inserire:'Da non inserire'};
const GIUDIZI = {da_prendere:'Da prendere', da_rivedere:'Da rivedere', non_a_livello:'Non a livello'};
/* Convocazioni dell'attività di base: aggiungi una partita del weekend, o tutte */
document.addEventListener('click', e => {
  const b = e.target.closest('[data-adbsug],[data-adbweekend]'); if(!b || !curTeam) return;
  const pp = partiteAdb(), usate = new Set(pp.map(p => p.calId).filter(Boolean)), [sab, dom] = weekendISO();
  const nuove = b.dataset.adbsug ? allCalendar().filter(m => m.id === b.dataset.adbsug)
    : inOrdine(allCalendar().filter(m => (m.date===sab || m.date===dom) && !usate.has(m.id)));
  /* una partita vuota (senza calendario né convocati) si riempie invece di aggiungerne un'altra */
  for(const m of nuove){
    if(pp.length >= ADB_MAX) break;
    const vuota = pp.find(p => !p.calId && !p.opponent && !(p.conv||[]).length);
    if(vuota) Object.assign(vuota, nuovaPartitaAdb(m), {id: vuota.id}); else pp.push(nuovaPartitaAdb(m));
  }
  save('sheet'); render();
});
let giocatoriStato = '', giocatoriRuolo = '';
const ORDINE_STATI = ['in_lista','in_osservazione','da_rivedere','inserito','da_non_inserire'];
const SIGLE_RUOLO = {portiere:'POR', difensore:'DIF', centrocampista:'CEN', attaccante:'ATT'};
const AREE_VAL = [['tecnica','Tecnica'],['motoria','Motoria'],['tattica','Tattica'],['mentale','Mentale']];
const mediaVal = v => v ? (v.tecnica + v.motoria + v.tattica + v.mentale) / 4 : null;
/* Chi ha valutato: iniziali in un cerchio colorato, stesso colore per la stessa persona (come nello Scouting, components/Autore.tsx) */
const COLORI_AUTORE = ['#003DA5','#C41E3A','#B8860B','#6B3FA0','#0F7C7C','#A34A1E','#B8336A','#35506B','#4A5563','#1F5FA8'];
/* Le 3 caselle delle valutazioni (persone diverse, come nello Scouting): verdi a 3 su 3 */
function slotValutazioni(valutazioni){
  const chi = [...new Set((valutazioni||[]).map(v => v.autore || '?'))], ok = chi.length >= 3;
  return `<span class="slotval${ok ? ' ok' : ''}" title="${ok ? 'Valutato da 3 persone: si può inserire' : chi.length + ' di 3 valutazioni per l\'inserimento'}">${
    [0,1,2].map(i => chi[i] ? autoreTondo(chi[i]) : '<span class="autore vuoto" aria-hidden="true">·</span>').join('')}${chi.length > 3 ? `<small>+${chi.length-3}</small>` : ''}${ok ? '<b aria-hidden="true">✓</b>' : ''}</span>`;
}
function autoreTondo(nome){
  if(!nome) return '';
  const mister = /^mister\b|·/i.test(nome), pulito = nome.replace(/^Mister\s+/i, '').split('·')[0].trim(), p = pulito.split(/\s+/).filter(Boolean);
  const ini = ((p[0]?.[0] || '?') + (p.length > 1 ? p[p.length-1][0] : '')).toUpperCase();
  let h = 0; for(const c of (mister ? 'm:' : '') + nome) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const col = COLORI_AUTORE[h % COLORI_AUTORE.length];
  return `<span class="autore${mister ? ' mister' : ''}" style="--ac:${col}" title="${esc(nome)}" aria-label="Valutazione di ${esc(nome)}">${esc(ini)}</span>`;
}
function viewGiocatori(){
  if(!coachPin) return `<h2>Giocatori</h2><section class="panel"><p class="empty">L'elenco si vede entrando col PIN della squadra.</p></section>`;
  if(giocatoriAnnata === null && !giocatoriErrore){
    giocatoriAnnata = undefined;
    supabaseClient.rpc('coach_giocatori', {p_pin: coachPin}).then(({data, error}) => {
      if(error){ giocatoriErrore = 'Elenco non disponibile.'; giocatoriAnnata = null; } else giocatoriAnnata = data || [];
      if(tab==='giocatori') render();
    });
  }
  /* Preparatori dei portieri (vedeTutte): i portieri di tutte le annate */
  const mia = S.teams.find(t => t.id === (squadraPropria || curTeam)), portieri = !!mia?.vedeTutte;
  const eta = etaSquadra(mia), stagione = +todayISO().slice(0,4) + (+todayISO().slice(5,7) >= 7 ? 1 : 0), annata = eta < 99 ? stagione - eta : null;
  const titolo = `<h2>${portieri ? 'Portieri · tutte le annate' : `Giocatori${annata ? ' · annata '+annata : ''}`}</h2>
    <p class="hint">${portieri ? 'I portieri osservati dallo scouting, di tutte le annate.' : 'I giocatori osservati dallo scouting della tua annata.'} Tocca un nome per valutazioni e segnalazioni.</p>`;
  if(!annata && !portieri) return titolo + '<section class="panel"><p class="empty">Questa squadra non ha un\'annata: l\'elenco è per le squadre Under.</p></section>';
  if(giocatoriErrore) return titolo + `<section class="panel"><p class="empty">${esc(giocatoriErrore)}</p></section>`;
  if(giocatoriAnnata === undefined) return titolo + '<section class="panel"><p class="note">Carico i giocatori…</p></section>';
  const tutti = giocatoriAnnata || [], q = giocatoriCerca.trim().toLowerCase();
  const cercati = tutti.filter(g => !q || [g.cognome, g.nome, g.descrizione, g.societa].join(' ').toLowerCase().includes(q));
  const perRuolo = cercati.filter(g => !giocatoriRuolo || (giocatoriRuolo === '-' ? !g.ruolo : g.ruolo === giocatoriRuolo));
  const lista = perRuolo.filter(g => !giocatoriStato || g.stato === giocatoriStato);
  const conta = (arr, f) => arr.filter(f).length;
  const chip = (attr, val, cur, label, n) => `<button class="gchip" ${attr}="${val}" aria-pressed="${val===cur}">${label} <span>${n}</span></button>`;
  const filtri = `<div class="gfiltri">
      <div class="gchips" role="group" aria-label="Stato">${chip('data-gstato', '', giocatoriStato, 'Tutti', perRuolo.length)}${
        ORDINE_STATI.filter(k => conta(perRuolo, g => g.stato===k)).map(k => chip('data-gstato', k, giocatoriStato, `<i class="gdot st-${k}"></i>${STATI_SCOUTING[k]}`, conta(perRuolo, g => g.stato===k))).join('')}</div>
      ${portieri ? '' : `<div class="gchips" role="group" aria-label="Ruolo">${chip('data-gruolo', '', giocatoriRuolo, 'Tutti i ruoli', cercati.length)}${
        Object.keys(SIGLE_RUOLO).filter(k => conta(cercati, g => g.ruolo===k)).map(k => chip('data-gruolo', k, giocatoriRuolo, RUOLI_SCOUTING[k], conta(cercati, g => g.ruolo===k))).join('')}${
        conta(cercati, g => !g.ruolo) ? chip('data-gruolo', '-', giocatoriRuolo, 'Ruolo da definire', conta(cercati, g => !g.ruolo)) : ''}</div>`}
    </div>`;
  const barre = v => AREE_VAL.map(([k,l]) => `<div class="gbar"><span>${l}</span><i><b style="width:${v[k]*20}%"></b></i><strong>${v[k]}</strong></div>${v[k+'_note'] ? `<p class="gtxt gnota">${esc(v[k+'_note'])}</p>` : ''}`).join('');
  /* Anteprima a colonne: 4 aree dell'ultima valutazione (colore dal voto), segnalazioni, giudizio */
  const tile = (l, v, cls = '') => `<span class="gt ${v==null || v==='' ? 'vuoto' : cls}"><small>${l}</small><b>${v==null || v==='' ? '–' : v}</b></span>`;
  const riga = g => {
    const nome = [g.cognome, g.nome].filter(Boolean).join(' ') || g.descrizione || 'Senza nome';
    const ultima = g.valutazioni[0], media = mediaVal(ultima);
    const agg = [ultima?.data, g.segnalazioni[0]?.data].filter(Boolean).sort().pop();
    const info = [portieri ? String(g.annata) : '', g.societa, agg ? 'agg. ' + fmtDate(agg).slice(0,5) : ''].filter(Boolean).map(esc).join(' · ');
    return `<details class="grow st-${esc(g.stato)}${new Set((g.valutazioni||[]).map(v => v.autore || '?')).size >= 3 ? ' completo' : ''}"><summary>
        <div class="gtesta">
          <div class="gprinc"><div class="gnome"><b>${esc(nome)}</b>${g.ruolo ? `<span class="gruolo">${SIGLE_RUOLO[g.ruolo]}</span>` : ''}</div>
            <div class="note">${info || '&nbsp;'}</div></div>
          <div class="gmedia ${media==null ? 'vuota' : 'v'+Math.round(media)}" title="Media dell'ultima valutazione"><small>Media</small>${media==null ? '–' : media.toFixed(1)}</div>
        </div>
        <div class="gcolonne">
          ${AREE_VAL.map(([k,l]) => tile(l.slice(0,3).toUpperCase(), ultima?.[k], 'v'+ultima?.[k])).join('')}
          ${tile('SEGN', g.segnalazioni.length || null, 'conta')}
          ${ultima ? `<span class="ggiud gg-${esc(ultima.giudizio)}">${esc(GIUDIZI[ultima.giudizio]||'')}</span>` : '<span class="ggiud gg-nessuno">Da valutare</span>'}
          ${slotValutazioni(g.valutazioni)}
        </div></summary>
      <div class="gdett">
        ${g.descrizione && g.cognome ? `<p class="note">${esc(g.descrizione)}</p>` : ''}
        ${g.piede ? `<p class="note">Piede ${esc(g.piede)}${g.categoria ? ' · '+esc(g.categoria) : ''}</p>` : ''}
        ${g.valutazioni.map(v => `<div class="gval"><div class="note">${autoreTondo(v.autore)} ${fmtDate(v.data)}${v.contesto ? ' · '+esc(v.contesto) : ''}${v.autore ? ' · '+esc(v.autore) : ''}</div>
          ${barre(v)}<p class="gtxt"><span class="ggiud gg-${esc(v.giudizio)}">${esc(GIUDIZI[v.giudizio] || v.giudizio)}</span>${v.commento ? ' '+esc(v.commento) : ''}</p></div>`).join('')}
        ${g.segnalazioni.map(x => `<div class="gval gseg"><div class="note">Segnalazione · ${fmtDate(x.data)}${x.contesto ? ' · '+esc(x.contesto) : ''}${x.autore ? ' · '+esc(x.autore) : ''}${x.voto ? ` · <b>${x.voto}/5</b>` : ''}</div><p class="gtxt">${esc(x.testo)}</p></div>`).join('')}
        ${!g.valutazioni.length && !g.segnalazioni.length ? '<p class="note">Nessuna segnalazione o valutazione.</p>' : ''}
      </div></details>`;
  };
  const gruppi = ORDINE_STATI.concat([...new Set(lista.map(g => g.stato))].filter(k => !ORDINE_STATI.includes(k)))
    .map(k => ({k, gs: lista.filter(g => g.stato === k)})).filter(x => x.gs.length);
  return titolo + `<section class="panel">
    <input id="gc_cerca" type="search" value="${esc(giocatoriCerca)}" placeholder="Cerca per nome o società" aria-label="Cerca giocatore">
    ${filtri}
    ${lista.length ? gruppi.map(x => `<h3 class="gtitolo"><i class="gdot st-${esc(x.k)}"></i>${esc(STATI_SCOUTING[x.k] || x.k)} <span>${x.gs.length}</span></h3>${x.gs.map(riga).join('')}`).join('')
      : '<p class="empty">Nessun giocatore con questi filtri.</p>'}
  </section>`;
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-gstato],[data-gruolo]'); if(!b) return;
  if(b.dataset.gstato !== undefined) giocatoriStato = b.dataset.gstato; else giocatoriRuolo = b.dataset.gruolo;
  render();
});
document.addEventListener('input', e => {
  if(e.target.id !== 'gc_cerca') return;
  giocatoriCerca = e.target.value; const pos = e.target.selectionStart; render();
  const c = $('#gc_cerca'); if(c){ c.focus(); c.setSelectionRange(pos, pos); }
});
let segDraft = {data: todayISO()}, segEsito = null, segInvio = false, societaNomi = null;
const RUOLI_SCOUTING = {portiere:'Portiere', difensore:'Difensore', centrocampista:'Centrocampista', attaccante:'Attaccante'};
/* stesso elenco di annateDisponibili() in lib/tipi.ts */
function annateScouting(){ const a = new Date().getFullYear(); return Array.from({length:16}, (_, i) => String(a - 5 - i)); }
/* Giocatore già in lista (coach_segnala risponde esistente, 0032): al posto della segnalazione la valutazione (coach_valuta) */
let segValuta = null;
const AREE_VALUTA = [['tecnica','Tecnica','Controllo, passaggio, tiro, uso dei due piedi'],['motoria','Motoria','Velocità, coordinazione, resistenza, forza'],
  ['tattica','Tattica','Posizione, letture di gioco, scelte'],['mentale','Mentale','Carattere, concentrazione, reazione all\'errore']];
function viewValutaMister(){
  const v = segValuta;
  return `<h2>Valutazione</h2>
  <p class="esito" role="status" style="border-left:4px solid var(--amber)"><b>${esc(v.nome || 'Il giocatore')} (${esc(v.annata||'')}${v.societa ? ', '+esc(v.societa) : ''}) è già in lista.</b>
    Invece di una nuova segnalazione, valutalo: quello che avevi scritto è nel commento finale.</p>
  ${segEsito && !segEsito.ok ? `<p class="esito ko" role="alert">${esc(segEsito.msg)}</p>` : ''}
  <section class="panel segform">
    ${AREE_VALUTA.map(([k,l,aiuto]) => `<div class="valarea"><div class="row" style="justify-content:space-between;align-items:baseline"><b>${l}</b><span class="note">${aiuto}</span></div>
      <div class="seg" role="group" aria-label="${l} da 1 a 5">${[1,2,3,4,5].map(n => `<button type="button" data-valv="${k}:${n}" aria-pressed="${String(v[k])===String(n)}">${n}</button>`).join('')}</div>
      <textarea data-valf="${k}_note" rows="2" placeholder="Note (facoltative)">${esc(v[k+'_note']||'')}</textarea></div>`).join('')}
    <span class="f">Giudizio finale *</span>
    <div class="seg" role="group" aria-label="Giudizio">${Object.entries(GIUDIZI).map(([k,l]) => `<button type="button" data-valg="${k}" aria-pressed="${v.giudizio===k}">${l}</button>`).join('')}</div>
    <label class="f" for="val_comm">Commento finale</label><textarea id="val_comm" data-valf="commento" rows="4">${esc(v.commento||'')}</textarea>
    <div class="grid">
      <div><label class="f">Partita o occasione</label><input data-valf="contesto" value="${esc(v.contesto||'')}"></div>
      <div><label class="f">Data</label><input type="date" data-valf="data" value="${esc(v.data||'')}"></div>
    </div>
    <div class="row" style="gap:8px;margin-top:10px"><button class="btn primary" data-act="valuta" ${segInvio?'disabled':''}>${segInvio ? 'Salvataggio…' : 'Salva valutazione'}</button>
      <button class="btn ghost" data-act="valutaannulla">Annulla</button></div>
  </section>`;
}
async function inviaValutazione(){
  if(segInvio) return;
  const v = segValuta, manca = AREE_VALUTA.find(([k]) => !v[k]);
  if(manca){ segEsito = {ok:false, msg:`Manca il voto di ${manca[1]}.`}; render(); window.scrollTo(0,0); return; }
  if(!v.giudizio){ segEsito = {ok:false, msg:'Scegli il giudizio finale.'}; render(); window.scrollTo(0,0); return; }
  segInvio = true; render();
  const dati = Object.fromEntries(Object.entries(v).filter(([k]) => !['giocatore_id','nome','annata','societa'].includes(k)));
  const { error } = await supabaseClient.rpc('coach_valuta', {p_pin: coachPin, p_giocatore: v.giocatore_id, p_dati: dati});
  segInvio = false;
  if(error){ segEsito = {ok:false, msg: error.message || 'Valutazione non salvata, riprova.'}; render(); return; }
  segValuta = null; segDraft = {data: todayISO()}; giocatoriAnnata = null;
  segEsito = {ok:true, msg:'Valutazione salvata. Grazie!'}; render(); window.scrollTo(0,0);
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-valv],[data-valg]'); if(!b || !segValuta) return;
  if(b.dataset.valv){ const [k, n] = b.dataset.valv.split(':'); segValuta[k] = +n; }
  else segValuta.giudizio = b.dataset.valg;
  render();
});
document.addEventListener('input', e => { if(segValuta && e.target.dataset?.valf) segValuta[e.target.dataset.valf] = e.target.value; });
function viewSegnala(){
  if(!coachPin) return `<h2>Segnala un giocatore</h2><section class="panel"><p class="empty">La segnalazione si fa entrando col PIN della squadra.</p></section>`;
  if(segValuta) return viewValutaMister();
  if(societaNomi === null){
    societaNomi = [];
    supabaseClient.rpc('coach_societa', {p_pin: coachPin}).then(({data}) => { if(Array.isArray(data)){ societaNomi = data; if(tab==='segnala') render(); } });
  }
  const d = segDraft;
  const inp = (k, attrs='') => `<input id="sg_${k}" data-seg="${k}" value="${esc(d[k]||'')}" ${attrs}>`;
  return `<h2>Segnala un giocatore</h2>
  <p class="hint">Hai visto un ragazzo interessante? Mandalo allo scouting del club. Se non sai il nome, descrivilo: lo completeranno loro.</p>
  ${segEsito ? `<p class="esito ${segEsito.ok?'ok':'ko'}" role="${segEsito.ok?'status':'alert'}">${esc(segEsito.msg)}</p>` : ''}
  <section class="panel segform">
    <div class="grid">
      <div><label class="f" for="sg_annata">Annata *</label><select id="sg_annata" data-seg="annata"><option value="">Scegli</option>${annateScouting().map(a => `<option ${a===d.annata?'selected':''}>${a}</option>`).join('')}</select></div>
      <div><label class="f" for="sg_ruolo">Ruolo</label><select id="sg_ruolo" data-seg="ruolo"><option value="">Non so</option>${Object.entries(RUOLI_SCOUTING).map(([v,l]) => `<option value="${v}" ${v===d.ruolo?'selected':''}>${l}</option>`).join('')}</select></div>
    </div>
    <label class="f" for="sg_societa">Società</label>
    ${inp('societa', 'list="sg_elenco" autocomplete="off"')}<datalist id="sg_elenco">${societaNomi.map(n => `<option value="${esc(n)}">`).join('')}</datalist>
    <div class="grid">
      <div><label class="f" for="sg_cognome">Cognome</label>${inp('cognome', 'autocomplete="off" autocapitalize="words"')}</div>
      <div><label class="f" for="sg_nome">Nome</label>${inp('nome', 'autocomplete="off" autocapitalize="words"')}</div>
    </div>
    <div id="sg_gia">${giaInListaHtml()}</div>
    <label class="f" for="sg_descrizione">Come riconoscerlo</label>
    ${inp('descrizione', 'autocomplete="off" placeholder="Es. N.8, biondo, mancino"')}
    <p class="note">Obbligatorio se manca il cognome.</p>
    <label class="f" for="sg_testo">Cosa hai visto *</label>
    <textarea id="sg_testo" data-seg="testo" rows="5">${esc(d.testo||'')}</textarea>
    <span class="f">Prima impressione (facoltativa)</span>
    <div class="seg" role="group" aria-label="Voto da 1 a 5">${[1,2,3,4,5].map(n => `<button type="button" data-segvoto="${n}" aria-pressed="${String(n)===d.voto}">${n}</button>`).join('')}</div>
    <p class="note">1 = non a livello · 5 = da prendere subito</p>
    <div class="grid">
      <div><label class="f" for="sg_contesto">Partita o occasione</label>${inp('contesto', 'placeholder="Es. Cambiaghese–Vibe, U12"')}</div>
      <div><label class="f" for="sg_data">Data</label>${inp('data', 'type="date"')}</div>
    </div>
    <button class="btn primary segsend" data-act="segnala" ${segInvio?'disabled':''}>${segInvio ? 'Invio…' : 'Invia allo scouting'}</button>
  </section>`;
}
/* Già in lista mentre si scrive: gli osservati della tua annata (coach_giocatori) con quel cognome, anche scritto
   un po' diverso. "Valuta questo" apre subito la valutazione; "No, è un altro" nasconde l'avviso. */
let giaNascosti = '';
const normSeg = s => String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
function giaInLista(){
  const d = segDraft, c = normSeg(d.cognome), n = normSeg(d.nome);
  if(!d.annata || c.length < 3) return [];
  if(giocatoriAnnata === null && !giocatoriErrore){
    giocatoriAnnata = undefined;
    supabaseClient.rpc('coach_giocatori', {p_pin: coachPin}).then(({data, error}) => {
      if(error){ giocatoriErrore = 'Elenco non disponibile.'; giocatoriAnnata = null; } else giocatoriAnnata = data || [];
      aggiornaGiaInLista();
    });
  }
  return (giocatoriAnnata || []).filter(g => String(g.annata) === String(d.annata)
      && (normSeg(g.cognome).startsWith(c) || (normSeg(g.cognome) && c.startsWith(normSeg(g.cognome)))))
    .sort((a, b) => (n && normSeg(b.nome).startsWith(n)) - (n && normSeg(a.nome).startsWith(n))).slice(0, 5);
}
function giaInListaHtml(){
  const tr = giaInLista(), firma = tr.map(g => g.id).join();
  if(!tr.length || firma === giaNascosti) return '';
  /* finestra sopra la pagina: "Vuoi valutare?" */
  return `<div class="giafondo" role="dialog" aria-modal="true" aria-labelledby="gia_titolo"><div class="giafin">
    <h3 id="gia_titolo">Già in lista. Vuoi valutare?</h3>
    <p class="note">${tr.length === 1 ? 'Questo ragazzo è' : 'Questi ragazzi sono'} già nell'archivio: se è lui, niente nuova segnalazione, lo valuti (quello che hai scritto va nel commento).</p>
    ${tr.map(g => `<div class="row giariga">
      <span><b>${esc([g.cognome, g.nome].filter(Boolean).join(' '))}</b> <span class="note">· ${esc(g.annata)}${g.societa ? ' · '+esc(g.societa) : ''}</span></span>
      <button type="button" class="btn small primary" data-giavaluta="${esc(g.id)}">Sì, valuta</button></div>`).join('')}
    <button type="button" class="btn giano" data-gianascondi="${esc(firma)}">No, è un altro giocatore</button></div></div>`;
}
function aggiornaGiaInLista(subito){
  clearTimeout(aggiornaGiaInLista.t);
  const fai = () => { const el = document.getElementById('sg_gia'); if(el) el.innerHTML = giaInListaHtml(); };
  if(subito) fai(); else aggiornaGiaInLista.t = setTimeout(fai, 700);   // aspetta una pausa nella scrittura
}
/* (questo file si carica prima di eventi.js: la bozza la aggiorno qui, prima di cercare) */
document.addEventListener('input', e => { const k = e.target.dataset?.seg;
  if(['cognome','nome','annata'].includes(k)){ segDraft[k] = e.target.value; aggiornaGiaInLista(); } });
document.addEventListener('click', e => {
  const b = e.target.closest('[data-giavaluta],[data-gianascondi]'); if(!b) return;
  if(b.dataset.gianascondi !== undefined){ giaNascosti = b.dataset.gianascondi; aggiornaGiaInLista(true); return; }
  const g = (giocatoriAnnata || []).find(x => x.id === b.dataset.giavaluta); if(!g) return;
  const d = segDraft;
  segValuta = {giocatore_id: g.id, nome: [g.cognome, g.nome].filter(Boolean).join(' '), annata: g.annata, societa: g.societa || '',
    commento: d.testo || '', contesto: d.contesto || '', data: d.data || todayISO()};
  segEsito = null; render(); window.scrollTo(0,0);
});
async function inviaSegnalazione(){
  if(segInvio) return;
  const d = segDraft;
  const manca = !d.annata ? 'Indica l’annata.'
    : !(d.cognome||'').trim() && !(d.descrizione||'').trim() ? 'Serve il cognome oppure una descrizione per riconoscerlo.'
    : !(d.testo||'').trim() ? 'Scrivi cosa hai visto: è la parte più importante.' : '';
  if(manca){ segEsito = {ok:false, msg:manca}; render(); window.scrollTo(0,0); return; }
  segInvio = true; render();
  let error = null;
  let risposta = null;
  try{ ({ data: risposta, error } = await supabaseClient.rpc('coach_segnala', {p_pin: coachPin, p_dati: {...d}})); }catch(e){ error = e; }
  segInvio = false;
  if(!error && risposta?.esistente){
    /* già in lista: si apre la valutazione, con quello che si era scritto nel commento */
    segValuta = {...risposta, commento: d.testo || '', contesto: d.contesto || '', data: d.data || todayISO()}; segEsito = null;
  }
  else if(!error){ segEsito = {ok:true, msg:'Segnalazione inviata allo scouting. Grazie!'}; segDraft = {data: todayISO()}; }
  else if(error.code === 'PGRST202') segEsito = {ok:false, msg:'Funzione non ancora attiva: chiedi all’admin di eseguire la migrazione 0007.'};
  else if(error.code === 'PT429') segEsito = {ok:false, msg:'Troppi PIN sbagliati in poco tempo: riprova tra qualche minuto.'};
  else if(error.code === '28000') segEsito = {ok:false, msg:'PIN della squadra non più valido: rientra dalla pagina d’ingresso.'};
  else segEsito = {ok:false, msg: error.message || 'Segnalazione non inviata, riprova.'};
  render(); window.scrollTo(0,0);
}
