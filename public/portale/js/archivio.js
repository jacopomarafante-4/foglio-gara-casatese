/* Portale · Società → Archivio documenti (0039): i PDF scaricati dal Portale (convocazioni, fogli gara, report,
   distinte, programmi, comunicazioni), con chi e quando. Li vedono e li scaricano admin e direttori; li elimina l'admin.
   L'elenco non porta con sé i file: si scaricano uno alla volta con archivio_scarica(). */
let archivioDati = null, archivioErrore = '', archivioFiltri = {tipo:'', squadra:'', cerca:''}, archivioMostra = 50;
async function caricaArchivio(){
  archivioDati = undefined; archivioErrore = '';
  const { data, error } = await supabaseClient.from('archivio_documenti')
    .select('id, nome, tipo, squadra_id, squadra, autore, dimensione, created_at').order('created_at', {ascending: false}).limit(2000);
  if(error){ archivioErrore = /archivio_documenti|schema cache|does not exist/i.test(error.message) ? 'Archivio non ancora attivo: serve la migrazione 0039.' : 'Archivio non disponibile.'; archivioDati = null; }
  else archivioDati = data || [];
  if(tab === 'archivio') render();
}
const kb = n => n > 1048576 ? (n / 1048576).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';
function viewArchivio(){
  if(!supabaseClient || RUNNING_IN_CLAUDE) return '<section class="panel"><h2>Archivio documenti</h2><p class="empty">L\'archivio si vede solo dal sito.</p></section>';
  if(archivioDati === null && !archivioErrore) caricaArchivio();
  const testa = `<h2>Archivio documenti</h2>
    <p class="hint">Ogni PDF scaricato dal Portale (convocazioni, fogli gara, report, distinte, programmi, comunicazioni) ne lascia qui una copia, con chi l'ha scaricato e quando. I fogli con i PIN delle famiglie non si archiviano.</p>`;
  if(archivioErrore) return `<section class="panel">${testa}<p class="empty">${esc(archivioErrore)}</p></section>`;
  if(!archivioDati) return `<section class="panel">${testa}<p class="note">Carico l'archivio…</p></section>`;
  const f = archivioFiltri, q = f.cerca.trim().toLowerCase();
  const tipi = [...new Set(archivioDati.map(d => d.tipo))].sort(), squadre = [...new Set(archivioDati.map(d => d.squadra).filter(Boolean))].sort();
  const lista = archivioDati.filter(d => (!f.tipo || d.tipo === f.tipo) && (!f.squadra || d.squadra === f.squadra)
    && (!q || [d.nome, d.autore, d.squadra, d.tipo].join(' ').toLowerCase().includes(q)));
  let mese = '';
  const righe = lista.slice(0, archivioMostra).map(d => {
    const m = new Date(d.created_at).toLocaleDateString('it-IT', {month: 'long', year: 'numeric', timeZone: 'Europe/Rome'});
    const testaMese = m !== mese ? `<li class="calmese">${esc(m)}</li>` : ''; mese = m;
    const quando = new Date(d.created_at).toLocaleString('it-IT', {day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome'});
    return testaMese + `<li class="archriga"><div class="archinfo"><span class="tipochip">${esc(d.tipo)}</span> <b>${esc(d.nome)}</b>
        <div class="note">${[quando, d.squadra, d.autore, kb(d.dimensione)].filter(Boolean).map(esc).join(' · ')}</div></div>
      <div class="row" style="gap:6px"><button class="btn small" data-archscarica="${esc(d.id)}">Scarica</button>
        ${isDirettore() ? '' : `<button class="btn small ghost danger" data-archdel="${esc(d.id)}">Elimina</button>`}</div></li>`;
  }).join('');
  const sel = (k, voci, tutti) => `<select data-archf="${k}" aria-label="${tutti}"><option value="">${tutti}</option>${voci.map(v => `<option ${v===f[k]?'selected':''}>${esc(v)}</option>`).join('')}</select>`;
  return `<section class="panel">${testa}
    <div class="grid" style="margin-bottom:10px">${sel('tipo', tipi, 'Tutti i documenti')}${sel('squadra', squadre, 'Tutte le squadre')}
      <input type="search" data-archf="cerca" value="${esc(f.cerca)}" placeholder="Cerca per nome, squadra o chi" aria-label="Cerca nell'archivio"></div>
    <p class="note">${lista.length} ${lista.length === 1 ? 'documento' : 'documenti'}</p>
    ${lista.length ? `<ul class="wklist archlista">${righe}</ul>` : '<p class="empty">Nessun documento.</p>'}
    ${lista.length > archivioMostra ? '<div class="row" style="margin-top:10px"><button class="btn small" data-archaltri="1">Mostra altri</button></div>' : ''}
  </section>`;
}
document.addEventListener('change', e => { const k = e.target.dataset?.archf; if(!k || k === 'cerca') return; archivioFiltri[k] = e.target.value; archivioMostra = 50; render(); });
document.addEventListener('input', e => { if(e.target.dataset?.archf !== 'cerca') return;
  archivioFiltri.cerca = e.target.value; const pos = e.target.selectionStart; render();
  const c = document.querySelector('[data-archf="cerca"]'); if(c){ c.focus(); c.setSelectionRange(pos, pos); } });
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-archscarica],[data-archdel],[data-archaltri]'); if(!b) return;
  if(b.dataset.archaltri){ archivioMostra += 50; render(); return; }
  if(b.dataset.archscarica){
    const d = (archivioDati || []).find(x => x.id === b.dataset.archscarica); if(!d) return;
    setStatus('Scarico…');
    const { data, error } = await supabaseClient.rpc('archivio_scarica', {p_id: d.id});
    if(error || !data){ setStatus('Download non riuscito'); return; }
    const bin = Uint8Array.from(atob(data), c => c.charCodeAt(0));
    browserDownload(d.nome, new Blob([bin], {type: 'application/pdf'})); setStatus('Scaricato');
    return;
  }
  if(b.dataset.archdel){
    const d = (archivioDati || []).find(x => x.id === b.dataset.archdel);
    if(!d || !confirm(`Eliminare dall'archivio "${d.nome}"?`)) return;
    const { error } = await supabaseClient.from('archivio_documenti').delete().eq('id', d.id);
    if(error){ setStatus('Non eliminato'); return; }
    archivioDati = archivioDati.filter(x => x.id !== d.id); setStatus('Eliminato'); render();
  }
});
