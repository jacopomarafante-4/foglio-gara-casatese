/* Portale Academy Casatese Merate · Pagine PDF disegnate su canvas: foglio gara e foglio convocazione.
   I file si caricano in ordine (vedi index.html) e condividono le stesse variabili globali. */
/* ---------- Canvas: pagine PDF ---------- */
const W = 1188, H = 840, K = 2.5;
const INK = '#15202B', MUTED = '#5B6875', GRASS = '#2F6B45', G1 = '#E3EFE6', G2 = '#D8E9DD', RED = '#C8102E';
const LABEL_BG = '#EEF1F4', LINK_C = '#1A56C4', LINE_C = '#D5DDD8';
function cv(){ const c = document.createElement('canvas'); c.width = W*K; c.height = H*K; const x = c.getContext('2d'); x.scale(K,K); x.fillStyle='#fff'; x.fillRect(0,0,W,H); return [c,x]; }
function font(x, size, weight=600, cond=false){ x.font = `${weight} ${size}px ${cond?'"Barlow Condensed","Arial Narrow",Arial':'"Barlow",Arial'},sans-serif`; }
function T(x, s, px, py, o={}){
  font(x, o.size||14, o.weight||500, o.cond);
  x.fillStyle = o.color||INK; x.textAlign = o.align||'left'; x.textBaseline = o.base||'alphabetic';
  let str = String(s??'');
  if(o.max){ let sz = o.size||14; while(x.measureText(str).width > o.max && sz > 8){ sz -= .5; font(x, sz, o.weight||500, o.cond); } }
  if(o.halo){ x.lineWidth = o.halo; x.strokeStyle = '#fff'; x.lineJoin='round'; x.strokeText(str, px, py); }
  x.fillText(str, px, py);
}
function wrap(x, s, px, py, maxW, lh, o={}, maxLines=99){
  font(x, o.size||14, o.weight||500, o.cond);
  const words = String(s||'').split(/\s+/); let line = '', n = 0;
  for(const para of String(s||'').split('\n')){
    line = '';
    for(const w of para.split(/\s+/)){
      const test = line ? line+' '+w : w;
      if(x.measureText(test).width > maxW && line){ T(x,line,px,py+n*lh,o); n++; line = w; if(n>=maxLines) return n; }
      else line = test;
    }
    T(x,line,px,py+n*lh,o); n++; if(n>=maxLines) return n;
  }
  return n;
}
function header(x, title, sub, page, total){
  const s = S.sheet;
  T(x, title, 36, 70, {size:40, weight:700, cond:true, max:700});
  if(sub) T(x, sub, 36, 98, {size:17, weight:500, color:MUTED, max:700});
  const right = [s.opponent ? `${teamLabel()} contro ${s.opponent}` : teamLabel(),
    [fmtDate(s.date), s.time].filter(Boolean).join(' ore '), [luogoPartita(s).venue, s.category].filter(Boolean).join(', ')].filter(Boolean);
  right.forEach((r,i) => T(x, r, W-36, 52+i*22, {size:i?15:19, weight:i?500:700, align:'right', color:i?MUTED:INK, max:400}));
  x.fillStyle = INK; x.fillRect(36, 116, W-72, 3);
  x.fillStyle = GRASS; x.fillRect(36, 116, 90, 3);
  T(x, `${page} / ${total}`, W-36, H-18, {size:12, color:MUTED, align:'right'});
}
function disc(x, cx, cy, r, fill, label, o={}){
  x.beginPath(); x.arc(cx,cy,r,0,Math.PI*2);
  if(o.hollow){ x.fillStyle='#fff'; x.fill(); x.setLineDash([4,3]); x.lineWidth=2; x.strokeStyle=fill; x.stroke(); x.setLineDash([]); }
  else { x.fillStyle=fill; x.fill(); x.lineWidth=2.5; x.strokeStyle='#fff'; x.stroke(); }
  T(x, label, cx, cy+1, {size:o.size||r*1.05, weight:700, cond:true, align:'center', base:'middle', color:o.hollow?fill:'#fff'});
}
function drawShape(x, x1, y1, x2, y2, type, dashed){
  x.save();
  x.strokeStyle = RED; x.lineWidth = dashed?2.5:3; x.lineCap='round';
  if(dashed) x.setLineDash([10,8]);
  x.beginPath(); x.moveTo(x1,y1); x.lineTo(x2,y2); x.stroke();
  x.setLineDash([]);
  if(type==='arrow'){
    const ang = Math.atan2(y2-y1, x2-x1), len = 15;
    x.beginPath(); x.moveTo(x2,y2);
    x.lineTo(x2-len*Math.cos(ang-Math.PI/7), y2-len*Math.sin(ang-Math.PI/7));
    x.lineTo(x2-len*Math.cos(ang+Math.PI/7), y2-len*Math.sin(ang+Math.PI/7));
    x.closePath(); x.fillStyle = RED; x.fill();
  }
  x.restore();
}

function coverPage(total){
  const [c,x] = cv(); const s = S.sheet;
  header(x, 'Foglio gara', s.opponent ? `Distinta e formazione contro ${s.opponent}` : 'Distinta e formazione', 1, total);
  // Distinta
  const st = starters();
  const bench = s.bench.map(P).filter(Boolean);
  const rows = st.length + bench.length;
  const rh = Math.min(27, (H-150-60-60)/Math.max(rows,1));
  let y = 158;
  const row = (p, slot, isStarter) => {
    x.fillStyle = isStarter ? INK : GRASS;
    x.beginPath(); x.roundRect ? x.roundRect(36, y-rh*0.72, 36, rh*0.86, 5) : x.rect(36,y-rh*0.72,36,rh*0.86); x.fill();
    T(x, p ? (matchNum(p.id)||'–') : '–', 54, y-rh*0.29+1, {size:Math.min(18,rh*0.7), weight:700, cond:true, align:'center', base:'middle', color:'#fff'});
    T(x, p ? p.name : 'Da assegnare', 82, y-rh*0.29+1, {size:Math.min(17,rh*0.66), weight:p?600:500, color:p?INK:MUTED, base:'middle', max:250});
    const tag = p && (p.id===s.captain ? 'K' : p.id===s.vice ? 'VK' : '');
    if(tag){ x.fillStyle = '#E3A008'; x.beginPath(); x.arc(356, y-rh*0.29, 11, 0, 7); x.fill(); T(x, tag, 356, y-rh*0.29+1, {size:tag.length>1?10:13, weight:700, align:'center', base:'middle', color:INK}); }
    y += rh;
  };
  T(x, 'Titolari', 36, 146, {size:21, weight:700, cond:true}); y = 146 + rh + 4;
  st.forEach(({slot,p}) => row(p, slot, true));
  y += 18; T(x, 'Panchina', 36, y, {size:21, weight:700, cond:true}); y += rh + 4;
  if(bench.length) bench.forEach(p => row(p, null, false)); else T(x, 'Nessun giocatore in panchina', 36, y-8, {size:14, color:MUTED});
  // Campo
  const ph = H-150-52, pw = ph*68/105, px = 400 + (440-pw)/2 + 20, py = 146;
  for(let i=0;i<12;i++){ x.fillStyle = i%2?G2:G1; x.fillRect(px, py+i*ph/12, pw, ph/12+0.5); }
  x.strokeStyle = GRASS; x.lineWidth = 2; x.strokeRect(px,py,pw,ph);
  const m = pw/68;
  x.beginPath(); x.moveTo(px,py+ph/2); x.lineTo(px+pw,py+ph/2); x.stroke();
  x.beginPath(); x.arc(px+pw/2, py+ph/2, 9.15*m, 0, 7); x.stroke();
  [[py,1],[py+ph,-1]].forEach(([yy,d]) => {
    x.strokeRect(px+pw/2-20.16*m, d>0?yy:yy-16.5*m, 40.32*m, 16.5*m);
    x.strokeRect(px+pw/2-9.16*m, d>0?yy:yy-5.5*m, 18.32*m, 5.5*m);
  });
  (FORMATIONS[s.formation]||[]).forEach(([n,bx,by]) => {
    const {x:fx,y:fy} = effSlot(s, n, bx, by);
    const p = P(s.lineup[n]); const cx = px + fx/100*pw, cy = py + fy/100*ph;
    disc(x, cx, cy, 19, INK, p ? (matchNum(p.id)||n) : n, {hollow:!p, size:21});
    if(p){ T(x, surname(p.name), cx, cy+36, {size:14, weight:700, align:'center', halo:4, max:110}); }
    if(p && (p.id===s.captain||p.id===s.vice)){ const tg = p.id===s.captain?'K':'VK'; x.fillStyle='#E3A008'; x.beginPath(); x.arc(cx+17,cy-15,9,0,7); x.fill(); T(x,tg,cx+17,cy-14,{size:tg.length>1?8:11,weight:700,align:'center',base:'middle'}); }
  });
  // Colonna destra
  const rx = 890;
  T(x, 'Modulo', rx, 150, {size:15, weight:600, color:MUTED});
  T(x, s.formation, rx, 196, {size:50, weight:700, cond:true});
  let ry = 240;
  const cap = P(s.captain), vice = P(s.vice);
  if(cap){ const cn=matchNum(cap.id); T(x, 'Capitano', rx, ry, {size:14, color:MUTED}); T(x, `${cn?cn+' ':''}${cap.name}`, rx, ry+22, {size:19, weight:700, max:260}); ry += 52; }
  if(vice){ const vn=matchNum(vice.id); T(x, 'Vice capitano', rx, ry, {size:14, color:MUTED}); T(x, `${vn?vn+' ':''}${vice.name}`, rx, ry+22, {size:19, weight:700, max:260}); ry += 52; }
  const sel = s.selected.map(id => S.schemes.find(q => q.id===id)).filter(Boolean);
  if(sel.length){
    ry += 8; T(x, 'Calci piazzati', rx, ry, {size:21, weight:700, cond:true}); ry += 26;
    sel.forEach((q,i) => { if(ry > 600) return; T(x, `p. ${i+2}`, rx, ry, {size:13, color:MUTED}); T(x, q.name + (q.subtitle?`, ${q.subtitle}`:''), rx+42, ry, {size:15, weight:600, max:220}); ry += 22; });
  }
  if(s.notes){
    ry += 16; T(x, 'Note', rx, ry, {size:21, weight:700, cond:true}); ry += 24;
    wrap(x, s.notes, rx, ry, 262, 20, {size:15, weight:500}, Math.max(1, Math.floor((H-50-ry)/20)));
  }
  return c;
}

function schemePage(sc, page, total){
  const [c,x] = cv();
  header(x, sc.name, sc.subtitle, page, total);
  const fav = sc.side==='favore';
  // Campo
  const sx = 12, sy = sx*YS, ox = 36, oy = 140, fw = (VX1-VX0)*sx, fh = (VY1-VY0)*sy;
  const X = v => ox + (v-VX0)*sx, Y = v => oy + (v-VY0)*sy;
  x.save(); x.beginPath(); x.roundRect ? x.roundRect(ox, oy, fw, fh, 8) : x.rect(ox,oy,fw,fh); x.clip();
  for(let i=0;i<10;i++){ x.fillStyle = i%2?G2:G1; x.fillRect(ox, oy+i*fh/10, fw, fh/10+0.5); }
  x.restore();
  x.strokeStyle = GRASS; x.lineWidth = 2.5; x.lineCap='round';
  const L = (a,b,c2,d) => { x.beginPath(); x.moveTo(X(a),Y(b)); x.lineTo(X(c2),Y(d)); x.stroke(); };
  L(VX0,0,VX1,0); L(34,0,34,VY1);
  x.strokeRect(X(-20.16),Y(0),40.32*sx,16.5*sy);
  x.strokeRect(X(-9.16),Y(0),18.32*sx,5.5*sy);
  x.strokeRect(X(-3.66),Y(-2.2),7.32*sx,2.2*sy);
  const a = Math.acos(5.5/9.15);
  x.beginPath(); x.ellipse(X(0),Y(11),9.15*sx,9.15*sy,0, Math.PI/2 - a, Math.PI/2 + a); x.stroke();
  x.beginPath(); x.arc(X(0),Y(11),2.5,0,7); x.fillStyle=GRASS; x.fill();
  x.beginPath(); x.ellipse(X(34),Y(0),sx,sy,0,Math.PI/2,Math.PI); x.stroke();
  // pallone
  const ball = effBall(sc);
  const bx2 = X(ball.x), by2 = Y(ball.y), br = 1.15*sx;
  x.beginPath(); x.arc(bx2,by2,br,0,7); x.fillStyle='#fff'; x.fill(); x.lineWidth=2; x.strokeStyle=INK; x.stroke();
  x.beginPath(); for(let i=0;i<5;i++){ const an = -Math.PI/2 + i*2*Math.PI/5; x.lineTo(bx2+Math.cos(an)*br*.42, by2+Math.sin(an)*br*.42); } x.closePath(); x.fillStyle=INK; x.fill();
  // frecce e linee disegnate (schema condiviso + eventuali aggiunte del mister per questa partita)
  [...(sc.draw||[]), ...effDraw(sc)].forEach(d => drawShape(x, X(d.x1), Y(d.y1), X(d.x2), Y(d.y2), d.type, d.dashed));
  // segni
  [...(sc.marks||[]), ...effMarks(sc)].forEach(m => T(x, m.text, X(m.x), Y(m.y)+1, {size:24, weight:700, align:'center', base:'middle', color:RED}));
  // pedine
  const rm = roleMap(sc); const r = 1.75*sx; const eTok = effTokens(sc); const nl = nameLayout(eTok);
  eTok.forEach(t => {
    const {p} = tokenPlayer(sc, t); const col = tokColor(sc, t, rm);
    disc(x, X(t.x), Y(t.y), r, col, p ? (matchNum(p.id)||t.slot) : t.slot, {hollow:!p, size:21});
    if(t.tag) T(x, t.tag, X(t.x), Y(t.y)-r-7, {size:18, weight:700, align:'center', color:RED, halo:3});
    if(p){ const L2 = nl[t.id]; T(x, surname(p.name), X(t.x), Y(t.y)+r+(L2.low?29:14), {size:12.5, weight:700, align:'center', halo:3.5, max:Math.min(96, L2.span*sx-8)}); }
  });
  // nota e legenda sotto il campo
  let ny = oy + fh + 30;
  if(sc.note) { const n = wrap(x, sc.note, 36, ny, fw, 26, {size:22, weight:700, cond:true}, 3); ny += n*26 + 4; }
  if(sc.legend) T(x, sc.legend, 36, ny, {size:15, weight:500, color:MUTED, max:fw});
  // Pannello compiti
  const rx = 790, rw = W-36-rx;
  x.fillStyle = fav ? '#DDF0E2' : '#F8DDE1';
  x.beginPath(); x.roundRect ? x.roundRect(rx, 140, 110, 30, 15) : x.rect(rx,140,110,30); x.fill();
  T(x, fav ? 'A favore' : 'A sfavore', rx+55, 156, {size:17, weight:700, cond:true, align:'center', base:'middle', color:fav?'#1E5A36':'#8E0C22'});
  const groups = new Map();
  sc.tokens.forEach(t => { const k = (t.role||'').trim() || 'Altri'; if(!groups.has(k)) groups.set(k, []); groups.get(k).push(t); });
  const entries = [...groups.entries()].sort((a,b) => (a[0]==='Altri') - (b[0]==='Altri'));
  const lines = sc.tokens.length + entries.length*1.6;
  const lh = Math.min(26, (H-60-200)/Math.max(lines,1));
  let gy = 206;
  T(x, 'Compiti', rx, 198, {size:24, weight:700, cond:true});
  gy = 232;
  entries.forEach(([role, toks]) => {
    const col = rm.get(role) || INK;
    x.fillStyle = col; x.fillRect(rx, gy-lh*0.55, 5, lh*0.7);
    T(x, role, rx+13, gy, {size:Math.min(19,lh*0.8), weight:700, cond:true, max:rw-13});
    gy += lh;
    toks.slice().sort((a,b)=> (a.tag&&b.tag&&!isNaN(a.tag)&&!isNaN(b.tag)) ? a.tag-b.tag : a.slot-b.slot).forEach(t => {
      const {p, override} = tokenPlayer(sc, t);
      disc(x, rx+24, gy-lh*0.3, Math.min(11, lh*0.42), col, p ? (matchNum(p.id)||t.slot) : t.slot, {hollow:!p, size:Math.min(13, lh*0.5)});
      T(x, p ? p.name : `Ruolo ${t.slot} da assegnare`, rx+44, gy-lh*0.3+1, {size:Math.min(15.5, lh*0.62), weight:p?600:500, color:p?INK:MUTED, base:'middle', max:rw-60});
      if(t.tag) T(x, t.tag, W-36, gy-lh*0.3+1, {size:Math.min(14,lh*.55), weight:700, color:RED, align:'right', base:'middle'});
      gy += lh;
    });
    gy += lh*0.5;
  });
  return c;
}

function makePages(){
  const sel = S.sheet.selected.map(id => S.schemes.find(q => q.id===id)).filter(Boolean);
  const total = 1 + sel.length;
  return [coverPage(total), ...sel.map((q,i) => schemePage(q, i+2, total))];
}
let fontsReady = null;
function ensureFonts(){
  if(!fontsReady) fontsReady = Promise.all(['700 20px "Barlow Condensed"','600 20px "Barlow Condensed"','500 20px "Barlow"','600 20px "Barlow"','700 20px "Barlow"'].map(f => document.fonts.load(f).catch(()=>{}))).catch(()=>{});
  return fontsReady;
}
async function buildPreview(){
  await ensureFonts();
  const box = $('#pages'); if(!box) return;
  box.innerHTML = '';
  makePages().forEach((c,i) => { c.setAttribute('aria-label', `Pagina ${i+1}`); box.appendChild(c); });
}
function browserDownload(filename, blob){
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function exportBackup(){
  if(!db){ setStatus('Backup non disponibile'); return; }
  setStatus('Preparo il backup…');
  try{
    const paths = ['shared/teams', 'shared/schemes', ...S.teams.flatMap(t => ['roster/'+t.id, 'sheet/'+t.id, 'calendar/'+t.id, 'registro/'+t.id])];
    const docs = {};
    for(const p of paths){
      const snap = await db.doc(p).get();
      if(snap.exists) docs[p] = snap.data();
    }
    const blob = new Blob([JSON.stringify({exportedAt:new Date().toISOString(), docs}, null, 2)], {type:'application/json'});
    const filename = 'foglio-gara-backup-' + new Date().toISOString().slice(0,10) + '.json';
    if(downloads) await downloads.save({filename, data:blob});
    else browserDownload(filename, blob);
    setStatus('Backup pronto');
  }catch(e){ setStatus('Backup non riuscito'); }
}
const imgPromises = {};
function loadImg(src){
  if(!imgPromises[src]){
    imgPromises[src] = new Promise(res => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = () => res(null);
      img.src = src;
    });
  }
  return imgPromises[src];
}
const loadLogo = () => loadImg('casatese-logo.png');
function convocazionePage(logoImg, figcImg){
  const PW = 800, PH = 1131, PK = 2;
  const c = document.createElement('canvas'); c.width = PW*PK; c.height = PH*PK;
  const x = c.getContext('2d'); x.scale(PK,PK); x.fillStyle = '#fff'; x.fillRect(0,0,PW,PH);
  const s = S.sheet;
  const mx = 40, tw = PW - mx*2;
  let y = 30;
  const hh = 96, lw = 200, rw = 88;
  if(figcImg){ const fh = lw*figcImg.height/figcImg.width; x.drawImage(figcImg, mx, y+(hh-fh)/2, lw, fh); }
  if(logoImg) x.drawImage(logoImg, PW-mx-rw, y+(hh-rw)/2, rw, rw);
  const cx = (mx+lw + PW-mx-rw)/2, cmax = PW - 2*mx - lw - rw - 16;
  T(x, 'ACADEMY', cx, y+28, {size:26, weight:700, align:'center', max:cmax});
  T(x, 'CASATESE MERATE', cx, y+60, {size:30, weight:700, align:'center', max:cmax});
  T(x, (s.category || TEAM()?.category || teamLabel()).toUpperCase(), cx, y+88, {size:21, weight:700, align:'center', max:cmax});
  y += hh + 14;
  const cellRow = (label, value, lw, h, fs) => {
    x.fillStyle = LABEL_BG; x.fillRect(mx, y, lw, h);
    x.strokeStyle = LINE_C; x.lineWidth = 1; x.strokeRect(mx, y, lw, h); x.strokeRect(mx+lw, y, tw-lw, h);
    T(x, label, mx+10, y+h/2+1, {size:12, weight:700, base:'middle', color:INK});
    T(x, value||'—', mx+lw+10, y+h/2+1, {size:fs||13, weight:600, base:'middle', max:tw-lw-20});
  };
  const gara = s.home ? `${teamLabel()} - ${s.opponent||'Avversario'}` : `${s.opponent||'Avversario'} - ${teamLabel()}`;
  cellRow('GARA', gara, 130, 34); y += 34;
  const cols = [['IMPEGNO', s.convType||''], ['DATA', s.date?fmtDate(s.date):''], ['ORARIO RITROVO', defaultMeetTime(s)], ['ORARI PARTITA', s.time||'']];
  const cw = tw/4;
  cols.forEach(([l],i) => { x.fillStyle = LABEL_BG; x.fillRect(mx+i*cw, y, cw, 26); x.strokeStyle = LINE_C; x.strokeRect(mx+i*cw, y, cw, 26); T(x, l, mx+i*cw+cw/2, y+13+1, {size:10.5, weight:700, align:'center', base:'middle', color:INK, max:cw-8}); });
  y += 26;
  cols.forEach(([,v],i) => { x.strokeStyle = LINE_C; x.strokeRect(mx+i*cw, y, cw, 30); T(x, v||'—', mx+i*cw+cw/2, y+15+1, {size:12.5, weight:600, align:'center', base:'middle', max:cw-10}); });
  y += 30;
  // Campo di gioco (come nel calendario ufficiale / comunicato) e ritrovo, ciascuno col suo link a Google Maps
  c.mapsLinks = [];
  const linkRow = (label, testo, url) => {
    cellRow(label, url ? ' ' : testo, 180, 32);
    if(url){
      const lx = mx+180+10, hintW = 130, maxw = tw-180-20-hintW;
      T(x, testo, lx, y+16+1, {size:13, weight:600, base:'middle', color:LINK_C, max:maxw});
      const uw = Math.min(x.measureText(testo).width, maxw);
      x.strokeStyle = LINK_C; x.lineWidth = .8; x.beginPath(); x.moveTo(lx, y+24); x.lineTo(lx+uw, y+24); x.stroke();
      T(x, 'Apri in Google Maps ›', PW-mx-10, y+16+1, {size:10.5, weight:600, base:'middle', align:'right', color:LINK_C});
      c.mapsLinks.push({x:mx+180, y, w:tw-180, h:32, url, pw:PW, ph:PH});
    }
    y += 32;
  };
  const luogo = luogoPartita(s), ritrovo = (s.meetAddress||'').trim();
  linkRow('CAMPO DI GIOCO', testoLuogo(luogo), luogoUrl(luogo));
  linkRow('RITROVO', ritrovo || 'Al campo di gioco', ritrovo ? venueUrl(ritrovo) : '');
  cellRow('NOTE', s.convNotes, 180, 32); y += 32 + 22;
  const sorted = S.players.slice().sort((a,b)=>a.name.localeCompare(b.name,'it'));
  const statW = 74, nameW = tw - statW*5;
  x.fillStyle = INK; x.fillRect(mx, y, tw, 26);
  T(x, 'NOME E COGNOME', mx+10, y+13+1, {size:11, weight:700, base:'middle', color:'#fff'});
  CALLUP_STATUSES.forEach((st,i) => T(x, st, mx+nameW+i*statW+statW/2, y+13+1, {size:11, weight:700, align:'center', base:'middle', color:'#fff'}));
  y += 26;
  const rh = Math.min(28, Math.max(16, (PH - y - 40)/Math.max(sorted.length,1)));
  sorted.forEach((p,i) => {
    x.fillStyle = i%2 ? '#F7F7F5' : '#fff'; x.fillRect(mx, y, tw, rh);
    x.strokeStyle = LINE_C; x.strokeRect(mx, y, tw, rh);
    T(x, p.name, mx+10, y+rh/2+1, {size:Math.min(12,rh*0.5), weight:600, base:'middle', max:nameW-16});
    const cur = s.callup[p.id];
    CALLUP_STATUSES.forEach((cst,ci) => {
      x.strokeStyle = LINE_C; x.beginPath(); x.moveTo(mx+nameW+ci*statW, y); x.lineTo(mx+nameW+ci*statW, y+rh); x.stroke();
      if(cur===cst) T(x, 'X', mx+nameW+ci*statW+statW/2, y+rh/2+1, {size:Math.min(13,rh*0.55), weight:700, align:'center', base:'middle'});
    });
    y += rh;
  });
  y += 16;
  T(x, 'CON: convocato   NC: non convocato   INF: infortunato   SQL: squalificato   ND: non disponibile', mx, y, {size:10, color:MUTED, max:tw});
  return c;
}
async function downloadConvocazione(){
  if(!window.jspdf){ setStatus('Libreria PDF non caricata'); return; }
  setStatus('Creo la convocazione…');
  await ensureFonts();
  const [logoImg, figcImg] = await Promise.all([loadLogo(), loadImg('figc-sgs-logo.png')]);
  const page = convocazionePage(logoImg, figcImg);
  const doc = new window.jspdf.jsPDF({orientation:'portrait', unit:'mm', format:'a4', compress:true});
  doc.addImage(page.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, 210, 297);
  for(const ml of page.mapsLinks || []){ const kx = 210/ml.pw, ky = 297/ml.ph; doc.link(ml.x*kx, ml.y*ky, ml.w*kx, ml.h*ky, {url: ml.url}); }
  const s = S.sheet;
  const name = [fmtDate(s.date).replace(/\//g,'_'), s.opponent ? s.opponent.replace(/[^\w]+/g,'_').toUpperCase() : '', 'CONVOCAZIONE'].filter(Boolean).join('_') + '.pdf';
  try{
    if(downloads) await downloads.save({filename:name, data:doc.output('blob')});
    else browserDownload(name, doc.output('blob'));
    setStatus('Convocazione pronta');
  }catch(e){ setStatus(e && e.code==='declined' ? 'Download annullato' : 'Download non riuscito'); }
}
async function downloadPdf(){
  if(!window.jspdf){ setStatus('Libreria PDF non caricata'); return; }
  setStatus('Creo il PDF…');
  await ensureFonts();
  const pages = makePages();
  const doc = new window.jspdf.jsPDF({orientation:'landscape', unit:'mm', format:'a4', compress:true});
  pages.forEach((c,i) => { if(i) doc.addPage(); doc.addImage(c.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, 297, 210); });
  const s = S.sheet;
  const name = [fmtDate(s.date).replace(/\//g,'_'), s.opponent ? s.opponent.replace(/[^\w]+/g,'_').toUpperCase() : '', 'FOGLIO_GARA'].filter(Boolean).join('_') + '.pdf';
  try{
    if(downloads) await downloads.save({filename:name, data:doc.output('blob')});
    else browserDownload(name, doc.output('blob'));
    setStatus('PDF pronto');
  }catch(e){ setStatus(e && e.code==='declined' ? 'Download annullato' : 'Download non riuscito'); }
}
