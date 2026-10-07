// Calendario → Tutte le squadre → "Importa da file": amichevoli, tornei ed eventi da un file ICS (esportazione di Google
// Calendar o Outlook), CSV o Excel. Si legge nel browser, si controlla in anteprima e si salva voce per voce (modificaDoc).
// Il campionato no: vale sempre il calendario ufficiale. Funzioni pure (niente Next né database), provate in tests/.
import { etaCategoria } from '@/lib/condivisi';

/** Una riga letta dal file, prima di scegliere la squadra */
export type RigaImport = {
  chiave: string;          // per non importare due volte la stessa riga (UID dell'ICS, o data|ora|titolo)
  data: string;            // AAAA-MM-GG
  ora: string;             // HH:MM o ''
  fine: string;            // HH:MM o ''
  titolo: string;          // come nel file
  avversario: string;
  eta: number | null;      // età della categoria riconosciuta (14 = Under 14), null se non si capisce
  casa: boolean | null;    // null = non detto
  campo: string;
  note: string;
  tipo: 'Partita' | 'Torneo' | 'Evento';
};

const TORNEO = /torneo|quadrangolare|triangolare|\bcup\b|memorial|finali|trofeo/i;
const pulisci = (s: string) => s.replace(/\s+/g, ' ').trim();

/** Anno in cui finisce la stagione di una data (da luglio, quello dopo) */
export const fineStagioneDi = (data: string) => { const [a, m] = data.split('-').map(Number); return m >= 7 ? a + 1 : a; };

/** Categoria, avversario e tipo da un titolo: "U14 - 2013 - Lecco", "AdB - 2014 - Torneo X", "Under 15 vs Merate", "2012 - Olginatese" */
export function leggiTitolo(titolo: string, data: string, categoria = ''): { eta: number | null; avversario: string; tipo: RigaImport['tipo'] } {
  const t = pulisci(titolo);
  let eta: number | null = null, resto = t;
  const conAnnata = t.match(/^(?:(U\s*\d{1,2}|Under\s*\d{1,2}|AdB)\s*[-–:]\s*)?((?:19|20)\d{2})(?:\/\d{2})?\s*[-–:]\s*(.+)$/i);
  if (conAnnata) { eta = fineStagioneDi(data) - Number(conAnnata[2]); resto = conAnnata[3]; }
  else {
    const u = t.match(/^(?:U\s*|Under\s*)(\d{1,2})\b\s*[-–:]?\s*(.*)$/i);
    if (u) { eta = Number(u[1]); resto = u[2]; }
  }
  if (eta === null && categoria) eta = etaCategoria({ category: categoria });
  resto = resto.replace(/^(vs\.?|contro|-)\s*/i, '').trim();
  const allenamento = /allenament/i.test(t);
  return { eta: allenamento ? null : eta, avversario: resto || 'Da definire', tipo: eta === null ? 'Evento' : TORNEO.test(resto) ? 'Torneo' : 'Partita' };
}

/* ---------- ICS ---------- */
const giornoOra = (v: string, tzUtc: boolean): { data: string; ora: string } => {
  const m = v.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2}))?/);
  if (!m) return { data: '', ora: '' };
  if (!m[4]) return { data: `${m[1]}-${m[2]}-${m[3]}`, ora: '' };
  if (!tzUtc) return { data: `${m[1]}-${m[2]}-${m[3]}`, ora: `${m[4]}:${m[5]}` };
  // ora in UTC ("Z"): in ora italiana
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]));
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Rome', hourCycle: 'h23', year: 'numeric', month: '2-digit',
    day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(d).map((x) => [x.type, x.value]));
  return { data: `${p.year}-${p.month}-${p.day}`, ora: `${p.hour}:${p.minute}` };
};
const testoIcs = (s: string) => s.replace(/\\n/gi, '\n').replace(/\\([,;\\])/g, '$1');

export function leggiIcs(testo: string, dal = ''): RigaImport[] {
  const righe = testo.replace(/\r\n?/g, '\n').replace(/\n[ \t]/g, '').split('\n');   // righe spezzate: si riuniscono
  const out: RigaImport[] = [];
  let ev: Record<string, { v: string; utc: boolean }> | null = null;
  for (const r of righe) {
    if (r === 'BEGIN:VEVENT') { ev = {}; continue; }
    if (r === 'END:VEVENT' && ev) {
      const inizio = ev.DTSTART ? giornoOra(ev.DTSTART.v, ev.DTSTART.utc) : null;
      const fine = ev.DTEND ? giornoOra(ev.DTEND.v, ev.DTEND.utc) : null;
      if (inizio?.data && !ev.RRULE && !ev['RECURRENCE-ID'] && ev.STATUS?.v !== 'CANCELLED' && (!dal || inizio.data >= dal)) {
        const titolo = testoIcs(ev.SUMMARY?.v ?? '');
        const { eta, avversario, tipo } = leggiTitolo(titolo, inizio.data);
        if (!/allenament/i.test(titolo)) out.push({
          chiave: 'ics:' + (ev.UID?.v || `${inizio.data}|${inizio.ora}|${titolo}`), data: inizio.data, ora: inizio.ora,
          fine: fine?.data === inizio.data ? fine.ora : '', titolo, avversario, eta, casa: null,
          campo: pulisci(testoIcs(ev.LOCATION?.v ?? '')), note: senzaContatti(testoIcs(ev.DESCRIPTION?.v ?? '')), tipo,
        });
      }
      ev = null; continue;
    }
    if (!ev) continue;
    const i = r.indexOf(':');
    if (i < 0) continue;
    const [nome, ...param] = r.slice(0, i).split(';');
    const valore = r.slice(i + 1);
    ev[nome.toUpperCase()] = { v: valore, utc: /Z$/.test(valore) && !param.some((p) => p.startsWith('TZID')) };
  }
  return out;
}

/** Nelle note niente telefoni, email né referenti (dati delle famiglie e dei dirigenti delle altre società) */
export function senzaContatti(s: string): string {
  return s.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').split('\n').map((r) => r.trim())
    .filter((r) => r && !/contatt|referente|@|\d[\d .]{7,}\d/i.test(r)).join(' · ').slice(0, 300);
}

/* ---------- Tabelle (CSV ed Excel) ---------- */
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');
const COLONNE: Record<string, string[]> = {
  data: ['data', 'giorno', 'date'], ora: ['ora', 'orario', 'inizio', 'time'], fine: ['fine', 'orafine'],
  squadra: ['squadra', 'categoria', 'annata', 'team'], avversario: ['avversario', 'avversari', 'partita', 'titolo', 'evento', 'descrizione'],
  casa: ['casa', 'casatrasferta', 'dove', 'incasa'], campo: ['campo', 'luogo', 'indirizzo', 'impianto'], tipo: ['tipo'], note: ['note', 'nota'],
};
/** 12/10/2026, 12-10-26, 2026-10-12 o numero di Excel → AAAA-MM-GG */
export function leggiData(v: string): string {
  const s = v.trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
  if (m) return `${m[3].length === 2 ? '20' + m[3] : m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  if (/^\d{5}(\.\d+)?$/.test(s)) return new Date(Date.UTC(1899, 11, 30) + Math.floor(+s) * 86400000).toISOString().slice(0, 10);
  return '';
}
/** 9.30, 09:30, 0,395833 (frazione di giorno di Excel) → HH:MM */
export function leggiOra(v: string): string {
  const s = v.trim();
  // frazione del giorno (Excel): più di due decimali, es. 0.4375 = 10:30
  if (/^0?[.,]\d{3,}$/.test(s)) { const t = Math.round(parseFloat(s.replace(',', '.')) * 1440); return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; }
  const m = s.match(/^(\d{1,2})[:.,h](\d{2})/);
  return m ? `${m[1].padStart(2, '0')}:${m[2]}` : '';
}

/** Righe di una tabella (la prima con i nomi delle colonne) → righe da importare */
export function daTabella(tabella: string[][], dal = ''): RigaImport[] {
  const [testa, ...corpo] = tabella.filter((r) => r.some((c) => c.trim()));
  if (!testa) return [];
  const col = Object.fromEntries(Object.entries(COLONNE).map(([k, nomi]) => [k, testa.findIndex((h) => nomi.includes(norm(h)))]));
  const v = (r: string[], k: string) => (col[k] >= 0 ? String(r[col[k]] ?? '').trim() : '');
  const out: RigaImport[] = [];
  for (const r of corpo) {
    const data = leggiData(v(r, 'data'));
    if (!data || (dal && data < dal)) continue;
    const titolo = v(r, 'avversario');
    const squadra = v(r, 'squadra');
    const letto = leggiTitolo(titolo, data, /^\d{4}$/.test(squadra) ? '' : squadra);
    const eta = /^(19|20)\d{2}$/.test(squadra) ? fineStagioneDi(data) - Number(squadra) : letto.eta;
    const dove = norm(v(r, 'casa'));
    const tipoFile = norm(v(r, 'tipo'));
    if (/allenament/.test(tipoFile) || /allenament/i.test(titolo)) continue;
    out.push({
      chiave: `tab:${data}|${v(r, 'ora')}|${squadra}|${titolo}`, data, ora: leggiOra(v(r, 'ora')), fine: leggiOra(v(r, 'fine')), titolo,
      avversario: letto.avversario, eta,
      casa: /^(casa|si|s|x|incasa|merate|cernusco)$/.test(dove) ? true : /^(trasferta|fuori|no|n)$/.test(dove) ? false : null,
      campo: v(r, 'campo'), note: senzaContatti(v(r, 'note')),
      tipo: eta === null ? 'Evento' : /torneo/.test(tipoFile) || TORNEO.test(titolo) ? 'Torneo' : 'Partita',
    });
  }
  return out;
}

/** CSV con ";" (Excel italiano) o ",", virgolette comprese */
export function leggiCsv(testo: string): string[][] {
  const t = testo.replace(/^﻿/, '');
  const primo = t.split('\n')[0] ?? '';
  const sep = (primo.match(/;/g)?.length ?? 0) >= (primo.match(/,/g)?.length ?? 0) ? ';' : ',';
  const righe: string[][] = [];
  let riga: string[] = [], cella = '', virg = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (virg) { if (c === '"' && t[i + 1] === '"') { cella += '"'; i++; } else if (c === '"') virg = false; else cella += c; continue; }
    if (c === '"') virg = true;
    else if (c === sep) { riga.push(cella); cella = ''; }
    else if (c === '\n') { riga.push(cella.replace(/\r$/, '')); righe.push(riga); riga = []; cella = ''; }
    else cella += c;
  }
  if (cella || riga.length) { riga.push(cella); righe.push(riga); }
  return righe;
}
