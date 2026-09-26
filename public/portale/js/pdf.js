/* Portale Academy Casatese Merate · Pagine PDF disegnate su canvas: foglio gara e foglio convocazione.
   I file si caricano in ordine (vedi index.html) e condividono le stesse variabili globali. */
/* ---------- Canvas: pagine PDF ---------- */
const W = 1188, H = 840, K = 2.5;
const INK = '#15202B', MUTED = '#5B6875', GRASS = '#2F6B45', G1 = '#E3EFE6', G2 = '#D8E9DD', RED = '#C8102E';
const LABEL_BG = '#EEF1F4', LINK_C = '#1A56C4', LINE_C = '#D5DDD8';
/* Colori del club (come app/globals.css e la striscia dell'app) */
const BLU = '#003DA5', BLU_SCURO = '#002A73', ORO = '#D4AF37', ROSSO_CLUB = '#C41E3A', CARTA = '#F3F6FA';
let pdfLogo = null;   // logo del club, caricato prima di disegnare le pagine (loadLogo)
function rrect(x, px, py, w, h, r){ x.beginPath(); if(x.roundRect) x.roundRect(px, py, w, h, r); else x.rect(px, py, w, h); }
function striscia(x, px, py, w, h){
  x.fillStyle = BLU; x.fillRect(px, py, w*6/9, h);
  x.fillStyle = ORO; x.fillRect(px + w*6/9, py, w/9, h);
  x.fillStyle = ROSSO_CLUB; x.fillRect(px + w*7/9, py, w*2/9, h);
}
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
  // Fascia blu con logo, titolo e dati della partita; sotto la striscia blu-oro-rosso
  x.fillStyle = BLU_SCURO; x.fillRect(0, 0, W, 104);
  striscia(x, 0, 104, W, 7);
  let tx = 36;
  if(pdfLogo){
    x.fillStyle = '#fff'; rrect(x, 30, 14, 76, 76, 14); x.fill();
    x.drawImage(pdfLogo, 36, 20, 64, 64);
    tx = 124;
  }
  T(x, title, tx, 58, {size:38, weight:700, cond:true, color:'#fff', max:560});
  if(sub) T(x, sub, tx, 86, {size:16, weight:500, color:'#C9D6EE', max:560});
  const luogo = luogoPartita(s);
  const right = [s.opponent ? (s.home ? `${teamLabel()} – ${s.opponent}` : `${s.opponent} – ${teamLabel()}`) : teamLabel(),
    [fmtDate(s.date), s.time].filter(Boolean).join(' · ore '), [luogo.venue, s.category].filter(Boolean).join(' · ')].filter(Boolean);
  right.forEach((r,i) => T(x, r, W-36, 40+i*24, {size:i?15:21, weight:i?500:700, align:'right', color:i?'#C9D6EE':'#fff', cond:!i, max:470}));
  // Piè di pagina
  x.fillStyle = LINE_C; x.fillRect(36, H-26, W-72, 1);
  T(x, 'Academy Casatese Merate · Foglio gara', 36, H-9, {size:12, weight:600, color:MUTED});
  T(x, `${page} / ${total}`, W-36, H-9, {size:12, color:MUTED, align:'right'});
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
  let zebra = 0;
  const row = (p, slot, isStarter) => {
    if(zebra++ % 2 === 0){ x.fillStyle = CARTA; rrect(x, 30, y-rh*0.8, 350, rh, 6); x.fill(); }
    x.fillStyle = isStarter ? BLU_SCURO : GRASS;
    x.beginPath(); x.roundRect ? x.roundRect(36, y-rh*0.72, 36, rh*0.86, 5) : x.rect(36,y-rh*0.72,36,rh*0.86); x.fill();
    T(x, p ? (matchNum(p.id)||'–') : '–', 54, y-rh*0.29+1, {size:Math.min(18,rh*0.7), weight:700, cond:true, align:'center', base:'middle', color:'#fff'});
    T(x, p ? p.name : 'Da assegnare', 82, y-rh*0.29+1, {size:Math.min(17,rh*0.66), weight:p?600:500, color:p?INK:MUTED, base:'middle', max:250});
    const tag = p && (p.id===s.captain ? 'K' : p.id===s.vice ? 'VK' : '');
    if(tag){ x.fillStyle = '#E3A008'; x.beginPath(); x.arc(356, y-rh*0.29, 11, 0, 7); x.fill(); T(x, tag, 356, y-rh*0.29+1, {size:tag.length>1?10:13, weight:700, align:'center', base:'middle', color:INK}); }
    y += rh;
  };
  T(x, 'Titolari', 36, 146, {size:21, weight:700, cond:true, color:BLU_SCURO}); y = 146 + rh + 4;
  st.forEach(({slot,p}) => row(p, slot, true));
  y += 18; zebra = 0; T(x, 'Panchina', 36, y, {size:21, weight:700, cond:true, color:BLU_SCURO}); y += rh + 4;
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
  // Colonna destra, in un riquadro
  const rx = 890;
  x.fillStyle = CARTA; rrect(x, rx-18, 128, W-36-(rx-18), H-128-48, 12); x.fill();
  x.fillStyle = BLU; x.fillRect(rx-18, 128+12, 4, 56);
  T(x, 'Modulo', rx, 150, {size:15, weight:600, color:MUTED});
  T(x, s.formation, rx, 196, {size:50, weight:700, cond:true, color:BLU_SCURO});
  let ry = 240;
  const cap = P(s.captain), vice = P(s.vice);
  if(cap){ const cn=matchNum(cap.id); T(x, 'Capitano', rx, ry, {size:14, color:MUTED}); T(x, `${cn?cn+' ':''}${cap.name}`, rx, ry+22, {size:19, weight:700, max:260}); ry += 52; }
  if(vice){ const vn=matchNum(vice.id); T(x, 'Vice capitano', rx, ry, {size:14, color:MUTED}); T(x, `${vn?vn+' ':''}${vice.name}`, rx, ry+22, {size:19, weight:700, max:260}); ry += 52; }
  const sel = s.selected.map(id => S.schemes.find(q => q.id===id)).filter(Boolean);
  if(sel.length){
    ry += 8; T(x, 'Calci piazzati', rx, ry, {size:21, weight:700, cond:true, color:BLU_SCURO}); ry += 26;
    sel.forEach((q,i) => { if(ry > 600) return; T(x, `p. ${i+2}`, rx, ry, {size:13, color:MUTED}); T(x, q.name + (q.subtitle?`, ${q.subtitle}`:''), rx+42, ry, {size:15, weight:600, max:220}); ry += 22; });
  }
  if(s.notes){
    ry += 16; T(x, 'Note', rx, ry, {size:21, weight:700, cond:true, color:BLU_SCURO}); ry += 24;
    wrap(x, s.notes, rx, ry, 262, 20, {size:15, weight:500}, Math.max(1, Math.floor((H-60-ry)/20)));
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
    // sul campo solo il numero: numero e cognome sono nell'elenco dei compiti a destra
  });
  // nota e legenda sotto il campo
  let ny = oy + fh + 30;
  if(sc.note) { const n = wrap(x, sc.note, 36, ny, fw, 26, {size:22, weight:700, cond:true}, 3); ny += n*26 + 4; }
  if(sc.legend) T(x, sc.legend, 36, ny, {size:15, weight:500, color:MUTED, max:fw});
  // Pannello compiti, in un riquadro
  const rx = 790, rw = W-36-rx;
  x.fillStyle = CARTA; rrect(x, rx-16, 128, rw+16, H-128-48, 12); x.fill();
  x.fillStyle = fav ? '#DDF0E2' : '#F8DDE1';
  x.beginPath(); x.roundRect ? x.roundRect(rx, 140, 110, 30, 15) : x.rect(rx,140,110,30); x.fill();
  T(x, fav ? 'A favore' : 'A sfavore', rx+55, 156, {size:17, weight:700, cond:true, align:'center', base:'middle', color:fav?'#1E5A36':'#8E0C22'});
  const groups = new Map();
  eTok.forEach(t => { const k = (t.role||'').trim() || 'Altri'; if(!groups.has(k)) groups.set(k, []); groups.get(k).push(t); });
  const entries = [...groups.entries()].sort((a,b) => (a[0]==='Altri') - (b[0]==='Altri'));
  const lines = eTok.length + entries.length*1.6;
  const lh = Math.min(26, (H-60-200)/Math.max(lines,1));
  let gy = 206;
  T(x, 'Compiti', rx, 198, {size:24, weight:700, cond:true, color:BLU_SCURO});
  gy = 232;
  entries.forEach(([role, toks]) => {
    const col = rm.get(role) || INK;
    x.fillStyle = col; x.fillRect(rx, gy-lh*0.55, 5, lh*0.7);
    T(x, role, rx+13, gy, {size:Math.min(19,lh*0.8), weight:700, cond:true, max:rw-13});
    gy += lh;
    toks.slice().sort((a,b)=> (a.tag&&b.tag&&!isNaN(a.tag)&&!isNaN(b.tag)) ? a.tag-b.tag : a.slot-b.slot).forEach(t => {
      const {p, override} = tokenPlayer(sc, t);
      disc(x, rx+24, gy-lh*0.3, Math.min(11, lh*0.42), col, p ? (matchNum(p.id)||t.slot) : t.slot, {hollow:!p, size:Math.min(13, lh*0.5)});
      T(x, p ? surname(p.name) + (override ? ' *' : '') : `Ruolo ${t.slot} da assegnare`, rx+44, gy-lh*0.3+1, {size:Math.min(15.5, lh*0.62), weight:p?600:500, color:p?INK:MUTED, base:'middle', max:rw-60});
      if(t.tag) T(x, t.tag, W-52, gy-lh*0.3+1, {size:Math.min(14,lh*.55), weight:700, color:RED, align:'right', base:'middle'});
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
  pdfLogo = await loadLogo();
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
/* Convocazione dell'attività di base (da Under 13 in giù), come il modello della società:
   CONVOCAZIONE · società · categoria, poi Data, Indirizzo, Inizio gara, Ritrovo, Avversario, Mister presente, Note
   e l'elenco dei soli convocati (su due colonne se sono tanti). */
function convocazioneAdbPage(logoImg, figcImg, p, n = 1, tot = 1){
  const PW = 800, PH = 1131, PK = 2;
  const c = document.createElement('canvas'); c.width = PW*PK; c.height = PH*PK;
  const x = c.getContext('2d'); x.scale(PK,PK); x.fillStyle = '#fff'; x.fillRect(0,0,PW,PH);
  const s = S.sheet;
  const mx = 40, tw = PW - mx*2;
  let y = 30;
  const hh = 110, lw = 200, rw = 96;
  if(figcImg){ const fh = lw*figcImg.height/figcImg.width; x.drawImage(figcImg, mx, y+(hh-fh)/2, lw, fh); }
  if(logoImg) x.drawImage(logoImg, PW-mx-rw, y+(hh-rw)/2, rw, rw);
  const cx = (mx+lw + PW-mx-rw)/2, cmax = PW - 2*mx - lw - rw - 16;
  T(x, 'CONVOCAZIONE', cx, y+34, {size:32, weight:700, align:'center', max:cmax});
  T(x, 'ACADEMY CASATESE MERATE', cx, y+66, {size:18, weight:700, align:'center', max:cmax, color:BLU_SCURO});
  T(x, String(TEAM()?.category || s.category || '').replace(/\s*-\s*attività di base/i, '').toUpperCase() + (tot > 1 ? ` · PARTITA ${n} DI ${tot}` : ''), cx, y+96, {size:22, weight:700, align:'center', max:cmax});
  y += hh + 10;
  striscia(x, mx, y, tw, 5); y += 18;

  const lwc = 180;
  c.mapsLinks = [];
  const riga = (label, valore, o = {}) => {
    const righe = o.aCapo ? spezza(valore, tw - lwc - 20, o.max || 4) : [valore || '—'];
    const h = Math.max(38, righe.length * 18 + 18);
    x.fillStyle = LABEL_BG; x.fillRect(mx, y, lwc, h);
    x.strokeStyle = LINE_C; x.lineWidth = 1; x.strokeRect(mx, y, lwc, h); x.strokeRect(mx+lwc, y, tw-lwc, h);
    T(x, label, mx+12, y+h/2+1, {size:13, weight:700, base:'middle', color:INK});
    righe.forEach((r, i) => T(x, r || '—', mx+lwc+12, y + 9 + 18*i + 9 + 1, {size:14, weight:600, base:'middle', color:o.url ? LINK_C : INK, max:tw-lwc-24}));
    if(o.url){ c.mapsLinks.push({x:mx+lwc, y, w:tw-lwc, h, url:o.url, pw:PW, ph:PH}); T(x, 'Apri in Google Maps ›', PW-mx-10, y+h-9, {size:10, weight:600, align:'right', color:LINK_C}); }
    y += h;
  };
  // Testo su più righe, senza uscire dal riquadro
  function spezza(testo, larg, maxRighe){
    font(x, 14, 600);
    const out = [];
    for(const para of String(testo || '').split('\n')){
      let line = '';
      for(const w of para.split(/\s+/).filter(Boolean)){ const p = line ? line + ' ' + w : w; if(x.measureText(p).width > larg && line){ out.push(line); line = w; } else line = p; }
      out.push(line);
    }
    while(out.length > 1 && !out[out.length-1]) out.pop();
    if(out.length > maxRighe){ out.length = maxRighe; out[maxRighe-1] = out[maxRighe-1].replace(/\s*\S*$/, '') + ' …'; }
    return out;
  }
  // Dati della partita: dal calendario, se collegata (campo aggiornato dai comunicati), se no quelli scritti
  const m = p.calId ? allCalendar().find(q => q.id === p.calId) : null;
  const luogo = m && m.venue ? {venue: m.venue, address: m.address||'', ll: m.ll||''} : {venue: p.venue||'', address: p.address||'', ll: p.ll||''};
  const ritrovo = (p.meetAddress||'').trim();
  riga('Data', p.date ? `${weekday(p.date)} ${fmtDate(p.date)}` : '');
  riga('Indirizzo', testoLuogo(luogo), {aCapo:true, max:2, url:luogoUrl(luogo)});
  if(ritrovo) riga('Ritrovo presso', ritrovo, {aCapo:true, max:2, url:venueUrl(ritrovo)});
  riga('Inizio gara ore', p.time || '');
  riga('Ritrovo ore', p.meetTime || minus75(p.time) || '');
  riga('Avversario', p.opponent ? `${p.opponent}${p.home ? ' (in casa)' : ' (in trasferta)'}` : '');
  riga('Mister presente', p.mr || coachNames(TEAM()) || '');
  riga('Note', p.note, {aCapo:true, max:6});
  y += 22;

  // Convocati: solo i nomi, in ordine alfabetico; due colonne se sono più di 10
  const conv = S.players.filter(g => (p.conv||[]).includes(g.id)).sort((a,b)=>a.name.localeCompare(b.name,'it'));
  x.fillStyle = BLU_SCURO; x.fillRect(mx, y, tw, 34);
  T(x, `CONVOCATI (${conv.length})`, mx+12, y+17+1, {size:15, weight:700, base:'middle', color:'#fff'});
  y += 34;
  const colonne = conv.length > 10 ? 2 : 1, perCol = Math.ceil(conv.length / colonne) || 1;
  const rh = Math.min(34, Math.max(20, (PH - y - 50) / perCol)), cw = tw / colonne;
  for(let i = 0; i < perCol; i++){
    for(let k = 0; k < colonne; k++){
      const g = conv[k*perCol + i]; const px = mx + k*cw;
      x.fillStyle = i%2 ? '#F7F7F5' : '#fff'; x.fillRect(px, y, cw, rh);
      x.strokeStyle = LINE_C; x.strokeRect(px, y, cw, rh);
      if(g){ T(x, String(k*perCol + i + 1), px+22, y+rh/2+1, {size:12, weight:700, align:'center', base:'middle', color:MUTED}); T(x, g.name, px+44, y+rh/2+1, {size:Math.min(15, rh*0.52), weight:600, base:'middle', max:cw-56}); }
    }
    y += rh;
  }
  if(!conv.length) T(x, 'Nessun giocatore convocato per questa partita.', mx+12, y+20, {size:13, color:MUTED});
  return c;
}
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
  // Note: vanno a capo e la riga cresce quanto serve (al massimo 8 righe), senza uscire dal riquadro
  {
    const lw = 180, maxW = tw - lw - 20, lh = 17;
    font(x, 12.5, 600);
    const righe = [];
    for(const para of String(s.convNotes || '').split('\n')){
      let line = '';
      for(const w of para.split(/\s+/).filter(Boolean)){
        const prova = line ? line + ' ' + w : w;
        if(x.measureText(prova).width > maxW && line){ righe.push(line); line = w; } else line = prova;
      }
      righe.push(line);
    }
    while(righe.length > 1 && !righe[righe.length-1]) righe.pop();
    const vis = righe.slice(0, 8);
    if(righe.length > 8) vis[7] = vis[7].replace(/\s*\S*$/, '') + ' …';
    const h = Math.max(32, vis.length * lh + 14);
    x.fillStyle = LABEL_BG; x.fillRect(mx, y, lw, h);
    x.strokeStyle = LINE_C; x.lineWidth = 1; x.strokeRect(mx, y, lw, h); x.strokeRect(mx+lw, y, tw-lw, h);
    T(x, 'NOTE', mx+10, y+h/2+1, {size:12, weight:700, base:'middle', color:INK});
    if(!vis.join('').trim()) T(x, '—', mx+lw+10, y+h/2+1, {size:13, weight:600, base:'middle'});
    else vis.forEach((r, i) => T(x, r, mx+lw+10, y + 7 + lh*i + lh/2 + 1, {size:12.5, weight:600, base:'middle'}));
    y += h + 22;
  }
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
  // Attività di base: una pagina per partita; agonistica: una pagina
  const pp = isAdb() ? partiteAdb() : null;
  const pages = pp ? pp.map((p, i) => convocazioneAdbPage(logoImg, figcImg, p, i + 1, pp.length)) : [convocazionePage(logoImg, figcImg)];
  const doc = new window.jspdf.jsPDF({orientation:'portrait', unit:'mm', format:'a4', compress:true});
  pages.forEach((page, i) => {
    if(i) doc.addPage();
    doc.addImage(page.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, 210, 297);
    for(const ml of page.mapsLinks || []){ const kx = 210/ml.pw, ky = 297/ml.ph; doc.link(ml.x*kx, ml.y*ky, ml.w*kx, ml.h*ky, {url: ml.url}); }
  });
  const s = pp && pp[0] ? pp[0] : S.sheet;
  const name = [fmtDate(s.date).replace(/\//g,'_'), (pp && pp.length > 1) ? `${pp.length}_PARTITE` : (s.opponent ? s.opponent.replace(/[^\w]+/g,'_').toUpperCase() : ''), 'CONVOCAZIONE'].filter(Boolean).join('_') + '.pdf';
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
  pdfLogo = await loadLogo();
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
