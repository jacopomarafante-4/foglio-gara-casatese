/* Portale Academy Casatese Merate · Eventi (tocchi, digitazione, trascinamento) e avvio dell'app.
   I file si caricano in ordine (vedi index.html) e condividono le stesse variabili globali. */
/* ---------- Eventi ---------- */
document.addEventListener('click', e => {
  const t = e.target.closest('button, [data-drop-slot], [data-drop-token], [data-move-token]');
  if(!t) return;
  if(t.dataset.tab){ goTab(t.dataset.tab); return; }
  if(t.dataset.area){ const a = AREAS.find(x => x.k===t.dataset.area); if(a){ const ok = tabsDi(a); goTab(ok.includes(areaLast[a.k]) ? areaLast[a.k] : ok[0]); } return; }
  /* Scelta del giocatore per una posizione toccata sul campo. Il telefono manda un "clic" subito dopo il tocco
     che ha aperto l'elenco: se arriva nel primo mezzo secondo lo ignoriamo (chiuderebbe o sceglierebbe per sbaglio) */
  if((t.dataset.pickplayer || t.dataset.pickclear !== undefined || t.dataset.pickclose !== undefined) && Date.now() - slotPickAt < 450) return;
  if(t.dataset.pickplayer){ if(slotPick != null) assignSlot(slotPick, t.dataset.pickplayer); impostaSlotPick(null); render(); return; }
  if(t.dataset.pickclear !== undefined){ if(slotPick != null){ delete S.sheet.lineup[slotPick]; save('sheet'); } impostaSlotPick(null); render(); return; }
  if(t.dataset.pickclose !== undefined){ impostaSlotPick(null); render(); return; }
  if(t.dataset.player !== undefined) return; // gestito dal drag
  const act = t.dataset.act;
  const ADMIN_ONLY = ['caladd'];
  if(!isAdmin() && (ADMIN_ONLY.includes(act) || t.dataset.pdel || t.dataset.up || t.dataset.down || t.dataset.caldel)) return;
  /* Società → Squadre (squadre, mister, PIN, scout, direttori, segreteria, backup): nell'app dalla tappa 3, /societa/squadre */
  if(t.dataset.caldel){ S.calendar = S.calendar.filter(m=>m.id!==t.dataset.caldel); save('calendar'); render(); return; }
  /* Convocazioni dell'attività di base */
  if(t.dataset.clearSlot){ e.stopPropagation(); delete S.sheet.lineup[t.dataset.clearSlot]; save('sheet'); render(); return; }
  if(t.dataset.dropSlot){ if(selectedPlayer){ assignSlot(t.dataset.dropSlot, selectedPlayer); impostaSelectedPlayer(null); render(); } return; }
  if(t.dataset.dropToken){
    if(selectedPlayer){ const ov = S.sheet.overrides[openSchemeId] ||= {}; ov[t.dataset.dropToken]=selectedPlayer; impostaSelectedPlayer(null); save('sheet'); render(); }
    else { const sel = document.querySelector(`[data-atok="${t.dataset.dropToken}"]`); if(sel){ sel.scrollIntoView({block:'nearest', behavior:'smooth'}); sel.focus(); sel.showPicker?.(); } }
    return;
  }
  if(t.dataset.bench){ const id=t.dataset.bench; const b=S.sheet.bench; S.sheet.bench = b.includes(id) ? b.filter(x=>x!==id) : [...b,id]; save('sheet'); render(); return; }
  if(t.dataset.schemecard){ const id=t.dataset.schemecard; const order=[...mieiSchemi(), ...S.schemes].map(q=>q.id); let s=S.sheet.selected.filter(i=>i!==id); if(!S.sheet.selected.includes(id)) s.push(id); S.sheet.selected = s.sort((a,b)=>order.indexOf(a)-order.indexOf(b)); save('sheet'); render(); return; }
  if(t.dataset.open){ impostaOpenSchemeId(t.dataset.open); impostaBoardMode(modificaBase(schemaDa(openSchemeId)) ? 'unico' : 'assign'); impostaSelectedToken(null); impostaDrawTool(null); impostaSelectedDraw(null); render(); window.scrollTo(0,0); return; }
  if(t.dataset.up || t.dataset.down){ const i=+(t.dataset.up??t.dataset.down), j=t.dataset.up!==undefined?i-1:i+1; if(j<0||j>=S.schemes.length) return; [S.schemes[i],S.schemes[j]]=[S.schemes[j],S.schemes[i]]; const order=S.schemes.map(q=>q.id); S.sheet.selected.sort((a,b)=>order.indexOf(a)-order.indexOf(b)); save('schemes'); save('sheet'); render(); return; }
  const sc = schemaDa(openSchemeId);
  switch(act){
    case 'caladd': S.calendar.push({id:uid('m'), date:'', time:'', opponent:'', venue:'', home:false}); save('calendar'); render(); break;
    case 'back': impostaOpenSchemeId(null); impostaSelectedToken(null); impostaBoardMode('assign'); impostaDrawTool(null); impostaSelectedDraw(null); render(); break;
    case 'resetov': if(sc){ delete S.sheet.overrides[sc.id]; save('sheet'); render(); } break;
    case 'resetslotpos': S.sheet.slotPos = {}; save('sheet'); render(); break;
    case 'refresh': buildPreview(); break;
    case 'download': downloadPdf(); break;
    case 'gatesubmit': {
      const val = ($('#gatepin')?.value || '').trim();
      if(secureMode){
        setStatus('Accesso…');
        coachLogin(val).then(ok => { impostaGateError(!ok); setStatus(ok ? 'Sincronizzato' : ''); if(!ok) render(); });
        break;
      }
      const tm = S.teams.find(x => (x.code||'') === val);
      if(tm){ impostaGateError(false); location.hash = 'squadra=' + tm.code; resolveAccess(); subscribeTeam(); break; }
      impostaGateError(true); render();
      break; }
    case 'adminlogin': adminLogin($('#gatepass')?.value || ''); break;
    case 'gateadmin': impostaAdminUnlocked(true); impostaGateError(false); try{ localStorage.setItem('fg:adminpin','ok'); }catch(e){} render(); break;
    case 'gateback': impostaAdminUnlocked(false); impostaGateError(false); try{ localStorage.removeItem('fg:adminpin'); }catch(e){} render(); break;
    case 'logout': logout(); break;
  }
});
document.addEventListener('keydown', e => {
  if(e.key === 'Escape' && slotPick != null){ impostaSlotPick(null); render(); return; }
  if(e.key !== 'Enter' || !e.target) return;
  if(e.target.id === 'gatepin'){ e.preventDefault(); $('[data-act="gatesubmit"]')?.click(); }
  else if(e.target.id === 'gateuser' || e.target.id === 'gatepass'){ e.preventDefault(); $('[data-act="adminlogin"]')?.click(); }
});
document.addEventListener('input', e => {
  const t = e.target;
  if(!isAdmin() && (t.dataset.pname || t.dataset.sc || t.dataset.tok || t.dataset.calid)) return;
  if(t.dataset.calid){ const m = S.calendar.find(x=>x.id===t.dataset.calid); if(m){ m[t.dataset.calf] = t.value; save('calendar'); } return; }
  else if(t.dataset.sheet && t.tagName!=='SELECT'){
    S.sheet[t.dataset.sheet]=t.value;
    save('sheet');
  }
});
document.addEventListener('change', e => {
  const t = e.target;
  if(t.dataset.asview){ const v = t.value; if(v==='admin') switchView('admin'); else switchView('coach', v.split(':')[1]); return; }
  if(t.dataset.curteam){ impostaCurTeam(t.value); impostaOpenSchemeId(null); subscribeTeam(); return; }
  if(!isAdmin() && (t.dataset.sc || (t.dataset.tok) || t.dataset.calid)) return;
  if(t.dataset.calid){ const m = S.calendar.find(x=>x.id===t.dataset.calid); if(m){ m[t.dataset.calf] = t.dataset.calf==='home' ? t.checked : t.value; save('calendar'); } return; }
  if(t.dataset.atok){
    const ov = S.sheet.overrides[openSchemeId] ||= {};
    if(t.value) ov[t.dataset.atok] = t.value; else delete ov[t.dataset.atok];
    save('sheet'); render(); return;
  }
  if(t.dataset.arolegrp !== undefined){
    const sc = schemaDa(openSchemeId); if(!sc) return;
    const prima = t.dataset.arolegrp, nuovo = t.value.trim();
    if(nuovo === prima) return;
    const toks = effTokens(sc).filter(q => (q.role||'').trim() === prima);
    if(modificaBase(sc)){ toks.forEach(q => { const tk = sc.tokens.find(x => x.id===q.id); if(tk) tk.role = nuovo; }); salvaSchema(sc); }
    else { const ed = schemeEdit(sc);
      toks.forEach(q => { const base = sc.tokens.find(x => x.id===q.id); if(!base) return;
        if(nuovo === (base.role||'')){ if(ed.roles?.[base.id]){ delete ed.roles[base.id].role; if(!Object.keys(ed.roles[base.id]).length) delete ed.roles[base.id]; } }
        else ((ed.roles ||= {})[base.id] ||= {}).role = nuovo; });
      save('sheet'); }
    setTimeout(render, 0); return;   // dopo l'uscita dal campo: ridisegnare durante il blur fa perdere il nodo
  }
  if(t.dataset.arole){
    const sc = schemaDa(openSchemeId); if(!sc) return;
    if(modificaBase(sc)){ const tk = sc.tokens.find(q=>q.id===t.dataset.arole); if(tk){ tk.role = t.value.trim(); salvaSchema(sc); } }
    else { const ed = schemeEdit(sc); const base = sc.tokens.find(q=>q.id===t.dataset.arole);
      if(base && t.value.trim() === (base.role||'')){ if(ed.roles?.[base.id]){ delete ed.roles[base.id].role; if(!Object.keys(ed.roles[base.id]).length) delete ed.roles[base.id]; } }
      else ((ed.roles ||= {})[t.dataset.arole] ||= {}).role = t.value.trim();
      save('sheet'); }
    render(); return;
  }
  if(t.dataset.sheet && t.tagName==='SELECT'){ S.sheet[t.dataset.sheet]=t.value; if(t.dataset.sheet==='formation') S.sheet.slotPos = {}; save('sheet'); render(); }
});

/* Drag giocatori (mouse e touch) */
let dnd = null;
document.addEventListener('pointerdown', e => {
  const chipEl = e.target.closest('[data-player]');
  if(chipEl){ dnd = {pid:chipEl.dataset.player, x:e.clientX, y:e.clientY, started:false, el:chipEl}; return; }

  const slotEl = e.target.closest('[data-move-slot]');
  if(slotEl && !selectedPlayer && !e.target.closest('[data-clear-slot]')){
    const pitch = $('#pitch');
    if(pitch){
      const n = slotEl.dataset.moveSlot;
      slotEl.setPointerCapture?.(e.pointerId);
      let moved = false, finalX, finalY;
      const mv = ev => {
        const rect = pitch.getBoundingClientRect();
        const x = Math.max(2, Math.min(98, +(((ev.clientX-rect.left)/rect.width)*100).toFixed(2)));
        const y = Math.max(2, Math.min(98, +(((ev.clientY-rect.top)/rect.height)*100).toFixed(2)));
        slotEl.style.left = x+'%'; slotEl.style.top = y+'%';
        finalX = x; finalY = y; moved = true;
      };
      const up = () => {
        slotEl.removeEventListener('pointermove', mv); slotEl.removeEventListener('pointerup', up); slotEl.removeEventListener('pointercancel', up);
        if(moved){ S.sheet.slotPos = S.sheet.slotPos || {}; S.sheet.slotPos[n] = {x:finalX, y:finalY}; save('sheet'); }
        else { impostaSlotPick(n); impostaSlotPickAt(Date.now()); }   // solo un tocco: si sceglie il giocatore per questa posizione
        render();
      };
      slotEl.addEventListener('pointermove', mv); slotEl.addEventListener('pointerup', up); slotEl.addEventListener('pointercancel', up);
      e.preventDefault();
      return;
    }
  }

  /* campo dei piazzati: vedi piazzati.js */
});
document.addEventListener('pointermove', e => {
  if(!dnd) return;
  if(!dnd.started && Math.hypot(e.clientX-dnd.x, e.clientY-dnd.y) > 8){
    dnd.started = true; dnd.ghost = dnd.el.cloneNode(true); dnd.ghost.classList.add('ghost-chip'); document.body.appendChild(dnd.ghost);
    /* Vicino al bordo alto o basso la pagina scorre da sola: così si raggiunge il campo anche quando è fuori dallo schermo */
    const d0 = dnd;
    d0.scroller = setInterval(() => {
      const y = d0.lastY ?? 0, m = 80;
      const v = y < m ? -(m - y) / 3 : y > innerHeight - m ? (y - (innerHeight - m)) / 3 : 0;
      if(v) window.scrollBy(0, v);
    }, 16);
  }
  dnd.lastY = e.clientY;
  if(dnd.started){
    dnd.ghost.style.left = e.clientX+'px'; dnd.ghost.style.top = e.clientY+'px';
    document.querySelectorAll('.slot.hot').forEach(s=>s.classList.remove('hot'));
    const under = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-drop-slot]'); if(under) under.classList.add('hot');
  }
});
document.addEventListener('pointerup', e => {
  if(!dnd) return;
  const d = dnd; dnd = null; clearInterval(d.scroller);
  if(d.started){
    d.ghost.remove();
    const under = document.elementFromPoint(e.clientX, e.clientY);
    const slot = under?.closest('[data-drop-slot]'), tok = under?.closest('[data-drop-token]');
    if(slot) assignSlot(slot.dataset.dropSlot, d.pid);
    else if(tok){ const ov = S.sheet.overrides[openSchemeId] ||= {}; ov[tok.dataset.dropToken] = d.pid; save('sheet'); }
    impostaSelectedPlayer(null); render();
  } else if(tab==='formazione'){
    const pid = d.pid;
    const curSlot = slotOf(pid);
    if(curSlot){ delete S.sheet.lineup[curSlot]; save('sheet'); }
    else if(S.sheet.bench.includes(pid)){ S.sheet.bench = S.sheet.bench.filter(x=>x!==pid); save('sheet'); }
    else {
      const free = slotPriorityOrder().find(n => !S.sheet.lineup[n]);
      if(free!=null) assignSlot(free, pid);
      else { S.sheet.bench = [...S.sheet.bench, pid]; save('sheet'); }
    }
    render();
  } else {
    impostaSelectedPlayer(selectedPlayer===d.pid ? null : d.pid); render();
  }
});
document.addEventListener('pointercancel', () => { if(dnd){ clearInterval(dnd.scroller); dnd.ghost?.remove(); } dnd = null; });

render();
ensureFonts();
initAuth();
initStore();
