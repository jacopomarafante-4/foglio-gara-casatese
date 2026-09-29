/* Portale · Società → Storico modifiche (0048), solo admin.
   Per ogni scheda del Portale (rosa, presenze e partite, foglio gara, calendario di ogni squadra; squadre, schemi,
   eventi, avvisi) le versioni precedenti degli ultimi 30 giorni, al massimo una ogni 10 minuti, con chi le aveva salvate.
   "Ripristina" rimette quella versione come nuova versione (ripristina_doc): anche il ripristino si può annullare. */
let modificheDati = null, modificheErrore = '', modificheAperta = '';
async function caricaModifiche(){
  modificheDati = undefined; modificheErrore = '';
  const [docs, st] = await Promise.all([
    supabaseClient.from('docs').select('path, versione, updated_at, modificato_da'),
    supabaseClient.from('docs_storico').select('id, path, versione, salvato_il, da, sostituita').order('sostituita', {ascending: false}).limit(3000),
  ]);
  const err = docs.error || st.error;
  if(err){ modificheErrore = /docs_storico|versione|schema cache|does not exist/i.test(err.message) ? 'Storico non ancora attivo: serve la migrazione 0048.' : 'Storico non disponibile.'; modificheDati = null; }
  else modificheDati = { docs: docs.data || [], storico: st.data || [] };
  if(tab === 'modifiche') render();
}
function nomeScheda(path){
  const [tipo, id] = path.split('/'), t = S.teams.find(x => x.id === id), sq = t ? (t.category || t.name) : id;
  const tipi = { roster: 'Rosa', registro: 'Presenze, partite e test', sheet: 'Foglio gara e convocazioni', calendar: 'Calendario' };
  const condivisi = { teams: 'Squadre, mister e PIN', schemes: 'Calci piazzati della società', eventi: 'Eventi', avvisi: 'Avvisi' };
  return tipo === 'shared' ? (condivisi[id] || id) : `${tipi[tipo] || tipo} · ${sq}`;
}
const quandoBreve = d => d ? new Date(d).toLocaleString('it-IT', {weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome'}) : '–';
function viewModifiche(){
  const testa = `<h2>Storico modifiche</h2>
    <p class="hint">Se una modifica nel Portale è sbagliata o è andata persa, qui ci sono le versioni precedenti di ogni scheda degli ultimi 30 giorni (al massimo una ogni 10 minuti). <b>Ripristina</b> rimette quella versione; la versione di adesso resta nello storico, quindi si può tornare indietro.</p>`;
  if(!supabaseClient || RUNNING_IN_CLAUDE) return `<section class="panel">${testa}<p class="empty">Lo storico si vede solo dal sito.</p></section>`;
  if(modificheDati === null && !modificheErrore) caricaModifiche();
  if(modificheErrore) return `<section class="panel">${testa}<p class="empty">${esc(modificheErrore)}</p></section>`;
  if(!modificheDati) return `<section class="panel">${testa}<p class="note">Carico lo storico…</p></section>`;
  const perPath = new Map();
  modificheDati.storico.forEach(v => { if(!perPath.has(v.path)) perPath.set(v.path, []); perPath.get(v.path).push(v); });
  const schede = modificheDati.docs.slice().sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''));
  const righe = schede.map(d => {
    const versioni = perPath.get(d.path) || [], aperta = modificheAperta === d.path;
    return `<li class="modriga${aperta ? ' aperta' : ''}">
      <button class="modtesta" data-modapri="${esc(d.path)}" aria-expanded="${aperta}">
        <span><b>${esc(nomeScheda(d.path))}</b><span class="note">Ultima modifica ${esc(quandoBreve(d.updated_at))}${d.modificato_da ? ' · ' + esc(d.modificato_da) : ''}</span></span>
        <span class="note">${versioni.length ? `${versioni.length} ${versioni.length === 1 ? 'versione' : 'versioni'} prima` : 'nessuna versione prima'} ›</span>
      </button>
      ${aperta ? (versioni.length ? `<ul class="modversioni">${versioni.map(v => `<li><span>${esc(quandoBreve(v.salvato_il))}${v.da ? ' · ' + esc(v.da) : ''}<span class="note"> · sostituita ${esc(quandoBreve(v.sostituita))}</span></span>
          <button class="btn small" data-modripristina="${v.id}">Ripristina</button></li>`).join('')}</ul>`
        : '<p class="note" style="margin:6px 0 0">Nessuna versione precedente negli ultimi 30 giorni.</p>') : ''}
    </li>`;
  }).join('');
  return `<section class="panel">${testa}<ul class="modlista">${righe}</ul></section>`;
}
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-modapri],[data-modripristina]'); if(!b) return;
  if(b.dataset.modapri !== undefined){ modificheAperta = modificheAperta === b.dataset.modapri ? '' : b.dataset.modapri; render(); return; }
  const v = (modificheDati?.storico || []).find(x => String(x.id) === b.dataset.modripristina); if(!v) return;
  if(!confirm(`Rimettere "${nomeScheda(v.path)}" com'era ${quandoBreve(v.salvato_il)}?\nLa versione di adesso resta nello storico.`)) return;
  setStatus('Ripristino…');
  const { error } = await supabaseClient.rpc('ripristina_doc', { p_storico: v.id });
  if(error){ setStatus('Ripristino non riuscito'); alert('Ripristino non riuscito: ' + error.message); return; }
  setStatus('Ripristinato'); caricaModifiche();
});
