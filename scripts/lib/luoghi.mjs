// Posizione dei campi da OpenStreetMap (Nominatim, gratuito): usato da geocodifica-campi.mjs e
// import-calendari/portale.mjs. Si inviano solo indirizzi pubblici dei campi, nessun dato di persone.
// Regole di Nominatim: al massimo una richiesta al secondo, applicazione identificata.
const AGENTE = 'AcademyCasateseScouting/1.0 (+https://academy-casatese.vercel.app)';
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

/** Paesi possibili dal nome del campo: "C.S.COMUNALE N. 1 (E.A) - VIMERCATE" → ["VIMERCATE"];
 *  senza trattino ("C.S.COMUNALE N. 1 VIMERCATE") si provano le ultime due parole e l'ultima */
export function paesi(campo) {
  let t = (campo ?? '').replace(/\(.*?\)/g, ' ').replace(/\b(FRAZ|FRAZIONE|FR|LOC|LOCALITA|Q\.?RE)\b.*$/i, '').replace(/\s+/g, ' ').trim();
  if (!t) return [];
  if (t.includes(' - ')) t = t.split(' - ').pop().trim();
  // via le parole del campo ("CAMPO N.1", "E.A."): restano i nomi, di cui si provano le ultime tre, due e una
  const parole = t.split(/[\s/]+/).filter((w) => /^[A-ZÀ-Ú']{2,}$/i.test(w) && !/^(COMUNALE|CAMPO|SPORTIVO|CENTRO|STADIO|ORATORIO|PARROCCHIALE|EA|N)$/i.test(w));
  return [...new Set([parole.slice(-3).join(' '), parole.slice(-2).join(' '), parole.slice(-1)[0]].filter(Boolean))];
}
export const paese = (campo) => paesi(campo)[0] ?? '';
/** "VIA DEGLI ATLETI,1" → "Via degli Atleti 1" (Nominatim trova meglio senza sigle e virgole attaccate) */
export const via = (s) => (s ?? '').replace(/\bS\.N\.C\.?|\bSNC\b/gi, '').replace(/,/g, ' ').replace(/\s+/g, ' ').trim();

let ultima = 0;
const norm = (t) => String(t ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z]/g, '');

/** Prima posizione trovata per il testo q. Con `paese`, solo se OpenStreetMap la mette in quel comune
 *  (non basta la provincia: evita la "Via Buozzi" di un altro comune della provincia di Lecco) */
export async function cerca(q, paese) {
  const attesa = 1100 - (Date.now() - ultima);
  if (attesa > 0) await pausa(attesa);
  ultima = Date.now();
  const u = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&countrycodes=it&q=${encodeURIComponent(q)}`;
  const r = await fetch(u, { headers: { 'User-Agent': AGENTE, 'Accept-Language': 'it' } });
  if (!r.ok) throw new Error(`OpenStreetMap ha risposto ${r.status}`);
  const risultati = await r.json();
  const p = norm(paese);
  const x = p
    ? risultati.find((y) => ['city', 'town', 'village', 'municipality', 'suburb', 'hamlet', 'quarter', 'neighbourhood']
      .map((k) => norm(y.address?.[k])).some((n) => n.length >= 4 && (n === p || n.includes(p) || p.includes(n))))
    : risultati[0];
  return x ? { lat: Number(Number(x.lat).toFixed(6)), lon: Number(Number(x.lon).toFixed(6)) } : null;
}

/** Coordinate di un campo: dall'indirizzo (se è davvero in quel paese), se no dal centro del paese.
 *  tipo: 'indirizzo' | 'paese' */
export async function posizioneCampo(campo, indirizzo) {
  const tutti = paesi(campo);
  for (const x of tutti) if (indirizzo) { const c = await cerca(`${via(indirizzo)}, ${x}`, x); if (c) return { ...c, tipo: 'indirizzo' }; }
  for (const x of tutti) { const c = await cerca(`${x}, Lombardia`); if (c) return { ...c, tipo: 'paese' }; }
  for (const x of tutti) { const c = await cerca(x); if (c) return { ...c, tipo: 'paese' }; }
  return null;
}
