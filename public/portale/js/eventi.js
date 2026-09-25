/* Portale Academy Casatese Merate · Eventi (tocchi, digitazione, trascinamento) e avvio dell'app.
   I file si caricano in ordine (vedi index.html) e condividono le stesse variabili globali. */
/* ---------- Eventi ---------- */
document.addEventListener('click', e => {
  const t = e.target.closest('button, [data-drop-slot], [data-drop-token], [data-move-token]');
  if(!t) return;
  if(t.dataset.tab){ goTab(t.dataset.tab); return; }
  if(t.dataset.area){ const a = AREAS.find(x => x.k===t.dataset.area); if(a) goTab(areaLast[a.k] || a.tabs[0]); return; }
  if(t.dataset.segvoto){ segDraft.voto = segDraft.voto === t.dataset.segvoto ? '' : t.dataset.segvoto; render(); return; }
  /* Scelta del giocatore per una posizione toccata sul campo. Il telefono manda un "clic" subito dopo il tocco
     che ha aperto l'elenco: se arriva nel primo mezzo secondo lo ignoriamo (chiuderebbe o sceglierebbe per sbaglio) */
  if((t.dataset.pickplayer || t.dataset.pickclear !== undefined || t.dataset.pickclose !== undefined) && Date.now() - slotPickAt < 450) return;
  if(t.dataset.pickplayer){ if(slotPick != null) assignSlot(slotPick, t.dataset.pickplayer); slotPick = null; render(); return; }
  if(t.dataset.pickclear !== undefined){ if(slotPick != null){ delete S.sheet.lineup[slotPick]; save('sheet'); } slotPick = null; render(); return; }
  if(t.dataset.pickclose !== undefined){ slotPick = null; render(); return; }
  if(t.dataset.player !== undefined) return; // gestito dal drag
  const act = t.dataset.act;
  const ADMIN_ONLY = ['padd','bulk','newscheme','addtok','deltok','dupscheme','delscheme','teamadd','exportbackup','caladd'];
  if(!isAdmin() && (ADMIN_ONLY.includes(act) || t.dataset.pdel || t.dataset.up || t.dataset.down || t.dataset.teamdel || t.dataset.teamcode || t.dataset.caldel || t.dataset.coachpin || t.dataset.coachdel || t.dataset.coachadd || t.dataset.teamcodeoff)) return;
  if(t.dataset.teamgo){ curTeam = t.dataset.teamgo; tab = 'rosa'; writeRoute(true); subscribeTeam(); return; }
  if(t.dataset.teamas){ switchView('coach', t.dataset.teamas); return; }
  /* Scout e direttori: account e PIN passano da /api/staff (admin e direttori) */
  if(t.dataset.staffpin && isAdmin() && !readOnly()){ const x = staff.find(p => p.id===t.dataset.staffpin); if(x && (!x.pin || confirm(`Rigenerare il codice di ${x.nome||''} ${x.cognome||''}? Quello vecchio smette di funzionare.`))) staffAction({azione:'pin', id:x.id}); return; }
  if(t.dataset.staffstato && isAdmin() && !readOnly()){
    const x = staff.find(p => p.id===t.dataset.staffstato), riattiva = t.dataset.attivo==='1';
    if(x && (riattiva || confirm(`Sospendere ${x.nome||''} ${x.cognome||''}? Non potrà più entrare finché non lo riattivi.`))) staffAction({azione:'stato', id:x.id, attivo:riattiva});
    return; }
  if(t.dataset.staffnew && isAdmin() && !readOnly()){ staffAdding[t.dataset.staffnew] = true; render(); $('#staffnew_'+t.dataset.staffnew)?.focus(); return; }
  if(t.dataset.staffadd && isAdmin() && !readOnly()){ const inp = $('#staffnew_'+t.dataset.staffadd); const nome = (inp?.value||'').trim(); if(!nome){ inp?.focus(); return; } staffAction({azione:'crea', nome, ruolo:t.dataset.staffadd}); return; }
  /* Mister e PIN personali (solo admin, controllato sopra) */
  const coachOf = v => { const [tid, cid] = v.split(':'); const tm = S.teams.find(x => x.id===tid); return [tm, tm?.coaches?.find(c => c.id===cid)]; };
  if(t.dataset.coachpin){ const [tm, c] = coachOf(t.dataset.coachpin); if(c){ c.code = genPin(); save('teams'); render(); } return; }
  if(t.dataset.coachdel){ const [tm, c] = coachOf(t.dataset.coachdel); if(c){ tm.coaches = tm.coaches.filter(x => x !== c); syncCoach(tm); save('teams'); render(); } return; }
  if(t.dataset.coachadd){ const tm = S.teams.find(x => x.id===t.dataset.coachadd); if(tm){ const c = {id:uid('m_'), name:'', code:''}; (tm.coaches ||= []).push(c); save('teams'); render(); $(`[data-coach="${tm.id}:${c.id}"]`)?.focus(); } return; }
  if(t.dataset.teamcodeoff){ const tm = S.teams.find(x => x.id===t.dataset.teamcodeoff); if(tm && confirm('Disattivare il PIN di squadra? Chi lo usa ancora non potrà più entrare: servirà il PIN personale.')){ delete tm.code; save('teams'); render(); } return; }
  if(t.dataset.teamcode){ const tm = S.teams.find(x=>x.id===t.dataset.teamcode); if(tm){ tm.code = genPin(); save('teams'); render(); } return; }
  if(t.dataset.teamdel){ const tm = S.teams.find(x=>x.id===t.dataset.teamdel); if(tm && confirm(`Eliminare la squadra "${tm.name}"? Rosa e formazione non saranno più accessibili.`)){ S.teams = S.teams.filter(x=>x!==tm); save('teams'); if(curTeam===tm.id){ curTeam = S.teams[0]?.id||null; subscribeTeam(); } else render(); } return; }
  if(t.dataset.pdel){ const id=t.dataset.pdel; S.players = S.players.filter(p=>p.id!==id); const l=S.sheet.lineup; Object.keys(l).forEach(k=>{if(l[k]===id) delete l[k]}); S.sheet.bench=S.sheet.bench.filter(b=>b!==id); save('roster'); save('sheet'); render(); return; }
  if(t.dataset.caldel){ S.calendar = S.calendar.filter(m=>m.id!==t.dataset.caldel); save('calendar'); render(); return; }
  if(t.dataset.callupid){ const id=t.dataset.callupid, st=t.dataset.callupstatus; S.sheet.callup ||= {}; S.sheet.callup[id] = S.sheet.callup[id]===st ? '' : st; save('sheet'); render(); return; }
  if(t.dataset.clearSlot){ e.stopPropagation(); delete S.sheet.lineup[t.dataset.clearSlot]; save('sheet'); render(); return; }
  if(t.dataset.dropSlot){ if(selectedPlayer){ assignSlot(t.dataset.dropSlot, selectedPlayer); selectedPlayer=null; render(); } return; }
  if(t.dataset.dropToken){ if(selectedPlayer){ const ov = S.sheet.overrides[openSchemeId] ||= {}; ov[t.dataset.dropToken]=selectedPlayer; selectedPlayer=null; save('sheet'); render(); } return; }
  if(t.dataset.bench){ const id=t.dataset.bench; const b=S.sheet.bench; S.sheet.bench = b.includes(id) ? b.filter(x=>x!==id) : [...b,id]; save('sheet'); render(); return; }
  if(t.dataset.schemecard){ const id=t.dataset.schemecard; const order=S.schemes.map(q=>q.id); let s=S.sheet.selected.filter(i=>i!==id); if(!S.sheet.selected.includes(id)) s.push(id); S.sheet.selected = s.sort((a,b)=>order.indexOf(a)-order.indexOf(b)); save('sheet'); render(); return; }
  if(t.dataset.open){ openSchemeId=t.dataset.open; boardMode = (t.dataset.editmode && isAdmin()) ? 'move' : 'assign'; selectedToken=null; drawTool=null; selectedDraw=null; render(); window.scrollTo(0,0); return; }
  if(t.dataset.up || t.dataset.down){ const i=+(t.dataset.up??t.dataset.down), j=t.dataset.up!==undefined?i-1:i+1; if(j<0||j>=S.schemes.length) return; [S.schemes[i],S.schemes[j]]=[S.schemes[j],S.schemes[i]]; const order=S.schemes.map(q=>q.id); S.sheet.selected.sort((a,b)=>order.indexOf(a)-order.indexOf(b)); save('schemes'); save('sheet'); render(); return; }
  if(t.dataset.mode){ boardMode = t.dataset.mode; selectedToken=null; selectedPlayer=null; drawTool=null; selectedDraw=null; render(); return; }
  if(t.dataset.drawtool){ drawTool = drawTool===t.dataset.drawtool ? null : t.dataset.drawtool; selectedDraw=null; render(); return; }
  const sc = S.schemes.find(q=>q.id===openSchemeId);
  switch(act){
    case 'teamadd': { const tm = {id:uid('t_'), name:'Nuova squadra', category:'', coach:'', code:'', coaches:[]}; S.teams.push(tm); save('teams'); if(!curTeam){ curTeam = tm.id; subscribeTeam(); } else render(); break; }
    case 'padd': S.players.push({id:uid('p'), name:''}); save('roster'); render(); const ins=document.querySelectorAll('[data-pname]'); ins[ins.length-1]?.focus(); break;
    case 'caladd': S.calendar.push({id:uid('m'), date:'', time:'', opponent:'', venue:'', home:false}); save('calendar'); render(); break;
    case 'usenext': { const nm = nextMatch(); if(nm){ S.sheet.opponent=nm.opponent||''; S.sheet.date=nm.date||''; S.sheet.time=nm.time||''; S.sheet.venue=nm.venue||''; S.sheet.address=nm.address||''; S.sheet.venueLL=nm.ll||''; S.sheet.home=!!nm.home; S.sheet.convType=nm.friendly?'Amichevole':'Campionato'; save('sheet'); render(); } break; }
    case 'bulk': {
      const lines = ($('#bulk').value||'').split('\n').map(l=>l.trim()).filter(Boolean);
      lines.forEach(l => { const m = l.match(/^\d{1,3}\s*[-.)]?\s*(.+)$/); S.players.push({id:uid('p'), name:(m?m[1]:l).trim()}); });
      save('roster'); render(); break; }
    case 'newmatch': if(confirm('Svuotare formazione, panchina, convocazioni e dati partita? Rosa e schemi restano.')){ const keep = S.sheet.selected; S.sheet = defaultSheet(); S.sheet.selected = keep; save('sheet'); render(); } break;
    case 'newscheme': {
      const b = BASES[$('#base').value];
      const tokens = Array.from({length:11},(_,i)=>({id:uid('t'), slot:i+1, x:-22+i*4.5, y:28, role:'', tag:''}));
      const q = {id:uid('s'), name:b.name, subtitle:'', side:b.side, note:'', legend:'', ball:{...b.ball}, tokens, marks:[], draw:[]};
      S.schemes.push(q); S.sheet.selected.push(q.id); save('schemes'); save('sheet'); openSchemeId=q.id; boardMode='move'; render(); break; }
    case 'back': openSchemeId=null; selectedToken=null; boardMode='assign'; drawTool=null; selectedDraw=null; render(); break;
    case 'addtok': if(sc){ const n={id:uid('t'), slot:1, x:0, y:30, role:'', tag:''}; sc.tokens.push(n); selectedToken=n.id; save('schemes'); render(); } break;
    case 'deltok': if(sc){ sc.tokens = sc.tokens.filter(q=>q.id!==selectedToken); selectedToken=null; save('schemes'); render(); } break;
    case 'resetov': if(sc){ delete S.sheet.overrides[sc.id]; save('sheet'); render(); } break;
    case 'resetedits': if(sc){ delete (S.sheet.schemeEdits||{})[sc.id]; save('sheet'); render(); } break;
    case 'resetslotpos': S.sheet.slotPos = {}; save('sheet'); render(); break;
    case 'deldraw': if(sc && selectedDraw){
      const { layer, kind, index } = selectedDraw;
      const arr = layer==='base' ? (kind==='draw' ? (sc.draw||(sc.draw=[])) : (sc.marks||(sc.marks=[]))) : (kind==='draw' ? schemeEdit(sc).draw : schemeEdit(sc).marks);
      arr.splice(index,1); selectedDraw=null; save(layer==='base'?'schemes':'sheet'); render();
    } break;
    case 'edittext': if(sc && selectedDraw && selectedDraw.kind==='mark'){
      const { layer, index } = selectedDraw;
      const arr = layer==='base' ? sc.marks : schemeEdit(sc).marks;
      const m = arr[index];
      const val = prompt('Testo:', m.text);
      if(val!=null){ const t = val.trim(); if(t) m.text = t; else arr.splice(index,1); selectedDraw=null; save(layer==='base'?'schemes':'sheet'); render(); }
    } break;
    case 'dupscheme': if(sc){ const q = clone(sc); q.id=uid('s'); q.name = sc.name+' (copia)'; q.tokens.forEach(t=>t.id=uid('t')); S.schemes.splice(S.schemes.indexOf(sc)+1,0,q); save('schemes'); openSchemeId=q.id; render(); } break;
    case 'delscheme': if(sc && confirm(`Eliminare lo schema "${sc.name}"?`)){ S.schemes = S.schemes.filter(q=>q!==sc); S.sheet.selected = S.sheet.selected.filter(i=>i!==sc.id); delete S.sheet.overrides[sc.id]; save('schemes'); save('sheet'); openSchemeId=null; render(); } break;
    case 'refresh': buildPreview(); break;
    case 'download': downloadPdf(); break;
    case 'downloadconv': downloadConvocazione(); break;
    case 'resetconv': if(confirm('Svuotare lo stato di tutti i giocatori e i dati del ritrovo per questa partita?')){ S.sheet.callup={}; S.sheet.meetTime=''; S.sheet.meetAddress=''; S.sheet.convNotes=''; S.sheet.convType='Campionato'; save('sheet'); render(); } break;
    case 'exportbackup': exportBackup(); break;
    case 'segnala': inviaSegnalazione(); break;
    case 'gatesubmit': {
      const val = ($('#gatepin')?.value || '').trim();
      if(secureMode){
        setStatus('Accesso…');
        coachLogin(val).then(ok => { gateError = !ok; setStatus(ok ? 'Sincronizzato' : ''); if(!ok) render(); });
        break;
      }
      const tm = S.teams.find(x => (x.code||'') === val);
      if(tm){ gateError = false; location.hash = 'squadra=' + tm.code; resolveAccess(); subscribeTeam(); break; }
      gateError = true; render();
      break; }
    case 'adminlogin': adminLogin($('#gatepass')?.value || ''); break;
    case 'gateadmin': adminUnlocked = true; gateError = false; try{ localStorage.setItem('fg:adminpin','ok'); }catch(e){} render(); break;
    case 'gateback': adminUnlocked = false; gateError = false; try{ localStorage.removeItem('fg:adminpin'); }catch(e){} render(); break;
    case 'logout': logout(); break;
  }
});
document.addEventListener('keydown', e => {
  if(e.key === 'Escape' && slotPick != null){ slotPick = null; render(); return; }
  if(e.key !== 'Enter' || !e.target) return;
  if(e.target.id === 'gatepin'){ e.preventDefault(); $('[data-act="gatesubmit"]')?.click(); }
  else if(e.target.id?.startsWith('staffnew_')){ e.preventDefault(); $(`[data-staffadd="${e.target.id.slice(9)}"]`)?.click(); }
  else if(e.target.id === 'gateuser' || e.target.id === 'gatepass'){ e.preventDefault(); $('[data-act="adminlogin"]')?.click(); }
});
document.addEventListener('input', e => {
  const t = e.target;
  if(t.dataset.seg){ segDraft[t.dataset.seg] = t.value; return; }
  if(!isAdmin() && (t.dataset.pname || t.dataset.sc || t.dataset.tok || t.dataset.team || t.dataset.calid || t.dataset.coach)) return;
  if(t.dataset.coach){ const [tid, cid] = t.dataset.coach.split(':'); const tm = S.teams.find(x => x.id===tid); const c = tm?.coaches?.find(x => x.id===cid); if(c){ c.name = t.value; syncCoach(tm); save('teams'); } return; }
  if(t.dataset.team){ const tm = S.teams.find(x=>x.id===t.dataset.team); if(tm){ tm[t.dataset.tf] = t.value; save('teams'); if(t.dataset.tf==='name'){ const h = t.closest('.teamcard')?.querySelector('.hd strong'); if(h) h.textContent = t.value || 'Senza nome'; } } return; }
  if(t.dataset.calid){ const m = S.calendar.find(x=>x.id===t.dataset.calid); if(m){ m[t.dataset.calf] = t.value; save('calendar'); } return; }
  if(t.dataset.pname){ const p=P(t.dataset.pname); if(p){ p.name=t.value; save('roster'); } }
  else if(t.dataset.sheet && t.tagName!=='SELECT'){
    S.sheet[t.dataset.sheet]=t.value;
    save('sheet');
    if(t.dataset.sheet==='meetAddress'){ const a = $('#cv_mapslink'); if(a){ const u = mapsLink(S.sheet); a.href = u; a.hidden = !u; } }
  }
  else if(t.dataset.sc && t.tagName!=='SELECT'){ const sc=S.schemes.find(q=>q.id===openSchemeId); if(sc){ sc[t.dataset.sc]=t.value; save('schemes'); } }
  else if(t.dataset.tok && t.tagName!=='SELECT'){ const sc=S.schemes.find(q=>q.id===openSchemeId); const tk=sc?.tokens.find(q=>q.id===selectedToken); if(tk){ tk[t.dataset.tok]=t.value; save('schemes'); } }
});
document.addEventListener('change', e => {
  if(e.target.dataset.staffname && isAdmin() && !readOnly()){ const x = staff.find(p => p.id===e.target.dataset.staffname); const v = e.target.value.trim(); if(x && v && v !== [x.nome, x.cognome].filter(Boolean).join(' ')) staffAction({azione:'nome', id:x.id, nome:v}); return; }
  const t = e.target;
  if(t.dataset.asview){ const v = t.value; if(v==='admin') switchView('admin'); else switchView('coach', v.split(':')[1]); return; }
  if(t.dataset.curteam){ curTeam = t.value; openSchemeId = null; subscribeTeam(); return; }
  if(t.dataset.team && t.dataset.tf==='name'){ render(); return; }
  if(!isAdmin() && (t.dataset.sc || (t.dataset.tok) || t.dataset.calid)) return;
  if(t.dataset.calid){ const m = S.calendar.find(x=>x.id===t.dataset.calid); if(m){ m[t.dataset.calf] = t.dataset.calf==='home' ? t.checked : t.value; save('calendar'); } return; }
  if(t.dataset.sheet && t.tagName==='SELECT'){ S.sheet[t.dataset.sheet]=t.value; if(t.dataset.sheet==='formation') S.sheet.slotPos = {}; save('sheet'); render(); }
  else if(t.dataset.sc && t.tagName==='SELECT'){ const sc=S.schemes.find(q=>q.id===openSchemeId); if(sc){ sc[t.dataset.sc]=t.value; save('schemes'); } }
  else if(t.dataset.tok==='slot'){ const sc=S.schemes.find(q=>q.id===openSchemeId); const tk=sc?.tokens.find(q=>q.id===selectedToken); if(tk){ tk.slot=+t.value; save('schemes'); render(); } }
  else if(t.dataset.tok==='role'){ render(); }
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
        else { slotPick = n; slotPickAt = Date.now(); }   // solo un tocco: si sceglie il giocatore per questa posizione
        render();
      };
      slotEl.addEventListener('pointermove', mv); slotEl.addEventListener('pointerup', up); slotEl.addEventListener('pointercancel', up);
      e.preventDefault();
      return;
    }
  }

  if(boardMode==='draw'){
    const svg = $('#board'); const sc = S.schemes.find(q=>q.id===openSchemeId);
    if(svg && sc && svg.contains(e.target)){
      const admin = isAdmin();
      const toLocal = ev => { const pt = svg.createSVGPoint(); pt.x=ev.clientX; pt.y=ev.clientY; return pt.matrixTransform(svg.getScreenCTM().inverse()); };
      const clampX = v => Math.max(VX0+1, Math.min(VX1-1, +v.toFixed(2)));
      const clampY = v => Math.max(VY0+.5, Math.min(VY1-.5, +v.toFixed(2)));
      if(!drawTool){
        const shapeEl = e.target.closest('[data-draw],[data-mark],[data-edraw],[data-emark]');
        if(!shapeEl) selectedDraw = null;
        else if(shapeEl.dataset.draw !== undefined) selectedDraw = {kind:'draw', layer:'base', index:+shapeEl.dataset.draw};
        else if(shapeEl.dataset.mark !== undefined) selectedDraw = {kind:'mark', layer:'base', index:+shapeEl.dataset.mark};
        else if(shapeEl.dataset.edraw !== undefined) selectedDraw = {kind:'draw', layer:'edit', index:+shapeEl.dataset.edraw};
        else selectedDraw = {kind:'mark', layer:'edit', index:+shapeEl.dataset.emark};
        render();
        return;
      }
      if(drawTool==='text'){
        const p = toLocal(e);
        const txt = prompt('Testo da scrivere sul campo:', '');
        if(txt && txt.trim()){
          const item = {text:txt.trim(), x:clampX(p.x), y:clampY(p.y/YS)};
          if(admin){ sc.marks = sc.marks || []; sc.marks.push(item); save('schemes'); }
          else { schemeEdit(sc).marks.push(item); save('sheet'); }
        }
        render();
        return;
      }
      const p0 = toLocal(e);
      const draft = {type: drawTool.startsWith('arrow') ? 'arrow' : 'line', dashed: drawTool.endsWith('dash'), x1:clampX(p0.x), y1:clampY(p0.y/YS), x2:clampX(p0.x), y2:clampY(p0.y/YS)};
      let moved = false;
      const mv = ev => { const p = toLocal(ev); draft.x2 = clampX(p.x); draft.y2 = clampY(p.y/YS); moved = true; renderDraftLine(draft); };
      const up = () => {
        svg.removeEventListener('pointermove', mv); svg.removeEventListener('pointerup', up); svg.removeEventListener('pointercancel', up);
        if(moved && Math.hypot(draft.x2-draft.x1, (draft.y2-draft.y1)*YS) > 1){
          if(admin){ sc.draw = sc.draw || []; sc.draw.push(draft); save('schemes'); }
          else { schemeEdit(sc).draw.push(draft); save('sheet'); }
        }
        render();
      };
      svg.addEventListener('pointermove', mv); svg.addEventListener('pointerup', up); svg.addEventListener('pointercancel', up);
      e.preventDefault();
      return;
    }
  }

  const tokEl = e.target.closest('[data-move-token],[data-ball]');
  if(tokEl && boardMode==='move'){
    const svg = $('#board'); const sc = S.schemes.find(q=>q.id===openSchemeId); if(!svg||!sc) return;
    const admin = isAdmin();
    const isBall = !!tokEl.dataset.ball;
    const baseTok = isBall ? null : sc.tokens.find(q=>q.id===tokEl.dataset.moveToken);
    if(!isBall){ selectedToken = baseTok.id; }
    tokEl.setPointerCapture?.(e.pointerId);
    const toLocal = ev => { const pt = svg.createSVGPoint(); pt.x=ev.clientX; pt.y=ev.clientY; return pt.matrixTransform(svg.getScreenCTM().inverse()); };
    let moved = false;
    const mv = ev => {
      const p = toLocal(ev);
      const x = Math.max(VX0+1, Math.min(VX1-.5, +p.x.toFixed(2)));
      const y = Math.max(VY0+.5, Math.min(VY1-1, +(p.y/YS).toFixed(2)));
      if(admin){ const tk = isBall ? sc.ball : baseTok; tk.x = x; tk.y = y; }
      else {
        const ed = schemeEdit(sc);
        if(isBall) ed.ball = {x,y}; else ed.tokens[baseTok.id] = {x,y};
      }
      tokEl.setAttribute('transform', `translate(${x} ${y*YS})`);
      moved = true;
    };
    const up = () => { tokEl.removeEventListener('pointermove', mv); tokEl.removeEventListener('pointerup', up); tokEl.removeEventListener('pointercancel', up); if(moved) save(admin?'schemes':'sheet'); render(); };
    tokEl.addEventListener('pointermove', mv); tokEl.addEventListener('pointerup', up); tokEl.addEventListener('pointercancel', up);
    e.preventDefault();
  }
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
    selectedPlayer = null; render();
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
    selectedPlayer = selectedPlayer===d.pid ? null : d.pid; render();
  }
});
document.addEventListener('pointercancel', () => { if(dnd){ clearInterval(dnd.scroller); dnd.ghost?.remove(); } dnd = null; });

render();
ensureFonts();
initAuth();
initStore();
