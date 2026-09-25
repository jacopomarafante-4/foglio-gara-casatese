/* Portale Academy Casatese Merate · Dati di base, stato, utilità, salvataggio, database (Supabase / Claude / locale) e accesso.
   I file si caricano in ordine (vedi index.html) e condividono le stesse variabili globali. */
/* ---------- Dati di base ---------- */
const FORMATIONS = {
  "1-4-4-2":   [[1,50,92],[2,86,73],[5,62,77],[6,38,77],[3,14,73],[7,86,48],[8,62,52],[4,38,52],[11,14,48],[9,62,22],[10,38,22]],
  "1-4-4-1-1": [[1,50,92],[2,86,73],[5,62,77],[6,38,77],[3,14,73],[7,86,54],[8,62,58],[4,38,58],[11,14,54],[10,50,35],[9,50,15]],
  "1-4-3-3":   [[1,50,92],[2,86,73],[5,62,77],[6,38,77],[3,14,73],[8,30,54],[4,50,60],[10,70,54],[7,84,26],[9,50,17],[11,16,26]],
  "1-4-2-3-1": [[1,50,92],[2,86,73],[5,62,77],[6,38,77],[3,14,73],[4,38,60],[8,62,60],[7,84,38],[10,50,36],[11,16,38],[9,50,15]],
  "1-4-3-1-2": [[1,50,92],[2,86,73],[5,62,77],[6,38,77],[3,14,73],[8,26,56],[4,50,60],[7,74,56],[10,50,38],[9,62,17],[11,38,17]],
  "1-3-5-2":   [[1,50,92],[2,72,76],[5,50,80],[6,28,76],[7,88,48],[8,66,54],[4,50,60],[10,34,54],[3,12,48],[9,62,20],[11,38,20]],
  "1-3-4-3":   [[1,50,92],[2,72,76],[5,50,80],[6,28,76],[7,88,52],[8,62,56],[4,38,56],[3,12,52],[10,82,24],[9,50,17],[11,18,24]],
  "1-3-4-2-1": [[1,50,92],[2,72,76],[5,50,80],[6,28,76],[7,88,54],[8,62,58],[4,38,58],[3,12,54],[10,64,33],[11,36,33],[9,50,15]],
  "1-5-3-2":   [[1,50,92],[2,90,66],[4,68,78],[5,50,80],[6,32,78],[3,10,66],[7,74,50],[8,50,54],[10,26,50],[9,62,20],[11,38,20]]
};
const ROLE_COLORS = ['#C8102E','#1F5FA8','#D98E04','#2E7D4F','#6B3FA0','#0F8A8A','#A34A1E','#4A5563','#B8336A'];
const BASES = {
  'angolo-favore':  {name:'Angolo a favore', side:'favore', ball:{x:33.3,y:0.7}},
  'angolo-sfavore': {name:'Angolo a sfavore', side:'sfavore', ball:{x:33.3,y:0.7}},
  'punizione-favore':{name:'Punizione a favore', side:'favore', ball:{x:12,y:26}},
  'punizione-sfavore':{name:'Punizione a sfavore', side:'sfavore', ball:{x:12,y:26}},
  'libero':{name:'Nuovo schema', side:'favore', ball:{x:0,y:30}}
};
function defaultSheet(){return {team:'',opponent:'',date:'',time:'',venue:'',category:'',formation:'1-4-4-1-1',lineup:{},bench:[],captain:'',vice:'',notes:'',selected:[],overrides:{},schemeEdits:{},slotPos:{},home:true,convType:'Campionato',meetTime:'',meetAddress:'',convNotes:'',callup:{}}}
function effSlot(s, n, bx, by){ const o = (s.slotPos||{})[n]; return o ? {x:o.x, y:o.y} : {x:bx, y:by}; }

function defaultReg(){return {trainings:[], games:[], tests:[], gk:[], friendlies:[]}}
let S = {teams:[], players:[], schemes:[], sheet:defaultSheet(), calendar:[], reg:defaultReg()};
/* Ruoli: 'admin' vede tutto e modifica rose, schemi e squadre; 'coach' vede solo la sua squadra */
let ROLE = 'admin', curTeam = null, hashLocked = false, unsubs = [];
/* Accesso: i mister entrano digitando il codice squadra sulla schermata iniziale (oppure via link #squadra=CODICE).
   L'amministratore: nell'app unica il PIN admin lo chiede la pagina d'ingresso (PIN_ADMIN, solo sul server);
   qui, fuori dall'app unica, sceglie "accesso amministratore" e fa il login Supabase con email e password.
   Nessun PIN admin nel codice: il repository è pubblico. */
const ADMIN_EMAIL = 'jacopo.marafante@gmail.com';
let adminUnlocked = false, gateError = false, teamsLoaded = false;
try{ adminUnlocked = localStorage.getItem('fg:adminpin') === 'ok'; }catch(e){}
const RUNNING_IN_CLAUDE = !!(window.claude && window.claude.use);
/* Dentro l'app unica (Next.js, /portale/) ci sono anche la pagina d'ingresso e Scouting Hub */
const IN_APP_UNICA = location.pathname.startsWith('/portale/');
/* Niente accesso automatico nell'app unica: il PIN vale finché si chiude il browser (o la scheda, per i mister)
   e al massimo ORE_ACCESSO ore (stesso valore in lib/supabase/durata.ts). */
const ORE_ACCESSO = 6;
const accessoRecente = t => Date.now()/1000 - (t || 0) < ORE_ACCESSO * 3600;
/* Il PIN del mister arriva dalla pagina d'ingresso in #squadra=PIN: lo si toglie subito dall'indirizzo
   (cronologia, preferiti) e resta solo in questa scheda. */
if(IN_APP_UNICA){
  const m = (location.hash||'').match(/squadra=([\w-]+)\/?(\w*)/i);
  if(m){
    try{ sessionStorage.setItem('fg:pin', JSON.stringify({ pin: m[1], t: Date.now()/1000 })); }catch(e){}
    history.replaceState(null, '', location.pathname + location.search + (m[2] ? '#/' + m[2] : ''));
  }
}
function teamPinFromUrl(){
  if(!IN_APP_UNICA) return ((location.hash||'').match(/squadra=([\w-]+)/i) || [])[1] || null;
  try{
    const v = JSON.parse(sessionStorage.getItem('fg:pin') || 'null');
    if(v && accessoRecente(v.t)) return v.pin;
    sessionStorage.removeItem('fg:pin');
  }catch(e){}
  return null;
}
const SUPABASE_URL = 'https://vxqpuwoqanvkpfzilrcc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4cXB1d29xYW52a3BmemlscmNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxNDg0NjksImV4cCI6MjEwNTcyNDQ2OX0.MIF-vt76o1jeuVuESFcrLf3lbXffu8P7aqtRd9k247o';
/* App unica: la sessione sta negli stessi cookie del login della pagina d'ingresso (@supabase/ssr:
   prefisso "base64-", divisi in pezzi .0 .1 … oltre 3180 caratteri), così l'accesso vale per tutto il sito. */
const COOKIE_CHUNK = 3180;
const cookieStorage = {
  getItem(key){
    const all = {};
    document.cookie.split('; ').filter(Boolean).forEach(c => { const i = c.indexOf('='); all[c.slice(0,i)] = decodeURIComponent(c.slice(i+1)); });
    let v = all[key];
    if(v == null){ const parts = []; for(let i=0; all[key+'.'+i] != null; i++) parts.push(all[key+'.'+i]); v = parts.length ? parts.join('') : null; }
    if(v == null || !v.startsWith('base64-')) return v;
    const b = v.slice(7).replace(/-/g,'+').replace(/_/g,'/');
    return new TextDecoder().decode(Uint8Array.from(atob(b + '==='.slice((b.length+3)%4)), ch => ch.charCodeAt(0)));
  },
  setItem(key, value){
    this.removeItem(key);
    let bin = ''; new TextEncoder().encode(value).forEach(x => bin += String.fromCharCode(x));
    const enc = 'base64-' + btoa(bin).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
    const opt = '; path=/; samesite=lax' + (location.protocol === 'https:' ? '; secure' : ''); // cookie di sessione
    if(enc.length <= COOKIE_CHUNK){ document.cookie = key + '=' + enc + opt; return; }
    for(let i=0; i*COOKIE_CHUNK < enc.length; i++) document.cookie = key + '.' + i + '=' + enc.slice(i*COOKIE_CHUNK, (i+1)*COOKIE_CHUNK) + opt;
  },
  removeItem(key){
    document.cookie.split('; ').map(c => c.split('=')[0]).filter(n => n === key || /^\d+$/.test(n.slice(key.length+1)) && n.startsWith(key+'.'))
      .forEach(n => { document.cookie = n + '=; path=/; max-age=0'; });
  }
};
const supabaseClient = (!RUNNING_IN_CLAUDE && window.supabase) ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, IN_APP_UNICA ? { auth: { storage: cookieStorage } } : undefined) : null;
/* Nell'app unica la stessa sessione può essere di uno scout: qui conta solo quella dell'admin */
/* Nell'app unica la sessione conta per il Portale se è dell'admin o di un direttore.
   Il direttore vede tutto (tutte le squadre, Società) ma non modifica: readOnly (0011 nel database). */
let staffRole = null;
const readOnly = () => staffRole === 'direttore';
const isAdminSession = s => (s?.user?.email || '').toLowerCase() === ADMIN_EMAIL;
const sessionOk = s => !!s && (!IN_APP_UNICA || (accessoRecente(loginTime(s)) && (isAdminSession(s) || staffRole === 'direttore')));
async function loadStaffRole(s){
  staffRole = null;
  if(!s || isAdminSession(s)) return;
  try{ const { data } = await supabaseClient.from('profiles').select('ruolo, attivo').eq('id', s.user.id).single(); if(data?.attivo) staffRole = data.ruolo; }catch(e){}
}
/* Ora dell'ultimo login, dal token (claim "amr"): resta la stessa anche quando il token si rinnova */
function loginTime(s){
  try{ const p = JSON.parse(atob(s.access_token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))); return Math.max(0, ...(p.amr || []).map(a => a.timestamp || 0)); }catch(e){ return 0; }
}
let supaSession = null;
function adminAccessGranted(){
  if(IN_APP_UNICA) return sessionOk(supaSession); // il PIN admin l'ha già chiesto la pagina d'ingresso
  if(!adminUnlocked) return false;
  if(RUNNING_IN_CLAUDE || !supabaseClient) return true;
  return !!supaSession;
}
async function initAuth(){
  if(!supabaseClient) return;
  try{
    const { data } = await supabaseClient.auth.getSession();
    supaSession = data.session || null;
  }catch(e){}
  supabaseClient.auth.onAuthStateChange((event, session) => {
    supaSession = session;
    if(sessionOk(session) && secureMode && !sharedSyncStarted){ db = makeSupabaseDb(supabaseClient); startSharedSync(); }
    render();
  });
  render();
}
async function adminLogin(password){
  if(!supabaseClient || !password) return;
  setStatus('Accesso…');
  try{
    const { error } = await supabaseClient.auth.signInWithPassword({ email: ADMIN_EMAIL, password });
    if(error){ console.error('signInWithPassword error:', error); gateError = true; setStatus('Accesso non riuscito'); }
    else { gateError = false; setStatus('Accesso riuscito'); }
  }catch(e){ console.error('signInWithPassword exception:', e); gateError = true; setStatus('Accesso non riuscito'); }
  render();
}
const isAdmin = () => ROLE === 'admin';
const TEAM = () => S.teams.find(t => t.id === curTeam);
const teamLabel = () => S.sheet.team || TEAM()?.name || 'Noi';
const LOCK_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
function lockNote(t){ return `<div class="lock">${LOCK_ICON}<div>${t}</div></div>`; }
/* PIN a 4 cifre mai usato: né di squadra né di un mister */
function genPin(){
  const usati = new Set(S.teams.flatMap(t => [t.code, ...(t.coaches||[]).map(c => c.code)]).filter(Boolean));
  let p; do{ p = String(Math.floor(1000+Math.random()*9000)); }while(usati.has(p)); return p;
}
/* Mister di una squadra: "coaches": [{id, name, code}], un PIN personale ciascuno.
   Le squadre di prima avevano solo il testo "coach" ("Nome, Nome"): diventa l'elenco, senza PIN. */
function withCoaches(t){
  if(!Array.isArray(t.coaches)) t.coaches = String(t.coach||'').split(',').map(s => s.trim()).filter(Boolean).map((name, i) => ({id:'m'+i, name, code:''}));
  return t;
}
const coachNames = t => (t?.coaches||[]).map(c => c.name).filter(Boolean).join(', ') || t?.coach || '';
/* "coach" resta come testo riassuntivo per le parti che lo leggono ancora */
function syncCoach(t){ t.coach = (t.coaches||[]).map(c => c.name).filter(Boolean).join(', '); }
let tab = 'home', selectedPlayer = null, openSchemeId = null, selectedToken = null;
/* boardMode: 'assign' (compiti/giocatori) | 'move' (pedine) | 'draw' (frecce, linee, testi) */
let boardMode = 'assign', drawTool = null, selectedDraw = null;
let db = null, downloads = null;
const pending = {}; const timers = {};

/* ---------- Utilità ---------- */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid = p => p + Math.random().toString(36).slice(2,9);
const clone = o => JSON.parse(JSON.stringify(o));
const P = id => S.players.find(p => p.id === id);
function fmtDate(d){ if(!d) return ''; const [y,m,g] = d.split('-'); return g ? `${g}/${m}/${y}` : d; }
function surname(n){ return (n||'').trim(); }
function setStatus(t){ $('#status').textContent = t; }

/* ---------- Salvataggio ---------- */
/* Condivisi: shared/teams, shared/schemes. Per squadra: roster/<id>, sheet/<id>, calendar/<id>, registro/<id> (presenze, partite, test) */
function docPath(name, team=curTeam){ return (name==='teams'||name==='schemes') ? 'shared/'+name : name+'/'+team; }
function payload(name){
  if(name==='teams') return {items:S.teams};
  if(name==='roster') return {players:S.players};
  if(name==='schemes') return {items:S.schemes};
  if(name==='calendar') return {matches:S.calendar};
  if(name==='registro') return S.reg;
  return clone(S.sheet);
}
function save(name){
  /* Sola lettura (direttori): niente salvataggio, si ricarica il dato vero e la modifica sparisce */
  if(readOnly()){
    setStatus('Sola lettura: nessuna modifica');
    db?.doc(docPath(name)).get().then(snap => { applyDoc(name, snap.data()); render(); }).catch(() => {});
    return;
  }
  if(!isAdmin() && name!=='sheet' && name!=='registro') return;   // i mister scrivono solo foglio gara e registro della propria squadra
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
  if(name==='teams') S.teams = clone(data.items || []).map(withCoaches);
  else if(name==='roster') S.players = clone(data.players || []);
  else if(name==='schemes') S.schemes = clone(data.items || []);
  else if(name==='calendar') S.calendar = clone(data.matches || []);
  else if(name==='registro') S.reg = Object.assign(defaultReg(), clone(data));
  else S.sheet = Object.assign(defaultSheet(), clone(data));
}
function resolveAccess(){
  const m = (location.hash||'').match(/squadra=([\w-]+)/i);
  if(m){
    const pin = m[1].toLowerCase();
    const t = S.teams.find(t => (t.code||'').toLowerCase() === pin || (t.coaches||[]).some(c => (c.code||'').toLowerCase() === pin));
    if(t){ ROLE = 'coach'; curTeam = t.id; hashLocked = true; return; }
  }
  if(!curTeam || !TEAM()) curTeam = S.teams[0]?.id || null;
}
function subscribeTeam(){
  unsubs.forEach(u => { try{ u(); }catch(e){} }); unsubs = [];
  S.players = []; S.sheet = defaultSheet(); S.calendar = []; S.reg = defaultReg();
  openTrainingId = openGameId = openTestId = null;
  if(curTeam){
    if(db){
      ['roster','sheet','calendar','registro'].forEach(n => {
        const path = docPath(n);
        unsubs.push(db.doc(path).onSnapshot(snap => {
          if(pending[path]) return;
          if(snap.exists){ applyDoc(n, snap.data()); render(); }
        }, () => setStatus('Sincronizzazione in pausa')));
      });
    } else {
      ['roster','sheet','calendar','registro'].forEach(n => { try{ const v = localStorage.getItem('fg:'+docPath(n)); if(v) applyDoc(n, JSON.parse(v)); }catch(e){} });
    }
  }
  render();
}
function switchView(role, team){
  ROLE = role; if(team) curTeam = team;
  if(!TEAM()) curTeam = S.teams[0]?.id || null;
  openSchemeId = null; boardMode = 'assign'; drawTool = null; selectedDraw = null; selectedToken = null; selectedPlayer = null;
  tab = 'home';
  subscribeTeam(); window.scrollTo(0,0);
}
async function logout(){
  unsubs.forEach(u => { try{ u(); }catch(e){} }); unsubs = [];
  if(supabaseClient){ try{ await supabaseClient.auth.signOut({ scope: 'local' }); }catch(e){} }
  if(IN_APP_UNICA){ try{ sessionStorage.removeItem('fg:pin'); }catch(e){} location.replace('/?pin=1'); return; }
  adminUnlocked = false; supaSession = null; gateError = false;
  try{ localStorage.removeItem('fg:adminpin'); }catch(e){}
  if(secureMode){ history.replaceState(null, '', location.pathname + location.search); location.reload(); return; }
  ROLE = 'admin'; curTeam = null; hashLocked = false;
  S.players = []; S.sheet = defaultSheet();
  history.replaceState(null, '', location.pathname + location.search);
  tab = 'home'; openSchemeId = null; selectedPlayer = null;
  window.scrollTo(0,0);
  render();
}
/* Fuori da Claude (es. GitHub Pages) il salvataggio condiviso passa da Supabase:
   stessa interfaccia doc().set()/onSnapshot() usata sopra, tabella "docs" a chiave/valore. */
function makeSupabaseDb(client){
  return {
    doc(path){
      return {
        async set(data){
          const { error } = await client.from('docs').upsert({ path, data, updated_at: new Date().toISOString() });
          if(error) throw error;
        },
        async get(){
          const { data, error } = await client.from('docs').select('data').eq('path', path).maybeSingle();
          if(error) throw error;
          return { exists: !!data, data: () => data && data.data };
        },
        onSnapshot(onNext, onError){
          let stopped = false;
          client.from('docs').select('data').eq('path', path).maybeSingle()
            .then(({data, error}) => { if(stopped) return; if(error){ onError && onError(error); return; } onNext({ exists: !!data, data: () => data && data.data }); })
            .catch(e => { if(!stopped) onError && onError(e); });
          const channel = client.channel('docs:'+path)
            .on('postgres_changes', { event:'*', schema:'public', table:'docs', filter:`path=eq.${path}` }, payload => {
              if(stopped) return;
              if(payload.eventType === 'DELETE'){ onNext({ exists:false, data:()=>undefined }); return; }
              onNext({ exists:true, data: () => payload.new.data });
            })
            .subscribe(status => { if(status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') onError && onError(new Error(status)); });
          return () => { stopped = true; client.removeChannel(channel); };
        }
      };
    }
  };
}
/* Database protetto (supabase/sicurezza.sql): i mister non leggono la tabella, passano da funzioni
   che verificano il PIN e aprono solo i documenti della loro squadra. Niente realtime per loro:
   i documenti si ricontrollano ogni 15 secondi. */
let secureMode = false, sharedSyncStarted = false;
let coachPin = null, misterName = ''; /* PIN e nome del mister entrato (servono per segnalare allo scouting) */
const stableStr = v => JSON.stringify(v, (k, x) => x && typeof x === 'object' && !Array.isArray(x) ? Object.keys(x).sort().reduce((o, key) => (o[key] = x[key], o), {}) : x);
function makeCoachDb(client, pin){
  const known = {};
  const get = async path => { const { data, error } = await client.rpc('coach_get', { p_pin: pin, p_path: path }); if(error) throw error; return data; };
  return {
    doc(path){
      return {
        async set(data){
          const { error } = await client.rpc('coach_set', { p_pin: pin, p_path: path, p_data: data });
          if(error) throw error;
          known[path] = stableStr(data);
        },
        async get(){ const d = await get(path); return { exists: d != null, data: () => d }; },
        onSnapshot(onNext, onError){
          let stopped = false;
          const tick = async () => {
            try{
              const d = await get(path);
              if(stopped) return;
              const k = stableStr(d);
              if(k !== known[path]){ known[path] = k; onNext({ exists: d != null, data: () => d }); }
            }catch(e){ if(!stopped) onError && onError(e); }
          };
          tick(); const iv = setInterval(tick, 15000);
          return () => { stopped = true; clearInterval(iv); };
        }
      };
    }
  };
}
/* Le funzioni del database protetto esistono? Se no, il database non è ancora stato protetto: comportamento di prima. */
async function detectSecure(){
  try{ const { error } = await supabaseClient.rpc('coach_team', { p_pin: '' }); return !error; }catch(e){ return false; }
}
async function coachLogin(pin){
  let tm = null;
  try{ const { data, error } = await supabaseClient.rpc('coach_team', { p_pin: pin }); if(!error) tm = data; }catch(e){}
  if(!tm) return false;
  db = makeCoachDb(supabaseClient, pin); coachPin = pin;
  S.teams = [withCoaches(tm)]; misterName = tm.mister || ''; ROLE = 'coach'; curTeam = tm.id; hashLocked = true; teamsLoaded = true; tab = startTab();
  if(!IN_APP_UNICA && !new RegExp('squadra=' + pin + '(/|$)').test(location.hash)) history.replaceState(null, '', '#squadra=' + pin + '/' + tab);
  db.doc('shared/schemes').onSnapshot(snap => { if(snap.exists){ applyDoc('schemes', snap.data()); render(); } }, () => setStatus('Sincronizzazione in pausa'));
  setStatus('Sincronizzato');
  subscribeTeam();
  return true;
}
function startSharedSync(){
  sharedSyncStarted = true;
  let first = true;
  db.doc('shared/schemes').onSnapshot(snap => { if(pending['shared/schemes']) return; if(snap.exists){ applyDoc('schemes', snap.data()); render(); } }, () => setStatus('Sincronizzazione in pausa'));
  db.doc('shared/teams').onSnapshot(snap => {
    if(pending['shared/teams']) return;
    if(snap.exists) applyDoc('teams', snap.data());
    teamsLoaded = true;
    const before = curTeam, beforeRole = ROLE; resolveAccess();
    if(first){ first = false; tab = startTab(); subscribeTeam(); }
    else if(before !== curTeam || beforeRole !== ROLE) subscribeTeam();
    else render();
  }, () => { teamsLoaded = true; setStatus('Sincronizzazione in pausa'); render(); });
  setStatus('Sincronizzato');
}
async function initStore(){
  try{ if(RUNNING_IN_CLAUDE) db = await window.claude.use('db'); }catch(e){ db = null; }
  try{ if(RUNNING_IN_CLAUDE) downloads = await window.claude.use('downloads'); }catch(e){ downloads = null; }
  if(!db && supabaseClient){
    secureMode = await detectSecure();
    let session = null;
    try{ session = (await supabaseClient.auth.getSession()).data.session; }catch(e){}
    if(IN_APP_UNICA){ supaSession = session; await loadStaffRole(session); }
    if(sessionOk(session) || !secureMode){
      try{ db = makeSupabaseDb(supabaseClient); }catch(e){ db = null; }
    } else {
      const pin = teamPinFromUrl();
      if(!(pin && await coachLogin(pin))){ teamsLoaded = true; render(); }
      return;
    }
  }
  if(db){ if(!sharedSyncStarted) startSharedSync(); }
  else {
    ['teams','schemes'].forEach(n => { try{ const v = localStorage.getItem('fg:shared/'+n); if(v) applyDoc(n, JSON.parse(v)); }catch(e){} });
    teamsLoaded = true;
    resolveAccess(); tab = startTab();
    setStatus('Salvato su questo dispositivo');
    subscribeTeam();
  }
}
