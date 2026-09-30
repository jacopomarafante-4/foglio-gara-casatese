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
/* Impaginazione automatica (come la Modulistica): righe di un testo in una larghezza, grandezza che ci sta */
function righeTesto(x, s, maxW){
  const out = [];
  for(const para of String(s||'').split('\n')){
    let line = '';
    for(const w of para.split(/\s+/).filter(Boolean)){ const t = line ? line+' '+w : w; if(x.measureText(t).width > maxW && line){ out.push(line); line = w; } else line = t; }
    out.push(line);
  }
  return out;
}
/* Una riga lunga al massimo maxW: se non ci sta finisce con "…" (stessa grandezza delle altre righe) */
function taglia(x, s, maxW){ let t = String(s||''); if(x.measureText(t).width <= maxW) return t; while(t && x.measureText(t + '…').width > maxW) t = t.slice(0, -1); return t.trimEnd() + '…'; }
/* Testo in un riquadro (larghezza e altezza): scende di grandezza fino a `min`; se ancora non ci sta, l'ultima riga finisce con "…" */
function testoInRiquadro(x, s, px, py, maxW, maxH, o = {}){
  let size = o.size || 15, righe, lh;
  for(;;){ font(x, size, o.weight||500, o.cond); lh = size * 1.33; righe = righeTesto(x, s, maxW); if(righe.length * lh <= maxH || size <= (o.min||11)) break; size -= .5; }
  const n = Math.max(1, Math.floor(maxH / lh));
  if(righe.length > n){ righe = righe.slice(0, n); let u = righe[n-1]; while(u && x.measureText(u + '…').width > maxW) u = u.slice(0, -1); righe[n-1] = u.trimEnd() + '…'; }
  righe.forEach((r, i) => T(x, r, px, py + i*lh, {...o, size}));
  return righe.length * lh;
}
/* Categoria nelle intestazioni: si può togliere con la casella "Mostra la categoria" (sheet.senzaCategoria) */
const conCategoria = t => S.sheet.senzaCategoria ? '' : t;
function header(x, title, sub, page, total){
  const s = S.sheet;
  // Intestazione su fondo bianco: stemma, titolo e dati della partita; sotto la sottile striscia blu-oro-rosso del club
  let tx = 36;
  if(pdfLogo){ x.drawImage(pdfLogo, 32, 16, 72, 72); tx = 120; }
  T(x, title, tx, 58, {size:38, weight:700, cond:true, color:BLU_SCURO, max:560});
  if(sub) T(x, sub, tx, 86, {size:16, weight:500, color:MUTED, max:560});
  striscia(x, 0, 102, W, 3);
  const luogo = luogoPartita(s);
  const right = [s.opponent ? (s.home ? `${teamLabel()} – ${s.opponent}` : `${s.opponent} – ${teamLabel()}`) : teamLabel(),
    [fmtDate(s.date), s.time].filter(Boolean).join(' · ore '), [luogo.venue, conCategoria(s.category)].filter(Boolean).join(' · ')].filter(Boolean);
  right.forEach((r,i) => T(x, r, W-36, 40+i*24, {size:i?15:21, weight:i?500:700, align:'right', color:i?MUTED:INK, cond:!i, max:470}));
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
  x.strokeStyle = LINE_C; x.lineWidth = 1.5; rrect(x, rx-18, 128, W-36-(rx-18), H-128-48, 12); x.stroke();
  x.fillStyle = BLU; x.fillRect(rx-18, 128+12, 4, 56);
  T(x, 'Modulo', rx, 150, {size:15, weight:600, color:MUTED});
  T(x, s.formation, rx, 196, {size:50, weight:700, cond:true, color:BLU_SCURO});
  let ry = 240;
  const cap = P(s.captain), vice = P(s.vice);
  if(cap){ const cn=matchNum(cap.id); T(x, 'Capitano', rx, ry, {size:14, color:MUTED}); T(x, `${cn?cn+' ':''}${cap.name}`, rx, ry+22, {size:19, weight:700, max:260}); ry += 52; }
  if(vice){ const vn=matchNum(vice.id); T(x, 'Vice capitano', rx, ry, {size:14, color:MUTED}); T(x, `${vn?vn+' ':''}${vice.name}`, rx, ry+22, {size:19, weight:700, max:260}); ry += 52; }
  const sel = s.selected.map(schemaDa).filter(Boolean);
  const fondo = H - 62, largh = W - 36 - rx - 14;
  if(sel.length){
    ry += 8; T(x, 'Calci piazzati', rx, ry, {size:21, weight:700, cond:true, color:BLU_SCURO}); ry += 26;
    /* una sola grandezza per tutte le righe (la più grande con cui ci stanno), lasciando spazio alle note */
    const spazio = (s.notes ? fondo - 130 : fondo) - ry, testi = sel.map(q => q.name + (q.subtitle ? ` · ${q.subtitle}` : ''));
    let size = 15; font(x, size, 600);
    /* scende fino a 12,5 perché ci stiano tutte; oltre, le più lunghe finiscono con "…" */
    while(size > 12.5 && (testi.some(t => x.measureText(t).width > largh - 42) || sel.length * size * 1.45 > spazio)){ size -= .5; font(x, size, 600); }
    const lh = size * 1.45, quante = Math.max(1, Math.min(sel.length, Math.floor(spazio / lh)));
    sel.slice(0, quante).forEach((q, i) => {
      const altri = i === quante - 1 && quante < sel.length ? sel.length - quante + 1 : 0;
      T(x, `p. ${i+2}`, rx, ry, {size: Math.min(13, size), color:MUTED});
      font(x, size, 600);
      if(altri) T(x, taglia(x, `e altri ${altri} schemi (pagine seguenti)`, largh-42), rx+42, ry, {size, weight:600, color:MUTED});
      else T(x, taglia(x, testi[i], largh-42), rx+42, ry, {size, weight:600});
      ry += lh;
    });
  }
  if(s.notes){
    ry += 16; T(x, 'Note', rx, ry, {size:21, weight:700, cond:true, color:BLU_SCURO}); ry += 24;
    testoInRiquadro(x, s.notes, rx, ry, largh, fondo - ry, {size:15, min:11, weight:500});
  }
  return c;
}

function schemePage(sc, page, total){
  const [c,x] = cv();
  header(x, sc.name, sc.subtitle, page, total);
  const fav = sc.side==='favore';
  // Campo: grande quanto possibile, lasciando sotto lo spazio per la nota (fino a 3 righe)
  const larghSx = 720, oy = 140;
  font(x, 22, 700, true);
  const nota = effNote(sc);
  const righeNota = nota ? Math.min(3, righeTesto(x, nota, larghSx).length) : 0, notaH = righeNota ? righeNota * 26 + 14 : 0;
  const sx = Math.min(12, larghSx / (VX1-VX0), (H - 44 - oy - notaH) / ((VY1-VY0)*YS)), sy = sx*YS;
  const fw = (VX1-VX0)*sx, fh = (VY1-VY0)*sy, ox = 36 + (larghSx - fw) / 2;
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
  // nota sotto il campo (al massimo 3 righe, poi "…")
  if(nota) testoInRiquadro(x, nota, 36, oy + fh + 30, larghSx, H - 40 - (oy + fh + 22), {size:22, min:16, weight:700, cond:true});
  // Pannello compiti, in un riquadro
  const rx = 790, rw = W-36-rx;
  x.strokeStyle = LINE_C; x.lineWidth = 1.5; rrect(x, rx-16, 128, rw+16, H-128-48, 12); x.stroke();
  x.fillStyle = fav ? '#DDF0E2' : '#F8DDE1';
  x.beginPath(); x.roundRect ? x.roundRect(rx, 140, 110, 30, 15) : x.rect(rx,140,110,30); x.fill();
  T(x, fav ? 'A favore' : 'A sfavore', rx+55, 156, {size:17, weight:700, cond:true, align:'center', base:'middle', color:fav?'#1E5A36':'#8E0C22'});
  const groups = new Map();
  eTok.forEach(t => { const k = (t.role||'').trim() || 'Altri'; if(!groups.has(k)) groups.set(k, []); groups.get(k).push(t); });
  const entries = [...groups.entries()].sort((a,b) => (a[0]==='Altri') - (b[0]==='Altri'));
  const lines = eTok.length + entries.length*1.6;
  const lh = Math.min(26, (H-60-200-(sc.legend ? 50 : 0))/Math.max(lines,1));   // spazio per la legenda in fondo
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
  // legenda in fondo al riquadro dei compiti
  if(sc.legend) testoInRiquadro(x, sc.legend, rx, H - 88, rw - 8, 36, {size:13, min:10, weight:500, color:MUTED});
  return c;
}

function makePages(){
  const sel = S.sheet.selected.map(schemaDa).filter(Boolean);
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
/* Consegna di un PDF: lo scarica e ne lascia una copia nell'Archivio di admin e direttori (0039).
   L'archiviazione non blocca lo scaricamento: se non riesce (rete, migrazione mancante) il file c'è comunque. */
async function consegnaPdf(nome, blob, tipo){
  if(downloads) await downloads.save({filename: nome, data: blob}); else browserDownload(nome, blob);
  archiviaDocumento(nome, blob, tipo);
}
async function archiviaDocumento(nome, blob, tipo){
  if(!supabaseClient || RUNNING_IN_CLAUDE) return;
  try{
    const b64 = await new Promise((ok, ko) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1]); r.onerror = ko; r.readAsDataURL(blob); });
    const { error } = await supabaseClient.rpc('archivia_documento', {p_pin: coachPin || null, p_nome: nome, p_tipo: tipo, p_squadra_id: curTeam || null, p_dati: b64});
    if(error && error.code !== 'PGRST202') console.warn('Archivio:', error.message);
  }catch(e){}
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
/* Intestazione della società (convocazione e comunicazione): logo FIGC-SGS a sinistra, ACADEMY / CASATESE MERATE /
   categoria al centro, stemma a destra. Disegna da y e restituisce l'altezza usata (96). */
function intestazioneSocieta(x, PW, mx, y, logoImg, figcImg, categoria){
  const hh = 96, lw = 200, rw = 88;
  if(figcImg){ const fh = lw*figcImg.height/figcImg.width; x.drawImage(figcImg, mx, y+(hh-fh)/2, lw, fh); }
  if(logoImg) x.drawImage(logoImg, PW-mx-rw, y+(hh-rw)/2, rw, rw);
  const cx = (mx+lw + PW-mx-rw)/2, cmax = PW - 2*mx - lw - rw - 16;
  T(x, 'ACADEMY', cx, y+(categoria ? 28 : 38), {size:26, weight:700, align:'center', max:cmax});
  T(x, 'CASATESE MERATE', cx, y+(categoria ? 60 : 72), {size:30, weight:700, align:'center', max:cmax});
  if(categoria) T(x, categoria.toUpperCase(), cx, y+88, {size:21, weight:700, align:'center', max:cmax});
  return hh;
}
/* La stessa intestazione come immagine (per i PDF di testo, es. la comunicazione): larga 800, alta 126 */
function immagineIntestazione(logoImg, figcImg, categoria){
  const PW = 800, PH = 126, PK = 3;
  const c = document.createElement('canvas'); c.width = PW*PK; c.height = PH*PK;
  const x = c.getContext('2d'); x.scale(PK,PK); x.fillStyle = '#fff'; x.fillRect(0,0,PW,PH);
  intestazioneSocieta(x, PW, 40, 30, logoImg, figcImg, categoria);
  return c;
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
    await consegnaPdf(name, doc.output('blob'), 'Foglio gara');
    setStatus('PDF pronto');
  }catch(e){ setStatus(e && e.code==='declined' ? 'Download annullato' : 'Download non riuscito'); }
}
