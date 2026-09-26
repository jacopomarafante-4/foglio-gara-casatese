/* Portale Academy Casatese Merate · Schermate: squadre, rosa, partita, convocazioni, formazione, calci piazzati, anteprima PDF.
   I file si caricano in ordine (vedi index.html) e condividono le stesse variabili globali. */
/* ---------- Logica assegnazioni ---------- */
function slotOf(pid){ const l = S.sheet.lineup; return Object.keys(l).find(k => l[k]===pid); }
/* Numero di maglia = per partita, non fisso: titolari = numero dello slot (1-11), panchina = 12+posizione. */
function matchNum(pid){
  const slot = slotOf(pid);
  if(slot) return +slot;
  const bi = (S.sheet.bench||[]).indexOf(pid);
  return bi>=0 ? 12+bi : null;
}
function slotPriorityOrder(){
  const list = FORMATIONS[S.sheet.formation] || [];
  const rest = list.filter(([n]) => n!==1);
  const shape = (S.sheet.formation||'').split('-').slice(1).map(Number).filter(n=>!isNaN(n));
  const bands = []; let idx = 0;
  shape.forEach(count => { bands.push(rest.slice(idx, idx+count)); idx += count; });
  const byXDesc = arr => arr.slice().sort((a,b) => b[1]-a[1]);
  const defense = bands[0] || [];
  const attack = bands.length>1 ? bands[bands.length-1] : [];
  const midfield = bands.slice(1,-1).flat();
  return [1, ...byXDesc(defense).map(t=>t[0]), ...byXDesc(midfield).map(t=>t[0]), ...byXDesc(attack).map(t=>t[0])];
}
function assignSlot(slot, pid){
  const l = S.sheet.lineup;
  const prev = slotOf(pid);
  if(prev) delete l[prev];
  l[slot] = pid;
  S.sheet.bench = S.sheet.bench.filter(b => b !== pid);
  save('sheet');
}
function starters(){ return (FORMATIONS[S.sheet.formation]||[]).map(([s]) => ({slot:s, p:P(S.sheet.lineup[s])})); }
function tokenPlayer(scheme, tok){
  const ov = (S.sheet.overrides[scheme.id]||{})[tok.id];
  if(ov && P(ov)) return {p:P(ov), override:true};
  return {p:P(S.sheet.lineup[tok.slot]), override:false};
}
/* Modifiche di posizione/disegno per la partita in corso (non toccano lo schema condiviso):
   l'admin modifica sempre la libreria condivisa; il mister modifica solo qui, per la sua partita. */
function schemeEdit(sc){
  const all = (S.sheet.schemeEdits ||= {});
  return (all[sc.id] ||= {tokens:{}, draw:[], marks:[]});
}
function effPos(sc, t){
  const ed = (S.sheet.schemeEdits||{})[sc.id];
  const o = ed && ed.tokens && ed.tokens[t.id];
  return o ? {x:o.x, y:o.y} : {x:t.x, y:t.y};
}
/* Compito ed etichetta cambiati dal mister solo per questa partita (schemeEdits[id].roles[tokenId] = {role, tag}) */
function effRole(sc, t){
  const ed = (S.sheet.schemeEdits||{})[sc.id];
  const r = ed && ed.roles && ed.roles[t.id];
  return r ? {role: r.role ?? t.role, tag: r.tag ?? t.tag} : {};
}
function effTokens(sc){ return sc.tokens.map(t => ({...t, ...effPos(sc,t), ...effRole(sc,t)})); }
function effBall(sc){ const ed = (S.sheet.schemeEdits||{})[sc.id]; return (ed && ed.ball) || sc.ball; }
function effDraw(sc){ const ed = (S.sheet.schemeEdits||{})[sc.id]; return (ed && ed.draw) || []; }
function effMarks(sc){ const ed = (S.sheet.schemeEdits||{})[sc.id]; return (ed && ed.marks) || []; }
function roleMap(scheme){
  const m = new Map();
  effTokens(scheme).forEach(t => { const r = (t.role||'').trim(); if(r && !m.has(r)) m.set(r, ROLE_COLORS[m.size % ROLE_COLORS.length]); });
  return m;
}
function tokColor(scheme, t, rm){ return rm.get((t.role||'').trim()) || '#15202B'; }
function nameLayout(tokens){
  const out = {}, seen = new Set();
  const close = (a,b) => Math.abs(a.y-b.y) < 1.6 && Math.abs(a.x-b.x) < 5.5;
  tokens.forEach(t0 => {
    if(seen.has(t0.id)) return;
    const cl = [t0]; seen.add(t0.id);
    for(let i=0;i<cl.length;i++) tokens.forEach(o => { if(!seen.has(o.id) && close(cl[i],o)){ seen.add(o.id); cl.push(o); } });
    cl.sort((a,b)=>a.x-b.x);
    cl.forEach((t,i) => {
      const near = cl.filter(o=>o!==t).map(o=>Math.abs(o.x-t.x));
      const d = near.length ? Math.min(...near) : 99;
      out[t.id] = {low: cl.length>1 && i%2===1, span: cl.length>1 ? d*2 : 99};
    });
  });
  return out;
}

/* ---------- Render ---------- */
function renderChrome(){
  const opts = `<option value="admin" ${isAdmin()?'selected':''}>${staffRole === 'direttore' ? 'Direttore' : 'Amministratore'} (tu)</option>` + S.teams.map(t => `<option value="coach:${t.id}" ${!isAdmin()&&t.id===curTeam?'selected':''}>Mister ${esc(t.category||t.name)}${coachNames(t)?' · '+esc(coachNames(t)):''}</option>`).join('');
  $('#demo').innerHTML = hashLocked ? '' : `<div class="in"><span class="tagd">ANTEPRIMA</span><label for="asview">Guarda l'app come</label><select id="asview" data-asview="1">${opts}</select></div>`;
  $('#demo').classList.toggle('hidden', hashLocked);
  const T0 = TEAM();
  $('#ctx').innerHTML = isAdmin()
    ? `${isDirettore() ? `<span class="badge dir" title="Squadre in sola lettura, Società e Scouting modificabili">Direttore${readOnly() ? ' · sola lettura' : ''}</span>` : '<span class="badge admin">Admin</span>'}${S.teams.length ? `<label class="note" for="curteam">Squadra</label><select id="curteam" data-curteam="1">${S.teams.map(t=>`<option value="${t.id}" ${t.id===curTeam?'selected':''}>${esc(t.category||t.name)}</option>`).join('')}</select>` : ''}<button class="logout" data-act="logout">Esci</button>`
    : `<span class="badge coach">Mister</span><span class="teamname">${esc([misterName, T0?.category||T0?.name].filter(Boolean).join(' · '))}</span><button class="logout" data-act="logout">Esci</button>`;
  // Il logo riporta alla Home del Portale (il PIN del mister non sta nell'indirizzo: resta entrato)
  if(IN_APP_UNICA) $('#homelink').href = '#/home'; else $('#homelink').removeAttribute('href');
  renderNav();
}
function viewGate(){
  if(!teamsLoaded){
    return `<section class="panel" style="max-width:360px;margin:48px auto"><p class="hint">Caricamento…</p></section>`;
  }
  if(!adminUnlocked){
    return `<section class="panel" style="max-width:360px;margin:48px auto">
      <h2>Accesso</h2>
      <p class="hint">Inserisci il PIN della tua squadra.</p>
      <label class="f" for="gatepin">PIN</label>
      <input id="gatepin" type="password" inputmode="numeric" autocomplete="off" placeholder="····" autofocus>
      ${gateError?'<p class="note" style="color:var(--red);margin-top:6px">PIN non valido.</p>':''}
      <div class="row" style="margin-top:10px"><button class="btn primary" data-act="gatesubmit">Entra</button></div>
      <div class="row" style="margin-top:10px"><button class="btn small ghost" data-act="gateadmin">Sei l'amministratore? Accedi con email e password</button></div>
    </section>`;
  }
  if(!RUNNING_IN_CLAUDE && supabaseClient && !supaSession){
    return `<section class="panel" style="max-width:360px;margin:48px auto">
      <h2>Accesso amministratore</h2>
      <p class="hint">Accedi con la password del tuo account.</p>
      <div class="grid">
        <div><label class="f" for="gateuser">Nome utente</label><input id="gateuser" autocomplete="username" placeholder="Es. Jacopo" autofocus></div>
        <div><label class="f" for="gatepass">Password</label><input id="gatepass" type="password" autocomplete="current-password"></div>
      </div>
      ${gateError?'<p class="note" style="color:var(--red);margin-top:8px">Accesso non riuscito, controlla la password.</p>':''}
      <div class="row" style="margin-top:10px"><button class="btn primary" data-act="adminlogin">Accedi</button></div>
      <div class="row" style="margin-top:10px"><button class="btn small ghost" data-act="gateback">← Sei un mister? Torna al PIN</button></div>
    </section>`;
  }
  return `<section class="panel" style="max-width:360px;margin:48px auto"><p class="hint">Accesso confermato — la pagina si aggiorna a breve.</p></section>`;
}
function render(){
  if(!hashLocked && !adminAccessGranted()){
    // App unica: l'accesso si fa solo dalla pagina d'ingresso (PIN)
    if(IN_APP_UNICA && teamsLoaded){ location.replace('/?pin=1'); return; }
    $('#demo').innerHTML = ''; $('#demo').classList.add('hidden');
    $('#ctx').innerHTML = ''; $('#tabs').innerHTML = ''; $('#areanav').classList.add('hidden'); $('#matchline').textContent = '';
    $('#view').innerHTML = viewGate();
    return;
  }
  document.body.classList.toggle('ro', readOnly());
  if(!allowedTabs().includes(tab)) tab = 'home';
  areaLast[areaOf(tab).k] = tab;
  writeRoute(false);
  renderChrome();
  const T0 = TEAM();
  $('#matchline').textContent = T0?.category || '';
  const v = $('#view');
  if(tab==='squadre') v.innerHTML = viewSquadre();
  else if(tab==='home') v.innerHTML = viewHome();
  else if(!curTeam) v.innerHTML = `<section class="panel"><p class="empty">Nessuna squadra. Creane una nella scheda Squadre.</p></section>`;
  else if(tab==='rosa') v.innerHTML = viewRosa();
  else if(tab==='partita') v.innerHTML = viewPartita();
  else if(tab==='convocazioni') v.innerHTML = viewConvocazioni();
  else if(tab==='formazione') v.innerHTML = viewFormazione();
  else if(tab==='piazzati') v.innerHTML = openSchemeId ? viewScheme() : viewSchemes();
  else if(tab==='pdf'){ v.innerHTML = viewPdf(); buildPreview(); }
  else if(tab==='calendario') v.innerHTML = viewCalendario();
  else if(tab==='allenamenti'){ v.innerHTML = registroPage('Presenze allenamenti', viewTrainings()); scrollGridsToEnd(); }
  else if(tab==='test') v.innerHTML = registroPage('Test atletici', viewTests());
  else if(tab==='statallen') v.innerHTML = viewStatAllenamento();
  else if(tab==='segnala') v.innerHTML = viewSegnala();
  else if(tab==='statpartite'){ v.innerHTML = viewStatPartite(); scrollGridsToEnd(); }
  // Direttori: si guarda soltanto (i campi non si scrivono; il resto lo blocca save())
  if(readOnly()){
    v.querySelectorAll('input:not([type=date]), textarea').forEach(el => {
      if(el.type === 'checkbox' || el.type === 'radio') el.disabled = true; else el.readOnly = true;
    });
    // anche le tendine che cambiano dati (modulo, capitano, tipo gara…); restano libere quelle per guardare
    v.querySelectorAll('select[data-sheet], select[data-sc], select[data-tok], select[data-frid], select[data-gmf], select[data-atok], select[data-ruolo]').forEach(el => {
      el.disabled = true; el.title = 'Sola lettura';
    });
  }
}

function viewSquadre(){
  const cards = S.teams.map(t => {
    const mister = (t.coaches||[]).map(c => `
        <div class="coachrow">
          <input data-coach="${t.id}:${c.id}" value="${esc(c.name)}" placeholder="Nome e cognome" aria-label="Nome del mister">
          ${c.code ? `<span class="code" title="PIN personale">${esc(c.code)}</span>` : '<span class="nocode">Senza PIN</span>'}
          <button class="btn small ${c.code?'ghost':'primary'}" data-coachpin="${t.id}:${c.id}">${c.code ? 'Rigenera' : 'Genera PIN'}</button>
          <button class="iconbtn" aria-label="Togli ${esc(c.name||'mister')}" data-coachdel="${t.id}:${c.id}">×</button>
        </div>`).join('');
    return `
    <div class="teamcard">
      <div class="hd">
        <div><strong>${esc(t.category || t.name || 'Senza nome')}</strong>${t.category && t.name ? `<span class="stat"> · ${esc(t.name)}</span>` : ''}</div>
        <div class="row">
          <button class="btn small" data-teamgo="${t.id}">Gestisci rosa</button>
          <button class="btn small ghost" data-teamas="${t.id}">Vedi come mister</button>
          <button class="iconbtn" aria-label="Elimina ${esc(t.category||t.name)}" data-teamdel="${t.id}">×</button>
        </div>
      </div>
      <div class="coachlist">
        <div class="coachhd">Mister</div>
        ${mister || '<p class="note">Nessun mister: aggiungilo e genera il suo PIN.</p>'}
        <button class="btn small ghost" data-coachadd="${t.id}">+ Aggiungi mister</button>
      </div>
      ${t.code ? `<p class="note legacy">PIN di squadra condiviso (vecchio): <span class="code">${esc(t.code)}</span>
        <button class="linkbtn" data-teamcodeoff="${t.id}">Disattiva</button> — quando ogni mister ha il suo PIN, disattivalo.</p>` : ''}
      <details class="teamedit"><summary>Nome e categoria</summary>
        <div class="grid">
          <div><label class="f">Nome squadra</label><input data-team="${t.id}" data-tf="name" value="${esc(t.name)}"></div>
          <div><label class="f">Categoria</label><input data-team="${t.id}" data-tf="category" value="${esc(t.category)}" placeholder="Es. Under 15"></div>
        </div>
      </details>
    </div>`;
  }).join('');
  return `<section class="panel">
    <h2>Squadre, scouting e direttori</h2>
    <p class="hint">La vedete solo tu e i direttori. Ognuno entra dalla pagina d'ingresso con il suo PIN personale: i mister trovano solo la loro squadra, gli scout lo Scouting.</p>
    ${cards || '<p class="empty">Nessuna squadra ancora.</p>'}
    <div class="row" style="margin-top:14px"><button class="btn primary" data-act="teamadd">Aggiungi squadra</button></div>
    ${viewStaff()}
  </section>
  <section class="panel">
    <h3 style="margin-top:0">Chi può fare cosa</h3>
    <div class="rolebox">
      <div><b>Amministratore e direttori</b>L'amministratore crea le squadre e i PIN di mister, scout e direttori, inserisce le rose, carica e disegna gli schemi. I direttori vedono tutte le squadre senza poterle modificare; in Società (squadre, mister, scout, direttori e PIN) e nello Scouting invece modificano come l'amministratore.</div>
      <div><b>Mister</b>Vede solo la propria squadra. Compila partita, formazione e panchina, sceglie gli schemi da stampare e scarica il PDF. Segna presenze, minuti e test, vede le statistiche e segnala giocatori allo scouting.</div>
      <div><b>In comune</b>Database degli schemi (angoli e punizioni, a favore e a sfavore) e moduli di gioco. Quando aggiungi uno schema, lo trovano tutti.</div>
    </div>
  </section>
  <section class="panel">
    <h3 style="margin-top:0">Backup</h3>
    <p class="hint">Scarica un file con tutti i dati attuali (squadre, rose, schemi, formazioni): una copia di sicurezza da tenere da parte.</p>
    <button class="btn" data-act="exportbackup">Esporta backup</button>
  </section>`;
}
/* Scouting e Direttori, mostrati come le squadre: ogni persona col suo PIN personale.
   Elenco letto con la sessione di admin/direttore (profiles + codici_accesso, 0010);
   creare account e cambiare PIN passa da /api/staff (il PIN è anche la password dell'account). */
let staff = null, staffBusy = false, staffMsg = '';
const staffAdding = {};
function loadStaff(){
  staff = 'loading';
  Promise.all([
    supabaseClient.from('profiles').select('id, nome, cognome, email, ruolo, attivo').in('ruolo', ['direttore','scout']).order('cognome'),
    supabaseClient.from('codici_accesso').select('profilo_id, pin'),
  ]).then(([p, c]) => {
    const pin = new Map((c.data||[]).map(x => [x.profilo_id, x.pin]));
    staff = (p.data||[]).map(x => ({...x, pin: pin.get(x.id) || ''}));
    if(tab==='squadre') render();
  }).catch(() => { staff = []; });
}
async function staffAction(body){
  if(staffBusy) return; staffBusy = true; staffMsg = ''; render();
  try{
    const r = await fetch('/api/staff', {method:'POST', headers:{'Content-Type':'application/json'}, credentials:'same-origin', body: JSON.stringify(body)});
    const j = await r.json().catch(() => ({errore: 'Sessione scaduta: rientra dalla pagina d’ingresso.'}));
    if(!r.ok || j.errore) staffMsg = j.errore || 'Operazione non riuscita.';
    else if(body.azione === 'crea') staffAdding[body.ruolo] = false;
  }catch(e){ staffMsg = 'Operazione non riuscita: controlla la connessione.'; }
  staffBusy = false; loadStaff(); render();
}
function viewStaffCard(ruolo){
  const scout = ruolo === 'scout';
  const chi = scout ? 'scout' : 'direttore';
  const persone = Array.isArray(staff) ? staff.filter(x => x.ruolo === ruolo) : [];
  const dis = staffBusy ? 'disabled' : '';
  const righe = persone.map(x => {
    const nome = [x.nome, x.cognome].filter(Boolean).join(' ');
    return `
        <div class="coachrow staffrow${x.attivo ? '' : ' off'}">
          <input data-staffname="${x.id}" value="${esc(nome)}" placeholder="Nome e cognome" aria-label="Nome">
          ${!x.attivo ? '<span class="nocode">Sospeso</span>' : x.pin ? `<span class="code" title="PIN personale">${esc(x.pin)}</span>` : '<span class="nocode">Senza PIN</span>'}
          ${x.attivo ? `<button class="btn small ${x.pin?'ghost':'primary'}" data-staffpin="${x.id}" ${dis}>${x.pin ? 'Rigenera' : 'Genera PIN'}</button>` : '<span></span>'}
          ${x.attivo ? `<button class="iconbtn" aria-label="Sospendi ${esc(nome)}" title="Sospendi l'accesso" data-staffstato="${x.id}" data-attivo="0" ${dis}>×</button>`
                     : `<button class="btn small ghost" data-staffstato="${x.id}" data-attivo="1" ${dis}>Riattiva</button>`}
        </div>`;
  }).join('');
  return `
    <div class="teamcard">
      <div class="hd">
        <div><strong>${scout ? 'Scouting' : 'Direttori'}</strong><span class="stat"> · ${scout ? 'Academy Casatese Merate' : 'a capo di squadre e scout'}</span></div>
        ${scout ? '<div class="row"><a class="btn small" href="/home">Apri Scouting</a></div>' : ''}
      </div>
      <div class="coachlist">
        <div class="coachhd">${scout ? 'Scout' : 'Direttori'}</div>
        ${staff === 'loading' ? '<p class="note">Caricamento…</p>' : righe || `<p class="note">Nessun ${chi}: aggiungilo e genera il suo PIN.</p>`}
        ${staffAdding[ruolo]
          ? `<div class="addrow"><input id="staffnew_${ruolo}" placeholder="Nome e cognome del nuovo ${chi}" aria-label="Nuovo ${chi}">
               <button class="btn small primary" data-staffadd="${ruolo}" ${dis}>Crea e genera PIN</button></div>`
          : `<button class="btn small ghost" data-staffnew="${ruolo}">+ Aggiungi ${chi}</button>`}
      </div>
    </div>`;
}
function viewStaff(){
  if(!supabaseClient || !sessionOk(supaSession)) return '';
  if(staff === null) loadStaff();
  return `${staffMsg ? `<p class="esito ko" role="alert" style="margin-top:14px">${esc(staffMsg)}</p>` : ''}
    ${viewStaffCard('scout')}
    ${viewStaffCard('direttore')}`;
}

const gkBtn = p => `<button class="gkbtn" data-gktoggle="${p.id}" aria-pressed="${isGk(p.id)}" title="${isGk(p.id)?'Portiere (tocca per togliere)':'Segna come portiere'}">🧤</button>`;
function viewRosa(){
  if(!isAdmin()){
    const rows = S.players.map(p => { const n = matchNum(p.id); return `<div class="ro-row"><span class="n ${n?'':'off'}">${n||'–'}</span><span class="nm">${esc(p.name)}</span>${ruoloSel(p)}</div>`; }).join('');
    return `<section class="panel">
      <h2>Rosa</h2>
      ${lockNote('La rosa la inserisce la società. Per aggiungere o togliere un giocatore, scrivi all\'amministratore.')}
      <p class="hint">Il numero è quello di questa partita (titolari 1-11, panchina 12+): lo decidi tu in Formazione. Scegli il <b>ruolo</b> di ogni giocatore${ruoliSquadra()===RUOLI_BASE ? ' (in questa categoria: portiere o giocatore di movimento)' : ''}: per i portieri potrai inserire i gol subiti nelle partite.</p>
      <div class="cols2">${rows || '<p class="empty">La rosa non è ancora stata caricata.</p>'}</div>
    </section>`;
  }
  const rows = S.players.map(p => `
    <div class="prow">
      <span class="num ${matchNum(p.id)?'':'missing'}">${matchNum(p.id)||'–'}</span>
      <input aria-label="Nome" data-pname="${p.id}" value="${esc(p.name)}" placeholder="Cognome">
      ${ruoloSel(p)}
      <button class="iconbtn" aria-label="Elimina ${esc(p.name)}" data-pdel="${p.id}">×</button>
    </div>`).join('');
  return `<section class="panel">
    <h2>Rosa · ${esc(TEAM()?.name||'')}</h2>
    <p class="hint">Nome e ruolo: il numero di maglia lo assegni in Formazione, cambia partita per partita (titolari 1-11, panchina 12+). Il ruolo lo può scegliere anche il mister${ruoliSquadra()===RUOLI_BASE ? ' (in questa categoria: portiere o giocatore di movimento)' : ''}.</p>
    ${rows || '<p class="empty">Nessun giocatore. Aggiungili uno a uno o incolla un elenco.</p>'}
    <div class="row"><button class="btn" data-act="padd">Aggiungi giocatore</button></div>
    <details ${S.players.length?'':'open'}>
      <summary>Incolla un elenco</summary>
      <p class="hint" style="margin-top:8px">Un nome per riga, per esempio <b>Brancaccio</b>. Se incolli righe con un numero davanti va bene lo stesso, lo ignoriamo.</p>
      <textarea id="bulk" placeholder="Alonge&#10;Vascaneau&#10;Brancaccio"></textarea>
      <div class="row" style="margin-top:8px"><button class="btn primary" data-act="bulk">Aggiungi all'elenco</button></div>
    </details>
  </section>`;
}

/* Calendario completo: partite ufficiali (le modifica solo l'admin) + amichevoli, salvate nel registro
   della squadra così le può aggiungere anche il mister. */
function allCalendar(){ return [...S.calendar, ...(S.reg.friendlies||[]).map(m => ({...m, friendly:true}))]; }
function nextMatch(){
  const today = todayISO();
  return allCalendar().filter(m => m.date && m.date>=today).sort((a,b)=>(a.date+(a.time||'')).localeCompare(b.date+(b.time||'')))[0] || null;
}
function minus75(t){
  if(!/^\d{1,2}:\d{2}$/.test(t||'')) return '';
  const [h,m] = t.split(':').map(Number);
  let total = h*60+m-75; if(total<0) total += 1440;
  return String(Math.floor(total/60)).padStart(2,'0')+':'+String(total%60).padStart(2,'0');
}
function mapsSearchUrl(q){ return q ? 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(q) : ''; }
function defaultMeetTime(s){ return s.meetTime || minus75(s.time); }
/* ---------- Campi: posizione esatta per Google Maps ----------
   Il link parte dalla posizione salvata del campo (registro.venues, una volta per campo: vale per tutte le partite lì),
   altrimenti da coordinate scritte nell'indirizzo, altrimenti da una ricerca col nome del campo ripulito. */
const venueKey = v => (v||'').trim().toLowerCase().replace(/\s+/g, ' ');
function parseLL(v){
  const t = String(v||'');
  const m = t.match(/^\s*(-?\d{1,2}\.\d+)\s*[,;\s]\s*(-?\d{1,3}\.\d+)\s*$/)                // 45.69, 9.40
    || t.match(/!3d(-?\d{1,2}\.\d+)!4d(-?\d{1,3}\.\d+)/)                                         // link Google Maps (punto)
    || t.match(/@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/)                                             // link Google Maps (vista)
    || t.match(/[?&](?:q|query|ll|destination)=(-?\d{1,2}\.\d+)(?:,|%2C)\s*(-?\d{1,3}\.\d+)/i);  // ?q=lat,lng
  return m ? `${(+m[1]).toFixed(6)},${(+m[2]).toFixed(6)}` : null;
}
const venuePin = v => ((S.reg && S.reg.venues) || {})[venueKey(v)] || null;
/* "C.S. Comunale Campo 2 - Cernusco Lombardone" → "Centro Sportivo Comunale, Cernusco Lombardone" */
function venueQuery(v){
  const i = v.lastIndexOf(' - ');
  let name = i > 0 ? v.slice(0, i) : v, town = i > 0 ? v.slice(i + 3) : '';
  name = name.replace(/\bC\.\s?S\./g, 'Centro Sportivo').replace(/\bCom\./g, 'Comunale').replace(/\bSport\./g, 'Sportivo')
    .replace(/\s*(Campo\s*)?N\.\s*\d+/gi, '').replace(/\s+Campo\s+\d+$/i, '').trim();
  town = town.replace(/\s*\(.*?\)/g, '').replace(/\s+Fraz\..*$/i, '').trim();
  return town ? `${name}, ${town}` : name;
}
function venueUrl(v){
  v = (v||'').trim(); if(!v) return '';
  const pin = venuePin(v), ll = parseLL(v) || (pin && pin.ll);
  if(ll) return 'https://www.google.com/maps/dir/?api=1&destination=' + ll;
  if(pin && pin.url) return pin.url;
  return mapsSearchUrl(venueQuery(v));
}
/* Campo di gioco della partita del foglio: sempre quello del calendario (scritto come nel calendario ufficiale o nel
   comunicato, con indirizzo e coordinate: import-calendari/portale.mjs). Se la partita non è in calendario, quello del foglio. */
function luogoPartita(s){
  const opp = (s.opponent||'').trim().toLowerCase();
  const m = s.date ? allCalendar().find(x => x.date===s.date && (x.opponent||'').trim().toLowerCase()===opp) : null;
  return m ? {venue:m.venue||'', address:m.address||'', ll:m.ll||''} : {venue:s.venue||'', address:s.address||'', ll:s.venueLL||''};
}
const testoLuogo = l => [l.venue, l.address].filter(Boolean).join(', ');
/* Link Google Maps del campo: posizione del cancello salvata dal mister (📌), se no coordinate del calendario, se no ricerca */
function luogoUrl(l){
  if(!l.venue) return '';
  const pin = venuePin(l.venue);
  if(pin && pin.ll) return 'https://www.google.com/maps/dir/?api=1&destination=' + pin.ll;
  if(pin && pin.url) return pin.url;
  if(l.ll) return 'https://www.google.com/maps/dir/?api=1&destination=' + l.ll;
  return mapsSearchUrl([venueQuery(l.venue), l.address].filter(Boolean).join(', '));
}
/* Dove andare: il ritrovo, se il mister ne ha scritto uno diverso, se no il campo di gioco */
function mapsLink(s){ return (s.meetAddress||'').trim() ? venueUrl(s.meetAddress) : luogoUrl(luogoPartita(s)); }
let pinEditing = null;   // campo di cui si sta impostando la posizione
function pinBtn(v){
  v = (v||'').trim(); if(!v || parseLL(v)) return '';
  const pin = venuePin(v);
  return `<button class="iconbtn2 ${pin?'on':''}" data-pinedit="${esc(v)}" title="${pin?'Posizione esatta salvata (tocca per cambiarla)':'Imposta la posizione esatta del campo'}" aria-label="Posizione esatta del campo">📌</button>`;
}
function pinBox(v, compact){
  v = (v||'').trim(); if(!v || parseLL(v)) return '';
  const pin = venuePin(v), open = pinEditing===venueKey(v);
  if(compact && !open) return '';
  const status = compact ? '' : pin ? `<span class="pinok">📌 Posizione esatta salvata</span> <button class="linkbtn" data-pinedit="${esc(v)}">cambia</button>`
    : `<button class="linkbtn" data-pinedit="${esc(v)}">📌 Imposta la posizione esatta del campo</button>`;
  return `${status ? `<div class="pinrow">${status}</div>` : ''}${open ? `<div class="pinbox">
      ${compact ? `<b class="pinttl">📌 Posizione esatta del campo${pin ? ' · salvata' : ''}</b>` : ''}
      <div class="row" style="flex-wrap:nowrap"><input id="pin_in" value="${esc(pin ? (pin.ll||pin.url||'') : '')}" placeholder="45.6978, 9.4004" aria-label="Coordinate del cancello"><button class="btn small primary" data-pinsave="${esc(v)}">Salva</button></div>
      <p class="note">Su Google Maps tieni premuto sul cancello d'ingresso: in alto compaiono le coordinate, copiale qui (va bene anche il link "Condividi"). Vale per tutte le partite su questo campo.</p>
      <div class="row"><button class="btn small ghost" data-pincancel="1">Annulla</button>${pin ? `<button class="btn small ghost danger" data-pindel="${esc(v)}">Togli posizione</button>` : ''}</div>
    </div>` : ''}`;
}
function viewPartita(){
  const s = S.sheet;
  const A = isAdmin();
  const opts = sel => `<option value="">Nessuno</option>` + S.players.map(p => { const n=matchNum(p.id); return `<option value="${p.id}" ${sel===p.id?'selected':''}>${esc((n?n+' ':'')+p.name)}</option>`; }).join('');
  const f = (k,l,t='text') => `<div><label class="f" for="f_${k}">${l}</label><input id="f_${k}" type="${t}" data-sheet="${k}" value="${esc(s[k])}"></div>`;
  const nm = nextMatch();
  const calRows = S.calendar.slice().sort((a,b)=>(a.date||'').localeCompare(b.date||'')).map(m => `
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
    </div>`).join('');
  return `<section class="panel">
    <h2>Partita</h2>
    ${nm ? `<div class="nextmatch">
      <span class="note">Prossima partita in calendario</span>
      <div class="row" style="justify-content:space-between;align-items:center;margin-top:4px;flex-wrap:wrap">
        <div><b>${esc(nm.opponent||'Avversario')}</b> — ${fmtDate(nm.date)}${nm.time?', '+esc(nm.time):''}${nm.venue?' · '+esc(nm.venue):''}${nm.home?' · Casa':''}${nm.friendly?' · <span class="note">amichevole</span>':''}</div>
        <button class="btn small primary" data-act="usenext">Usa questa</button>
      </div>
      <p class="hint" style="margin:6px 0 0">Oppure ignora e scrivi qui sotto i dati di un'altra partita (amichevole, recupero, ecc.).</p>
    </div>` : ''}
    <p class="hint">Questi dati finiscono nell'intestazione di ogni pagina del PDF. Il calendario delle partite è in Squadra → Calendario.</p>
    <div class="grid">
      ${f('team','La nostra squadra (nel PDF)')}${f('opponent','Avversario')}
      ${f('date','Data','date')}${f('time','Ora','time')}
      ${f('venue','Campo')}${f('category','Categoria')}
      <div><label class="f" for="f_cap">Capitano</label><select id="f_cap" data-sheet="captain">${opts(s.captain)}</select></div>
      <div><label class="f" for="f_vice">Vice capitano</label><select id="f_vice" data-sheet="vice">${opts(s.vice)}</select></div>
    </div>
    <div style="margin-top:12px"><label class="f" for="f_notes">Note per la squadra</label><textarea id="f_notes" data-sheet="notes">${esc(s.notes)}</textarea></div>
    <div class="row" style="margin-top:14px"><button class="btn ghost danger" data-act="newmatch">Nuova partita (svuota formazione e dati)</button></div>
  </section>
`;
}

function viewFriendlies(){ /* in Squadra → Calendario */
  const today = todayISO();
  const rows = (S.reg.friendlies||[]).slice().sort((a,b)=>(a.date||'').localeCompare(b.date||'')).map(m => `
    <div class="teamcard ${m.date && m.date < today ? 'past' : ''}">
      <div class="grid">
        <div><label class="f">Data</label><input type="date" data-frid="${m.id}" data-frf="date" value="${esc(m.date||'')}"></div>
        <div><label class="f">Ora</label><input type="time" data-frid="${m.id}" data-frf="time" value="${esc(m.time||'')}"></div>
        <div><label class="f">Avversario</label><input data-frid="${m.id}" data-frf="opponent" value="${esc(m.opponent||'')}" placeholder="Avversario"></div>
        <div><label class="f">Campo</label><input data-frid="${m.id}" data-frf="venue" value="${esc(m.venue||'')}" placeholder="Campo"></div>
      </div>
      <div class="row" style="margin-top:10px;justify-content:space-between">
        <label class="row" style="gap:6px"><input type="checkbox" data-frid="${m.id}" data-frf="home" ${m.home?'checked':''}> In casa</label>
        <button class="iconbtn" aria-label="Elimina amichevole" data-frdel="${m.id}">×</button>
      </div>
    </div>`).join('');
  return `<section class="panel">
    <h3 style="margin-top:0">Amichevoli</h3>
    <p class="hint">Partite fuori dal calendario ufficiale: le può aggiungere anche il mister. Compaiono nel calendario, in "Usa questa" di Gara → Partita e in Statistiche → Partite.</p>
    ${rows || '<p class="empty">Nessuna amichevole.</p>'}
    <div class="row" style="margin-top:10px"><button class="btn small" data-act="fradd">+ Aggiungi amichevole</button></div>
  </section>`;
}
const CALLUP_STATUSES = ['CON','NC','INF','SQL','ND'];
const CALLUP_LABELS = {CON:'Convocato', NC:'Non convocato', INF:'Infortunato', SQL:'Squalificato', ND:'Non disponibile'};
const CALLUP_COLOR_VAR = {CON:'--grass', NC:'--muted', INF:'--red', SQL:'--ink', ND:'--amber'};
function viewConvocazioni(){
  const s = S.sheet;
  if(!S.players.length) return `<section class="panel"><h2>Convocazioni</h2><p class="empty">Prima inserisci la rosa nella scheda Rosa.</p></section>`;
  const sorted = S.players.slice().sort((a,b) => a.name.localeCompare(b.name, 'it'));
  const rows = sorted.map(p => {
    const cur = s.callup[p.id] || '';
    const btns = CALLUP_STATUSES.map(st => `<button data-callupid="${p.id}" data-callupstatus="${st}" aria-pressed="${cur===st}" title="${CALLUP_LABELS[st]}">${st}</button>`).join('');
    return `<div class="callrow" data-status="${cur}">
      <div class="callname">${esc(p.name)}</div>
      <div class="seg callseg" role="group" aria-label="Stato convocazione ${esc(p.name)}">${btns}</div>
    </div>`;
  }).join('');
  const count = CALLUP_STATUSES.reduce((o,st)=>{ o[st]=sorted.filter(p=>(s.callup[p.id]||'')===st).length; return o; }, {});
  const chips = CALLUP_STATUSES.map(st => `<span class="countchip" data-status="${st}"><b>${count[st]||0}</b>${st}</span>`).join('');
  const nm = nextMatch();
  return `<section class="panel">
    <h2>Convocazioni</h2>
    ${nm ? `<div class="nextmatch">
      <span class="note">Prossima partita in calendario</span>
      <div class="row" style="justify-content:space-between;align-items:center;margin-top:4px;flex-wrap:wrap">
        <div><b>${esc(nm.opponent||'Avversario')}</b> — ${fmtDate(nm.date)}${nm.time?', '+esc(nm.time):''}${nm.venue?' · '+esc(nm.venue):''}${nm.home?' · Casa':''}${nm.friendly?' · <span class="note">amichevole</span>':''}</div>
        <button class="btn small primary" data-act="usenext">Usa questa</button>
      </div>
      <p class="hint" style="margin:6px 0 0">Oppure ignora e compila tu i campi qui sotto per un'altra partita (amichevole, recupero, ecc.).</p>
    </div>` : ''}
    <p class="hint">Questi dati finiscono nel foglio convocazione (PDF separato dal foglio gara), da mandare a giocatori e famiglie.</p>

    <h3 class="convh3" style="margin-top:8px">Impegno</h3>
    <div class="grid">
      <div><label class="f" for="cv_type">Tipo</label><select id="cv_type" data-sheet="convType"><option ${s.convType==='Campionato'?'selected':''}>Campionato</option><option ${s.convType==='Amichevole'?'selected':''}>Amichevole</option><option ${s.convType==='Coppa'?'selected':''}>Coppa</option><option ${s.convType==='Recupero'?'selected':''}>Recupero</option><option ${s.convType==='Torneo'?'selected':''}>Torneo</option></select></div>
      <div><label class="f" for="cv_home">Sede</label><select id="cv_home" data-sheet="home"><option value="1" ${s.home?'selected':''}>Casa</option><option value="" ${!s.home?'selected':''}>Trasferta</option></select></div>
    </div>

    <h3 class="convh3">Campo di gioco</h3>
    ${(() => { const l = luogoPartita(s), u = luogoUrl(l); return l.venue ? `
    <div class="addrrow luogo">
      <div class="luogotxt"><b>${esc(l.venue)}</b>${l.address ? `<br><span>${esc(l.address)}</span>` : ''}</div>
      ${u ? `<a class="iconbtn2" href="${esc(u)}" target="_blank" rel="noopener" title="Apri in Google Maps" aria-label="Apri in Google Maps">📍</a>` : ''}
      ${pinBtn(l.venue)}
    </div>
    ${pinBox(l.venue, true)}
    <p class="note">Come scritto nel calendario ufficiale o nell'ultimo comunicato: si aggiorna da solo.</p>`
      : `<p class="note">Campo non indicato: scrivilo nel calendario della squadra.</p>`; })()}

    <h3 class="convh3">Ritrovo</h3>
    <div class="grid">
      <div><label class="f" for="cv_meettime">Orario</label><input id="cv_meettime" type="time" data-sheet="meetTime" value="${esc(defaultMeetTime(s))}"></div>
      <div><label class="f" for="cv_meetaddr">Indirizzo del ritrovo</label>
        <div class="addrrow"><input id="cv_meetaddr" data-sheet="meetAddress" value="${esc(s.meetAddress||'')}" placeholder="Al campo di gioco (scrivi solo se è altrove)">
          <a id="cv_mapslink" class="iconbtn2" href="${esc(mapsLink(s))}" target="_blank" rel="noopener" title="Apri in Google Maps" aria-label="Apri in Google Maps" ${mapsLink(s)?'':'hidden'}>📍</a>
        </div>
      </div>
    </div>
    <div style="margin-top:12px"><label class="f" for="cv_notes">Note</label><textarea id="cv_notes" data-sheet="convNotes">${esc(s.convNotes)}</textarea></div>

    <div class="row" style="justify-content:space-between;align-items:center;margin-top:26px;flex-wrap:wrap;gap:10px">
      <h3 class="convh3" style="margin:0">Giocatori</h3>
      <div class="row" style="gap:6px">${chips}</div>
    </div>
    <p class="hint">Ordine alfabetico. Tocca lo stato per ciascun giocatore: <b>CON</b> convocato · <b>NC</b> non convocato · <b>INF</b> infortunato · <b>SQL</b> squalificato · <b>ND</b> non disponibile.</p>
    <div class="callist">${rows}</div>
    <div class="row" style="margin-top:16px;justify-content:space-between">
      <button class="btn primary" data-act="downloadconv">Scarica convocazione PDF</button>
      <button class="btn small ghost danger" data-act="resetconv">Svuota convocazioni</button>
    </div>
  </section>`;
}

function chip(p, extra=''){
  const cls = [];
  if(slotOf(p.id)) cls.push('used');
  if(S.sheet.bench.includes(p.id)) cls.push('bench');
  if(selectedPlayer===p.id) cls.push('selected');
  const n = matchNum(p.id);
  return `<button class="chip ${cls.join(' ')}" data-player="${p.id}" ${extra}><b>${n||'–'}</b>${esc(p.name||'Senza nome')}</button>`;
}

function pitchLines(){
  return `<div class="ln" style="left:-2px;right:-2px;top:50%;border-width:2px 0 0"></div>
  <div class="ln" style="left:50%;top:50%;width:26%;aspect-ratio:1;border-radius:50%;transform:translate(-50%,-50%)"></div>
  <div class="ln" style="left:20%;right:20%;top:-2px;height:15.7%"></div>
  <div class="ln" style="left:36.5%;right:36.5%;top:-2px;height:5.2%"></div>
  <div class="ln" style="left:20%;right:20%;bottom:-2px;height:15.7%"></div>
  <div class="ln" style="left:36.5%;right:36.5%;bottom:-2px;height:5.2%"></div>`;
}

/* Posizione del campo toccata: si apre l'elenco per scegliere chi metterci (comodo da telefono,
   dove campo e giocatori non stanno insieme sullo schermo e il trascinamento non arriva) */
let slotPick = null, slotPickAt = 0;   // slotPickAt: quando si è aperto (per ignorare il "clic fantasma" del tocco)
function viewSlotPicker(){
  const s = S.sheet;
  if(slotPick == null || !(FORMATIONS[s.formation]||[]).some(([n]) => String(n) === String(slotPick))) return '';
  const ora = P(s.lineup[slotPick]);
  const liberi = S.players.filter(p => !slotOf(p.id)), inCampo = S.players.filter(p => slotOf(p.id) && p.id !== s.lineup[slotPick]);
  const btn = p => `<button class="chip" data-pickplayer="${p.id}"><b>${matchNum(p.id)||'–'}</b>${esc(p.name)}</button>`;
  return `<div class="picker" role="dialog" aria-modal="true" aria-label="Scegli il giocatore per la posizione ${slotPick}">
    <button class="pickback" data-pickclose aria-label="Chiudi"></button>
    <div class="pickbox">
      <div class="pickhd"><div><b>Posizione ${esc(slotPick)}</b>${ora ? `<span class="note"> · ora: ${esc(ora.name)}</span>` : ''}</div>
        <button class="btn small ghost" data-pickclose>Chiudi</button></div>
      ${ora ? '<button class="btn small danger" data-pickclear>Togli dal campo</button>' : ''}
      <div class="coachhd" style="margin-top:12px">Da mettere in campo</div>
      <div class="tray">${liberi.map(btn).join('') || '<span class="note">Tutti i giocatori sono già in campo.</span>'}</div>
      ${inCampo.length ? `<div class="coachhd" style="margin-top:12px">Già in campo (si spostano qui)</div><div class="tray">${inCampo.map(btn).join('')}</div>` : ''}
    </div>
  </div>`;
}
/* Formazione come la prima pagina del PDF, da sinistra a destra: distinta (titolari, panchina, disponibili) ·
   campo · modulo, capitani, piazzati e note. Da telefono le tre colonne vanno una sotto l'altra. */
function viewFormazione(){
  const s = S.sheet;
  if(!S.players.length) return `<section class="panel"><h2>Formazione</h2><p class="empty">Prima inserisci la rosa nella scheda Rosa.</p></section>`;
  const fopts = Object.keys(FORMATIONS).map(k => `<option ${k===s.formation?'selected':''}>${k}</option>`).join('');
  const hasSlotPos = !!(s.slotPos && Object.keys(s.slotPos).length);
  const slots = (FORMATIONS[s.formation]||[]).map(([n,bx,by]) => {
    const p = P(s.lineup[n]);
    const {x,y} = effSlot(s, n, bx, by);
    return `<div class="slot ${p?'':'empty'}" data-drop-slot="${n}" data-move-slot="${n}" style="left:${x}%;top:${y}%;cursor:grab">
      <span class="sn">${n}</span>
      <span class="disc">${n}</span>
      ${p ? `<span class="pname">${esc(surname(p.name))}</span><button class="x" aria-label="Togli ${esc(p.name)}" data-clear-slot="${n}">×</button>` : ''}
    </div>`;
  }).join('');
  const kTag = p => p.id===s.captain ? '<span class="ktag">K</span>' : p.id===s.vice ? '<span class="ktag">VK</span>' : '';
  // Titolari nell'ordine del modulo, come nella distinta del PDF
  const titolari = starters().map(({slot, p}) => `<div class="frow">
      <b class="fnum">${p ? (matchNum(p.id)||'–') : '–'}</b>
      ${p ? `<span class="fname">${esc(p.name)}</span>${kTag(p)}<button class="iconbtn fx" aria-label="Togli ${esc(p.name)}" data-clear-slot="${slot}">×</button>`
          : `<span class="fname vuoto">Posizione ${slot} da assegnare</span>`}
    </div>`).join('');
  const panchina = s.bench.map(P).filter(Boolean).map(p => `<div class="frow">
      <b class="fnum bench">${matchNum(p.id)||'–'}</b><span class="fname">${esc(p.name)}</span>${kTag(p)}
      <button class="iconbtn fx" aria-label="Togli ${esc(p.name)} dalla panchina" data-bench="${p.id}">×</button>
    </div>`).join('');
  // Disponibili: né in campo né in panchina. Tocca = prossima posizione libera; "Panchina" = in panchina
  const liberi = S.players.filter(p => !slotOf(p.id) && !s.bench.includes(p.id));
  const disponibili = liberi.map(p => `<div class="frow libero">${chip(p)}<button class="btn small ghost" data-bench="${p.id}">Panchina</button></div>`).join('');
  const opts = sel => `<option value="">Nessuno</option>` + S.players.filter(p => slotOf(p.id) || s.bench.includes(p.id) || p.id===sel)
    .map(p => { const n=matchNum(p.id); return `<option value="${p.id}" ${sel===p.id?'selected':''}>${esc((n?n+' ':'')+p.name)}</option>`; }).join('');
  const piazzati = s.selected.map(id => S.schemes.find(q => q.id===id)).filter(Boolean);
  return `<section class="panel">
    <h2>Formazione</h2>
    <p class="hint">Tocca una <b>posizione sul campo</b> per scegliere chi metterci, oppure tocca un giocatore <b>disponibile</b> per metterlo nella prossima posizione libera (o trascinalo sul campo). Il numerino in alto sulla pedina è il ruolo usato negli schemi.</p>
    <div class="fgrid">
      <div class="fcol">
        <h3>Titolari</h3>
        <div class="flist">${titolari}</div>
        <h3>Panchina</h3>
        <div class="flist">${panchina || '<p class="note">Nessuno in panchina: aggiungili dai disponibili.</p>'}</div>
        ${liberi.length ? `<h3>Disponibili</h3><div class="flist">${disponibili}</div>` : ''}
      </div>
      <div class="fcol">
        <div class="pitch" id="pitch">${pitchLines()}${slots}</div>${viewSlotPicker()}
        ${hasSlotPos ? `<div class="row" style="margin-top:8px"><button class="btn small ghost" data-act="resetslotpos">Ripristina posizioni modulo</button></div>` : ''}
      </div>
      <div class="fcol fside">
        <div><label class="f" for="f_form">Modulo</label><select id="f_form" data-sheet="formation" class="fmodulo">${fopts}</select></div>
        <div><label class="f" for="f_cap">Capitano</label><select id="f_cap" data-sheet="captain">${opts(s.captain)}</select></div>
        <div><label class="f" for="f_vice">Vice capitano</label><select id="f_vice" data-sheet="vice">${opts(s.vice)}</select></div>
        <div>
          <label class="f">Calci piazzati</label>
          ${piazzati.length ? `<ul class="fpiaz">${piazzati.map((q,i) => `<li><span class="note">p. ${i+2}</span> ${esc(q.name)}</li>`).join('')}</ul>` : '<p class="note" style="margin:0">Nessuno scelto.</p>'}
          <button class="btn small ghost" data-hgo="piazzati" style="margin-top:6px">Scegli i piazzati</button>
        </div>
        <div><label class="f" for="f_notes2">Note per la squadra</label><textarea id="f_notes2" data-sheet="notes" rows="5">${esc(s.notes)}</textarea></div>
      </div>
    </div>
  </section>`;
}

function viewSchemes(){
  const sel = S.sheet.selected, A = isAdmin();
  const cards = S.schemes.map((sc,i) => {
    const isSel = sel.includes(sc.id);
    return `<div class="scard ${isSel?'sel':''}">
      <button class="scardmain" data-schemecard="${sc.id}" aria-pressed="${isSel}" aria-label="${isSel?'Togli dalla partita':'Seleziona per la partita'}: ${esc(sc.name)}">
        <span class="chk2" aria-hidden="true">${isSel?'✓':''}</span>
        ${schemeThumb(sc)}
        <span class="stitle">${esc(sc.name)}<span class="side ${sc.side}">${sc.side==='favore'?'A favore':'A sfavore'}</span></span>
        <span class="ssub">${sc.subtitle?esc(sc.subtitle)+' · ':''}${sc.tokens.length} pedine</span>
      </button>
      <div class="row sassign" style="justify-content:space-between">
        ${isSel ? `<button class="btn small primary" data-open="${sc.id}">Assegna</button>` : `<p class="note">Seleziona per assegnare</p>`}
        ${A?`<span class="row" style="gap:4px">
          <button class="iconbtn" aria-label="Modifica disegno ${esc(sc.name)}" data-open="${sc.id}" data-editmode="1">✎</button>
          <button class="iconbtn" aria-label="Sposta su" data-up="${i}">↑</button>
          <button class="iconbtn" aria-label="Sposta giù" data-down="${i}">↓</button>
        </span>`:''}
      </div>
    </div>`;
  }).join('');
  const bopts = Object.entries(BASES).map(([k,b]) => `<option value="${k}">${b.name}</option>`).join('');
  return `<section class="panel">
    <h2>Calci piazzati</h2>
    ${A ? '<p class="hint">Database comune a tutte le squadre: quello che crei o modifichi qui lo vedono tutti i mister.</p>' : lockNote('Gli schemi sono comuni a tutte le squadre e li carica l\'amministratore. Tu scegli quali stampare, assegni i giocatori e, solo per la tua partita, puoi cambiare i compiti, spostare pedine o disegnare frecce: nessuna di queste modifiche cambia lo schema per gli altri.')}
    <p class="hint">Tocca uno schema per selezionarlo per questa partita: solo per quelli selezionati potrai assegnare compiti e giocatori. I giocatori si riempiono comunque in automatico dalla formazione, in base al numero di ruolo.</p>
    <div class="sgrid">${cards || '<p class="empty">Ancora nessuno schema.</p>'}</div>
  </section>
  ${A ? `<section class="panel">
    <h3 style="margin-top:0">Nuovo schema</h3>
    <div class="row"><select id="base" style="max-width:260px">${bopts}</select><button class="btn primary" data-act="newscheme">Crea schema</button></div>
  </section>` : ''}`;
}

const YS = 1.5, VX0 = -25, VX1 = 35, VY0 = -3, VY1 = 31;
function fieldSVG(){
  const g = '#2F6B45', Y = v => v*YS;
  const stripes = Array.from({length:10},(_,i)=>`<rect x="${VX0}" y="${Y(VY0)+i*(VY1-VY0)*YS/10}" width="${VX1-VX0}" height="${(VY1-VY0)*YS/10}" fill="${i%2?'#D8E9DD':'#E3EFE6'}"/>`).join('');
  const a = Math.acos(5.5/9.15);
  const ax1 = -9.15*Math.sin(a), ay = Y(11+9.15*Math.cos(a)), ax2 = 9.15*Math.sin(a);
  return `${stripes}
  <g fill="none" stroke="${g}" stroke-width=".28" stroke-linecap="round">
    <line x1="${VX0}" y1="0" x2="${VX1}" y2="0"/>
    <line x1="34" y1="0" x2="34" y2="${Y(VY1)}"/>
    <rect x="-20.16" y="0" width="40.32" height="${Y(16.5)}"/>
    <rect x="-9.16" y="0" width="18.32" height="${Y(5.5)}"/>
    <rect x="-3.66" y="${Y(-2.2)}" width="7.32" height="${Y(2.2)}"/>
    <path d="M ${ax1} ${ay} A 9.15 ${9.15*YS} 0 0 0 ${ax2} ${ay}"/>
    <path d="M 33 0 A 1 ${YS} 0 0 1 34 ${YS}"/>
  </g>
  <circle cx="0" cy="${Y(11)}" r=".3" fill="${g}"/>`;
}
function ballSVG(b, drag){ return `<g ${drag?'data-ball="1" style="cursor:grab"':''} transform="translate(${b.x} ${b.y*YS})">${drag?'<circle r="2.4" fill="transparent"/>':''}<circle r="1.15" fill="#fff" stroke="#15202B" stroke-width=".22"/><path d="M0 -.45 L.43 -.14 L.27 .37 L-.27 .37 L-.43 -.14Z" fill="#15202B"/></g>`; }
function schemeThumb(sc){
  const rm = roleMap(sc);
  const mid = 'ah-'+sc.id;
  const dots = effTokens(sc).map(t => `<circle cx="${t.x}" cy="${t.y*YS}" r="1.5" fill="${tokColor(sc,t,rm)}" stroke="#fff" stroke-width=".3"/>`).join('');
  const allDraw = [...(sc.draw||[]), ...effDraw(sc)];
  const shapes = allDraw.map(d => `<line x1="${d.x1}" y1="${d.y1*YS}" x2="${d.x2}" y2="${d.y2*YS}" stroke="#C8102E" stroke-width=".35" stroke-linecap="round" ${d.dashed?'stroke-dasharray=".9 .7"':''} ${d.type==='arrow'?`marker-end="url(#${mid})"`:''}/>`).join('');
  return `<svg class="sthumb" viewBox="${VX0} ${VY0*YS} ${VX1-VX0} ${(VY1-VY0)*YS}" role="img" aria-label="Anteprima schema ${esc(sc.name)}"><defs><marker id="${mid}" markerWidth="3.2" markerHeight="3.2" refX="2.6" refY="1.6" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L3.2,1.6 L0,3.2 Z" fill="#C8102E"/></marker></defs>${fieldSVG()}${shapes}${ballSVG(effBall(sc),false)}${dots}</svg>`;
}

function markG(m, i, attr, interactive, isSel){
  return `<g ${interactive?`${attr}="${i}" style="cursor:pointer"`:''}>
    <circle cx="${m.x}" cy="${m.y*YS}" r="2.2" fill="transparent"/>
    <text x="${m.x}" y="${m.y*YS+.6}" text-anchor="middle" font-family="Barlow, Arial, sans-serif" font-weight="700" font-size="2" fill="${isSel?'#1F5FA8':'#C8102E'}" pointer-events="none">${esc(m.text)}</text>
  </g>`;
}
function marksSVG(sc, sel){
  const base = (sc.marks||[]).map((m,i) => markG(m, i, 'data-mark', isAdmin(), boardMode==='draw' && isAdmin() && sel && sel.kind==='mark' && sel.layer==='base' && sel.index===i)).join('');
  const edit = effMarks(sc).map((m,i) => markG(m, i, 'data-emark', !isAdmin(), boardMode==='draw' && !isAdmin() && sel && sel.kind==='mark' && sel.layer==='edit' && sel.index===i)).join('');
  return base + edit;
}
function drawG(d, i, attr, interactive, isSel){
  const dash = d.dashed ? 'stroke-dasharray=".9 .7"' : '';
  const marker = d.type==='arrow' ? 'marker-end="url(#arrowhead)"' : '';
  return `<g>
    ${interactive?`<line x1="${d.x1}" y1="${d.y1*YS}" x2="${d.x2}" y2="${d.y2*YS}" stroke="transparent" stroke-width="1.6" ${attr}="${i}" style="cursor:pointer"/>`:''}
    <line x1="${d.x1}" y1="${d.y1*YS}" x2="${d.x2}" y2="${d.y2*YS}" stroke="${isSel?'#1F5FA8':'#C8102E'}" stroke-width="${isSel?.45:.32}" stroke-linecap="round" ${dash} ${marker} pointer-events="none"/>
  </g>`;
}
function drawShapesSVG(sc, sel){
  const base = (sc.draw||[]).map((d,i) => drawG(d, i, 'data-draw', isAdmin(), boardMode==='draw' && isAdmin() && sel && sel.kind==='draw' && sel.layer==='base' && sel.index===i)).join('');
  const edit = effDraw(sc).map((d,i) => drawG(d, i, 'data-edraw', !isAdmin(), boardMode==='draw' && !isAdmin() && sel && sel.kind==='draw' && sel.layer==='edit' && sel.index===i)).join('');
  return base + edit;
}
function renderDraftLine(d){
  const el = document.getElementById('draftline'); if(!el) return;
  el.setAttribute('x1', d.x1); el.setAttribute('y1', d.y1*YS);
  el.setAttribute('x2', d.x2); el.setAttribute('y2', d.y2*YS);
  el.setAttribute('stroke-dasharray', d.dashed ? '.9 .7' : '');
  el.setAttribute('marker-end', d.type==='arrow' ? 'url(#arrowhead)' : '');
  el.setAttribute('opacity', '1');
}
const DRAW_TOOLS = [
  ['arrow','Freccia'], ['arrow-dash','Freccia tratteggiata'],
  ['line','Linea'], ['line-dash','Linea tratteggiata'], ['text','Testo']
];
/* Sotto il campo dei piazzati: per ogni compito, numero e cognome (sul campo ci sono solo i numeri) */
function compitiList(sc, rm){
  const gruppi = new Map();
  effTokens(sc).forEach(t => { const k = (t.role||'').trim() || 'Altri'; if(!gruppi.has(k)) gruppi.set(k, []); gruppi.get(k).push(t); });
  const righe = [...gruppi.entries()].sort((a,b) => (a[0]==='Altri') - (b[0]==='Altri')).map(([role, toks]) => {
    const col = rm.get(role) || 'var(--ink)';
    const chi = toks.slice().sort((a,b) => a.slot-b.slot).map(t => {
      const {p, override} = tokenPlayer(sc, t);
      return `<span class="scomp${p?'':' vuoto'}"><b style="background:${p?col:'transparent'};border-color:${col};color:${p?'#fff':col}">${p ? (matchNum(p.id)||t.slot) : t.slot}</b>${p ? esc(surname(p.name)) + (override?' *':'') : 'da assegnare'}${t.tag?` <i>${esc(t.tag)}</i>`:''}</span>`;
    }).join('');
    return `<div class="scomprow"><span class="scompr"><i style="background:${col}"></i>${esc(role)}</span><div class="scompp">${chi}</div></div>`;
  }).join('');
  return righe ? `<div class="scompiti">${righe}</div>` : '';
}
/* Modalità Assegna: per ogni compito le sue pedine, e per ognuna la tendina con la rosa.
   Prima voce = "Dalla formazione" (chi gioca con quel numero di ruolo); scegliere un altro giocatore
   lo cambia solo in questo schema (*). Il compito si cambia nella stessa riga: il mister solo per
   la sua partita, l'admin nello schema comune. */
function assegnaList(sc, rm, roles){
  const A = isAdmin();
  const rosa = S.players.slice().sort((a,b) => (matchNum(a.id)||99) - (matchNum(b.id)||99) || a.name.localeCompare(b.name,'it'));
  const gruppi = new Map();
  effTokens(sc).forEach(t => { const k = (t.role||'').trim() || 'Senza compito'; if(!gruppi.has(k)) gruppi.set(k, []); gruppi.get(k).push(t); });
  const blocchi = [...gruppi.entries()].sort((a,b) => (a[0]==='Senza compito') - (b[0]==='Senza compito')).map(([role, toks]) => {
    const col = rm.get(role) || 'var(--ink)';
    const righe = toks.slice().sort((a,b) => a.slot-b.slot).map(t => {
      const {p, override} = tokenPlayer(sc, t);
      const dallaForm = P(S.sheet.lineup[t.slot]);
      const opts = `<option value="">${dallaForm ? `${matchNum(dallaForm.id) ? matchNum(dallaForm.id)+' · ' : ''}${esc(dallaForm.name)} (formazione)` : 'Nessuno in formazione'}</option>` +
        rosa.map(q => `<option value="${q.id}" ${override && p && p.id===q.id ? 'selected' : ''}>${matchNum(q.id) ? matchNum(q.id)+' · ' : ''}${esc(q.name)}</option>`).join('');
      return `<div class="asrow">
        <b class="asnum" style="background:${p?col:'transparent'};border-color:${col};color:${p?'#fff':col}">${p ? (matchNum(p.id)||t.slot) : t.slot}</b>
        <select id="as_${t.id}" data-atok="${t.id}" aria-label="Giocatore della pedina ${t.slot}" class="${override?'ov':''}">${opts}</select>
        <input data-arole="${t.id}" list="rolelist" value="${esc(t.role)}" placeholder="Compito" aria-label="Compito della pedina ${t.slot}">
      </div>`;
    }).join('');
    return `<div class="asgrp"><div class="scompr"><i style="background:${col}"></i>${esc(role)}</div>${righe}</div>`;
  }).join('');
  return `<h3>Chi fa cosa</h3>
    <p class="hint">Scegli il giocatore per ogni pedina${A ? '' : ' (vale solo per questa partita)'}: di partenza c'è chi gioca con quel numero di ruolo in formazione. Puoi anche toccare una pedina sul campo.</p>
    <datalist id="rolelist">${roles.map(r=>`<option value="${esc(r)}">`).join('')}</datalist>
    <div class="aslist">${blocchi}</div>`;
}
/* Mister, modalità Pedine: compito ed etichetta della pedina toccata, solo per questa partita */
function misterTokPanel(sc, roles){
  const t = effTokens(sc).find(q => q.id===selectedToken);
  const base = sc.tokens.find(q => q.id===selectedToken);
  if(!t) return `<p class="note" style="margin-top:10px">Trascina pedine e pallone. Tocca una pedina per cambiarne il compito. Le modifiche restano solo su questa partita, non toccano lo schema condiviso con gli altri mister.</p>`;
  const cambiato = (t.role||'') !== (base.role||'') || (t.tag||'') !== (base.tag||'');
  return `<div class="tokpanel">
    <p class="note" style="margin:0 0 8px">Pedina ${t.slot}: compito solo per questa partita.</p>
    <div class="grid">
      <div><label class="f">Compito</label><input data-etok="role" list="rolelist" value="${esc(t.role)}" placeholder="Es. Marcatura"></div>
      <div><label class="f">Etichetta rossa</label><input data-etok="tag" value="${esc(t.tag)}" placeholder="Es. 1 o M"></div>
    </div>
    <datalist id="rolelist">${roles.map(r=>`<option value="${esc(r)}">`).join('')}</datalist>
    ${cambiato ? `<div class="row" style="margin-top:10px"><button class="btn small" data-act="resetrole">Torna al compito dello schema (${esc(base.role||'nessuno')})</button></div>` : ''}
  </div>`;
}
function viewScheme(){
  const sc = S.schemes.find(s => s.id===openSchemeId);
  if(!sc){ openSchemeId=null; return viewSchemes(); }
  const A = isAdmin();
  const rm = roleMap(sc);
  const eTokens = effTokens(sc);
  const nl = nameLayout(eTokens);
  const moveMode = boardMode==='move', drawMode = boardMode==='draw';
  const toks = eTokens.map(t => {
    const {p, override} = tokenPlayer(sc, t);
    const col = tokColor(sc, t, rm);
    const sel = selectedToken===t.id && moveMode;
    const lbl = p ? (matchNum(p.id)||'·') : t.slot;
    return `<g ${moveMode?`data-move-token="${t.id}" style="cursor:grab"`:`data-drop-token="${t.id}" style="cursor:pointer"`} transform="translate(${t.x} ${t.y*YS})">
      <circle r="3" fill="transparent"/>
      ${sel?'<circle r="2.4" fill="none" stroke="#1F5FA8" stroke-width=".35"/>':''}
      <circle r="1.75" fill="${p?col:'#fff'}" stroke="${p?'#fff':col}" stroke-width="${p?.3:.3}" ${p?'':'stroke-dasharray=".6 .4"'}/>
      <text y=".62" text-anchor="middle" font-family="Barlow Condensed, Arial Narrow, sans-serif" font-weight="700" font-size="1.85" fill="${p?'#fff':col}">${lbl}</text>
      ${t.tag?`<text y="-2.35" text-anchor="middle" font-family="Barlow, Arial, sans-serif" font-weight="700" font-size="1.4" fill="#C8102E">${esc(t.tag)}</text>`:''}
      ${p && override ? `<text x="1.55" y="-1.15" font-family="Barlow, Arial, sans-serif" font-weight="700" font-size="1.5" fill="#1F5FA8" stroke="#fff" stroke-width=".3" paint-order="stroke">*</text>` : ''}
    </g>`;
  }).join('');
  const legend = [...rm.entries()].map(([r,c]) => `<span><i style="background:${c}"></i>${esc(r)}</span>`).join('');
  const st = A ? sc.tokens.find(t => t.id===selectedToken) : null;
  const roles = [...new Set(S.schemes.flatMap(s => s.tokens.map(t => t.role).filter(Boolean)))];
  const slotOpts = n => Array.from({length:11},(_,i)=>`<option ${i+1===n?'selected':''}>${i+1}</option>`).join('');
  const hasEdits = !!(S.sheet.schemeEdits && S.sheet.schemeEdits[sc.id] && (Object.keys(S.sheet.schemeEdits[sc.id].tokens||{}).length || Object.keys(S.sheet.schemeEdits[sc.id].roles||{}).length || (S.sheet.schemeEdits[sc.id].draw||[]).length || (S.sheet.schemeEdits[sc.id].marks||[]).length || S.sheet.schemeEdits[sc.id].ball));
  const selShape = drawMode && selectedDraw && selectedDraw.kind==='draw' ? (selectedDraw.layer==='base' ? sc.draw[selectedDraw.index] : schemeEdit(sc).draw[selectedDraw.index]) : null;
  const selMark = drawMode && selectedDraw && selectedDraw.kind==='mark' ? (selectedDraw.layer==='base' ? sc.marks[selectedDraw.index] : schemeEdit(sc).marks[selectedDraw.index]) : null;
  let panel;
  if(moveMode){
    panel = (A && st) ? `<div class="tokpanel">
      <div class="grid">
        <div><label class="f">Numero di ruolo</label><select data-tok="slot">${slotOpts(st.slot)}</select></div>
        <div><label class="f">Compito</label><input data-tok="role" list="rolelist" value="${esc(st.role)}" placeholder="Es. Marcatura"></div>
        <div><label class="f">Etichetta rossa</label><input data-tok="tag" value="${esc(st.tag)}" placeholder="Es. 1 o M"></div>
      </div>
      <datalist id="rolelist">${roles.map(r=>`<option value="${esc(r)}">`).join('')}</datalist>
      <div class="row" style="margin-top:10px"><button class="btn small danger" data-act="deltok">Elimina pedina</button></div>
    </div>` : (A
      ? `<p class="note" style="margin-top:10px">Trascina pedine e pallone. Tocca una pedina per cambiarne ruolo e compito: aggiorni lo schema condiviso, lo vedono tutti i mister.</p>`
      : misterTokPanel(sc, roles));
  } else if(drawMode){
    const toolBtns = DRAW_TOOLS.map(([k,label]) => `<button data-drawtool="${k}" aria-pressed="${drawTool===k}">${label}</button>`).join('');
    panel = `<div class="tokpanel">
      <label class="f">Strumento</label>
      <div class="seg" role="group" aria-label="Strumento di disegno" style="flex-wrap:wrap">${toolBtns}</div>
      <p class="hint" style="margin-top:8px">${drawTool==='text' ? 'Tocca il campo dove vuoi scrivere.' : drawTool ? 'Trascina sul campo per disegnare.' : 'Scegli uno strumento, oppure tocca una freccia/linea/testo già presente per selezionarla.'}${A?'':' Quello che disegni resta solo su questa partita.'}</p>
      ${selShape || selMark ? `<div class="row" style="margin-top:10px">
        ${selMark ? `<button class="btn small" data-act="edittext">Modifica testo</button>` : ''}
        <button class="btn small danger" data-act="deldraw">Elimina selezionato</button>
      </div>` : ''}
    </div>`;
  } else {
    panel = assegnaList(sc, rm, roles);
  }
  return `<section class="panel">
    <div class="row" style="justify-content:space-between;margin-bottom:10px">
      <button class="btn small ghost" data-act="back">← Tutti gli schemi</button>
      <div class="seg" role="group" aria-label="Modalità">
        <button data-mode="assign" aria-pressed="${boardMode==='assign'}">Assegna</button>
        <button data-mode="move" aria-pressed="${moveMode}">Pedine</button>
        <button data-mode="draw" aria-pressed="${drawMode}">Disegna</button>
      </div>
    </div>
    ${A ? '' : `<h2>${esc(sc.name)}<span class="side ${sc.side}">${sc.side==='favore'?'A favore':'A sfavore'}</span></h2><p class="hint">${esc(sc.subtitle||'')}</p>`}
    <div class="grid ${A?'':'hidden'}" style="margin-bottom:12px">
      <div><label class="f">Nome schema</label><input data-sc="name" value="${esc(sc.name)}"></div>
      <div><label class="f">Sottotitolo</label><input data-sc="subtitle" value="${esc(sc.subtitle)}" placeholder="Es. Braccia alzate"></div>
      <div><label class="f">Tipo</label><select data-sc="side"><option value="favore" ${sc.side==='favore'?'selected':''}>A favore</option><option value="sfavore" ${sc.side==='sfavore'?'selected':''}>A sfavore</option></select></div>
    </div>
    <svg class="board" id="board" viewBox="${VX0} ${VY0*YS} ${VX1-VX0} ${(VY1-VY0)*YS}" role="img" aria-label="Schema ${esc(sc.name)}">
      <defs><marker id="arrowhead" markerWidth="3.2" markerHeight="3.2" refX="2.6" refY="1.6" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L3.2,1.6 L0,3.2 Z" fill="#C8102E"/></marker></defs>
      ${fieldSVG()}${drawShapesSVG(sc, selectedDraw)}${marksSVG(sc, selectedDraw)}${ballSVG(effBall(sc), moveMode)}${toks}
      ${drawMode ? '<line id="draftline" x1="0" y1="0" x2="0" y2="0" stroke="#C8102E" stroke-width=".35" opacity="0" pointer-events="none"/>' : ''}
    </svg>
    <div class="legend">${legend}</div>
    ${boardMode==='assign' ? '' : compitiList(sc, rm)}
    ${moveMode && A ? `<div class="row" style="margin-top:12px"><button class="btn small" data-act="addtok">Aggiungi pedina</button></div>` : ''}
    ${boardMode==='assign' ? `<div class="row" style="margin-top:12px"><button class="btn small" data-act="resetov">Ripristina dalla formazione</button></div>` : ''}
    ${boardMode!=='assign' ? `<div class="row" style="margin-top:12px"><button class="btn small" data-act="resetedits" ${hasEdits?'':'disabled'}>Ripristina originale</button></div>` : ''}
    ${panel}
    ${A ? `<div style="margin-top:14px"><label class="f">Nota sotto lo schema</label><input data-sc="note" value="${esc(sc.note)}" placeholder="Es. Marcatura a uomo sui saltatori"></div>
    <div class="row" style="margin-top:16px;justify-content:space-between">
      <button class="btn small" data-act="dupscheme">Duplica schema</button>
      <button class="btn small danger ghost" data-act="delscheme">Elimina schema</button>
    </div>` : (sc.note ? `<p class="note" style="margin-top:14px"><b>Nota:</b> ${esc(sc.note)}</p>` : '')}
  </section>`;
}

function viewPdf(){
  return `<section class="panel">
    <h2>PDF</h2>
    <p class="hint">A4 orizzontale: prima pagina con distinta e formazione, poi una pagina per ogni schema spuntato.</p>
    <div class="row">
      <button class="btn primary" data-act="download">Scarica PDF</button>
      <button class="btn" data-act="refresh">Aggiorna anteprima</button>
    </div>
    <div class="pages" id="pages"><p class="empty">Preparo l'anteprima…</p></div>
  </section>`;
}
