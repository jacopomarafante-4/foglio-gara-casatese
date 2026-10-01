'use client';
// Pulsante "Scarica Excel": crea il file nel browser coi fogli preparati dalla pagina (lib/esporta.ts, lib/xlsx-scrivi.ts)
import { useState } from 'react';
import { creaXlsx, type Foglio } from '@/lib/xlsx-scrivi';
import { scarica } from '@/lib/pdf-moduli';

export function ScaricaExcel({ nome, fogli, etichetta = 'Scarica Excel' }: { nome: string; fogli: Foglio[]; etichetta?: string }) {
  const [fatto, setFatto] = useState(false);
  return (
    <button type="button" className="rounded-lg border border-linea bg-white px-3 py-2 text-sm font-semibold hover:border-blu"
      onClick={() => {
        const dati = creaXlsx(fogli);
        scarica(nome, new Blob([dati.buffer as ArrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
        setFatto(true); setTimeout(() => setFatto(false), 2500);
      }}>
      {fatto ? 'Scaricato ✓' : etichetta}
    </button>
  );
}
