/* Portale · Famiglia (0031): entra col PIN del ragazzo e vede SOLO lui: convocazioni (con "ci sarà / non ci sarà"),
   calendario della squadra, avvisi, anagrafica (contatti dei genitori e taglie modificabili), iscrizione e quote.
   Tutto arriva da famiglia_get(pin); si scrive solo con famiglia_contatti e famiglia_rispondi. */

let famPin = null, F = null, famTab = 'home', famAt = 0, famBozza = null;
async function famigliaLogin(pin){
  if(!supabaseClient) return false;
  const { data, error } = await supabaseClient.rpc('famiglia_get', { p_pin: pin });
  if(error || !data) return false;
  famPin = pin; F = data; famAt = Date.now(); ROLE = 'famiglia'; hashLocked = true; teamsLoaded = true;
  if(F.squadra){ S.teams = [F.squadra]; curTeam = F.squadra.id; }   // per i nomi delle partite nel calendario
  setInterval(aggiornaFamiglia, 60000);
  render();
  return true;
}
async function aggiornaFamiglia(forza){
  if(!famPin || !supabaseClient || (!forza && Date.now() - famAt < 55000)) return;
  const { data, error } = await supabaseClient.rpc('famiglia_get', { p_pin: famPin });
  if(!error && data){ F = data; famAt = Date.now(); if(!famBozza) render(); }
}
const chiavePartita = c => c.calId || `${c.date}|${c.opponent}`;
const mapsDi = c => c.ll ? 'https://www.google.com/maps/dir/?api=1&destination=' + c.ll
  : (c.venue || c.address) ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent([c.venue, c.address].filter(Boolean).join(', ')) : '';

function viewFamigliaHome(){
  const oggi = todayISO(), conv = (F.convocazioni||[]).filter(c => c.date && c.date >= oggi).sort((a,b) => (a.date+(a.time||'')).localeCompare(b.date+(b.time||'')));
  const d = F.dati || {}, g = giorniA(d.certificato_scadenza);
  const cert = g == null ? '' : g < 0 ? `<div class="hcard hwide avvisocert ko"><b>Certificato medico scaduto</b><p class="note">Era valido fino al ${fmtDate(d.certificato_scadenza)}: senza certificato il ragazzo non può giocare. Portatelo in segreteria.</p></div>`
    : g <= 30 ? `<div class="hcard hwide avvisocert"><b>Certificato medico in scadenza</b><p class="note">Scade il ${fmtDate(d.certificato_scadenza)} (tra ${g} giorni): prenotate la visita.</p></div>` : '';
  const scheda = c => {
    const k = chiavePartita(c), r = (F.risposte||{})[k]?.risposta, con = c.stato === 'CON', maps = mapsDi(c);
    const ritrovo = c.meetTime || minus75(c.time);
    return `<div class="hcard hwide hmatch convfam ${con ? '' : 'nc'}">
      <div class="hlabel">${con ? 'Convocato' : CALLUP_LABELS[c.stato] || 'Non convocato'} · ${weekday(c.date)} ${fmtDate(c.date)}</div>
      <div class="hbig">${esc(c.home ? `${F.squadra?.category || 'Academy'} - ${c.opponent||''}` : `${c.opponent||''} - ${F.squadra?.category || 'Academy'}`)}</div>
      ${con ? `<div class="note">${c.time ? `Inizio ${esc(c.time)}` : ''}${ritrovo ? ` · <b>ritrovo alle ${esc(ritrovo)}</b>` : ''}${c.meetAddress ? ' a '+esc(c.meetAddress) : ''}</div>
        <div class="note">${esc([c.venue, c.address].filter(Boolean).join(', '))}${maps ? ` · <a href="${esc(maps)}" target="_blank" rel="noopener">📍 Apri in Google Maps</a>` : ''}</div>
        ${c.note ? `<p class="note">${esc(c.note)}</p>` : ''}
        <div class="row" style="margin-top:12px;gap:8px">
          <button class="btn ${r==='si' ? 'primary' : ''}" data-famrisp="${esc(k)}" data-v="si">✓ Ci sarà</button>
          <button class="btn ${r==='no' ? 'danger-on' : ''}" data-famrisp="${esc(k)}" data-v="no">✗ Non ci sarà</button>
        </div>
        ${r ? `<p class="note" style="margin-top:6px">Risposta mandata: ${r==='si' ? 'ci sarà' : 'non ci sarà'}. Potete cambiarla.</p>` : '<p class="note" style="margin-top:6px">Fate sapere al mister se ci sarà.</p>'}` : '<p class="note">Per questa partita non è convocato.</p>'}
    </div>`;
  };
  const avvisi = (F.avvisi||[]).slice().sort((a,b) => (b.data||'').localeCompare(a.data||''));
  const prossima = (F.calendario||[]).filter(m => m.date && m.date >= oggi).sort((a,b) => (a.date+(a.time||'')).localeCompare(b.date+(b.time||'')))[0];
  return `${cert}
    ${conv.length ? conv.map(scheda).join('') : `<div class="hcard hwide"><div class="hlabel">Convocazioni</div><p class="note">Nessuna convocazione per ora.${prossima ? ` Prossima partita della squadra: ${weekday(prossima.date)} ${fmtDate(prossima.date)} · ${esc(prossima.opponent||'')}.` : ''}</p></div>`}
    ${avvisi.length ? `<div class="hcard hwide havvisi"><div class="hlabel">Avvisi della società</div>${avvisi.slice(0,3).map(a => `<div class="gval gseg avviso"><div class="note">${fmtDate(a.data)}</div>${a.titolo ? `<b>${esc(a.titolo)}</b>` : ''}<p class="gtxt" style="white-space:pre-line">${esc(a.testo)}</p></div>`).join('')}</div>` : ''}`;
}
function viewFamigliaCalendario(){
  const oggi = todayISO();
  const ms = (F.calendario||[]).map(m => ({...m, team: F.squadra}))
    .concat((F.eventi||[]).map(eventoCome)).filter(m => !m.date || m.date >= oggi)
    .sort((a,b) => ((a.date||'')+(a.time||'').padStart(5,'0')).localeCompare((b.date||'')+(b.time||'').padStart(5,'0')));
  return `<section class="panel"><h2>Calendario · ${esc(F.squadra?.category || '')}</h2>${legendaCal()}
    ${ms.length ? `<ul class="wklist callist">${listaCalendario(ms, false)}</ul>` : '<p class="empty">Nessuna partita in programma.</p>'}</section>`;
}
function viewFamigliaAnagrafica(){
  const r = F.ragazzo || {}, d = famBozza || F.dati || {};
  const f = (k, l, tipo='text') => `<div><label class="f">${l}</label><input type="${tipo}" data-famf="${k}" value="${esc(d[k] ?? '')}"></div>`;
  return `<section class="panel"><h2>${esc(r.nome || '')}</h2>
    <div class="grid">
      <div><label class="f">Squadra</label><input value="${esc(F.squadra?.category || '')}" readonly></div>
      <div><label class="f">Data di nascita</label><input value="${esc(fmtDate(r.data_nascita) || '—')}" readonly></div>
      <div><label class="f">Ruolo</label><input value="${esc(r.ruolo ? r.ruolo[0].toUpperCase() + r.ruolo.slice(1) : '—')}" readonly></div>
      <div><label class="f">Numero</label><input value="${esc(r.numero ?? '—')}" readonly></div>
    </div>
    <h3 class="convh3" style="margin-top:16px">Contatti dei genitori e taglie</h3>
    <p class="hint">Teneteli aggiornati: servono al mister e alla segreteria.</p>
    <div class="grid">${f('genitore1_nome','Genitore 1')}${f('genitore1_tel','Telefono','tel')}${f('genitore1_email','Email','email')}
      ${f('genitore2_nome','Genitore 2')}${f('genitore2_tel','Telefono','tel')}${f('genitore2_email','Email','email')}
      ${f('taglia_divisa','Taglia divisa')}${f('taglia_tuta','Taglia tuta')}</div>
    <div class="row" style="margin-top:12px"><button class="btn primary" data-famsalva="1" ${famBozza ? '' : 'disabled'}>Salva</button>${famBozza ? '<span class="note">Modifiche da salvare</span>' : ''}</div>
  </section>`;
}
function viewFamigliaSegreteria(){
  const d = F.dati || {}, g = giorniA(d.certificato_scadenza), quote = d.quote || [];
  return `<section class="panel"><h2>Segreteria</h2>
    <div class="kpis">
      <div class="kpi"><b>${d.iscrizione_completa ? '✓' : '—'}</b><span>${d.iscrizione_completa ? 'Iscrizione completata' : 'Iscrizione da completare'}</span>${d.documenti_mancanti ? `<small>Mancano: ${esc(d.documenti_mancanti)}</small>` : ''}</div>
      <div class="kpi"><b>${d.certificato_scadenza ? fmtDate(d.certificato_scadenza) : '—'}</b><span>Certificato medico valido fino al</span>${g != null && g < 0 ? '<small class="lowc">Scaduto</small>' : g != null && g <= 30 ? '<small>In scadenza</small>' : ''}</div>
    </div>
    <h3 class="convh3" style="margin-top:16px">Quote</h3>
    ${quote.length ? `<div class="tblwrap"><table class="stbl"><thead><tr><th class="nm">Rata</th><th>Importo</th><th>Scadenza</th><th>Stato</th></tr></thead><tbody>
      ${quote.map(q => `<tr><td class="nm">${esc(q.rata||'')}</td><td>${q.importo ? '€ '+esc(q.importo) : ''}</td><td>${fmtDate(q.scadenza)}</td><td>${q.pagata ? '✓ Pagata' : '<b>Da pagare</b>'}</td></tr>`).join('')}</tbody></table></div>`
      : '<p class="note">Nessuna rata registrata.</p>'}
    <p class="note" style="margin-top:10px">Per dubbi su iscrizione e quote rivolgetevi alla segreteria della società.</p>
  </section>`;
}
const FAM_TABS = [['home','Home'],['calendario','Calendario'],['anagrafica','Anagrafica'],['segreteria','Segreteria']];
function renderFamiglia(){
  aggiornaFamiglia();
  $('#demo').innerHTML = ''; $('#demo').classList.add('hidden');
  $('#ctx').innerHTML = `<span class="badge coach">Famiglia</span><span class="teamname">${esc(F.ragazzo?.nome || '')}</span><button class="logout" data-act="logout">Esci</button>`;
  $('#matchline').textContent = F.squadra?.category || '';
  $('#areanav').classList.add('hidden'); $('#subtabs').classList.add('hidden');
  $('#tabs').innerHTML = FAM_TABS.map(([k,l]) => `<button class="tab" data-famtab="${k}" aria-selected="${k===famTab}">${l}</button>`).join('');
  $('#tabs').classList.remove('hidden');
  $('#view').innerHTML = famTab==='calendario' ? viewFamigliaCalendario() : famTab==='anagrafica' ? viewFamigliaAnagrafica()
    : famTab==='segreteria' ? viewFamigliaSegreteria() : `<section class="hhead"><h2>${esc(F.ragazzo?.nome || '')}</h2><p class="note">${esc(F.squadra?.category || '')}</p></section><div class="hgrid">${viewFamigliaHome()}</div>`;
}
document.addEventListener('click', async e => {
  if(ROLE !== 'famiglia') return;
  const b = e.target.closest('[data-famtab],[data-famrisp],[data-famsalva]'); if(!b) return;
  if(b.dataset.famtab){ famTab = b.dataset.famtab; render(); window.scrollTo(0,0); return; }
  if(b.dataset.famrisp){
    const k = b.dataset.famrisp, v = b.dataset.v;
    const { error } = await supabaseClient.rpc('famiglia_rispondi', { p_pin: famPin, p_partita: k, p_risposta: v, p_nota: '' });
    if(error){ setStatus('Risposta non mandata: riprova'); return; }
    (F.risposte ||= {})[k] = {risposta: v}; setStatus('Risposta mandata al mister'); render(); return;
  }
  if(b.dataset.famsalva && famBozza){
    const { error } = await supabaseClient.rpc('famiglia_contatti', { p_pin: famPin, p_dati: famBozza });
    if(error){ setStatus('Non salvato: riprova'); return; }
    F.dati = {...(F.dati||{}), ...famBozza}; famBozza = null; setStatus('Salvato'); render();
  }
});
document.addEventListener('input', e => {
  if(ROLE !== 'famiglia' || !e.target.dataset?.famf) return;
  famBozza ||= {...(F.dati||{})}; famBozza[e.target.dataset.famf] = e.target.value;
  const s = $('[data-famsalva]'); if(s) s.disabled = false;
});
