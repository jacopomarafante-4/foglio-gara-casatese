'use client';
// Calendario → Programma gare: periodo dal–al, squadre da scegliere (nessuna = tutte), elenco per giorno colorato col
// calendario (Merate, Cernusco, Trasferta) e PDF su carta intestata ordinato per categoria. Il PDF si scarica e se ne
// lascia una copia nell'Archivio documenti (archiviaPdf).
import '@fontsource/barlow/700.css';
import { useState } from 'react';
import { CALENDARI } from '@/lib/condivisi';
import {
  calendario, categoriaProgramma, fmtData, giorno, impegniDelPeriodo, ordineProgramma, siglaSquadra,
  type Evento, type Impegno, type SquadraCal,
} from '@/lib/programma';
import { BLU_RGB, GRIGIO_RGB, INK_RGB, LARGH, PAG, blocco, intestazionePdf, misuraBlocco, nomeFile, nuovaPagina, piePdf, riga1, scarica } from '@/lib/pdf-moduli';
import { archiviaPdf } from '@/app/(aree)/modulistica/actions';

const RGB_CAL = { merate: BLU_RGB, cernusco: [212, 175, 55], trasferta: [196, 30, 58] } as const;

export function ProgrammaGare({ squadre, eventi, mia, dalIniziale, alIniziale }: {
  squadre: SquadraCal[]; eventi: Evento[]; mia: string | null; dalIniziale: string; alIniziale: string;
}) {
  const [dal, setDal] = useState(dalIniziale);
  const [al, setAl] = useState(alIniziale);
  const [scelte, setScelte] = useState<string[]>([]);
  const [messaggio, setMessaggio] = useState('');
  const [inCorso, setInCorso] = useState(false);

  const sceglibili = squadre.filter((t) => !t.organizza && !t.vedeTutte && (t.matches.length || t.id === mia));
  const impegni = impegniDelPeriodo(squadre, eventi, dal, al, scelte);
  const squadreTesto = (ids?: string[]) => (ids ?? []).length
    ? ids!.map((id) => siglaSquadra(squadre.find((t) => t.id === id))).filter(Boolean).join(', ') : 'Tutta la società';

  async function pdf() {
    setInCorso(true); setMessaggio('Preparo il PDF…');
    try {
      const { jsPDF } = await import('jspdf');
      const ms = impegni.slice().sort(ordineProgramma);
      const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
      const quali = scelte.length ? scelte.map((id) => siglaSquadra(squadre.find((t) => t.id === id))).join(', ') : 'Tutte le squadre';
      const TITOLO = 'PROGRAMMA GARE';
      const categoria = scelte.length === 1 ? squadre.find((t) => t.id === scelte[0])?.category || '' : '';
      let y = await intestazionePdf(doc, TITOLO, `Dal ${fmtData(dal)} al ${fmtData(al)} · ${quali}`, categoria);
      const cols: [number, number, string][] = [[PAG.sx, 24, 'Giorno'], [PAG.sx + 24, 18, 'Ora'], [PAG.sx + 42, 82, 'Partita / evento'], [PAG.sx + 124, LARGH - 124, 'Campo']];
      const testata = () => {
        doc.setFillColor(...BLU_RGB); doc.rect(PAG.sx, y, LARGH, 7, 'F'); doc.setTextColor(255);
        cols.forEach(([x, w, l]) => riga1(doc, l, x + 2, y + 4.8, w - 4, { size: 9, bold: true })); y += 8.5; doc.setTextColor(...INK_RGB);
      };
      testata();
      const gruppoH = 7;
      /* Ogni partita: partita e campo su al massimo 2 righe, che si adattano; l'altezza segue la cella più alta */
      const misura = (m: Impegno) => {
        const titolo = m.evento ? `${m.opponent} (${m.tipo})`
          : (m.home ? `Academy - ${m.opponent || '?'}` : `${m.opponent || '?'} - Academy`) + (m.friendly ? ` · ${m.tipo || 'Amichevole'}` : '');
        const campo = m.evento ? m.venue || '' : m.home ? `In casa · ${CALENDARI[calendario(m)].nome}${m.venue ? ' · ' + m.venue : ''}` : m.venue || 'Trasferta';
        const b1 = misuraBlocco(doc, titolo, cols[2][1] - 4, { size: 9.5, min: 8, maxRighe: 2 });
        const b2 = misuraBlocco(doc, campo, cols[3][1] - 4, { size: 8.5, min: 7, maxRighe: 2 });
        return { titolo, campo, h: Math.max(b1.righe.length * b1.alt, b2.righe.length * b2.alt) + 3.2 };
      };
      let gruppo = '';
      for (const m of ms) {
        const r = misura(m), cat = categoriaProgramma(m), nuovo = cat !== gruppo;
        /* il titolo della categoria non resta mai da solo in fondo alla pagina (e si ripete in cima alla pagina dopo) */
        if (y + r.h + (nuovo ? gruppoH : 0) > PAG.basso) { y = nuovaPagina(doc, TITOLO); testata(); gruppo = ''; }
        if (cat !== gruppo) {
          gruppo = cat; doc.setTextColor(...BLU_RGB);
          riga1(doc, cat.toUpperCase(), PAG.sx, y + 4, LARGH, { size: 10.5, bold: true }); y += gruppoH; doc.setTextColor(...INK_RGB);
        }
        doc.setFillColor(...(RGB_CAL[calendario(m)] as [number, number, number])); doc.rect(PAG.sx, y, 1.4, r.h - 1, 'F');
        const by = y + 4;
        riga1(doc, `${giorno(m.date)} ${fmtData(m.date).slice(0, 5)}`, cols[0][0] + 3, by, cols[0][1] - 4, { size: 9.5, min: 7, bold: true });
        riga1(doc, m.time ? `${m.time.padStart(5, '0')}${m.fine ? '–' + m.fine : ''}` : 'da def.', cols[1][0] + 2, by, cols[1][1] - 3, { size: 9.5, min: 7 });
        blocco(doc, r.titolo, cols[2][0] + 2, by, cols[2][1] - 4, { size: 9.5, min: 8, maxRighe: 2 });
        doc.setTextColor(...GRIGIO_RGB); blocco(doc, r.campo, cols[3][0] + 2, by, cols[3][1] - 4, { size: 8.5, min: 7, maxRighe: 2 }); doc.setTextColor(...INK_RGB);
        doc.setDrawColor(230); doc.line(PAG.sx, y + r.h - 0.6, PAG.dx, y + r.h - 0.6);
        y += r.h;
      }
      if (!ms.length) riga1(doc, 'Nessun impegno nel periodo.', PAG.sx, y + 6, LARGH, { size: 11 });
      piePdf(doc);
      const nome = nomeFile('PROGRAMMA', dal, al), blob = doc.output('blob');
      scarica(nome, blob);
      setMessaggio('PDF pronto');
      archiviaPdf(nome, 'Programma gare', blob, mia).catch(() => { /* il PDF c'è comunque */ });
    } catch {
      setMessaggio('PDF non creato: riprova');
    }
    setInCorso(false);
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:max-w-md">
        <label>
          <span className="mb-1 block text-sm font-semibold text-grigio">Dal</span>
          <input type="date" className="campo" value={dal} onChange={(e) => { setDal(e.target.value); if (al < e.target.value) setAl(e.target.value); }} />
        </label>
        <label>
          <span className="mb-1 block text-sm font-semibold text-grigio">Al</span>
          <input type="date" className="campo" value={al} min={dal} onChange={(e) => setAl(e.target.value < dal ? dal : e.target.value)} />
        </label>
      </div>

      <div>
        <p className="mb-1 text-sm font-semibold text-grigio">Squadre <span className="font-normal">(nessuna scelta = tutte)</span></p>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Squadre">
          {sceglibili.map((t) => {
            const on = scelte.includes(t.id);
            return (
              <button key={t.id} aria-pressed={on} onClick={() => setScelte(on ? scelte.filter((x) => x !== t.id) : [...scelte, t.id])}
                className={`rounded-full border px-3 py-1 text-sm font-semibold ${on ? 'border-blu bg-blu text-white' : 'border-linea bg-white hover:border-blu'}`}>
                {siglaSquadra(t)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button className="bottone" onClick={pdf} disabled={!impegni.length || inCorso}>Scarica programma PDF</button>
        <span className="text-sm text-grigio">{impegni.length} {impegni.length === 1 ? 'impegno' : 'impegni'}</span>
      </div>

      {impegni.length === 0 ? (
        <p className="rounded-xl border border-dashed border-linea p-8 text-center text-grigio">Nessun impegno nel periodo.</p>
      ) : (
        <ul className="rounded-xl border border-linea bg-white px-3">
          {impegni.map((m, i) => {
            const testa = i === 0 || m.date !== impegni[i - 1].date;   // titolo del giorno quando cambia
            const cal = calendario(m), propria = !m.evento && m.team?.id === mia;
            const note = m.evento
              ? [m.venue, m.fine ? 'fino alle ' + m.fine : '', squadreTesto(m.evento.squadre), m.note]
              : [m.home ? `In casa a ${CALENDARI[cal].nome}` : 'Trasferta', m.home ? '' : m.venue, m.friendly ? m.tipo || 'Amichevole' : '', m.note];
            return (
              <li key={(m.id ?? '') + i}>
                {testa && (
                  <p className="pb-1 pt-4 font-display text-[13px] font-bold uppercase tracking-wider text-grigio">{giorno(m.date)} {fmtData(m.date)}</p>
                )}
                <div className="flex gap-3 border-l-4 py-2 pl-2.5" style={{ borderColor: CALENDARI[cal].colore, background: propria ? `color-mix(in srgb, ${CALENDARI[cal].colore} 12%, transparent)` : undefined }}>
                  <div className="w-12 shrink-0 text-sm">
                    <b className="block">{giorno(m.date)}</b>
                    <span className="text-grigio">{m.time ? m.time.padStart(5, '0') : 'ora ?'}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-display text-lg font-semibold leading-tight">
                      {m.evento ? m.opponent : `${siglaSquadra(m.team)} · ${m.opponent || 'Avversario'}`}
                      {propria && <span className="ml-1 font-sans text-xs font-semibold text-grigio">· la tua squadra</span>}
                    </p>
                    <p className="text-sm text-grigio">
                      {m.evento && <span className="mr-1 rounded-full bg-[#6B3FA0] px-2 py-px text-xs font-bold text-white">{m.tipo}</span>}
                      {note.filter(Boolean).join(' · ')}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {messaggio && (
        <p role="status" className="fixed bottom-4 left-1/2 z-30 -translate-x-1/2 rounded-full bg-inchiostro px-4 py-2 text-sm font-semibold text-white shadow-lg">
          {messaggio}
        </p>
      )}
    </div>
  );
}
