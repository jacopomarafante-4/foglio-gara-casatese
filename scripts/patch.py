import re
s=open('mt.html').read()
def rep(a,b,count=1):
    global s
    assert s.count(a)>=1, a[:80]
    s=s.replace(a,b,count)

# CSS
rep(".hidden{display:none!important}", """.hidden{display:none!important}
/* Multi-squadra */
.demo{background:#15202B;color:#E7EEE9;font-size:13px}
.demo .in{max-width:1000px;margin:0 auto;padding:7px 16px;display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.demo .tagd{font-family:var(--cond);font-weight:700;letter-spacing:.08em;font-size:13px;background:var(--amber);color:#15202B;padding:1px 8px;border-radius:5px}
.demo select{width:auto;min-height:32px;padding:3px 8px;background:#243241;color:#fff;border:1px solid #3a4a5a;border-radius:7px}
.ctx{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:8px}
.ctx select{width:auto;min-height:32px;padding:3px 8px;font-weight:600}
.badge{font-size:11px;font-weight:700;padding:3px 9px;border-radius:999px;letter-spacing:.06em;text-transform:uppercase}
.badge.admin{background:var(--ink);color:var(--paper)} .badge.coach{background:var(--grass);color:#fff}
.teamname{font-family:var(--cond);font-weight:600;font-size:18px}
.lock{display:flex;gap:10px;align-items:flex-start;background:var(--grass-soft);border:1px solid var(--grass-2);border-radius:10px;padding:10px 12px;font-size:14px;margin:0 0 14px}
.lock svg{flex:none;margin-top:2px}
.ro-row{display:grid;grid-template-columns:40px 1fr;gap:12px;align-items:center;padding:7px 0;border-bottom:1px solid var(--line)}
.ro-row:last-child{border-bottom:0}
.ro-row .n{display:grid;place-items:center;width:34px;height:34px;border-radius:50%;background:var(--ink);color:var(--paper);font-family:var(--cond);font-weight:700;font-size:17px}
.ro-row .nm{font-weight:600}
.cols2{columns:2 240px;column-gap:28px}
.teamcard{border:1px solid var(--line);border-radius:12px;padding:14px;margin-top:12px;background:var(--paper)}
.teamcard .hd{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:10px}
.teamcard .hd strong{font-family:var(--cond);font-size:21px;font-weight:700}
.code{font-family:ui-monospace,Menlo,Consolas,monospace;font-weight:700;background:var(--bg);padding:4px 9px;border-radius:6px;border:1px solid var(--line);letter-spacing:.05em}
.stat{font-size:13px;color:var(--muted)}
.rolebox{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;margin-top:6px}
.rolebox div{border:1px solid var(--line);border-radius:10px;padding:12px;font-size:14px}
.rolebox b{font-family:var(--cond);font-size:17px;display:block;margin-bottom:4px}
.ro-field{padding:8px 0}
.ro-field .v{font-weight:600}""")

# Header
rep("""    <div class="brand" id="brand">Foglio gara<small id="matchline">Nuova partita</small></div>""",
"""    <div><div class="brand" id="brand">Foglio gara<small id="matchline">Nuova partita</small></div><div class="ctx" id="ctx"></div></div>""")
rep("""<div class="top">
  <div class="bar">""", """<div class="top">
  <div class="demo" id="demo"></div>
  <div class="bar">""")
s=re.sub(r'<nav class="tabs" role="tablist">.*?</nav>', '<nav class="tabs" role="tablist" id="tabs"></nav>', s, flags=re.S)

# State
rep("let S = {players:[], schemes:[], sheet:defaultSheet()};",
"""let S = {teams:[], players:[], schemes:[], sheet:defaultSheet()};
/* Ruoli: 'admin' vede tutto e modifica rose, schemi e squadre; 'coach' vede solo la sua squadra */
let ROLE = 'admin', curTeam = null, hashLocked = false, unsubs = [];
const isAdmin = () => ROLE === 'admin';
const TEAM = () => S.teams.find(t => t.id === curTeam);
const teamLabel = () => S.sheet.team || TEAM()?.name || 'Noi';
const LOCK_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
function lockNote(t){ return `<div class="lock">${LOCK_ICON}<div>${t}</div></div>`; }
function genCode(){ const a='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let c=''; for(let i=0;i<6;i++) c+=a[Math.floor(Math.random()*a.length)]; return c.slice(0,3)+'-'+c.slice(3); }""")
rep("let tab = 'rosa',", "let tab = 'squadre',")

# Save / store
old_store = s[s.index("/* ---------- Salvataggio ---------- */"):s.index("/* ---------- Logica assegnazioni ---------- */")]
new_store = r"""/* ---------- Salvataggio ---------- */
/* Condivisi: shared/teams, shared/schemes. Per squadra: roster/<id>, sheet/<id> */
function docPath(name, team=curTeam){ return (name==='teams'||name==='schemes') ? 'shared/'+name : name+'/'+team; }
function payload(name){
  if(name==='teams') return {items:S.teams};
  if(name==='roster') return {players:S.players};
  if(name==='schemes') return {items:S.schemes};
  return clone(S.sheet);
}
function save(name){
  if(!isAdmin() && name!=='sheet') return;           // i mister scrivono solo il proprio foglio gara
  if(name!=='teams' && name!=='schemes' && !curTeam) return;
  const path = docPath(name), data = clone(payload(name));
  pending[path] = true; setStatus('Salvataggio…');
  clearTimeout(timers[path]);
  timers[path] = setTimeout(async () => {
    try{
      if(db) await db.doc(path).set(data);
      else { try{ localStorage.setItem('fg:'+path, JSON.stringify(data)); }catch(e){} }
      setStatus('Salvato');
    }catch(e){ setStatus('Non salvato: riprova'); }
    setTimeout(()=>{ pending[path] = false; }, 400);
  }, 600);
}
function applyDoc(name, data){
  if(!data) return;
  if(name==='teams') S.teams = clone(data.items || []);
  else if(name==='roster') S.players = clone(data.players || []);
  else if(name==='schemes') S.schemes = clone(data.items || []);
  else S.sheet = Object.assign(defaultSheet(), clone(data));
}
function resolveAccess(){
  const m = (location.hash||'').match(/squadra=([\w-]+)/i);
  if(m){
    const t = S.teams.find(t => (t.code||'').toLowerCase() === m[1].toLowerCase());
    if(t){ ROLE = 'coach'; curTeam = t.id; hashLocked = true; return; }
  }
  if(!curTeam || !TEAM()) curTeam = S.teams[0]?.id || null;
}
function subscribeTeam(){
  unsubs.forEach(u => { try{ u(); }catch(e){} }); unsubs = [];
  S.players = []; S.sheet = defaultSheet();
  if(curTeam){
    if(db){
      ['roster','sheet'].forEach(n => {
        const path = docPath(n);
        unsubs.push(db.doc(path).onSnapshot(snap => {
          if(pending[path]) return;
          if(snap.exists){ applyDoc(n, snap.data()); render(); }
        }, () => setStatus('Sincronizzazione in pausa')));
      });
    } else {
      ['roster','sheet'].forEach(n => { try{ const v = localStorage.getItem('fg:'+docPath(n)); if(v) applyDoc(n, JSON.parse(v)); }catch(e){} });
    }
  }
  render();
}
function switchView(role, team){
  ROLE = role; if(team) curTeam = team;
  if(!TEAM()) curTeam = S.teams[0]?.id || null;
  openSchemeId = null; moveMode = false; selectedToken = null; selectedPlayer = null;
  if(!allowedTabs().includes(tab)) tab = isAdmin() ? 'squadre' : 'formazione';
  subscribeTeam(); window.scrollTo(0,0);
}
async function initStore(){
  try{ if(window.claude && window.claude.use) db = await window.claude.use('db'); }catch(e){ db = null; }
  try{ if(window.claude && window.claude.use) downloads = await window.claude.use('downloads'); }catch(e){ downloads = null; }
  if(db){
    let first = true;
    db.doc('shared/schemes').onSnapshot(snap => { if(pending['shared/schemes']) return; if(snap.exists){ applyDoc('schemes', snap.data()); render(); } }, () => setStatus('Sincronizzazione in pausa'));
    db.doc('shared/teams').onSnapshot(snap => {
      if(pending['shared/teams']) return;
      if(snap.exists) applyDoc('teams', snap.data());
      const before = curTeam, beforeRole = ROLE; resolveAccess();
      if(first){ first = false; if(ROLE==='coach') tab = 'formazione'; subscribeTeam(); }
      else if(before !== curTeam || beforeRole !== ROLE) subscribeTeam();
      else render();
    }, () => setStatus('Sincronizzazione in pausa'));
    setStatus('Sincronizzato');
  } else {
    ['teams','schemes'].forEach(n => { try{ const v = localStorage.getItem('fg:shared/'+n); if(v) applyDoc(n, JSON.parse(v)); }catch(e){} });
    resolveAccess(); if(ROLE==='coach') tab = 'formazione';
    setStatus('Salvato su questo dispositivo');
    subscribeTeam();
  }
}

"""
s=s.replace(old_store,new_store)

# Render
rep("""function render(){
  document.querySelectorAll('.tab').forEach(b => b.setAttribute('aria-selected', b.dataset.tab===tab));
  const s = S.sheet;
  $('#matchline').textContent = (s.opponent ? `${s.team||'Noi'} contro ${s.opponent}` : 'Nuova partita') + (s.date ? `, ${fmtDate(s.date)}` : '');
  const v = $('#view');
  if(tab==='rosa')""", """const TAB_NAMES = {squadre:'Squadre', rosa:'Rosa', partita:'Partita', formazione:'Formazione', piazzati:'Piazzati', pdf:'PDF'};
function allowedTabs(){ return isAdmin() ? ['squadre','rosa','partita','formazione','piazzati','pdf'] : ['rosa','partita','formazione','piazzati','pdf']; }
function renderChrome(){
  const opts = `<option value="admin" ${isAdmin()?'selected':''}>Amministratore (tu)</option>` + S.teams.map(t => `<option value="coach:${t.id}" ${!isAdmin()&&t.id===curTeam?'selected':''}>Mister ${esc(t.name)}${t.coach?' · '+esc(t.coach):''}</option>`).join('');
  $('#demo').innerHTML = hashLocked ? '' : `<div class="in"><span class="tagd">ANTEPRIMA</span><label for="asview">Guarda l'app come</label><select id="asview" data-asview="1">${opts}</select></div>`;
  $('#demo').classList.toggle('hidden', hashLocked);
  const T0 = TEAM();
  $('#ctx').innerHTML = isAdmin()
    ? `<span class="badge admin">Admin</span>${S.teams.length ? `<label class="note" for="curteam">Squadra</label><select id="curteam" data-curteam="1">${S.teams.map(t=>`<option value="${t.id}" ${t.id===curTeam?'selected':''}>${esc(t.name)}</option>`).join('')}</select>` : ''}`
    : `<span class="badge coach">Mister</span><span class="teamname">${esc(T0?.name||'')}</span>`;
  $('#tabs').innerHTML = allowedTabs().map(k => `<button class="tab" role="tab" data-tab="${k}" aria-selected="${k===tab}">${TAB_NAMES[k]}</button>`).join('');
}
function render(){
  if(!allowedTabs().includes(tab)) tab = isAdmin() ? 'squadre' : 'formazione';
  renderChrome();
  const s = S.sheet;
  $('#matchline').textContent = (s.opponent ? `${teamLabel()} contro ${s.opponent}` : 'Nuova partita') + (s.date ? `, ${fmtDate(s.date)}` : '');
  const v = $('#view');
  if(tab==='squadre') v.innerHTML = viewSquadre();
  else if(!curTeam) v.innerHTML = `<section class="panel"><p class="empty">Nessuna squadra. Creane una nella scheda Squadre.</p></section>`;
  else if(tab==='rosa')""")

# Squadre view + read-only rosa
rep("function viewRosa(){", r"""function viewSquadre(){
  const cards = S.teams.map(t => `
    <div class="teamcard">
      <div class="hd"><strong>${esc(t.name||'Senza nome')}</strong><span class="stat">${t.id===curTeam?'Squadra attiva':''}</span></div>
      <div class="grid">
        <div><label class="f">Nome squadra</label><input data-team="${t.id}" data-tf="name" value="${esc(t.name)}"></div>
        <div><label class="f">Categoria</label><input data-team="${t.id}" data-tf="category" value="${esc(t.category)}" placeholder="Es. Juniores"></div>
        <div><label class="f">Mister</label><input data-team="${t.id}" data-tf="coach" value="${esc(t.coach)}" placeholder="Nome del mister"></div>
      </div>
      <div class="row" style="margin-top:12px;justify-content:space-between">
        <div class="row"><span class="note">Codice di accesso</span><span class="code">${esc(t.code)}</span><button class="btn small ghost" data-teamcode="${t.id}">Rigenera</button></div>
        <div class="row">
          <button class="btn small" data-teamgo="${t.id}">Gestisci rosa</button>
          <button class="btn small" data-teamas="${t.id}">Vedi come mister</button>
          <button class="iconbtn" aria-label="Elimina ${esc(t.name)}" data-teamdel="${t.id}">×</button>
        </div>
      </div>
    </div>`).join('');
  return `<section class="panel">
    <h2>Squadre</h2>
    <p class="hint">Questa scheda la vedi solo tu. Ogni mister entra con il link della sua squadra e trova solo la sua rosa e la sua formazione. Schemi e moduli sono uguali per tutti.</p>
    ${cards || '<p class="empty">Nessuna squadra ancora.</p>'}
    <div class="row" style="margin-top:14px"><button class="btn primary" data-act="teamadd">Aggiungi squadra</button></div>
  </section>
  <section class="panel">
    <h3 style="margin-top:0">Chi può fare cosa</h3>
    <div class="rolebox">
      <div><b>Amministratore</b>Crea le squadre, inserisce le rose, carica e disegna gli schemi dei calci piazzati. Può aprire qualsiasi squadra.</div>
      <div><b>Mister</b>Vede solo la propria squadra. Compila partita, formazione e panchina, sceglie gli schemi da stampare e scarica il PDF.</div>
      <div><b>In comune</b>Database degli schemi (angoli e punizioni, a favore e a sfavore) e moduli di gioco. Quando aggiungi uno schema, lo trovano tutti.</div>
    </div>
  </section>`;
}

function viewRosa(){
  if(!isAdmin()){
    const rows = S.players.map(p => `<div class="ro-row"><span class="n">${esc(p.num||'?')}</span><span class="nm">${esc(p.name)}</span></div>`).join('');
    return `<section class="panel">
      <h2>Rosa</h2>
      ${lockNote('La rosa la inserisce la società. Per aggiungere un giocatore o cambiare un numero, scrivi all\'amministratore.')}
      <div class="cols2">${rows || '<p class="empty">La rosa non è ancora stata caricata.</p>'}</div>
    </section>`;
  }""")
rep("""    <h2>Rosa</h2>
    <p class="hint">Numero di maglia e cognome.""", """    <h2>Rosa · ${esc(TEAM()?.name||'')}</h2>
    <p class="hint">Numero di maglia e cognome.""")

# Schemes list
rep("""function viewSchemes(){
  const sel = S.sheet.selected;""", """function viewSchemes(){
  const sel = S.sheet.selected, A = isAdmin();""")
rep("""        <button class="btn small" data-open="${sc.id}">Apri</button>
        <button class="iconbtn" aria-label="Sposta su" data-up="${i}">↑</button>
        <button class="iconbtn" aria-label="Sposta giù" data-down="${i}">↓</button>""",
"""        <button class="btn small" data-open="${sc.id}">${A?'Apri':'Assegna'}</button>
        ${A?`<button class="iconbtn" aria-label="Sposta su" data-up="${i}">↑</button>
        <button class="iconbtn" aria-label="Sposta giù" data-down="${i}">↓</button>`:''}""")
rep("""    <h2>Calci piazzati</h2>
    <p class="hint">Spunta gli schemi da stampare in questa partita. I giocatori si riempiono in automatico dalla formazione, in base al numero di ruolo.</p>
    ${list || '<p class="empty">Ancora nessuno schema. Creane uno qui sotto.</p>'}
  </section>
  <section class="panel">""", """    <h2>Calci piazzati</h2>
    ${A ? '<p class="hint">Database comune a tutte le squadre: quello che crei o modifichi qui lo vedono tutti i mister.</p>' : lockNote('Gli schemi sono comuni a tutte le squadre e li carica l\\'amministratore. Tu scegli quali stampare e, se serve, cambi chi va dove.')}
    <p class="hint">Spunta gli schemi da stampare in questa partita. I giocatori si riempiono in automatico dalla formazione, in base al numero di ruolo.</p>
    ${list || '<p class="empty">Ancora nessuno schema.</p>'}
  </section>
  ${A ? `<section class="panel">""")
rep("""<button class="btn primary" data-act="newscheme">Crea schema</button></div>
  </section>`;""", """<button class="btn primary" data-act="newscheme">Crea schema</button></div>
  </section>` : ''}`;""")

# Scheme detail
rep("""  if(!sc){ openSchemeId=null; return viewSchemes(); }
  const rm = roleMap(sc);""", """  if(!sc){ openSchemeId=null; return viewSchemes(); }
  const A = isAdmin(); if(!A) moveMode = false;
  const rm = roleMap(sc);""")
rep("""      <div class="seg" role="group" aria-label="Modalità">
        <button data-mode="assign" aria-pressed="${!moveMode}">Assegna</button>
        <button data-mode="move" aria-pressed="${moveMode}">Modifica disegno</button>
      </div>
    </div>
    <div class="grid" style="margin-bottom:12px">""", """      ${A ? `<div class="seg" role="group" aria-label="Modalità">
        <button data-mode="assign" aria-pressed="${!moveMode}">Assegna</button>
        <button data-mode="move" aria-pressed="${moveMode}">Modifica disegno</button>
      </div>` : '<span class="badge coach">Sola lettura</span>'}
    </div>
    ${A ? '' : `<h2>${esc(sc.name)}<span class="side ${sc.side}">${sc.side==='favore'?'A favore':'A sfavore'}</span></h2><p class="hint">${esc(sc.subtitle||'')}</p>`}
    <div class="grid ${A?'':'hidden'}" style="margin-bottom:12px">""")
rep("""    <div style="margin-top:14px"><label class="f">Nota sotto lo schema</label><input data-sc="note" value="${esc(sc.note)}" placeholder="Es. Marcatura a uomo sui saltatori"></div>
    <div class="row" style="margin-top:16px;justify-content:space-between">
      <button class="btn small" data-act="dupscheme">Duplica schema</button>
      <button class="btn small danger ghost" data-act="delscheme">Elimina schema</button>
    </div>""", """    ${A ? `<div style="margin-top:14px"><label class="f">Nota sotto lo schema</label><input data-sc="note" value="${esc(sc.note)}" placeholder="Es. Marcatura a uomo sui saltatori"></div>
    <div class="row" style="margin-top:16px;justify-content:space-between">
      <button class="btn small" data-act="dupscheme">Duplica schema</button>
      <button class="btn small danger ghost" data-act="delscheme">Elimina schema</button>
    </div>` : (sc.note ? `<p class="note" style="margin-top:14px"><b>Nota:</b> ${esc(sc.note)}</p>` : '')}""")

# Partita placeholder team
rep("${f('team','La nostra squadra')}", "${f('team','La nostra squadra (nel PDF)')}")

# PDF header team
rep("const right = [s.team && s.opponent ? `${s.team} contro ${s.opponent}` : (s.opponent ? `Contro ${s.opponent}` : s.team),",
    "const right = [s.opponent ? `${teamLabel()} contro ${s.opponent}` : teamLabel(),")
rep("$('#matchline').textContent = (S.sheet.opponent?`${S.sheet.team||'Noi'} contro", "$('#matchline').textContent = (S.sheet.opponent?`${teamLabel()} contro")

# Events: click
rep("""  if(t.dataset.tab){ tab = t.dataset.tab; selectedPlayer = null; render(); window.scrollTo(0,0); return; }
  if(t.dataset.player !== undefined) return; // gestito dal drag
  const act = t.dataset.act;""", """  if(t.dataset.tab){ tab = t.dataset.tab; selectedPlayer = null; if(tab!=='piazzati') openSchemeId = null; render(); window.scrollTo(0,0); return; }
  if(t.dataset.player !== undefined) return; // gestito dal drag
  const act = t.dataset.act;
  const ADMIN_ONLY = ['padd','bulk','newscheme','addtok','deltok','dupscheme','delscheme','teamadd'];
  if(!isAdmin() && (ADMIN_ONLY.includes(act) || t.dataset.pdel || t.dataset.up || t.dataset.down || t.dataset.mode==='move' || t.dataset.teamdel || t.dataset.teamcode)) return;
  if(t.dataset.teamgo){ curTeam = t.dataset.teamgo; tab = 'rosa'; subscribeTeam(); return; }
  if(t.dataset.teamas){ switchView('coach', t.dataset.teamas); return; }
  if(t.dataset.teamcode){ const tm = S.teams.find(x=>x.id===t.dataset.teamcode); if(tm){ tm.code = genCode(); save('teams'); render(); } return; }
  if(t.dataset.teamdel){ const tm = S.teams.find(x=>x.id===t.dataset.teamdel); if(tm && confirm(`Eliminare la squadra "${tm.name}"? Rosa e formazione non saranno più accessibili.`)){ S.teams = S.teams.filter(x=>x!==tm); save('teams'); if(curTeam===tm.id){ curTeam = S.teams[0]?.id||null; subscribeTeam(); } else render(); } return; }""")
rep("""    case 'padd':""", """    case 'teamadd': { const tm = {id:uid('t_'), name:'Nuova squadra', category:'', coach:'', code:genCode()}; S.teams.push(tm); save('teams'); if(!curTeam){ curTeam = tm.id; subscribeTeam(); } else render(); break; }
    case 'padd':""")

# input guards
rep("""document.addEventListener('input', e => {
  const t = e.target;
  if(t.dataset.pnum){""", """document.addEventListener('input', e => {
  const t = e.target;
  if(!isAdmin() && (t.dataset.pnum || t.dataset.pname || t.dataset.sc || t.dataset.tok || t.dataset.team)) return;
  if(t.dataset.team){ const tm = S.teams.find(x=>x.id===t.dataset.team); if(tm){ tm[t.dataset.tf] = t.value; save('teams'); if(t.dataset.tf==='name'){ const h = t.closest('.teamcard')?.querySelector('.hd strong'); if(h) h.textContent = t.value || 'Senza nome'; } } return; }
  if(t.dataset.pnum){""")
rep("""document.addEventListener('change', e => {
  const t = e.target;
  if(t.dataset.sheet""", """document.addEventListener('change', e => {
  const t = e.target;
  if(t.dataset.asview){ const v = t.value; if(v==='admin') switchView('admin'); else switchView('coach', v.split(':')[1]); return; }
  if(t.dataset.curteam){ curTeam = t.value; openSchemeId = null; subscribeTeam(); return; }
  if(t.dataset.team && t.dataset.tf==='name'){ render(); return; }
  if(!isAdmin() && (t.dataset.sc || (t.dataset.tok))) return;
  if(t.dataset.sheet""")
# drag move guard
rep("if(tokEl && moveMode){", "if(tokEl && moveMode && isAdmin()){")
# page title
rep("<title>Foglio gara</title>", "<title>Foglio gara · Anteprima multi-squadra</title>")
open('mt.html','w').write(s)
print('ok')
