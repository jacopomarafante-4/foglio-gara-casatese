/* Portale · Responsabile organizzativo ed eventi (0029): eventi della società, avvisi per le squadre (anche su WhatsApp),
   modifica dei calendari di tutte le squadre. Eventi e avvisi li leggono tutti (calendario, Home dei mister).
   Documenti: shared/eventi {items:[{id, titolo, tipo, data, inizio, fine, luogo:'merate'|'cernusco'|'altro', indirizzo,
   squadre:[id], note}]}, shared/avvisi {items:[{id, data, squadre:[id], titolo, testo, autore}]} (squadre vuote = tutta la società). */

/* ---------- Dati condivisi: eventi e avvisi ---------- */
let eventiSoc = [], avvisiSoc = [], condivisiAt = 0, condivisiInCorso = false;
const puoOrganizzare = () => isOrg() || (isAdmin() && !isDirettore());
async function caricaCondivisi(forza){
  if(!db || condivisiInCorso || (!forza && Date.now() - condivisiAt < 60000)) return;
  condivisiInCorso = true;
  const leggi = p => db.doc(p).get().then(s => (s.exists && s.data()?.items) || []).catch(() => null);
  const [ev, av] = await Promise.all([leggi('shared/eventi'), leggi('shared/avvisi')]);
  if(ev) eventiSoc = ev;
  if(av) avvisiSoc = av;
  condivisiAt = Date.now(); condivisiInCorso = false;
  if(['home','calendario','calendariotutte','eventi','avvisi'].includes(tab)) render();
}
function salvaCondiviso(path, items){
  if(!puoOrganizzare()){ setStatus('Sola lettura: nessuna modifica'); return; }
  condivisiAt = Date.now(); setStatus('Salvataggio…');
  clearTimeout(timers[path]);
  timers[path] = setTimeout(async () => {
    try{ await db.doc(path).set({items: clone(items)}); setStatus('Salvato'); }catch(e){ setStatus('Non salvato: riprova'); }
  }, 500);
}

/* ---------- Eventi come righe di calendario (colonna del luogo, etichetta del tipo) ---------- */
const TIPI_EVENTO = ['Torneo organizzato','Open day','Festa','Riunione','Altro'];
const LUOGHI_EVENTO = {merate:'Campo di Merate', cernusco:'Campo di Cernusco', altro:'Altrove'};
const eventoCome = e => ({id:'ev_'+e.id, evento:e, date:e.data, time:e.inizio||'', fine:e.fine||'', opponent:e.titolo||'Evento',
  home:e.luogo!=='altro', luogo:e.luogo, venue:e.luogo==='altro' ? (e.indirizzo||'') : LUOGHI_EVENTO[e.luogo], tipo:e.tipo||'Evento', note:e.note||''});
/* Eventi di una squadra: quelli che la coinvolgono, o di tutta la società (nessuna squadra indicata) */
const eventiPer = teamId => { caricaCondivisi(); return eventiSoc.filter(e => !(e.squadre||[]).length || e.squadre.includes(teamId)).map(eventoCome); };
const eventiTutti = () => { caricaCondivisi(); return eventiSoc.map(eventoCome); };
const squadreTesto = ids => (ids||[]).length ? ids.map(id => siglaSquadra(S.teams.find(t => t.id===id) || (tuttiCal||[]).find(t => t.id===id))).filter(Boolean).join(', ') : 'Tutta la società';

/* ---------- Eventi ---------- */
let eventoAperto = null;
function viewEventi(){
  caricaCondivisi();
  const oggi = todayISO(), P = puoOrganizzare();
  const ord = eventiSoc.slice().sort((a,b) => ((a.data||'')+(a.inizio||'')).localeCompare((b.data||'')+(b.inizio||'')));
  const prossimi = ord.filter(e => !e.data || e.data >= oggi), passati = ord.filter(e => e.data && e.data < oggi).reverse();
  const squadre = S.teams.filter(t => !t.organizza && !t.vedeTutte);
  const form = e => `<details class="fredit" ${e.id===eventoAperto ? 'open' : ''}><summary>Modifica evento</summary>
      <div class="grid">
        <div><label class="f">Titolo</label><input data-evf="titolo" data-evid="${e.id}" value="${esc(e.titolo||'')}" placeholder="Es. Torneo di Natale"></div>
        <div><label class="f">Tipo</label><select data-evf="tipo" data-evid="${e.id}">${TIPI_EVENTO.map(t => `<option ${t===e.tipo?'selected':''}>${t}</option>`).join('')}</select></div>
        <div><label class="f">Data</label><input type="date" data-evf="data" data-evid="${e.id}" value="${esc(e.data||'')}"></div>
        <div><label class="f">Dalle</label><input type="time" data-evf="inizio" data-evid="${e.id}" value="${esc(e.inizio||'')}"></div>
        <div><label class="f">Alle</label><input type="time" data-evf="fine" data-evid="${e.id}" value="${esc(e.fine||'')}"></div>
        <div><label class="f">Luogo</label><select data-evf="luogo" data-evid="${e.id}">${Object.entries(LUOGHI_EVENTO).map(([k,l]) => `<option value="${k}" ${k===e.luogo?'selected':''}>${l}</option>`).join('')}</select></div>
        ${e.luogo==='altro' ? `<div><label class="f">Indirizzo</label><input data-evf="indirizzo" data-evid="${e.id}" value="${esc(e.indirizzo||'')}" placeholder="Via, paese"></div>` : ''}
      </div>
      <label class="f" style="margin-top:8px">Squadre coinvolte <span class="note">(nessuna = tutta la società)</span></label>
      <div class="gchips" style="flex-wrap:wrap">${squadre.map(t => `<button class="gchip" data-evsq="${e.id}:${t.id}" aria-pressed="${(e.squadre||[]).includes(t.id)}">${esc(siglaSquadra(t))}</button>`).join('')}</div>
      <label class="f" style="margin-top:8px">Note</label><textarea data-evf="note" data-evid="${e.id}">${esc(e.note||'')}</textarea>
      <div class="row" style="margin-top:8px;justify-content:space-between">
        <button class="btn small" data-evavviso="${e.id}">Scrivi un avviso per questo evento</button>
        <button class="btn small ghost danger" data-evdel="${e.id}">Elimina evento</button>
      </div></details>`;
  const riga = e => { const m = eventoCome(e);
    return rigaPartita(m, true, true).replace(/<\/div>\s*<\/li>\s*$/, (P ? form(e) : '') + '</div></li>'); };
  return `<section class="panel">
    <h2>Eventi della società</h2>
    <p class="hint">Tornei organizzati da noi, open day, feste, riunioni. Compaiono nel calendario di tutti (vista Giorno compresa, nella colonna del campo) e in quello delle squadre coinvolte.</p>
    ${prossimi.length ? `<ul class="wklist callist">${prossimi.map(riga).join('')}</ul>` : '<p class="empty">Nessun evento in programma.</p>'}
    ${P ? '<div class="row" style="margin-top:10px"><button class="btn primary small" data-evadd="1">+ Nuovo evento</button></div>' : ''}
    ${passati.length ? `<details class="storico"><summary>Eventi passati · ${passati.length}</summary><ul class="wklist callist">${passati.map(riga).join('')}</ul></details>` : ''}
  </section>`;
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-evadd],[data-evdel],[data-evsq],[data-evavviso]'); if(!b || !puoOrganizzare()) return;
  if(b.dataset.evadd){ const ev = {id:uid('ev'), titolo:'', tipo:'Torneo organizzato', data:todayISO(), inizio:'', fine:'', luogo:'merate', indirizzo:'', squadre:[], note:''};
    eventiSoc.push(ev); eventoAperto = ev.id; salvaCondiviso('shared/eventi', eventiSoc); render(); return; }
  if(b.dataset.evdel){ const ev = eventiSoc.find(x => x.id===b.dataset.evdel);
    if(ev && confirm(`Eliminare l'evento "${ev.titolo||'senza titolo'}"?`)){ eventiSoc = eventiSoc.filter(x => x!==ev); salvaCondiviso('shared/eventi', eventiSoc); render(); } return; }
  if(b.dataset.evsq){ const [id, t] = b.dataset.evsq.split(':'), ev = eventiSoc.find(x => x.id===id); if(!ev) return;
    ev.squadre = (ev.squadre||[]).includes(t) ? ev.squadre.filter(x => x!==t) : [...(ev.squadre||[]), t];
    eventoAperto = id; salvaCondiviso('shared/eventi', eventiSoc); render(); return; }
  if(b.dataset.evavviso){ const ev = eventiSoc.find(x => x.id===b.dataset.evavviso); if(!ev) return;
    bozzaAvviso = {modello:'evento', squadre:[...(ev.squadre||[])], titolo:ev.titolo||'Evento', testo:testoEvento(ev)}; goTab('avvisi'); }
});
document.addEventListener('input', e => {
  const t = e.target; if(!t.dataset?.evf || !puoOrganizzare()) return;
  const ev = eventiSoc.find(x => x.id===t.dataset.evid); if(!ev) return;
  ev[t.dataset.evf] = t.value; eventoAperto = ev.id; salvaCondiviso('shared/eventi', eventiSoc);
});
document.addEventListener('change', e => {
  if(!e.target.dataset?.evf || !['eventi'].includes(tab)) return;
  eventoAperto = e.target.dataset.evid; render();
});

/* ---------- Avvisi (Comunicazioni): per una o più squadre, restano nel Portale e si mandano su WhatsApp ---------- */
const MODELLI_AVVISO = {
  libero: {label:'Avviso libero', titolo:'', testo:''},
  campo: {label:'Cambio campo', titolo:'Cambio campo', testo:'⚠️ CAMBIO CAMPO\nLa partita di [giorno] contro [avversario] si gioca a [campo, indirizzo].\nOrario invariato: ritrovo alle [ora].'},
  orario: {label:'Cambio orario', titolo:'Cambio orario', testo:'⚠️ CAMBIO ORARIO\nLa partita di [giorno] contro [avversario] inizia alle [ora] (ritrovo alle [ora ritrovo]).'},
  evento: {label:'Evento', titolo:'', testo:''}
};
let bozzaAvviso = {modello:'libero', squadre:[], titolo:'', testo:''};
function testoEvento(ev){
  const luogo = ev.luogo==='altro' ? (ev.indirizzo || 'luogo da definire') : LUOGHI_EVENTO[ev.luogo];
  return `📣 ${(ev.titolo||'Evento').toUpperCase()}\n${ev.data ? weekday(ev.data)+' '+fmtDate(ev.data) : ''}${ev.inizio ? ' dalle '+ev.inizio : ''}${ev.fine ? ' alle '+ev.fine : ''}\n📍 ${luogo}\nSquadre: ${squadreTesto(ev.squadre)}${ev.note ? '\n'+ev.note : ''}`;
}
const testoWhatsapp = a => `*Academy Casatese Merate*${a.titolo ? '\n*'+a.titolo+'*' : ''}\n${a.testo}\n(${squadreTesto(a.squadre)})`;
function viewAvvisi(){
  caricaCondivisi();
  const P = puoOrganizzare(), b = bozzaAvviso, squadre = S.teams.filter(t => !t.organizza && !t.vedeTutte);
  const elenco = avvisiSoc.slice().sort((x,y) => (y.data||'').localeCompare(x.data||''));
  const scheda = a => `<div class="gval gseg avviso"><div class="note">${fmtDate(a.data)} · ${esc(squadreTesto(a.squadre))}${a.autore ? ' · '+esc(a.autore) : ''}</div>
      ${a.titolo ? `<b>${esc(a.titolo)}</b>` : ''}<p class="gtxt" style="white-space:pre-line">${esc(a.testo)}</p>
      <div class="row" style="margin-top:6px"><a class="btn small" href="https://wa.me/?text=${encodeURIComponent(testoWhatsapp(a))}" target="_blank" rel="noopener">Manda su WhatsApp</a>
      ${P ? `<button class="btn small ghost danger" data-avdel="${a.id}">Elimina</button>` : ''}</div></div>`;
  return `${P ? `<section class="panel">
    <h2>Nuovo avviso</h2>
    <p class="hint">Scegli le squadre (nessuna = tutta la società) e un modello, completa il testo. "Pubblica" lo mette nella Home dei mister delle squadre scelte; poi mandalo su WhatsApp.</p>
    <label class="f">Squadre</label>
    <div class="gchips" style="flex-wrap:wrap">${squadre.map(t => `<button class="gchip" data-avsq="${t.id}" aria-pressed="${b.squadre.includes(t.id)}">${esc(siglaSquadra(t))}</button>`).join('')}</div>
    <div class="grid" style="margin-top:10px">
      <div><label class="f" for="av_mod">Modello</label><select id="av_mod" data-avmod="1">${Object.entries(MODELLI_AVVISO).map(([k,m]) => `<option value="${k}" ${k===b.modello?'selected':''}>${m.label}</option>`).join('')}</select></div>
      <div><label class="f" for="av_tit">Titolo</label><input id="av_tit" data-avf="titolo" value="${esc(b.titolo)}" placeholder="Es. Cambio campo U12"></div>
    </div>
    <label class="f" for="av_txt" style="margin-top:8px">Testo</label>
    <textarea id="av_txt" data-avf="testo" rows="6" placeholder="Scrivi l'avviso. Le parti tra [ ] vanno completate.">${esc(b.testo)}</textarea>
    <div class="row" style="margin-top:10px;gap:8px">
      <button class="btn primary" data-avpub="1" ${b.testo.trim() ? '' : 'disabled'}>Pubblica avviso</button>
      <a class="btn" href="https://wa.me/?text=${encodeURIComponent(testoWhatsapp(b))}" target="_blank" rel="noopener">Anteprima su WhatsApp</a>
    </div>
  </section>` : ''}
  <section class="panel">
    <h2>Avvisi pubblicati</h2>
    ${elenco.length ? elenco.map(scheda).join('') : '<p class="empty">Nessun avviso.</p>'}
  </section>`;
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-avsq],[data-avpub],[data-avdel]'); if(!b || !puoOrganizzare()) return;
  if(b.dataset.avsq){ const t = b.dataset.avsq; bozzaAvviso.squadre = bozzaAvviso.squadre.includes(t) ? bozzaAvviso.squadre.filter(x => x!==t) : [...bozzaAvviso.squadre, t]; render(); return; }
  if(b.dataset.avpub){ const a = {id:uid('av'), data:todayISO(), squadre:[...bozzaAvviso.squadre], titolo:bozzaAvviso.titolo.trim(), testo:bozzaAvviso.testo.trim(), autore:misterName || (isAdmin() ? 'Società' : '')};
    if(!a.testo) return;
    avvisiSoc.push(a); salvaCondiviso('shared/avvisi', avvisiSoc); bozzaAvviso = {modello:'libero', squadre:[], titolo:'', testo:''}; setStatus('Avviso pubblicato'); render(); return; }
  if(b.dataset.avdel){ const a = avvisiSoc.find(x => x.id===b.dataset.avdel);
    if(a && confirm('Eliminare questo avviso?')){ avvisiSoc = avvisiSoc.filter(x => x!==a); salvaCondiviso('shared/avvisi', avvisiSoc); render(); } }
});
document.addEventListener('input', e => {
  const t = e.target; if(!t.dataset?.avf) return;
  bozzaAvviso[t.dataset.avf] = t.value;
  const pub = $('[data-avpub]'); if(pub) pub.disabled = !bozzaAvviso.testo.trim();
});
document.addEventListener('change', e => {
  if(!e.target.dataset?.avmod) return;
  const m = MODELLI_AVVISO[e.target.value]; bozzaAvviso.modello = e.target.value;
  if(m.testo || !bozzaAvviso.testo.trim()){ bozzaAvviso.titolo = m.titolo; bozzaAvviso.testo = m.testo; }
  render();
});
/* Avvisi per la squadra aperta (Home dei mister): ultimi 14 giorni */
function avvisiSquadra(teamId){
  caricaCondivisi();
  const da = new Date(todayISO()+'T12:00:00'); da.setDate(da.getDate() - 14);
  const limite = da.toISOString().slice(0,10);
  return avvisiSoc.filter(a => (a.data||'') >= limite && (!(a.squadre||[]).length || a.squadre.includes(teamId))).sort((x,y) => (y.data||'').localeCompare(x.data||''));
}

/* ---------- Modifica dei calendari di tutte le squadre (organizzativo e admin) ---------- */
let partitaAperta = null;
function salvaCalendarioSquadra(teamId){
  const t = (tuttiCal||[]).find(x => x.id===teamId); if(!t || !puoOrganizzare()) return;
  tuttiCalAt = Date.now(); setStatus('Salvataggio…');
  const path = 'calendar/'+teamId;
  clearTimeout(timers[path]);
  timers[path] = setTimeout(async () => {
    try{
      const snap = await db.doc(path).get();
      await db.doc(path).set({...(snap.exists ? snap.data() : {}), matches: clone(t.matches||[])});
      if(teamId === curTeam) S.calendar = clone(t.matches||[]);
      setStatus('Salvato');
    }catch(e){ setStatus('Non salvato: riprova'); }
  }, 600);
}
/* "Modifica" sotto amichevoli e tornei di qualsiasi squadra. Le partite di campionato no: vale sempre il calendario
   ufficiale (salvo comunicati), e scripts/import-calendari/portale.mjs le riporterebbe comunque alla data ufficiale.
   Gli eventi si cambiano in Eventi. */
function modificaPartitaSquadra(m){
  if(!puoOrganizzare() || m.evento || !m.team || m.garaId || !m.friendly) return '';
  const k = `${m.team.id}|${m.id}`, f = (campo, l, tipo='text') => `<div><label class="f">${l}</label><input type="${tipo}" data-tcf="${esc(k)}|${campo}" value="${esc(m[campo]||'')}"></div>`;
  return `<details class="fredit" ${k===partitaAperta ? 'open' : ''}><summary>Modifica</summary>
    <div class="grid">${f('date','Data','date')}${f('time','Ora','time')}${f('opponent','Avversario')}${f('venue','Campo')}</div>
    <div class="row" style="margin-top:8px;justify-content:space-between">
      <label class="row" style="gap:6px"><input type="checkbox" data-tcf="${esc(k)}|home" ${m.home?'checked':''}> In casa</label>
      ${m.friendly ? `<button class="btn small ghost danger" data-tcdel="${esc(k)}">Elimina amichevole</button>` : ''}
    </div></details>`;
}
document.addEventListener('input', e => {
  const t = e.target; if(!t.dataset?.tcf || !puoOrganizzare()) return;
  const [teamId, id, campo] = t.dataset.tcf.split('|');
  const m = ((tuttiCal||[]).find(x => x.id===teamId)?.matches || []).find(x => x.id===id); if(!m) return;
  m[campo] = t.type==='checkbox' ? t.checked : t.value;
  partitaAperta = `${teamId}|${id}`; salvaCalendarioSquadra(teamId);
});
document.addEventListener('change', e => {
  if(!e.target.dataset?.tcf || tab !== 'calendariotutte') return;
  render();
});
document.addEventListener('click', e => {
  const b = e.target.closest('[data-tcdel],[data-tcadd]'); if(!b || !puoOrganizzare()) return;
  if(b.dataset.tcdel){ const [teamId, id] = b.dataset.tcdel.split('|'), t = (tuttiCal||[]).find(x => x.id===teamId); if(!t) return;
    const m = (t.matches||[]).find(x => x.id===id);
    if(m && confirm(`Eliminare l'amichevole con ${m.opponent||'avversario'}?`)){ t.matches = t.matches.filter(x => x!==m); salvaCalendarioSquadra(teamId); render(); } return; }
  if(b.dataset.tcadd){ const sel = $('#tc_squadra'), teamId = sel?.value, t = (tuttiCal||[]).find(x => x.id===teamId); if(!t) return;
    const m = {id:uid('m'), date:todayISO(), time:'', opponent:'', home:true, venue:'', friendly:true, tipo:'Amichevole', note:''};
    (t.matches ||= []).push(m); partitaAperta = `${teamId}|${m.id}`; calCategoria = teamId; calVista = 'elenco'; salvaCalendarioSquadra(teamId); render(); }
});

/* ---------- Home del responsabile organizzativo ---------- */
function viewHomeOrg(){
  caricaTuttiCal(); caricaCondivisi();
  const [sab, dom] = weekendISO(), oggi = todayISO();
  const wk = partiteTutte().filter(m => m.date===sab || m.date===dom);
  const conta = k => wk.filter(m => calDi(m)===k).length;
  const prossimi = eventiSoc.filter(e => e.data && e.data >= oggi).sort((a,b) => (a.data+(a.inizio||'')).localeCompare(b.data+(b.inizio||''))).slice(0,5);
  const avvisi = avvisiSoc.slice().sort((x,y) => (y.data||'').localeCompare(x.data||'')).slice(0,3);
  return `<section class="hhead"><h2>Organizzazione</h2><p class="note">Calendari, campi, eventi e avvisi della società</p></section>
    <div class="hgrid">
      <div class="hcard hmatch hwide"><div class="hlabel">Weekend · sab ${fmtDate(sab).slice(0,5)} e dom ${fmtDate(dom).slice(0,5)}</div>
        ${legendaCal()}
        <div class="hriep" style="grid-template-columns:repeat(3,1fr)">${Object.entries(CAL_NOMI).map(([k,n]) => `<button class="hriepbox cal-${k}" data-hgo="calendariotutte" style="border-left:5px solid var(--calc)"><span class="hriepttl">${n}</span><span><b>${conta(k)}</b> impegni</span></button>`).join('')}</div>
        <div class="row" style="margin-top:12px"><button class="btn primary small" data-hgo="calendariotutte">Apri la vista Giorno</button></div></div>
      <div class="hcard"><div class="hlabel">Prossimi eventi</div>
        ${prossimi.length ? `<ul class="todo">${prossimi.map(e => `<li><button data-hgo="eventi"><span class="tdtxt">${weekday(e.data)} ${fmtDate(e.data).slice(0,5)} · ${esc(e.titolo||'Evento')}</span><span aria-hidden="true">›</span></button></li>`).join('')}</ul>` : '<p class="note">Nessun evento in programma.</p>'}
        <div class="row" style="margin-top:10px"><button class="btn small" data-hgo="eventi">Eventi</button></div></div>
      <div class="hcard"><div class="hlabel">Ultimi avvisi</div>
        ${avvisi.length ? `<ul class="todo">${avvisi.map(a => `<li><button data-hgo="avvisi"><span class="tdtxt">${fmtDate(a.data).slice(0,5)} · ${esc(a.titolo || a.testo.slice(0,40))}</span><span aria-hidden="true">›</span></button></li>`).join('')}</ul>` : '<p class="note">Nessun avviso.</p>'}
        <div class="row" style="margin-top:10px"><button class="btn small" data-hgo="avvisi">Nuovo avviso</button></div></div>
    </div>`;
}
