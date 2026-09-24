/* Portale Academy Casatese Merate · Portale: aree e sotto-schede, indirizzo della pagina, Home, Squadra → Calendario.
   I file si caricano in ordine (vedi index.html) e condividono le stesse variabili globali. */
/* ---------- Portale: aree, sotto-schede, indirizzo della pagina ---------- */
/* L'indirizzo tiene la scheda aperta (#/formazione, oppure #squadra=PIN/formazione per i mister):
   il tasto indietro del telefono torna alla scheda precedente e si può mandare il link a una sezione. */
const AREA_ICONS = {
  home:'<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10"/><path d="M10 20v-6h4v6"/>',
  squadra:'<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.6 2.7-6 6-6s6 2.4 6 6"/><circle cx="17" cy="9" r="2.5"/><path d="M16.5 14.2c2.6.3 4.5 2.4 4.5 5.8"/>',
  gara:'<circle cx="12" cy="12" r="9"/><path d="m12 7.5 4 2.9-1.5 4.8h-5L8 10.4z"/><path d="M12 3v4.5M21 10.4l-5 0M17.3 19.3l-2.8-4.1M6.7 19.3l2.8-4.1M3 10.4l5 0"/>',
  allenamento:'<circle cx="13.5" cy="4.5" r="2"/><path d="m9 21 2.5-6 2.5 2.5V21"/><path d="M6 12.5 9 9l4 1.5 2.5 3.5H19"/><path d="m11.5 15-2-3"/>',
  statistiche:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  societa:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'
};
const AREAS = [
  {k:'home', label:'Home', tabs:['home']},
  {k:'squadra', label:'Squadra', tabs:['rosa','calendario']},
  {k:'gara', label:'Gara', tabs:['partita','convocazioni','formazione','piazzati','pdf']},
  {k:'allenamento', label:'Allenamento', tabs:['allenamenti','test']},
  {k:'statistiche', label:'Statistiche', tabs:['statistiche','tabellini']},
  {k:'societa', label:'Società', tabs:['squadre'], admin:true}
];
const TAB_NAMES = {home:'Home', rosa:'Rosa', calendario:'Calendario', partita:'Partita', convocazioni:'Convocazioni', formazione:'Formazione',
  piazzati:'Piazzati', pdf:'Foglio gara PDF', tabellini:'Tabellini', allenamenti:'Presenze', test:'Test atletici', statistiche:'Statistiche', squadre:'Squadre'};
const areaLast = {};
const allowedAreas = () => AREAS.filter(a => !a.admin || isAdmin());
function allowedTabs(){ return allowedAreas().flatMap(a => a.tabs); }
const areaOf = t => AREAS.find(a => a.tabs.includes(t)) || AREAS[0];
function routeTab(){ const m = (location.hash||'').match(/\/(\w+)$/); return m && TAB_NAMES[m[1]] ? m[1] : null; }
const startTab = () => routeTab() || 'home';
function writeRoute(push){
  const pin = ((location.hash||'').match(/squadra=([\w-]+)/)||[])[1];
  const h = '#' + (pin ? 'squadra=' + pin : '') + '/' + tab;
  if(location.hash !== h) history[push ? 'pushState' : 'replaceState'](null, '', h);
}
function goTab(t){
  if(!allowedTabs().includes(t)) t = 'home';
  tab = t; areaLast[areaOf(t).k] = t;
  selectedPlayer = null; if(t!=='piazzati') openSchemeId = null;
  openTrainingId = openGameId = openTestId = null;
  writeRoute(true); render(); window.scrollTo(0,0);
}
window.addEventListener('popstate', () => {
  const t = routeTab();
  if(t && allowedTabs().includes(t) && t !== tab){ tab = t; openTrainingId = openGameId = openTestId = null; render(); window.scrollTo(0,0); }
});
function renderNav(){
  const cur = areaOf(tab);
  $('#areanav').innerHTML = allowedAreas().map(a => `<button class="areabtn" data-area="${a.k}" aria-current="${a===cur?'page':'false'}">
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${AREA_ICONS[a.k]}</svg><span>${a.label}</span></button>`).join('');
  $('#areanav').classList.remove('hidden');
  $('#tabs').innerHTML = cur.tabs.length > 1 ? cur.tabs.map(k => `<button class="tab" role="tab" data-tab="${k}" aria-selected="${k===tab}">${TAB_NAMES[k]}</button>`).join('') : '';
  $('#tabs').classList.toggle('hidden', cur.tabs.length <= 1);
}

/* ---------- Home ---------- */
function daysUntil(d){ const a = new Date(todayISO()+'T12:00:00'), b = new Date(d+'T12:00:00'); return Math.round((b-a)/86400000); }
const whenTxt = d => { const n = daysUntil(d); return n===0 ? 'oggi' : n===1 ? 'domani' : n>1 ? `tra ${n} giorni` : `${-n} giorni fa`; };
function homeTodo(){
  const today = todayISO(), items = [];
  const noReason = S.reg.trainings.reduce((a,t) => a + Object.values(t.att||{}).filter(v => v==='A').length, 0);
  if(noReason) items.push({txt:`${noReason} assenz${noReason===1?'a':'e'} senza motivo negli allenamenti`, go:'allenamenti'});
  const cal = allCalendar().filter(m => m.date && m.date < today).sort((a,b) => b.date.localeCompare(a.date));
  cal.forEach(m => {
    const g = S.reg.games.find(x => x.calId===m.id);
    if(!g || !gamePlayed(g)) items.push({txt:`Tabellino da compilare: ${m.opponent||'partita'} (${fmtDate(m.date).slice(0,5)})`, go:'opencal:'+m.id});
    else if(!gameScore(g)) items.push({txt:`Gol da inserire: ${m.opponent||'partita'} (${fmtDate(m.date).slice(0,5)})`, go:'opengm:'+g.id});
  });
  if(S.players.length && !(S.reg.gk||[]).length) items.push({txt:'Segna i portieri con 🧤 nella Rosa', go:'rosa'});
  return items;
}
function viewHome(){
  if(!curTeam) return `<section class="panel"><h2>Benvenuto</h2><p class="empty">Nessuna squadra. Creane una in Società → Squadre.</p></section>`;
  const T0 = TEAM(), nm = nextMatch(), today = todayISO();
  const trToday = S.reg.trainings.find(t => t.date===today);
  const {team} = computeStats();
  const todo = homeTodo(), maxTodo = 6;
  const s = S.sheet, sheetIsNext = nm && s.date===nm.date && (s.opponent||'').trim().toLowerCase()===(nm.opponent||'').trim().toLowerCase();
  const matchCard = nm ? `<div class="hcard hmatch">
      <div class="hlabel">Prossima partita · ${whenTxt(nm.date)}</div>
      <div class="hbig">${esc(nm.home ? `${teamLabel()} - ${nm.opponent||'Avversario'}` : `${nm.opponent||'Avversario'} - ${teamLabel()}`)}</div>
      <div class="note">${weekday(nm.date)} ${fmtDate(nm.date)}${nm.time?' · ore '+esc(nm.time):''}${nm.venue?' · '+esc(nm.venue):''}${nm.friendly?' · amichevole':''}</div>
      <div class="row" style="margin-top:12px"><button class="btn primary small" data-hgo="prep">${sheetIsNext ? 'Apri la gara' : 'Prepara la gara'}</button><button class="btn small" data-hgo="conv">Convocazioni</button></div>
    </div>` : `<div class="hcard"><div class="hlabel">Prossima partita</div><p class="note">Nessuna partita in calendario.</p><button class="btn small" data-hgo="calendario">Apri il calendario</button></div>`;
  const trCard = trToday
    ? (() => { const v = S.players.map(p => attOf(trToday, p.id)); return `<div class="hcard"><div class="hlabel">Allenamento di oggi</div>
        <div class="hbig">${v.filter(x=>x==='P').length} presenti <span class="note">· ${v.filter(isAbs).length} assenti</span></div>
        <div class="row" style="margin-top:12px"><button class="btn small" data-hgo="tr:${trToday.id}">Modifica presenze</button></div></div>`; })()
    : `<div class="hcard"><div class="hlabel">Allenamento di oggi</div><p class="note">Presenze non ancora segnate.</p>
        <div class="row" style="margin-top:10px"><button class="btn primary small" data-hgo="trnew">Segna le presenze di oggi</button></div></div>`;
  const todoCard = `<div class="hcard hwide"><div class="hlabel">Da fare</div>
    ${todo.length ? `<ul class="todo">${todo.slice(0,maxTodo).map(i => `<li><button data-hgo="${i.go}">${esc(i.txt)}<span aria-hidden="true">›</span></button></li>`).join('')}</ul>${todo.length>maxTodo?`<p class="note">…e altre ${todo.length-maxTodo}</p>`:''}`
      : '<p class="note">Tutto in ordine ✓</p>'}</div>`;
  const numCard = `<div class="hcard hwide"><div class="hlabel">Stagione</div>
    <div class="kpis hk">
      <div class="kpi"><b>${team.nT}</b><span>Allenamenti</span></div>
      <div class="kpi"><b>${pctTxt(team.avgPct)}</b><span>Presenza media</span></div>
      <div class="kpi"><b>${team.nG}</b><span>Partite</span></div>
      <div class="kpi"><b>${team.nScored ? `${team.gf}-${team.ga}` : '—'}</b><span>Gol fatti-subiti</span></div>
    </div>
    <div class="row" style="margin-top:10px"><button class="btn small" data-hgo="statistiche">Tutte le statistiche</button></div></div>`;
  return `<section class="hhead"><h2>${esc(T0?.name||'')}</h2><p class="note">${esc(T0?.category||'')}${T0?.coach?' · Mister '+esc(T0.coach):''}</p></section>
    <div class="hgrid">${matchCard}${trCard}${todoCard}${numCard}</div>`;
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-hgo]'); if(!b || !curTeam) return;
  const [k, id] = b.dataset.hgo.split(':');
  if(k==='prep' || k==='conv'){
    const nm = nextMatch(), s = S.sheet;
    if(nm && !(s.date===nm.date && (s.opponent||'').trim().toLowerCase()===(nm.opponent||'').trim().toLowerCase())){
      s.opponent = nm.opponent||''; s.date = nm.date||''; s.time = nm.time||''; s.venue = nm.venue||''; s.home = !!nm.home; s.convType = nm.friendly ? 'Amichevole' : 'Campionato'; save('sheet');
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
  goTab(k);
});

/* ---------- Squadra → Calendario ---------- */
function viewCalendario(){
  const A = isAdmin(), today = todayISO();
  const cal = S.calendar.slice().sort((a,b)=>(a.date||'').localeCompare(b.date||''));
  const official = A
    ? cal.map(m => `
      <div class="teamcard">
        <div class="grid">
          <div><label class="f">Data</label><input type="date" data-calf="date" data-calid="${m.id}" value="${esc(m.date||'')}"></div>
          <div><label class="f">Ora</label><input type="time" data-calf="time" data-calid="${m.id}" value="${esc(m.time||'')}"></div>
          <div><label class="f">Avversario</label><input data-calf="opponent" data-calid="${m.id}" value="${esc(m.opponent||'')}" placeholder="Avversario"></div>
          <div><label class="f">Campo</label><input data-calf="venue" data-calid="${m.id}" value="${esc(m.venue||'')}" placeholder="Campo"></div>
        </div>
        <div class="row" style="margin-top:10px;justify-content:space-between">
          <label class="row" style="gap:6px"><input type="checkbox" data-calf="home" data-calid="${m.id}" ${m.home?'checked':''}> In casa</label>
          <button class="iconbtn" aria-label="Elimina partita" data-caldel="${m.id}">×</button>
        </div>
      </div>`).join('')
    : `<div class="reglist">${cal.map(m => `<div class="regrow ${m.date && m.date < today ? 'past' : ''}"><div><b>${weekday(m.date)} ${fmtDate(m.date)}</b>${m.time?' · '+esc(m.time):''} · ${esc(m.home ? `${teamLabel()} - ${m.opponent||''}` : `${m.opponent||''} - ${teamLabel()}`)}</div><span class="note">${esc(m.venue||'')}</span></div>`).join('')}</div>`;
  return `<section class="panel">
    <h2>Calendario · ${esc(TEAM()?.name||'')}</h2>
    <p class="hint">${A ? 'Le partite ufficiali della squadra: le modifichi solo tu.' : 'Le partite ufficiali le inserisce la società.'} Servono per la Home, per "Usa questa" in Gara → Partita e per i Tabellini (Statistiche).</p>
    ${cal.length ? official : '<p class="empty">Nessuna partita in calendario.</p>'}
    ${A ? '<div class="row" style="margin-top:10px"><button class="btn small" data-act="caladd">Aggiungi partita</button></div>' : ''}
  </section>
  ${viewFriendlies()}`;
}

/* ---------- Allenamento / Gara: pagine del registro ---------- */
function registroPage(title, body, hint){
  if(!S.players.length) return `<section class="panel"><h2>${title}</h2><p class="empty">Prima serve la rosa (Squadra → Rosa).</p></section>`;
  return `<section class="panel"><h2>${title} · ${esc(TEAM()?.name||'')}</h2>${hint?`<p class="hint">${hint}</p>`:''}${body}</section>`;
}
