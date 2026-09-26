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
function attCell(v){
  if(v==='P') return `<td class="c-p" title="Presente">✓</td>`;
  if(v==='A') return `<td class="c-a" title="Assente, motivo da indicare">✗</td>`;
  if(ABS[v]) return `<td class="c-a c-${v}" title="Assente: ${ABS[v].l}">${ABS[v].s}</td>`;
  return `<td class="c-0"></td>`;
}
function viewTrainings(){
  const t = curTraining();
  if(t) return trainingEditor(t);
  const tr = S.reg.trainings.slice().sort((a,b)=>a.date.localeCompare(b.date));
  const today = todayISO(), hasToday = tr.some(x => x.date===today);
  const head = tr.map((t, i) => `<th ${i===tr.length-1?'data-focus':''}><button class="colbtn" data-opentr="${t.id}" title="Apri e modifica"><small>${weekday(t.date)}</small>${fmtDate(t.date).slice(0,5)}</button></th>`).join('');
  const body = byName().map(p => {
    const vals = tr.map(t => attOf(t, p.id));
    const P = vals.filter(v=>v==='P').length, absNoInj = vals.filter(v => isAbs(v) && v!=='INF').length, pct = attPct(P, absNoInj);
    return `<tr><th class="nm" scope="row">${isGk(p.id)?'🧤 ':''}${esc(p.name)}</th>${vals.map(attCell).join('')}
      <td class="tot">${P}</td><td class="tot ${pct!=null&&pct<LOW_ATT?'lowc':''}">${pctTxt(pct)}</td></tr>`;
  }).join('');
  const foot = tr.map(t => `<td>${Object.values(t.att||{}).filter(v=>v==='P').length}</td>`).join('');
  return `<div class="row regbar">
      <button class="btn primary" data-act="tradd" data-date="${today}">${hasToday ? 'Apri l\'allenamento di oggi' : '+ Allenamento di oggi'}</button>
      <span class="note">oppure</span><input type="date" id="newtrdate" value="${today}" aria-label="Data allenamento" style="width:auto"><button class="btn" data-act="tradd">Apri</button>
    </div>
    ${tr.length ? `<div class="tblwrap gridwrap"><table class="gtbl">
      <thead><tr><th class="nm">Giocatore</th>${head}<th class="tot">Pres.</th><th class="tot">%</th></tr></thead>
      <tbody>${body}</tbody>
      <tfoot><tr><th class="nm">Presenti</th>${foot}<td class="tot"></td><td class="tot"></td></tr></tfoot>
    </table></div>
    <p class="note legend2">Tocca una data per modificarla · ✓ presente · assente per ${ABSENCES.map(a => `<b>${a.s}</b> ${a.l.toLowerCase()}`).join(' · ')} · ✗ motivo non indicato. Gli infortuni non abbassano la %.</p>`
    : '<p class="empty">Nessun allenamento registrato.</p>'}`;
}
function trainingEditor(t){
  const att = t.att ||= {};
  const rows = byName().map(p => {
    const v = attOf(t, p.id), abs = isAbs(v);
    const reasons = abs ? `<div class="reasons" role="group" aria-label="Motivo assenza ${esc(p.name)}">${ABSENCES.map(a => `<button data-absid="${p.id}" data-reason="${a.k}" aria-pressed="${v===a.k}">${a.l}</button>`).join('')}</div>${v==='A' ? '<span class="need">Scegli il motivo</span>' : ''}` : '';
    return `<div class="attrow ${v==='P'?'is-p':abs?'is-a':''}">
      <div class="attmain"><div class="callname">${isGk(p.id)?'🧤 ':''}${esc(p.name)}</div>
        <div class="seg pa" role="group" aria-label="Presenza ${esc(p.name)}">
          <button data-attid="${p.id}" data-attstatus="P" aria-pressed="${v==='P'}">Presente</button>
          <button data-attid="${p.id}" data-attstatus="A" aria-pressed="${abs}">Assente</button>
        </div></div>
      ${reasons}
    </div>`;
  }).join('');
  const vals = S.players.map(p => attOf(t, p.id)), nP = vals.filter(v=>v==='P').length, nA = vals.filter(isAbs).length;
  return `<div class="row regbar"><button class="btn small ghost" data-act="regback">← Tabella allenamenti</button></div>
    <div class="edhead"><h3>Allenamento · ${weekday(t.date)} ${fmtDate(t.date)}</h3>
      <div class="row"><span class="countchip" data-att="P"><b>${nP}</b> presenti</span><span class="countchip" data-att="A"><b>${nA}</b> assenti</span></div></div>
    <div class="grid">
      <div><label class="f" for="tr_date">Data</label><input id="tr_date" type="date" data-trf="date" value="${esc(t.date)}"></div>
      <div><label class="f" for="tr_note">Note (facoltative)</label><input id="tr_note" data-trf="note" value="${esc(t.note||'')}" placeholder="Es. seduta atletica"></div>
    </div>
    <div class="row" style="justify-content:space-between;margin-top:14px"><button class="btn small" data-act="trallp">Tutti presenti</button><button class="btn small ghost danger" data-act="trdel">Elimina allenamento</button></div>
    <div class="callist" style="margin-top:10px">${rows}</div>
    <div class="row" style="margin-top:14px"><button class="btn primary" data-act="regback">Fatto</button><span class="note">Si salva da solo a ogni tocco.</span></div>`;
}
function viewGames(){
  const g = curGame();
  if(g) return gameEditor(g);
  const cols = matchColumns(), today = todayISO();
  const focusIdx = Math.max(cols.findIndex(c => (c.cal?.date || c.game?.date || '') > today), 0) || cols.length - 1;
  const head = cols.map(({cal, game}, ci) => {
    const i = game ? gameInfo(game) : {date:cal.date, opponent:cal.opponent||'', home:!!cal.home};
    const sc = game && gameScore(game), future = i.date > today;
    const attr = game ? `data-opengm="${game.id}"` : `data-opencal="${cal.id}"`;
    return `<th class="${future?'future':''}" ${ci===focusIdx?'data-focus':''}><button class="colbtn" ${attr} title="${esc(gameTitle(game || {calId:cal.id}))}"><small>${fmtDate(i.date).slice(0,5)}</small>${esc(i.opponent || (cal ? '' : 'Amichevole'))}<em>${sc ? `${sc.gf}-${sc.ga}` : future ? 'prossima' : i.opponent ? (i.home?'casa':'trasf.') : ''}</em></button></th>`;
  }).join('');
  const body = byName().map(p => {
    let pres = 0, min = 0, gol = 0;
    const cells = cols.map(({game}) => {
      const x = game ? (game.pl||{})[p.id] || {} : {}, m = numOr0(x.min);
      if(played(x)) pres++; min += m; gol += numOr0(x.g);
      if(!played(x)) return `<td class="c-0">${game && gamePlayed(game) ? '–' : ''}</td>`;
      if(!m) return `<td class="c-m" title="Ha giocato, minuti non registrati">✓</td>`;
      const gk = plGk(game, p.id);
      return `<td class="c-m">${m}'${numOr0(x.g) ? `<span class="gl">⚽${x.g>1?x.g:''}</span>` : ''}${gk && x.gc!=null && x.gc!=='' ? `<span class="gc">🧤${x.gc}</span>` : ''}</td>`;
    }).join('');
    return `<tr><th class="nm" scope="row">${isGk(p.id)?'🧤 ':''}${esc(p.name)}</th>${cells}<td class="tot">${pres}</td><td class="tot">${min}'</td><td class="tot">${gol||''}</td></tr>`;
  }).join('');
  return `<div class="row regbar"><button class="btn" data-act="gmadd">+ Amichevole</button><span class="note">finisce anche nel calendario della squadra</span></div>
    ${cols.length ? `<div class="tblwrap gridwrap"><table class="gtbl gms">
      <thead><tr><th class="nm">Giocatore</th>${head}<th class="tot">Pres.</th><th class="tot">Min</th><th class="tot">Gol</th></tr></thead>
      <tbody>${body}</tbody></table></div>
      <p class="note legend2">Le partite arrivano dal Calendario (campionato e amichevoli): tocca una partita per segnare minuti, gol e gol subiti dal portiere. ⚽ gol · 🧤 gol subiti (portiere).</p>`
    : '<p class="empty">Nessuna partita: inserisci il calendario nella scheda Partita, oppure aggiungi un\'amichevole.</p>'}`;
}
function gameEditor(g){
  const pl = g.pl ||= {};
  const i = gameInfo(g), cal = calOf(g), sc = gameScore(g), s = S.sheet;
  const sheetMatch = s.date && (s.date===i.date || (i.opponent && (s.opponent||'').trim().toLowerCase()===i.opponent.trim().toLowerCase()));
  const players = byName().sort((a,b) => plGk(g,b.id) - plGk(g,a.id));
  const rows = players.map(p => {
    const x = pl[p.id] || {}, gk = plGk(g, p.id), on = played(x);
    return `<div class="gmrow2 ${on?'on':''}">
      <div class="callname"><button class="gkbtn" data-gkgame="${p.id}" aria-pressed="${gk}" title="${gk?'In porta in questa partita':'Segna come portiere in questa partita'}">🧤</button>${esc(p.name)}</div>
      <div class="gmin">
        <label class="mini">Minuti<input type="number" inputmode="numeric" min="0" max="130" data-gmp="${p.id}" data-k="min" value="${x.min??''}" placeholder="${x.pres && !numOr0(x.min) ? '✓' : '0'}"></label>
        <label class="mini">Gol<input type="number" inputmode="numeric" min="0" max="20" data-gmp="${p.id}" data-k="g" value="${x.g||''}" placeholder="0"></label>
        ${gk ? `<label class="mini gcl">Subiti<input type="number" inputmode="numeric" min="0" max="30" data-gmp="${p.id}" data-k="gc" value="${x.gc??''}" placeholder="0"></label>` : ''}
      </div>
    </div>`;
  }).join('');
  const header = cal && cal.friendly
    ? `<div class="grid">
        <div><label class="f" for="fr_date">Data</label><input id="fr_date" type="date" data-frid="${cal.id}" data-frf="date" value="${esc(cal.date)}"></div>
        <div><label class="f" for="fr_time">Ora</label><input id="fr_time" type="time" data-frid="${cal.id}" data-frf="time" value="${esc(cal.time||'')}"></div>
        <div><label class="f" for="fr_opp">Avversario</label><input id="fr_opp" data-frid="${cal.id}" data-frf="opponent" value="${esc(cal.opponent||'')}" placeholder="Es. Merate"></div>
        <div><label class="f" for="fr_venue">Campo</label><input id="fr_venue" data-frid="${cal.id}" data-frf="venue" value="${esc(cal.venue||'')}" placeholder="Campo"></div>
        <div><label class="f" for="fr_home">Sede</label><select id="fr_home" data-frid="${cal.id}" data-frf="home"><option value="1" ${cal.home?'selected':''}>Casa</option><option value="" ${!cal.home?'selected':''}>Trasferta</option></select></div>
      </div>`
    : cal
    ? `<div class="matchcard"><small>${esc(i.comp)} · ${weekday(i.date)} ${fmtDate(i.date)}${cal.time?' · '+esc(cal.time):''}</small><b>${esc(gameTitle(g))}</b>${i.venue?`<span class="note">${esc(i.venue)}</span>`:''}</div>`
    : `<div class="grid">
        <div><label class="f" for="gm_date">Data</label><input id="gm_date" type="date" data-gmf="date" value="${esc(g.date)}"></div>
        <div><label class="f" for="gm_opp">Avversario</label><input id="gm_opp" data-gmf="opponent" value="${esc(g.opponent||'')}" placeholder="Es. Merate"></div>
        <div><label class="f" for="gm_home">Sede</label><select id="gm_home" data-gmf="home"><option value="1" ${g.home?'selected':''}>Casa</option><option value="" ${!g.home?'selected':''}>Trasferta</option></select></div>
        <div><label class="f" for="gm_comp">Tipo</label><select id="gm_comp" data-gmf="comp">${COMP_TYPES.map(c=>`<option ${i.comp===c?'selected':''}>${c}</option>`).join('')}</select></div>
      </div>`;
  return `<div class="row regbar"><button class="btn small ghost" data-act="regback">← Tabella partite</button></div>
    <div class="edhead">${header}<div class="score"><span>Risultato</span><b>${sc ? `${sc.gf} - ${sc.ga}` : '– -'}</b><small>calcolato dai gol</small></div></div>
    <div class="grid" style="margin-top:12px">
      <div><label class="f" for="gm_dur">Durata partita (minuti)</label><input id="gm_dur" type="number" inputmode="numeric" data-gmf="dur" value="${esc(g.dur ?? DEFAULT_DUR)}"></div>
      <div><label class="f" for="gm_og">Autogol a favore</label><input id="gm_og" type="number" inputmode="numeric" min="0" data-gmf="og" value="${esc(g.og||'')}" placeholder="0"></div>
    </div>
    ${g.nomin ? `<p class="note" style="margin-top:12px">Per questa partita i minuti non sono stati registrati: ✓ = ha giocato. Se li conosci, scrivili.</p>` : ''}
    ${sheetMatch ? `<div class="row" style="margin-top:12px"><button class="btn small" data-act="gmfromsheet">Prendi titolari e panchina dalla Formazione</button><span class="note">i titolari partono con i minuti pieni, la panchina a 0</span></div>` : ''}
    <div class="callist" style="margin-top:12px">${rows}</div>
    <div class="row" style="margin-top:14px;justify-content:space-between"><div class="row"><button class="btn primary" data-act="regback">Fatto</button><span class="note">Si salva da solo.</span></div>
      <button class="btn small ghost danger" data-act="gmdel">${cal && !cal.friendly ? 'Svuota dati partita' : 'Elimina partita'}</button></div>`;
}
function viewTests(){
  const t = curTest();
  if(t) return testEditor(t);
  const list = S.reg.tests.slice().sort((a,b)=>b.date.localeCompare(a.date)).map(t => {
    const n = Object.values(t.res||{}).filter(r => r.s!=null).length;
    return `<div class="regrow"><div><b>${esc(t.name||'Test')}</b> · ${fmtDate(t.date)}</div>
      <div class="row"><span class="countchip"><b>${n}</b> tempi</span><button class="btn small" data-opents="${t.id}">Apri</button></div></div>`;
  }).join('');
  return `<div class="row regbar"><button class="btn primary" data-act="tsadd">+ Nuovo test</button></div>
    <p class="hint">Scrivi i tempi come 12:51 (minuti:secondi). Qualsiasi altra parola (es. "differenziato", "non svolto") resta come nota.</p>
    <div class="reglist">${list || '<p class="empty">Nessun test registrato.</p>'}</div>`;
}
function testEditor(t){
  const res = t.res ||= {};
  const rows = byName().map(p => {
    const r = res[p.id];
    const v = r ? (r.s!=null ? `${Math.floor(r.s/60)}:${String(r.s%60).padStart(2,'0')}` : (r.note||'')) : '';
    return `<div class="gmrow"><div class="callname">${esc(p.name)}</div><input data-tsr="${p.id}" value="${esc(v)}" placeholder="mm:ss" aria-label="Tempo ${esc(p.name)}" style="max-width:170px"></div>`;
  }).join('');
  return `<div class="row regbar"><button class="btn small ghost" data-act="regback">← Tutti i test</button></div>
    <div class="grid">
      <div><label class="f" for="ts_name">Test</label><input id="ts_name" data-tsf="name" value="${esc(t.name||'')}" list="testnames" placeholder="Es. 3 km"></div>
      <div><label class="f" for="ts_date">Data</label><input id="ts_date" type="date" data-tsf="date" value="${esc(t.date)}"></div>
    </div>
    <datalist id="testnames">${[...new Set(['3 km','2 km','1 km', ...S.reg.tests.map(x=>x.name).filter(Boolean)])].map(n=>`<option value="${esc(n)}">`).join('')}</datalist>
    <div class="row" style="justify-content:flex-end;margin-top:16px"><button class="btn small ghost danger" data-act="tsdel">Elimina test</button></div>
    <div class="callist" style="margin-top:10px">${rows}</div>`;
}

/* ---------- Scheda Statistiche ---------- */
/* Statistiche → Allenamento e Statistiche → Partite (con i tabellini) */
function statHeader(title, kpis){
  return `<section class="panel">
    <div class="row" style="justify-content:space-between;align-items:flex-end">
      <h2>${title} · ${esc(TEAM()?.name||'')}</h2>
      <div class="row"><label class="f" for="statperiod" style="margin:0">Periodo</label><select id="statperiod" data-statperiod="1" style="width:auto">${periodOptions()}</select></div>
    </div>
    <div class="kpis">${kpis}</div>
    ${isAdmin() ? `<div class="row" style="margin-top:12px"><button class="btn primary" data-act="statspdf">Scarica report PDF</button><span class="note">Riepilogo, presenze giorno per giorno, minuti partita per partita, test.</span></div>` : ''}
  </section>`;
}
const kpiBox = (v, l, sub='') => `<div class="kpi"><b>${v}</b><span>${l}</span>${sub?`<small>${sub}</small>`:''}</div>`;
function viewStatAllenamento(){
  if(!S.players.length) return `<section class="panel"><h2>Statistiche allenamento</h2><p class="empty">Prima serve la rosa (Squadra → Rosa).</p></section>`;
  const {tr, rows, team} = computeStats();
  const inj = rows.reduce((a,r) => a + r.c.INF, 0), absAll = rows.reduce((a,r) => a + r.absAll, 0);
  const kpis = [
    kpiBox(team.nT, 'Allenamenti', team.avgPresent!=null ? `media ${team.avgPresent.toFixed(1)} presenti` : ''),
    kpiBox(pctTxt(team.avgPct), 'Presenza media'),
    kpiBox(team.low, `Sotto il ${LOW_ATT*100}%`, team.low ? 'in rosso nella tabella' : ''),
    kpiBox(absAll, 'Assenze', inj ? `di cui ${inj} per infortunio` : '')
  ].join('');
  const bar = v => v==null ? '<span class="note">—</span>' : `<span class="pbar ${v<LOW_ATT?'low':''}"><i style="width:${Math.round(v*100)}%"></i></span><b>${pctTxt(v)}</b>`;
  const trRows = rows.slice().sort((a,b)=>(b.pct??-1)-(a.pct??-1)).map(r => `<tr class="${r.pct!=null&&r.pct<LOW_ATT?'low':''}">
      <td class="nm">${esc(r.p.name)}</td><td>${r.c.P}</td>${ABSENCES.map(a => `<td>${r.c[a.k]||''}</td>`).join('')}<td>${r.c.A||''}</td><td class="pc">${bar(r.pct)}</td></tr>`).join('');
  const {months, per} = monthlyAttendance();
  const moRows = byName().map(p => `<tr><td class="nm">${esc(p.name)}</td>${months.map(m => { const o = per.get(p.id)?.[m]; const v = o && o.tot ? o.P/o.tot : null; return `<td class="${v!=null&&v<LOW_ATT?'lowc':''}">${pctTxt(v)}</td>`; }).join('')}</tr>`).join('');
  const tests = S.reg.tests.slice().sort((a,b)=>a.date.localeCompare(b.date));
  const tsRows = byName().map(p => `<tr><td class="nm">${esc(p.name)}</td>${tests.map(t => `<td>${esc(testCell((t.res||{})[p.id]))||'<span class="note">—</span>'}</td>`).join('')}</tr>`).join('');
  return statHeader('Statistiche allenamento', kpis) + `
  <section class="panel">
    <h3 class="convh3">Presenze per giocatore</h3>
    ${tr.length ? `<div class="tblwrap"><table class="stbl"><thead><tr><th class="nm">Giocatore</th><th title="Presenze">Pres.</th>${ABSENCES.map(a => `<th title="Assenze: ${a.l}">${a.l.split(' ')[0]}</th>`).join('')}<th title="Assenze senza motivo indicato">N.i.</th><th>Presenza</th></tr></thead><tbody>${trRows}</tbody></table></div>
      <p class="note" style="margin-top:6px">In rosso chi è sotto il ${LOW_ATT*100}% di presenze. Le assenze per infortunio non abbassano la percentuale. N.i. = assenza senza motivo indicato.</p>` : '<p class="empty">Nessun allenamento nel periodo.</p>'}
  </section>
  ${months.length > 1 ? `<section class="panel"><h3 class="convh3">Presenze per mese</h3>
    <div class="tblwrap"><table class="stbl"><thead><tr><th class="nm">Giocatore</th>${months.map(m=>`<th>${monthLabel(m)}</th>`).join('')}</tr></thead><tbody>${moRows}</tbody></table></div></section>` : ''}
  ${tests.length ? `<section class="panel"><h3 class="convh3">Test atletici</h3>
    <div class="tblwrap"><table class="stbl"><thead><tr><th class="nm">Giocatore</th>${tests.map(t=>`<th>${esc(t.name||'Test')}<br><span class="note">${fmtDate(t.date).slice(0,5)}</span></th>`).join('')}</tr></thead><tbody>${tsRows}</tbody></table></div></section>` : ''}`;
}
function viewStatPartite(){
  if(!S.players.length) return `<section class="panel"><h2>Statistiche partite</h2><p class="empty">Prima serve la rosa (Squadra → Rosa).</p></section>`;
  if(curGame()) return registroPage('Tabellino', viewGames());
  const {gm, rows, team} = computeStats();
  const kpis = [
    kpiBox(team.nG, 'Partite giocate', team.nScored ? `${team.w}V ${team.d}N ${team.l}P` : ''),
    kpiBox(team.nScored ? `${team.gf}-${team.ga}` : '—', 'Gol fatti-subiti', team.nScored ? `${(team.gf/team.nScored).toFixed(1)} - ${(team.ga/team.nScored).toFixed(1)} a partita` : 'segna i gol nei tabellini'),
    kpiBox(rows.filter(r => r.gol).length, 'Marcatori diversi'),
    kpiBox(team.nScored ? gm.map(gameScore).filter(s => s && s.ga===0).length : '—', 'Porta inviolata')
  ].join('');
  const gmRows = rows.slice().sort((a,b)=>b.min-a.min).map(r => `<tr>
      <td class="nm">${isGk(r.p.id)?'🧤 ':''}${esc(r.p.name)}</td><td>${r.pres}</td><td>${r.min}'</td><td>${pctTxt(r.minPct)}</td><td>${r.avg!=null?Math.round(r.avg)+"'":'—'}</td><td>${r.gol||''}</td><td>${r.gkGames ? r.gc : ''}</td></tr>`).join('');
  return statHeader('Statistiche partite', kpis) + `
  <section class="panel">
    <h3 class="convh3">Giocatori</h3>
    ${gm.length ? `<div class="tblwrap"><table class="stbl"><thead><tr><th class="nm">Giocatore</th><th title="Partite giocate (almeno 1 minuto)">Pres.</th><th>Minuti</th><th title="Minuti giocati sul totale disponibile">% min</th><th title="Minuti medi a partita giocata">Media</th><th>Gol</th><th title="Gol subiti da portiere">Subiti 🧤</th></tr></thead><tbody>${gmRows}</tbody></table></div>` : '<p class="empty">Nessuna partita giocata nel periodo.</p>'}
  </section>
  <section class="panel">
    <h3 class="convh3">Tabellini</h3>
    <p class="hint" style="margin-bottom:0">Minuti, gol e gol subiti di ogni partita. Tocca una partita per compilarla.</p>
    ${viewGames()}
  </section>`;
}

/* ---------- Eventi registro e statistiche ---------- */
function newFriendly(){ const f = {id:uid('am'), date:todayISO(), time:'', opponent:'', venue:'', home:true}; (S.reg.friendlies ||= []).push(f); return f; }
/* Ruolo di ogni giocatore: lo sceglie il mister (registro.ruoli, come i portieri in registro.gk).
   Da Under 13 in su i ruoli completi; da Under 12 in giù (Esordienti, Pulcini…) solo portiere o giocatore di movimento. */
const RUOLI_PIENI = [['portiere','Portiere'],['difensore','Difensore'],['centrocampista','Centrocampista'],['attaccante','Attaccante']];
const RUOLI_BASE = [['portiere','Portiere'],['movimento','Giocatore di movimento']];
function ruoliSquadra(){
  const c = String(TEAM()?.category || TEAM()?.name || '');
  const u = c.match(/under\s*(\d+)|\bu\s*(\d{1,2})\b/i);
  const eta = u ? +(u[1] || u[2]) : /esordienti/i.test(c) ? 12 : /pulcini|primi\s*calci|piccoli/i.test(c) ? 10 : 99;
  return eta >= 13 ? RUOLI_PIENI : RUOLI_BASE;
}
const ruoloDi = pid => (S.reg.ruoli||{})[pid] || (isGk(pid) ? 'portiere' : '');
function ruoloSel(p){
  const r = ruoloDi(p.id);
  return `<select class="rsel" data-ruolo="${p.id}" aria-label="Ruolo di ${esc(p.name)}"><option value="">Ruolo</option>${ruoliSquadra().map(([v,e]) => `<option value="${v}" ${v===r?'selected':''}>${e}</option>`).join('')}</select>`;
}
function setRuolo(pid, v){
  const R = S.reg; R.ruoli ||= {};
  if(v) R.ruoli[pid] = v; else delete R.ruoli[pid];
  const gk = R.gk || [];
  R.gk = v === 'portiere' ? [...new Set([...gk, pid])] : gk.filter(x => x !== pid);   // il portiere resta segnato anche per i gol subiti
  save('registro'); render();
}
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
  if(t.dataset.opents){ openTestId = t.dataset.opents; render(); window.scrollTo(0,0); return; }
  if(t.dataset.gktoggle){ toggleGk(t.dataset.gktoggle); return; }
  if(t.dataset.frdel){
    const f = (R.friendlies||[]).find(x => x.id===t.dataset.frdel); if(!f) return;
    const g = R.games.find(x => x.calId===f.id), hasData = g && gamePlayed(g);
    if(!confirm(`Eliminare l'amichevole${f.opponent?' con '+f.opponent:''} del ${fmtDate(f.date)}?${hasData?' Si cancellano anche minuti e gol segnati.':''}`)) return;
    R.friendlies = R.friendlies.filter(x => x!==f); R.games = R.games.filter(x => x.calId!==f.id); save('registro'); render(); return;
  }
  if(t.dataset.attid){
    const tr = curTraining(); if(!tr) return;
    const pid = t.dataset.attid, cur = attOf(tr, pid);
    tr.att[pid] = t.dataset.attstatus==='P' ? 'P' : (isAbs(cur) ? cur : 'A');
    save('registro'); render(); return;
  }
  if(t.dataset.absid){ const tr = curTraining(); if(tr){ tr.att[t.dataset.absid] = t.dataset.reason; save('registro'); render(); } return; }
  if(t.dataset.gkgame){
    const g = curGame(); if(!g) return;
    const x = g.pl[t.dataset.gkgame] ||= {};
    x.gk = !plGk(g, t.dataset.gkgame);
    save('registro'); render(); return;
  }
  switch(act){
    case 'regback': openTrainingId = openGameId = openTestId = null; render(); break;
    case 'tradd': {
      const date = t.dataset.date || $('#newtrdate')?.value || todayISO();
      const ex = R.trainings.find(x => x.date===date);
      if(ex){ openTrainingId = ex.id; render(); window.scrollTo(0,0); break; }
      const tr = {id:uid('tr'), date, note:'', att:Object.fromEntries(S.players.map(p => [p.id,'P']))};
      R.trainings.push(tr); openTrainingId = tr.id; save('registro'); render(); window.scrollTo(0,0); break; }
    case 'trallp': { const tr = curTraining(); if(tr){ S.players.forEach(p => tr.att[p.id]='P'); save('registro'); render(); } break; }
    case 'trdel': { const tr = curTraining(); if(tr && confirm(`Eliminare l'allenamento del ${fmtDate(tr.date)}?`)){ R.trainings = R.trainings.filter(x=>x!==tr); openTrainingId = null; save('registro'); render(); } break; }
    case 'gmfromsheet': {
      const g = curGame(), s = S.sheet; if(!g) break;
      const dur = numOr0(g.dur) || DEFAULT_DUR;
      Object.values(s.lineup||{}).forEach(pid => { (g.pl[pid] ||= {}).min = dur; });
      (s.bench||[]).forEach(pid => { const x = g.pl[pid] ||= {}; if(x.min==null || x.min==='') x.min = 0; });
      save('registro'); render(); break; }
    case 'gmadd': {
      const f = newFriendly();
      const g = {id:uid('gm'), calId:f.id, date:f.date, opponent:'', home:true, comp:'Amichevole', dur:DEFAULT_DUR, og:'', pl:{}};
      R.games.push(g); openGameId = g.id; save('registro'); render(); window.scrollTo(0,0); break; }
    case 'fradd': newFriendly(); save('registro'); render(); break;
    case 'gmdel': {
      const g = curGame(); if(!g) break;
      const fr = (R.friendlies||[]).find(f => f.id===g.calId);
      if(!confirm(fr ? `Eliminare l'amichevole del ${fmtDate(fr.date)} con minuti e gol?` : g.calId ? `Cancellare minuti e gol di questa partita?` : `Eliminare la partita del ${fmtDate(g.date)}?`)) break;
      if(fr) R.friendlies = R.friendlies.filter(f => f!==fr);
      R.games = R.games.filter(x=>x!==g); openGameId = null; save('registro'); render(); break; }
    case 'tsadd': { const ts = {id:uid('ts'), date:todayISO(), name:'', res:{}}; R.tests.push(ts); openTestId = ts.id; save('registro'); render(); break; }
    case 'tsdel': { const ts = curTest(); if(ts && confirm(`Eliminare il test "${ts.name||'Test'}" del ${fmtDate(ts.date)}?`)){ R.tests = R.tests.filter(x=>x!==ts); openTestId = null; save('registro'); render(); } break; }
    case 'statspdf': if(isAdmin()) downloadStatsPdf(); break;
  }
});
document.addEventListener('input', e => {
  const t = e.target;
  if(!curTeam) return;
  if(t.dataset.trf){ const tr = curTraining(); if(tr){ tr[t.dataset.trf] = t.value; save('registro'); } return; }
  if(t.dataset.frid){
    const f = (S.reg.friendlies||[]).find(x => x.id===t.dataset.frid); if(!f) return;
    f[t.dataset.frf] = t.type==='checkbox' ? t.checked : (t.dataset.frf==='home' ? !!t.value : t.value);
    save('registro'); return;
  }
  if(t.dataset.gmf){
    const g = curGame(); if(!g) return;
    g[t.dataset.gmf] = t.dataset.gmf==='home' ? !!t.value : t.value;
    save('registro');
    if(t.dataset.gmf==='og') refreshScore(g);
    return;
  }
  if(t.dataset.gmp){
    const g = curGame(); if(!g) return;
    const x = g.pl[t.dataset.gmp] ||= {};
    x[t.dataset.k] = t.value==='' ? '' : Math.max(0, +t.value||0);
    if(t.dataset.k==='min') delete x.pres;   // con i minuti scritti la presenza "senza minuti" non serve più
    t.closest('.gmrow2')?.classList.toggle('on', played(x));
    save('registro'); refreshScore(g); return;
  }
  if(t.dataset.tsf){ const ts = curTest(); if(ts){ ts[t.dataset.tsf] = t.value; save('registro'); } return; }
  if(t.dataset.tsr){
    const ts = curTest(); if(!ts) return;
    const v = t.value.trim(), sec = parseTime(v);
    if(!v) delete ts.res[t.dataset.tsr];
    else ts.res[t.dataset.tsr] = sec!=null ? {s:sec} : {note:v};
    save('registro'); return;
  }
});
/* aggiorna il risultato mentre si scrive, senza ridisegnare (il campo resta attivo) */
function refreshScore(g){ const b = document.querySelector('.score b'); if(b){ const sc = gameScore(g); b.textContent = sc ? `${sc.gf} - ${sc.ga}` : '– -'; } }
document.addEventListener('change', e => {
  if(e.target.dataset && e.target.dataset.ruolo && curTeam){ setRuolo(e.target.dataset.ruolo, e.target.value); return; }
  if(e.target.dataset.statperiod){ statPeriod = e.target.value; render(); }
});

/* ---------- Report PDF statistiche (solo admin) ---------- */
function reportHeader(x, imgs, title, sub){
  const mx = 36, hh = 70, lw = 160, rw = 70;
  if(imgs.figc){ const fh = lw*imgs.figc.height/imgs.figc.width; x.drawImage(imgs.figc, mx, 24+(hh-fh)/2, lw, fh); }
  if(imgs.logo) x.drawImage(imgs.logo, W-mx-rw, 24, rw, rw);
  const cx = W/2;
  T(x, 'ACADEMY CASATESE MERATE', cx, 50, {size:26, weight:700, align:'center', max:700});
  T(x, (TEAM()?.category || teamLabel()).toUpperCase(), cx, 78, {size:18, weight:700, align:'center', color:MUTED, max:700});
  T(x, title, mx, 128, {size:24, weight:700, cond:true});
  if(sub) T(x, sub, W-mx, 128, {size:13, color:MUTED, align:'right', max:600});
  x.fillStyle = INK; x.fillRect(mx, 138, W-2*mx, 2);
  return 154;
}
/* Tabella generica: cols [{t, w, al}], rows [[...]], fill(ri, ci, val) → colore cella o null */
function drawTable(x, x0, y0, cols, rows, o={}){
  const headH = o.headH || 24, rh = o.rh || 22, fs = o.fs || Math.min(12, rh*0.52);
  const tw = cols.reduce((a,c)=>a+c.w, 0);
  x.fillStyle = INK; x.fillRect(x0, y0, tw, headH);
  let cx = x0;
  cols.forEach(c => { T(x, c.t, c.al==='left' ? cx+8 : cx+c.w/2, y0+headH/2+1, {size:Math.min(11, headH*0.45), weight:700, base:'middle', align:c.al==='left'?'left':'center', color:'#fff', max:c.w-8}); cx += c.w; });
  let y = y0 + headH;
  rows.forEach((r, ri) => {
    x.fillStyle = ri%2 ? '#F7F7F5' : '#fff'; x.fillRect(x0, y, tw, rh);
    cx = x0;
    cols.forEach((c, ci) => {
      const f = o.fill && o.fill(ri, ci, r[ci]);
      if(f){ x.fillStyle = f; x.fillRect(cx+1, y+1, c.w-2, rh-2); }
      x.strokeStyle = LINE_C; x.lineWidth = 1; x.strokeRect(cx, y, c.w, rh);
      const bold = o.bold && o.bold(ri, ci);
      T(x, r[ci] ?? '', c.al==='left' ? cx+8 : cx+c.w/2, y+rh/2+1, {size:fs, weight:(ci===0||bold)?700:500, base:'middle', align:c.al==='left'?'left':'center', max:c.w-8, color:(o.color && o.color(ri,ci,r[ci])) || INK});
      cx += c.w;
    });
    y += rh;
  });
  return y;
}
const chunk = (a, n) => a.length ? Array.from({length:Math.ceil(a.length/n)}, (_,i) => a.slice(i*n, i*n+n)) : [[]];
const ATT_FILL = {P:'#DDEFE2', A:'#F6D5DA', MAL:'#F6D5DA', SCU:'#FBEBC8', FAM:'#FBEBC8', ING:'#F2C4CB', INF:'#E4D9F2'};
const attShort = v => v==='P' ? 'P' : v==='A' ? 'A' : ABS[v] ? ABS[v].s : '';
function statsPages(imgs){
  const {tr, gm, rows, team} = computeStats();
  const period = statPeriod==='all' ? 'Tutta la stagione' : monthLabel(statPeriod);
  const sub = `${period} · aggiornato al ${fmtDate(todayISO())}`;
  const pages = [];
  const players = byName(), mx = 36, tw = W - 2*mx;
  const rhFor = (y, n) => Math.max(14, Math.min(26, (H - 50 - y) / Math.max(n,1)));
  const foot = x => T(x, `Report statistiche · ${TEAM()?.name||''}`, mx, H-18, {size:11, color:MUTED});

  // 1. Riepilogo
  { const [c, x] = cv(); let y = reportHeader(x, imgs, 'Riepilogo statistiche', sub);
    const k = [[team.nT, 'Allenamenti'], [pctTxt(team.avgPct), 'Presenza media'], [team.nG, 'Partite giocate'],
               [team.nScored ? `${team.w}V ${team.d}N ${team.l}P` : '—', 'Risultati'], [team.nScored ? `${team.gf}-${team.ga}` : '—', 'Gol fatti-subiti'], [team.low, `Sotto il ${LOW_ATT*100}% presenze`]];
    const kw = tw / k.length;
    k.forEach(([v,l], i) => { x.strokeStyle = LINE_C; x.lineWidth = 1; x.strokeRect(mx+i*kw+4, y, kw-8, 56); T(x, v, mx+i*kw+kw/2, y+26, {size:22, weight:700, align:'center', cond:true}); T(x, l, mx+i*kw+kw/2, y+45, {size:11, color:MUTED, align:'center'}); });
    y += 72;
    const cols = [{t:'GIOCATORE', w:230, al:'left'}, {t:'PRES. ALL.', w:80}, {t:'ASSENZE', w:74}, {t:'DI CUI INF.', w:80}, {t:'% PRES.', w:80},
                  {t:'PARTITE', w:76}, {t:'MINUTI', w:80}, {t:'% MIN', w:72}, {t:'MEDIA', w:70}, {t:'GOL', w:60}, {t:'SUBITI (POR)', w:96}];
    const scale = tw / cols.reduce((a,c)=>a+c.w,0); cols.forEach(c => c.w *= scale);
    const data = rows.map(r => [(isGk(r.p.id)?'(P) ':'') + r.p.name, r.c.P, r.absAll, r.c.INF||'', pctTxt(r.pct), r.pres, r.min, pctTxt(r.minPct), r.avg!=null?Math.round(r.avg)+"'":'—', r.gol||'', r.gkGames ? r.gc : '']);
    drawTable(x, mx, y, cols, data, {rh:rhFor(y+24, data.length), fill:(ri,ci) => ci===4 && rows[ri].pct!=null && rows[ri].pct<LOW_ATT ? '#F6D5DA' : null});
    foot(x); pages.push(c); }

  // 2. Presenze allenamenti giorno per giorno
  chunk(tr, 24).forEach((part, pi, all) => {
    const [c, x] = cv(); let y = reportHeader(x, imgs, 'Presenze allenamenti' + (all.length>1 ? ` (${pi+1}/${all.length})` : ''), sub);
    if(!part.length){ T(x, 'Nessun allenamento registrato nel periodo.', mx, y+30, {size:15, color:MUTED}); foot(x); pages.push(c); return; }
    const nameW = 200, totW = 56, dayW = Math.min(44, (tw - nameW - totW*4) / part.length);
    const cols = [{t:'GIOCATORE', w:nameW, al:'left'}, ...part.map(t => ({t:fmtDate(t.date).slice(0,5), w:dayW})), {t:'PRES.', w:totW}, {t:'ASS.', w:totW}, {t:'DI CUI INF.', w:totW}, {t:'%', w:totW}];
    const data = players.map(p => {
      const st = part.map(t => attOf(t, p.id));
      const allv = tr.map(t => attOf(t, p.id));
      const P = allv.filter(v=>v==='P').length, abs = allv.filter(isAbs).length, inj = allv.filter(v=>v==='INF').length;
      return [p.name, ...st.map(attShort), P, abs, inj||'', pctTxt(attPct(P, abs - inj))];
    });
    drawTable(x, mx, y, cols, data, {rh:rhFor(y+24, data.length), fs:11, fill:(ri,ci) => ci>0 && ci<=part.length ? ATT_FILL[attOf(part[ci-1], players[ri].id)] || null : null});
    T(x, 'P presente · assente per: ' + ABSENCES.map(a => `${a.s} ${a.l.toLowerCase()}`).join(' · ') + ' · A motivo non indicato · gli infortuni non contano nella %', mx, H-36, {size:11, color:MUTED, max:tw});
    foot(x); pages.push(c);
  });

  // 3. Minuti partita per partita
  chunk(gm, 12).forEach((part, pi, all) => {
    const [c, x] = cv(); let y = reportHeader(x, imgs, 'Partite: minuti, gol, gol subiti' + (all.length>1 ? ` (${pi+1}/${all.length})` : ''), sub);
    if(!part.length){ T(x, 'Nessuna partita giocata nel periodo.', mx, y+30, {size:15, color:MUTED}); foot(x); pages.push(c); return; }
    const nameW = 200, totW = 62, gW = Math.min(70, (tw - nameW - totW*3) / part.length);
    const cols = [{t:'GIOCATORE', w:nameW, al:'left'}, ...part.map(g => ({t:fmtDate(gameInfo(g).date).slice(0,5), w:gW})), {t:'PRES.', w:totW}, {t:'MINUTI', w:totW}, {t:'GOL', w:totW}];
    let gx = mx + nameW;
    part.forEach(g => { const sc = gameScore(g); T(x, [gameInfo(g).opponent, sc ? `${sc.gf}-${sc.ga}` : ''].filter(Boolean).join(' '), gx+gW/2, y+8, {size:9.5, align:'center', color:MUTED, max:gW-4}); gx += gW; });
    y += 16;
    const data = players.map(p => {
      const r = rows.find(z => z.p.id===p.id);
      return [(isGk(p.id)?'(P) ':'') + p.name, ...part.map(g => {
        const v = (g.pl||{})[p.id] || {}, m = numOr0(v.min);
        if(!played(v)) return '—';
        if(!m) return '✓';
        return `${m}'` + (numOr0(v.g) ? ` G${v.g}` : '') + (plGk(g, p.id) && v.gc!=null && v.gc!=='' ? ` S${v.gc}` : '');
      }), r.pres, r.min, r.gol||''];
    });
    drawTable(x, mx, y, cols, data, {rh:rhFor(y+24, data.length), fs:11,
      fill:(ri,ci) => { if(ci===0 || ci>part.length) return null; const v = (part[ci-1].pl||{})[players[ri].id] || {}; return numOr0(v.g) ? '#DDEFE2' : (played(v) ? '#EEF4FA' : null); },
      color:(ri,ci,v) => v==='—' ? '#A0A8B0' : null});
    T(x, "Minuti giocati · ✓ ha giocato, minuti non registrati · G gol segnati (in verde) · S gol subiti dal portiere · (P) portiere", mx, H-36, {size:11, color:MUTED});
    foot(x); pages.push(c);
  });

  // 4. Presenze per mese + test atletici
  { const [c, x] = cv(); let y = reportHeader(x, imgs, 'Presenze per mese e test atletici', sub);
    const {months, per} = monthlyAttendance();
    const tests = S.reg.tests.slice().sort((a,b)=>a.date.localeCompare(b.date));
    const half = (tw - 24) / 2;
    if(months.length){
      const mw = Math.min(70, (half - 170) / months.length);
      const cols = [{t:'GIOCATORE', w:170, al:'left'}, ...months.map(m => ({t:monthLabel(m).toUpperCase(), w:mw}))];
      const data = players.map(p => [p.name, ...months.map(m => { const o = per.get(p.id)?.[m]; return o && o.tot ? pctTxt(o.P/o.tot) : '—'; })]);
      drawTable(x, mx, y, cols, data, {rh:rhFor(y+24, data.length), fs:11, fill:(ri,ci) => { if(!ci) return null; const o = per.get(players[ri].id)?.[months[ci-1]]; return o && o.tot && o.P/o.tot < LOW_ATT ? '#F6D5DA' : null; }});
    } else T(x, 'Nessun allenamento registrato.', mx, y+20, {size:14, color:MUTED});
    const tx = mx + half + 24;
    if(tests.length){
      const tw2 = Math.min(90, (half - 170) / tests.length);
      const cols = [{t:'GIOCATORE', w:170, al:'left'}, ...tests.map(t => ({t:`${(t.name||'TEST').toUpperCase()} ${fmtDate(t.date).slice(0,5)}`, w:tw2}))];
      const data = players.map(p => [p.name, ...tests.map(t => testCell((t.res||{})[p.id]) || '—')]);
      drawTable(x, tx, y, cols, data, {rh:rhFor(y+24, data.length), fs:10.5, color:(ri,ci,v) => (ci && v && !/\d/.test(v)) ? MUTED : null});
    } else T(x, 'Nessun test registrato.', tx, y+20, {size:14, color:MUTED});
    foot(x); pages.push(c); }
  return pages;
}
async function downloadStatsPdf(){
  if(!window.jspdf){ setStatus('Libreria PDF non caricata'); return; }
  setStatus('Creo il report…');
  await ensureFonts();
  const [logo, figc] = await Promise.all([loadLogo(), loadImg('figc-sgs-logo.png')]);
  const pages = statsPages({logo, figc});
  const doc = new window.jspdf.jsPDF({orientation:'landscape', unit:'mm', format:'a4', compress:true});
  pages.forEach((c,i) => { if(i) doc.addPage(); doc.addImage(c.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, 297, 210); });
  const name = ['REPORT', (TEAM()?.category || TEAM()?.name || '').replace(/[^\w]+/g,'_').toUpperCase(), statPeriod==='all' ? 'STAGIONE' : statPeriod, todayISO()].filter(Boolean).join('_') + '.pdf';
  try{
    if(downloads) await downloads.save({filename:name, data:doc.output('blob')});
    else browserDownload(name, doc.output('blob'));
    setStatus('Report pronto');
  }catch(e){ setStatus(e && e.code==='declined' ? 'Download annullato' : 'Download non riuscito'); }
}
