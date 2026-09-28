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
  scouting:'<circle cx="6.5" cy="15.5" r="3.5"/><circle cx="17.5" cy="15.5" r="3.5"/><path d="M10 15.5h4M4 13l2.5-8h3l1 5.5M20 13l-2.5-8h-3l-1 5.5"/>',
  societa:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'
};
const AREAS = [
  {k:'home', label:'Home', tabs:['home']},
  {k:'squadra', label:'Squadra', tabs:['rosa','calendario']},
  {k:'gara', label:'Gara', tabs:['partita','convocazioni','formazione','piazzati','pdf']},
  {k:'allenamento', label:'Allenamento', tabs:['allenamenti','test']},
  {k:'statistiche', label:'Statistiche', tabs:['statallen','statpartite']},
  {k:'scouting', label:'Scouting', tabs:['segnala'], coach:true},
  {k:'societa', label:'Società', tabs:['squadre'], admin:true}
];
const TAB_NAMES = {home:'Home', rosa:'Rosa', calendario:'Calendario', partita:'Partita', convocazioni:'Convocazioni', formazione:'Formazione',
  piazzati:'Piazzati', pdf:'Foglio gara PDF', statallen:'Allenamento', statpartite:'Partite', allenamenti:'Presenze', test:'Test atletici', squadre:'Squadre', segnala:'Segnala un giocatore'};
/* nomi delle schede di versioni precedenti (link salvati) */
const TAB_ALIASES = {statistiche:'statallen', tabellini:'statpartite', registro:'allenamenti'};
const areaLast = {};
/* Scouting: solo per i mister (l'admin ha Scouting Hub completo) */
const allowedAreas = () => AREAS.filter(a => (!a.admin || isAdmin()) && (!a.coach || !isAdmin()));
/* Attività di base (da Under 13 in giù): niente formazione, piazzati e foglio gara PDF */
const SOLO_AGONISTICA = ['formazione','piazzati','pdf'];
const tabsDi = a => a.tabs.filter(t => !(isAdb() && SOLO_AGONISTICA.includes(t)));
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
  tab = t; areaLast[areaOf(t).k] = t;
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
  const schede = tabsDi(cur);
  $('#tabs').innerHTML = schede.length > 1 ? schede.map(k => `<button class="tab" role="tab" data-tab="${k}" aria-selected="${k===tab}">${TAB_NAMES[k]}</button>`).join('') : '';
  $('#tabs').classList.toggle('hidden', schede.length <= 1);
}

/* ---------- Home ---------- */
function daysUntil(d){ const a = new Date(todayISO()+'T12:00:00'), b = new Date(d+'T12:00:00'); return Math.round((b-a)/86400000); }
/* ---------- Calendari di tutte le squadre (Calendario → "Tutte le squadre") ----------
   Mister: funzione coach_calendari (0027, solo nome, categoria e partite); admin e direttori leggono i documenti.
   Si ricaricano al massimo ogni minuto; se non si possono leggere resta il calendario della propria squadra. */
let tuttiCal = null, tuttiCalAt = 0, tuttiCalInCorso = false, calScope = 'mia';
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
  if(tab==='calendario') render();
}
/* Partite di tutte le squadre, ognuna con la sua squadra (la propria dai dati aperti, amichevoli del mister comprese) */
function partiteTutte(){
  const mie = allCalendar().map(m => ({...m, team:TEAM()}));
  const altre = (tuttiCal || []).filter(t => t.id !== curTeam).flatMap(t => (t.matches || []).map(m => ({...m, team:t})));
  return [...mie, ...altre].sort((a,b) => ((a.date||'')+(a.time||'').padStart(5,'0')).localeCompare((b.date||'')+(b.time||'').padStart(5,'0')));
}
/* I tre calendari della società, ognuno col suo colore: campo di Merate, campo di Cernusco, trasferta */
const CAL_NOMI = {merate:'Merate', cernusco:'Cernusco', trasferta:'Trasferta'};
const calDi = m => !m.home ? 'trasferta' : /MERATE/i.test(m.venue || '') ? 'merate' : 'cernusco';
const legendaCal = () => `<div class="calleg">${Object.entries(CAL_NOMI).map(([k,n]) => `<span class="cal-${k}">${n}</span>`).join('')}</div>`;
const siglaSquadra = t => { const e = etaSquadra(t); return e < 99 ? 'U' + e : (t?.name || ''); };
/* Nelle liste di tutte le squadre: "U11 · Fc Milanese" (casa o trasferta la dice il colore) */
const nomePartita = (m, tutte) => tutte ? `${siglaSquadra(m.team)} · ${m.opponent||'Avversario'}`
  : (m.home ? `${teamLabel()} - ${m.opponent||'Avversario'}` : `${m.opponent||'Avversario'} - ${teamLabel()}`);
/* Una riga di partita colorata col suo calendario */
const rigaPartita = (m, tutte, conData) => `<li class="cal-${calDi(m)}${tutte && m.team?.id===curTeam ? ' mia' : ''}">
    <div class="wkwhen"><b>${weekday(m.date)}${conData ? ' '+fmtDate(m.date).slice(0,5) : ''}</b><span>${esc(m.time ? m.time.padStart(5,'0') : 'ora ?')}</span></div>
    <div><div class="wkmatch">${esc(nomePartita(m, tutte))}</div>
      <div class="note">${[m.home ? `In casa a ${CAL_NOMI[calDi(m)]}` : 'Trasferta', m.home ? '' : m.venue, tipoPartita(m), m.note].filter(Boolean).map(esc).join(' · ')}</div>
      ${conData && !m.friendly ? calStato(m) : ''}</div>
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
  /* Anteprima: gli impegni della squadra di sabato e domenica di questa settimana (campionato, amichevoli e tornei),
     colorati per calendario. Le altre partite e le altre squadre sono in Squadra → Calendario */
  const [sab, dom] = weekendISO(), wk = allCalendar().filter(m => m.date===sab || m.date===dom)
    .sort((a,b) => (a.date+(a.time||'').padStart(5,'0')).localeCompare(b.date+(b.time||'').padStart(5,'0')));
  const matchCard = `<div class="hcard hmatch hwide">
      <div class="hlabel">Weekend · sab ${fmtDate(sab).slice(0,5)} e dom ${fmtDate(dom).slice(0,5)}</div>
      ${wk.length ? `${legendaCal()}<ul class="wklist">${wk.map(m => rigaPartita(m, false)).join('')}</ul>`
        : `<p class="note">Nessun impegno questo weekend.${nm ? ` Prossima partita: ${weekday(nm.date)} ${fmtDate(nm.date)} · ${esc(nm.opponent||'')} (${whenTxt(nm.date)}).` : ''}</p>`}
      ${nm ? `<div class="row" style="margin-top:12px"><button class="btn primary small" data-hgo="prep">${sheetIsNext ? 'Apri la gara' : 'Prepara la gara'}</button><button class="btn small" data-hgo="conv">Convocazioni</button><button class="btn small" data-hgo="calendario">Calendario</button></div>`
        : '<div class="row" style="margin-top:12px"><button class="btn small" data-hgo="calendario">Apri il calendario</button></div>'}
    </div>`;
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
    <div class="row" style="margin-top:10px"><button class="btn small" data-hgo="statallen">Statistiche allenamento</button><button class="btn small" data-hgo="statpartite">Statistiche partite</button></div></div>`;
  return `<section class="hhead"><h2>${esc(T0?.name||'')}</h2><p class="note">${esc(T0?.category||'')}${coachNames(T0)?' · Mister '+esc(coachNames(T0)):''}</p></section>
    <div class="hgrid">${matchCard}${trCard}${todoCard}${numCard}</div>`;
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
    goTab('statpartite');
    const m = allCalendar().find(x => x.id===id); if(!m) return;
    let g = S.reg.games.find(x => x.calId===m.id);
    if(!g){ g = {id:uid('gm'), calId:m.id, date:m.date, opponent:m.opponent||'', home:!!m.home, comp:m.friendly?'Amichevole':'Campionato', dur:DEFAULT_DUR, og:'', pl:{}}; S.reg.games.push(g); save('registro'); }
    openGameId = g.id; render(); return;
  }
  if(k==='opengm'){ goTab('statpartite'); openGameId = id; render(); return; }
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

/* ---------- Squadra → Calendario ---------- */
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
function listaCalendario(ms, tutte){
  let mese = '';
  return ms.map(m => {
    const mm = (m.date||'').slice(0,7), testa = mm !== mese ? `<li class="calmese">${mm ? monthLabel(mm) : 'Senza data'}</li>` : '';
    mese = mm;
    return testa + rigaPartita(m, tutte, true);
  }).join('');
}
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
let calVista = 'giorno', calGiorno = null, calScelta = null;
const CG_ORA = 56;                                   // pixel per ora
const minuti = t => { const [h, m] = (t||'').split(':').map(Number); return h*60 + (m||0); };
const durataPartita = m => { const e = etaSquadra(m.team); return e <= 10 ? 60 : e <= 13 ? 75 : 90; };
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
    return `<div class="cg-ev${mia ? ' mia' : ''}${chiave===calScelta ? ' scelta' : ''}" role="button" tabindex="0" data-calev="${esc(chiave)}" style="top:${px(e.inizio)}px;height:${px(e.fine) - px(e.inizio) - 2}px;left:calc(${e.corsia}/${e.corsie}*100%);width:calc(100%/${e.corsie} - 3px)"
        title="${esc(`${m.time} ${siglaSquadra(m.team)} · ${m.opponent||''}${m.venue ? ' · '+m.venue : ''}${m.note ? ' · '+m.note : ''}`)}">
      <b>${esc(siglaSquadra(m.team))} · ${esc(m.opponent||'Avversario')}</b><span>${esc(m.time.padStart(5,'0'))}${k==='trasferta' && m.venue ? ' · '+esc(m.venue) : ''}</span></div>`;
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
    ${(() => { const m = delGiorno.find(x => `${x.team?.id}|${x.id}` === calScelta); return m ? `<ul class="wklist callist cg-dettaglio">${rigaPartita(m, true, true)}</ul>` : ''; })()}
    <p class="note">Tocca una partita per i dettagli. Durata dei blocchi indicativa: si conosce l'ora d'inizio della partita.</p>`;
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-calday],[data-calvista],[data-calev]'); if(!b) return;
  if(b.dataset.calvista){ calVista = b.dataset.calvista; render(); return; }
  if(b.dataset.calev){ calScelta = calScelta === b.dataset.calev ? null : b.dataset.calev; render(); return; }
  if(b.dataset.calday){ calGiorno = b.dataset.calday; calScelta = null; render(); }
});
function viewCalendario(){
  const A = isAdmin(), sigla = siglaSquadra(TEAM());
  const scelta = `<div class="row" style="justify-content:space-between;margin-bottom:10px">
      <div class="seg" role="group" aria-label="Quali partite"><button data-calscope="mia" aria-pressed="${calScope==='mia'}">Solo ${esc(sigla)}</button><button data-calscope="tutte" aria-pressed="${calScope==='tutte'}">Tutte le squadre</button></div>
      ${legendaCal()}</div>`;
  if(calScope === 'tutte'){
    caricaTuttiCal();
    const ms = partiteTutte().filter(daGiocare);
    const vista = `<div class="seg" role="group" aria-label="Vista"><button data-calvista="giorno" aria-pressed="${calVista==='giorno'}">Giorno</button><button data-calvista="elenco" aria-pressed="${calVista==='elenco'}">Elenco</button></div>`;
    return `<section class="panel">
      <h2>Calendario · tutte le squadre</h2>
      ${scelta}
      <div class="row" style="justify-content:space-between;margin-bottom:8px">
        <p class="hint" style="margin:0">Le partite da giocare di tutte le squadre, fino a fine stagione. La tua squadra è evidenziata.</p>${vista}</div>
      ${tuttiCal ? '' : '<p class="note">Carico le altre squadre…</p>'}
      ${!ms.length ? '<p class="empty">Nessuna partita in programma.</p>'
        : calVista==='giorno' ? vistaGiorno(ms) : `<ul class="wklist callist">${listaCalendario(ms, true)}</ul>`}
    </section>`;
  }
  const cal = inOrdine(S.calendar.filter(daGiocare)), prossime = inOrdine(allCalendar().filter(daGiocare));
  const official = A
    ? cal.map(m => `
      <div class="teamcard cal-${calDi(m)}">
        ${calStato(m)}
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
    : `<ul class="wklist callist">${listaCalendario(prossime, false)}</ul>`;
  return `<section class="panel">
    <h2>Calendario · ${esc(TEAM()?.name||'')}</h2>
    ${scelta}
    <p class="hint">${A ? 'Le partite ufficiali da giocare: le modifichi solo tu.' : 'Le partite da giocare fino a fine stagione: campionato, amichevoli e tornei.'} Le partite già giocate sono nello storico, in fondo. Servono per la Home, per "Usa questa" in Gara → Partita e per i tabellini (Statistiche → Partite).</p>
    ${(A ? cal.length : prossime.length) ? official : '<p class="empty">Nessuna partita da giocare.</p>'}
    ${A ? '<div class="row" style="margin-top:10px"><button class="btn small" data-act="caladd">Aggiungi partita</button></div>' : ''}
    ${viewStorico()}
  </section>
  ${viewFriendlies()}
  ${viewVenues()}`;
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-calscope]'); if(!b) return;
  calScope = b.dataset.calscope; render();
});
function viewVenues(){
  const vs = [...new Set(allCalendar().map(m => (m.venue||'').trim()).filter(Boolean))].sort((a,b) => a.localeCompare(b,'it'));
  if(!vs.length) return '';
  const n = vs.filter(v => venuePin(v)).length;
  return `<section class="panel">
    <h3 style="margin-top:0">Campi · posizione per Google Maps</h3>
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
let segDraft = {data: todayISO()}, segEsito = null, segInvio = false, societaNomi = null;
const RUOLI_SCOUTING = {portiere:'Portiere', difensore:'Difensore', centrocampista:'Centrocampista', attaccante:'Attaccante'};
/* stesso elenco di annateDisponibili() in lib/tipi.ts */
function annateScouting(){ const a = new Date().getFullYear(); return Array.from({length:16}, (_, i) => String(a - 5 - i)); }
function viewSegnala(){
  if(!coachPin) return `<h2>Segnala un giocatore</h2><section class="panel"><p class="empty">La segnalazione si fa entrando col PIN della squadra.</p></section>`;
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
async function inviaSegnalazione(){
  if(segInvio) return;
  const d = segDraft;
  const manca = !d.annata ? 'Indica l’annata.'
    : !(d.cognome||'').trim() && !(d.descrizione||'').trim() ? 'Serve il cognome oppure una descrizione per riconoscerlo.'
    : !(d.testo||'').trim() ? 'Scrivi cosa hai visto: è la parte più importante.' : '';
  if(manca){ segEsito = {ok:false, msg:manca}; render(); window.scrollTo(0,0); return; }
  segInvio = true; render();
  let error = null;
  try{ ({ error } = await supabaseClient.rpc('coach_segnala', {p_pin: coachPin, p_dati: {...d}})); }catch(e){ error = e; }
  segInvio = false;
  if(!error){ segEsito = {ok:true, msg:'Segnalazione inviata allo scouting. Grazie!'}; segDraft = {data: todayISO()}; }
  else if(error.code === 'PGRST202') segEsito = {ok:false, msg:'Funzione non ancora attiva: chiedi all’admin di eseguire la migrazione 0007.'};
  else if(error.code === 'PT429') segEsito = {ok:false, msg:'Troppi PIN sbagliati in poco tempo: riprova tra qualche minuto.'};
  else if(error.code === '28000') segEsito = {ok:false, msg:'PIN della squadra non più valido: rientra dalla pagina d’ingresso.'};
  else segEsito = {ok:false, msg: error.message || 'Segnalazione non inviata, riprova.'};
  render(); window.scrollTo(0,0);
}
