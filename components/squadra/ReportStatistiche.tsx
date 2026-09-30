'use client';
// Pulsante "Scarica report PDF" delle statistiche (solo admin): riepilogo, presenze giorno per giorno, minuti partita per partita,
// presenze per mese e test (lib/report-statistiche.ts); una copia va nell'Archivio documenti.
import '@fontsource/barlow/700.css';
import { useState } from 'react';
import { creaReport } from '@/lib/report-statistiche';
import { scarica } from '@/lib/pdf-moduli';
import { archiviaPdf } from '@/app/(aree)/modulistica/actions';
import type { Partita } from '@/lib/programma';
import type { Registro, Test } from '@/lib/registro';

export function ReportStatistiche(p: {
  squadraId: string; squadra: { name: string; category: string }; giocatori: { id: string; name: string }[];
  reg: Registro & { tests?: Test[] }; calendario: (Partita & { id: string })[]; periodo: string; oggi: string;
}) {
  const [stato, setStato] = useState('');
  async function scaricaReport() {
    setStato('Creo il report…');
    try {
      const { nome, blob } = await creaReport(p);
      scarica(nome, blob); setStato('Report pronto');
      archiviaPdf(nome, 'Report statistiche', blob, p.squadraId).catch(() => { /* il PDF c'è comunque */ });
    } catch { setStato('Report non creato: riprova'); }
  }
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button className="bottone" onClick={scaricaReport}>Scarica report PDF</button>
      <span className="text-sm text-grigio">{stato || 'Riepilogo, presenze giorno per giorno, minuti partita per partita, test.'}</span>
    </div>
  );
}
