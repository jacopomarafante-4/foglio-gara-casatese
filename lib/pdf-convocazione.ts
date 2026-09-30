// PDF della convocazione (come convocazionePage/convocazioneAdbSheet/downloadConvocazione di pdf.js), disegnato su tela.
// Agonistica: A4 verticale con gara, impegno, campo e ritrovo (con link a Google Maps), note e tutti i giocatori con lo stato.
// Attività di base: A4 orizzontale, una colonna per partita (1–4) con i soli convocati. Solo nel browser.
import { BLU_SCURO, INK, LABEL_BG, LINE_C, LINK_C, MUTED, T, font, intestazioneSocieta, stemmi, striscia, tela, type Ctx } from '@/lib/tela';
import { fmtData, giorno, type Partita } from '@/lib/programma';
import { linkCampo, linkLuogo, type Campi } from '@/lib/campi';
import { STATI_CONVOCAZIONE, luogoPartita, menoSettantacinque, ritrovo, testoLuogo, type FoglioPartita, type PartitaAdb } from '@/lib/foglio';

type Link = { x: number; y: number; w: number; h: number; url: string; pw: number; ph: number };
type Dati = { foglio: FoglioPartita; nomeSquadra: string; categoria: string; giocatori: { id: string; name: string }[];
  calendario: (Partita & { id: string; ll?: string })[]; campi: Campi; mister: string; adb: boolean };

function spezza(x: Ctx, testo: string, larg: number, maxRighe: number, size: number) {
  font(x, size, 600);
  const out: string[] = [];
  for (const para of String(testo || '').split('\n')) {
    let line = '';
    for (const w of para.split(/\s+/).filter(Boolean)) { const q = line ? line + ' ' + w : w; if (x.measureText(q).width > larg && line) { out.push(line); line = w; } else line = q; }
    out.push(line);
  }
  while (out.length > 1 && !out[out.length - 1]) out.pop();
  if (out.length > maxRighe) { out.length = maxRighe; out[maxRighe - 1] = out[maxRighe - 1].replace(/\s*\S*$/, '') + ' …'; }
  return out;
}

function paginaAgonistica(d: Dati, logo: HTMLImageElement | null, figc: HTMLImageElement | null) {
  const PW = 800, PH = 1131, s = d.foglio, links: Link[] = [];
  const [c, x] = tela(PW, PH, 2);
  const mx = 40, tw = PW - mx * 2;
  let y = 30;
  y += intestazioneSocieta(x, PW, mx, y, logo, figc, d.categoria) + 14;
  const riga = (label: string, valore: string, lw: number, h: number, fs?: number) => {
    x.fillStyle = LABEL_BG; x.fillRect(mx, y, lw, h);
    x.strokeStyle = LINE_C; x.lineWidth = 1; x.strokeRect(mx, y, lw, h); x.strokeRect(mx + lw, y, tw - lw, h);
    T(x, label, mx + 10, y + h / 2 + 1, { size: 12, weight: 700, base: 'middle', color: INK });
    T(x, valore || '—', mx + lw + 10, y + h / 2 + 1, { size: fs || 13, weight: 600, base: 'middle', max: tw - lw - 20 });
  };
  riga('GARA', s.home ? `${d.nomeSquadra} - ${s.opponent || 'Avversario'}` : `${s.opponent || 'Avversario'} - ${d.nomeSquadra}`, 130, 34); y += 34;
  const cols: [string, string][] = [['IMPEGNO', s.convType || ''], ['DATA', s.date ? fmtData(s.date) : ''], ['ORARIO RITROVO', ritrovo(s)], ['ORARI PARTITA', s.time || '']];
  const cw = tw / 4;
  cols.forEach(([l], i) => { x.fillStyle = LABEL_BG; x.fillRect(mx + i * cw, y, cw, 26); x.strokeStyle = LINE_C; x.strokeRect(mx + i * cw, y, cw, 26); T(x, l, mx + i * cw + cw / 2, y + 14, { size: 10.5, weight: 700, align: 'center', base: 'middle', color: INK, max: cw - 8 }); });
  y += 26;
  cols.forEach(([, v], i) => { x.strokeStyle = LINE_C; x.strokeRect(mx + i * cw, y, cw, 30); T(x, v || '—', mx + i * cw + cw / 2, y + 16, { size: 12.5, weight: 600, align: 'center', base: 'middle', max: cw - 10 }); });
  y += 30;
  const rigaLink = (label: string, testo: string, url: string) => {
    riga(label, url ? ' ' : testo, 180, 32);
    if (url) {
      const lx = mx + 190, maxw = tw - 180 - 20 - 130;
      T(x, testo, lx, y + 17, { size: 13, weight: 600, base: 'middle', color: LINK_C, max: maxw });
      const uw = Math.min(x.measureText(testo).width, maxw);
      x.strokeStyle = LINK_C; x.lineWidth = 0.8; x.beginPath(); x.moveTo(lx, y + 24); x.lineTo(lx + uw, y + 24); x.stroke();
      T(x, 'Apri in Google Maps ›', PW - mx - 10, y + 17, { size: 10.5, weight: 600, base: 'middle', align: 'right', color: LINK_C });
      links.push({ x: mx + 180, y, w: tw - 180, h: 32, url, pw: PW, ph: PH });
    }
    y += 32;
  };
  const luogo = luogoPartita(s, d.calendario), dove = (s.meetAddress || '').trim();
  rigaLink('CAMPO DI GIOCO', testoLuogo(luogo), linkLuogo(d.campi, luogo));
  rigaLink('RITROVO', dove || 'Al campo di gioco', dove ? linkCampo(d.campi, dove) : '');
  {
    const lw = 180, lh = 17, righe = spezza(x, s.convNotes || '', tw - lw - 20, 8, 12.5);
    const h = Math.max(32, righe.length * lh + 14);
    x.fillStyle = LABEL_BG; x.fillRect(mx, y, lw, h);
    x.strokeStyle = LINE_C; x.lineWidth = 1; x.strokeRect(mx, y, lw, h); x.strokeRect(mx + lw, y, tw - lw, h);
    T(x, 'NOTE', mx + 10, y + h / 2 + 1, { size: 12, weight: 700, base: 'middle', color: INK });
    if (!righe.join('').trim()) T(x, '—', mx + lw + 10, y + h / 2 + 1, { size: 13, weight: 600, base: 'middle' });
    else righe.forEach((r, i) => T(x, r, mx + lw + 10, y + 7 + lh * i + lh / 2 + 1, { size: 12.5, weight: 600, base: 'middle' }));
    y += h + 22;
  }
  const statW = 74, nomeW = tw - statW * 5;
  x.fillStyle = INK; x.fillRect(mx, y, tw, 26);
  T(x, 'NOME E COGNOME', mx + 10, y + 14, { size: 11, weight: 700, base: 'middle', color: '#fff' });
  STATI_CONVOCAZIONE.forEach((st, i) => T(x, st, mx + nomeW + i * statW + statW / 2, y + 14, { size: 11, weight: 700, align: 'center', base: 'middle', color: '#fff' }));
  y += 26;
  const rh = Math.min(28, Math.max(16, (PH - y - 40) / Math.max(d.giocatori.length, 1)));
  d.giocatori.forEach((p, i) => {
    x.fillStyle = i % 2 ? '#F7F7F5' : '#fff'; x.fillRect(mx, y, tw, rh);
    x.strokeStyle = LINE_C; x.strokeRect(mx, y, tw, rh);
    T(x, p.name, mx + 10, y + rh / 2 + 1, { size: Math.min(12, rh * 0.5), weight: 600, base: 'middle', max: nomeW - 16 });
    const cur = (s.callup ?? {})[p.id];
    STATI_CONVOCAZIONE.forEach((st, ci) => {
      x.strokeStyle = LINE_C; x.beginPath(); x.moveTo(mx + nomeW + ci * statW, y); x.lineTo(mx + nomeW + ci * statW, y + rh); x.stroke();
      if (cur === st) T(x, 'X', mx + nomeW + ci * statW + statW / 2, y + rh / 2 + 1, { size: Math.min(13, rh * 0.55), weight: 700, align: 'center', base: 'middle' });
    });
    y += rh;
  });
  T(x, 'CON: convocato   NC: non convocato   INF: infortunato   SQL: squalificato   ND: non disponibile', mx, y + 16, { size: 10, color: MUTED, max: tw });
  return { c, links };
}

function foglioAdb(d: Dati, pp: PartitaAdb[], logo: HTMLImageElement | null, figc: HTMLImageElement | null) {
  const PW = 1188, PH = 840, links: Link[] = [];
  const [c, x] = tela(PW, PH, 2.2);
  const mx = 32, tw = PW - mx * 2;
  let y = 22;
  y += intestazioneSocieta(x, PW, mx, y, logo, figc, d.categoria) + 8;
  striscia(x, mx, y, tw, 4); y += 12;
  const n = Math.max(1, pp.length), labW = 150, colW = (tw - labW) / n, colX = (i: number) => mx + labW + i * colW;
  const dati = pp.map((p) => {
    const m = p.calId ? d.calendario.find((q) => q.id === p.calId) : undefined;
    const luogo = m && m.venue ? { venue: m.venue, address: m.address || '', ll: m.ll || '' } : { venue: p.venue || '', address: p.address || '', ll: p.ll || '' };
    const dove = (p.meetAddress || '').trim();
    const testi: Record<string, string> = {
      Data: p.date ? `${giorno(p.date)} ${fmtData(p.date)}` : '',
      Indirizzo: testoLuogo(luogo) + (dove ? `\nRitrovo presso: ${dove}` : ''),
      'Inizio gara ore': p.time || '', 'Ritrovo ore': p.meetTime || menoSettantacinque(p.time) || '',
      Avversario: p.opponent ? `${p.opponent}${p.home ? ' (casa)' : ' (trasferta)'}` : '',
      'Mister presente': p.mr || d.mister || '', Note: p.note || '',
    };
    return { testi, url: dove ? linkCampo(d.campi, dove) : linkLuogo(d.campi, luogo), conv: d.giocatori.filter((g) => (p.conv ?? []).includes(g.id)) };
  });
  const cella = (px: number, py: number, w: number, h: number, fill?: string) => { if (fill) { x.fillStyle = fill; x.fillRect(px, py, w, h); } x.strokeStyle = LINE_C; x.lineWidth = 1; x.strokeRect(px, py, w, h); };
  cella(mx, y, labW, 28, LABEL_BG);
  pp.forEach((_, i) => { cella(colX(i), y, colW, 28, BLU_SCURO); T(x, `${n > 1 ? `PARTITA ${i + 1}` : 'PARTITA'} · ${dati[i].conv.length} CONVOCATI`, colX(i) + colW / 2, y + 15, { size: 12.5, weight: 700, align: 'center', base: 'middle', color: '#fff', max: colW - 10 }); });
  y += 28;
  for (const [et, maxR] of [['Data', 1], ['Indirizzo', 3], ['Inizio gara ore', 1], ['Ritrovo ore', 1], ['Avversario', 2], ['Mister presente', 2], ['Note', 3]] as [string, number][]) {
    const righe = dati.map((dd) => spezza(x, dd.testi[et], colW - 16, maxR, 12.5));
    const h = Math.max(28, Math.max(...righe.map((r) => r.length)) * 16 + 12);
    cella(mx, y, labW, h, LABEL_BG);
    T(x, et, mx + 10, y + h / 2 + 1, { size: 12, weight: 700, base: 'middle', color: INK });
    righe.forEach((r, i) => {
      cella(colX(i), y, colW, h);
      const link = et === 'Indirizzo' && dati[i].url;
      r.forEach((t, k) => T(x, t || (k ? '' : '—'), colX(i) + 8, y + 6 + 16 * k + 9, { size: 12.5, weight: 600, base: 'middle', color: link ? LINK_C : INK, max: colW - 16 }));
      if (link) links.push({ x: colX(i), y, w: colW, h, url: dati[i].url, pw: PW, ph: PH });
    });
    y += h;
  }
  const maxConv = Math.max(1, ...dati.map((dd) => dd.conv.length));
  const rh = Math.min(26, Math.max(15, (PH - y - 30) / maxConv));
  cella(mx, y, labW, rh * maxConv, LABEL_BG);
  T(x, 'CONVOCATI', mx + 10, y + 14, { size: 12, weight: 700, base: 'middle', color: INK });
  dati.forEach((dd, i) => {
    for (let k = 0; k < maxConv; k++) {
      const g = dd.conv[k], py = y + k * rh;
      cella(colX(i), py, colW, rh, k % 2 ? '#F7F7F5' : '#fff');
      if (g) { T(x, String(k + 1), colX(i) + 16, py + rh / 2 + 1, { size: Math.min(11, rh * 0.5), weight: 700, align: 'center', base: 'middle', color: MUTED }); T(x, g.name, colX(i) + 32, py + rh / 2 + 1, { size: Math.min(13, rh * 0.56), weight: 600, base: 'middle', max: colW - 40 }); }
    }
  });
  return { c, links };
}

/** Crea il PDF della convocazione; restituisce nome del file e contenuto */
export async function creaConvocazione(d: Dati) {
  const { logo, figc } = await stemmi();
  const { jsPDF } = await import('jspdf');
  const pp = d.adb ? d.foglio.adb?.partite ?? [] : null;
  const { c, links } = pp ? foglioAdb(d, pp, logo, figc) : paginaAgonistica(d, logo, figc);
  const [fw, fh] = pp ? [297, 210] : [210, 297];
  const doc = new jsPDF({ orientation: pp ? 'landscape' : 'portrait', unit: 'mm', format: 'a4', compress: true });
  doc.addImage(c.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, fw, fh);
  for (const l of links) { const kx = fw / l.pw, ky = fh / l.ph; doc.link(l.x * kx, l.y * ky, l.w * kx, l.h * ky, { url: l.url }); }
  const s = pp && pp[0] ? pp[0] : d.foglio;
  const nome = [fmtData(s.date).replace(/\//g, '_'), pp && pp.length > 1 ? `${pp.length}_PARTITE` : s.opponent ? s.opponent.replace(/[^\w]+/g, '_').toUpperCase() : '', 'CONVOCAZIONE'].filter(Boolean).join('_') + '.pdf';
  return { nome, blob: doc.output('blob') };
}
