/* Portale Academy Casatese Merate · Registro della squadra: presenze allenamenti, tabellini partite, test atletici, statistiche e report PDF.
   I file si caricano in ordine (vedi index.html) e condividono le stesse variabili globali. */
/* ---------- Registro: presenze allenamenti, partite, test atletici ---------- */
/* registro/<squadra> = {
     trainings:[{id, date, note, att:{pid: 'P' | 'A' | motivo}}]      'A' = assente senza motivo indicato
     games:[{id, calId?, date, opponent, home, comp, dur, og, pl:{pid:{min, g, gc, gk}}}]
          calId = partita del Calendario; og = autogol a favore; gc = gol subiti (portiere); gk = in porta in quella partita
     tests:[{id, date, name, res:{pid:{s, note}}}]                     s = tempo in secondi
     gk:[pid]                                                           portieri della rosa
   } */
const ABSENCES = [
  {k:'MAL', l:'Malattia', s:'M'},
  {k:'INF', l:'Infortunio', s:'I'},
  {k:'SCU', l:'Scuola / studio', s:'S'},
  {k:'FAM', l:'Motivi familiari', s:'F'},
  {k:'ING', l:'Ingiustificata', s:'X'}
];
const ABS = Object.fromEntries(ABSENCES.map(a => [a.k, a]));
const MONTHS_IT = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
const WEEKDAYS_IT = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab'];
const COMP_TYPES = ['Campionato','Amichevole','Coppa','Recupero','Torneo'];
const LOW_ATT = 0.75;   // sotto il 75% di presenze il giocatore viene evidenziato
const DEFAULT_DUR = 70;
let openTrainingId = null, openGameId = null, openTestId = null, statPeriod = 'all';

/* data di oggi nel fuso del telefono (toISOString è in UTC: dopo mezzanotte darebbe ancora ieri) */
const todayISO = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0,10); };
const byName = () => S.players.slice().sort((a,b) => a.name.localeCompare(b.name, 'it'));
const weekday = d => d ? WEEKDAYS_IT[new Date(d+'T12:00:00').getDay()] : '';
const monthLabel = ym => { const [y,m] = ym.split('-'); return `${MONTHS_IT[+m-1]} ${y}`; };
const pctTxt = v => v==null ? '—' : Math.round(v*100)+'%';
const numOr0 = v => +v || 0;
const addDays = (d, n) => { const x = new Date(d+'T12:00:00'); x.setDate(x.getDate()+n); return x.toISOString().slice(0,10); };
/* 'G' (giustificato) delle prime versioni = motivi familiari */
const attOf = (t, pid) => { const v = (t.att||{})[pid]; return v==='G' ? 'FAM' : (v || ''); };
const isAbs = v => !!v && v!=='P';
/* % presenza = presenze / sedute registrate, escluse le assenze per infortunio */
const attPct = (P, absNoInj) => (P+absNoInj) ? P/(P+absNoInj) : null;
function parseTime(v){
  const m = String(v||'').trim().match(/^(\d{1,2})(?:\s*[:,.'’]\s*(\d{1,2}))?\s*["”]?$/);
  if(!m) return null;
  const sec = m[2]===undefined ? 0 : (m[2].length===1 ? +m[2]*10 : +m[2]);
  return sec > 59 ? null : +m[1]*60 + sec;
}
const fmtTime = sec => `${Math.floor(sec/60)}'${String(sec%60).padStart(2,'0')}"`;
const testCell = r => !r ? '' : (r.s!=null ? fmtTime(r.s) : (r.note||''));
const curTraining = () => S.reg.trainings.find(x => x.id===openTrainingId);
const curGame = () => S.reg.games.find(x => x.id===openGameId);
const curTest = () => S.reg.tests.find(x => x.id===openTestId);

/* ---------- Partite: calendario + registro ---------- */
const isGk = pid => (S.reg.gk||[]).includes(pid);
const calOf = g => g.calId ? allCalendar().find(m => m.id===g.calId) : null;
/* dati della partita: quelli del calendario hanno la precedenza (se il calendario cambia, la tabella segue) */
function gameInfo(g){
  const m = calOf(g);
  return m ? {date:m.date, opponent:m.opponent||'', home:!!m.home, comp:m.friendly ? 'Amichevole' : (g.comp||'Campionato'), venue:m.venue||''} : {date:g.date, opponent:g.opponent||'', home:!!g.home, comp:g.comp||'Amichevole', venue:''};
}
const plGk = (g, pid) => { const x = (g.pl||{})[pid] || {}; return x.gk!=null ? !!x.gk : isGk(pid); };
/* ha giocato: minuti > 0, oppure presenza senza minuti (pres: partite importate in cui i minuti non erano registrati) */
const played = x => numOr0(x.min) > 0 || !!x.pres;
const gamePlayed = g => Object.values(g.pl||{}).some(played);
/* risultato calcolato: gol dei giocatori + autogol a favore / gol subiti dai portieri. Noto solo se è stato inserito qualcosa. */
function gameScore(g){
  const pl = Object.entries(g.pl||{});
  const gf = pl.reduce((a,[,x]) => a + numOr0(x.g), 0) + numOr0(g.og);
  const ga = pl.reduce((a,[pid,x]) => a + (plGk(g,pid) ? numOr0(x.gc) : 0), 0);
  const known = gf > 0 || pl.some(([pid,x]) => plGk(g,pid) && x.gc!=null && x.gc!=='' && played(x));
  return known ? {gf, ga} : null;
}
const gameTitle = g => { const i = gameInfo(g); return i.opponent ? (i.home ? `${teamLabel()} - ${i.opponent}` : `${i.opponent} - ${teamLabel()}`) : `Partita del ${fmtDate(i.date)}`; };
/* colonne della tabella partite: partite del calendario fino a oggi + la prossima, più quelle fuori calendario */
function matchColumns(){
  const today = todayISO();
  const cal = allCalendar().filter(m => m.date).sort((a,b) => a.date.localeCompare(b.date));
  const next = cal.find(m => m.date > today);
  const cols = cal.filter(m => m.date <= today || m===next).map(m => ({cal:m, game:S.reg.games.find(g => g.calId===m.id)}));
  S.reg.games.filter(g => !g.calId || !cal.some(m => m.id===g.calId)).forEach(g => cols.push({cal:null, game:g}));
  return cols.sort((a,b) => (a.cal?.date || a.game.date || '').localeCompare(b.cal?.date || b.game.date || ''));
}

/* ---------- Statistiche calcolate al volo dal registro, filtrate per periodo (stagione o mese) ---------- */
function inPeriod(d){ return statPeriod==='all' || (d||'').startsWith(statPeriod); }
function computeStats(){
  const tr = S.reg.trainings.filter(t => inPeriod(t.date)).sort((a,b)=>a.date.localeCompare(b.date));
  const gm = S.reg.games.filter(g => gamePlayed(g) && inPeriod(gameInfo(g).date)).sort((a,b)=>gameInfo(a).date.localeCompare(gameInfo(b).date));
  const rows = byName().map(p => {
    const c = {P:0, A:0}; ABSENCES.forEach(a => c[a.k] = 0);
    tr.forEach(t => { const v = attOf(t, p.id); if(v in c) c[v]++; });
    const absAll = c.A + ABSENCES.reduce((a,x)=>a+c[x.k],0), absNoInj = absAll - c.INF;
    let pres = 0, presMin = 0, min = 0, avail = 0, gol = 0, gc = 0, gkGames = 0;
    gm.forEach(g => {
      const x = (g.pl||{})[p.id] || {}, m = numOr0(x.min);
      if(!g.nomin) avail += numOr0(g.dur) || DEFAULT_DUR;   // partite senza minuti registrati: fuori dal calcolo dei minuti
      if(played(x)){ pres++; if(plGk(g, p.id)){ gkGames++; gc += numOr0(x.gc); } }
      if(m > 0){ presMin++; min += m; }
      gol += numOr0(x.g);
    });
    return {p, c, absAll, reg: c.P + absAll, pct: attPct(c.P, absNoInj), pres, min, avail, minPct: avail ? min/avail : null, avg: presMin ? min/presMin : null, gol, gc, gkGames};
  });
  const withPct = rows.filter(r => r.pct!=null);
  const scored = gm.map(gameScore).filter(Boolean);
  const team = {
    nT: tr.length, nG: gm.length,
    avgPct: withPct.length ? withPct.reduce((a,r)=>a+r.pct,0)/withPct.length : null,
    avgPresent: tr.length ? tr.reduce((a,t)=>a+Object.values(t.att||{}).filter(v=>v==='P').length,0)/tr.length : null,
    w: scored.filter(s=>s.gf>s.ga).length, d: scored.filter(s=>s.gf===s.ga).length, l: scored.filter(s=>s.gf<s.ga).length,
    gf: scored.reduce((a,s)=>a+s.gf,0), ga: scored.reduce((a,s)=>a+s.ga,0), nScored: scored.length,
    low: withPct.filter(r => r.pct < LOW_ATT).length
  };
  return {tr, gm, rows, team};
}
/* Presenze per mese: per ogni giocatore {ym: {P, tot}} (tot senza gli infortuni) */
function monthlyAttendance(){
  const months = [...new Set(S.reg.trainings.map(t => (t.date||'').slice(0,7)).filter(Boolean))].sort();
  const per = new Map(S.players.map(p => [p.id, {}]));
  S.reg.trainings.forEach(t => {
    const ym = (t.date||'').slice(0,7);
    S.players.forEach(p => {
      const v = attOf(t, p.id); if(!v) return;
      const m = per.get(p.id)[ym] ||= {P:0, tot:0}; if(v!=='INF') m.tot++; if(v==='P') m.P++;
    });
  });
  return {months, per};
}
function periodOptions(){
  const ms = [...new Set([...S.reg.trainings.map(t=>t.date), ...S.reg.games.filter(gamePlayed).map(g=>gameInfo(g).date)].map(d => (d||'').slice(0,7)).filter(Boolean))].sort();
  return `<option value="all" ${statPeriod==='all'?'selected':''}>Tutta la stagione</option>` + ms.map(m => `<option value="${m}" ${statPeriod===m?'selected':''}>${monthLabel(m)}</option>`).join('');
}

/* ---------- Scheda Presenze ---------- */
/* dopo il disegno le tabelle mostrano la colonna più recente (data-focus), allineata a destra */
function scrollGridsToEnd(){
  requestAnimationFrame(() => document.querySelectorAll('.gridwrap').forEach(w => {
    const th = w.querySelector('th[data-focus]');
    w.scrollLeft = th ? th.offsetLeft + th.offsetWidth - w.clientWidth : w.scrollWidth;
  }));
}
/* Presenze allenamenti: nell'app dalla tappa 3 (/squadra/presenze, NELL_APP) */
/* Tabellini (agonistica e attività di base): nell'app dalla tappa 3 (/squadra/tabellini, NELL_APP) */
/* Test atletici: nell'app dalla tappa 3 (/squadra/test) */

/* Statistiche partite e report PDF: nell'app dalla tappa 3 (/squadra/statistiche-partite) */

/* ---------- Eventi registro e statistiche ---------- */
function newFriendly(){ const f = {id:uid('am'), date:todayISO(), time:'', opponent:'', venue:'', home:true}; (S.reg.friendlies ||= []).push(f); return f; }
/* Ruolo di ogni giocatore: lo sceglie il mister (registro.ruoli, come i portieri in registro.gk).
   Da Under 13 in su i ruoli completi; da Under 12 in giù (Esordienti, Pulcini…) solo portiere o giocatore di movimento. */
const RUOLI_PIENI = [['portiere','Portiere'],['difensore','Difensore'],['centrocampista','Centrocampista'],['attaccante','Attaccante']];
const RUOLI_BASE = [['portiere','Portiere'],['movimento','Giocatore di movimento']];
/* Età della categoria della squadra: "Under 13 - Attività di base" → 13 (99 se non si capisce) */
function etaSquadra(t = TEAM()){ return etaCategoria(t) ?? 99; }   // regola comune con lo Scouting (condivisi.js)
/* Attività di base: da Under 13 in giù (risultato a tempi, convocazione semplice, niente foglio gara) */
const isAdb = (t = TEAM()) => etaSquadra(t) <= 13;
function ruoliSquadra(){ return etaSquadra() >= 13 ? RUOLI_PIENI : RUOLI_BASE; }
const ruoloDi = pid => (S.reg.ruoli||{})[pid] || (isGk(pid) ? 'portiere' : '');
function toggleGk(pid){ const a = S.reg.gk ||= []; S.reg.gk = a.includes(pid) ? a.filter(x => x!==pid) : [...a, pid]; save('registro'); render(); }
document.addEventListener('click', e => {
  const t = e.target.closest('button');
  if(!t || !curTeam) return;
  const R = S.reg, act = t.dataset.act;
  if(t.dataset.opentr){ openTrainingId = t.dataset.opentr; render(); window.scrollTo(0,0); return; }
  if(t.dataset.opengm){ openGameId = t.dataset.opengm; render(); window.scrollTo(0,0); return; }
  if(t.dataset.opencal){
    const m = allCalendar().find(x => x.id===t.dataset.opencal); if(!m) return;
    let g = R.games.find(x => x.calId===m.id);
    if(!g){ g = {id:uid('gm'), calId:m.id, date:m.date, opponent:m.opponent||'', home:!!m.home, comp:m.friendly?'Amichevole':'Campionato', dur:DEFAULT_DUR, og:'', pl:{}}; R.games.push(g); save('registro'); }
    openGameId = g.id; render(); window.scrollTo(0,0); return;
  }
  switch(act){
    case 'regback': openTrainingId = openGameId = openTestId = null; render(); break;
  }
});
document.addEventListener('change', e => {
  if(e.target.dataset.statperiod){ statPeriod = e.target.value; render(); }
});

/* Variabili di questo file cambiate anche da altri file: si cambiano solo da qui (passo verso i moduli) */
function impostaOpenTrainingId(v){ return (openTrainingId = v); }
function impostaOpenGameId(v){ return (openGameId = v); }
function impostaOpenTestId(v){ return (openTestId = v); }
