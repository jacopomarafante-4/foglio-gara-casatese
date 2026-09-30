'use client';
// Famiglia → Anagrafica: contatti dei genitori e taglie, modificabili dalla famiglia (famiglia_contatti)
import { useState } from 'react';
import { salvaContatti } from '@/app/famiglia/actions';

const CAMPI: [string, string, string][] = [
  ['genitore1_nome', 'Genitore 1', 'text'], ['genitore1_tel', 'Telefono', 'tel'], ['genitore1_email', 'Email', 'email'],
  ['genitore2_nome', 'Genitore 2', 'text'], ['genitore2_tel', 'Telefono', 'tel'], ['genitore2_email', 'Email', 'email'],
  ['taglia_divisa', 'Taglia divisa', 'text'], ['taglia_tuta', 'Taglia tuta', 'text'],
];

export function Contatti({ iniziali }: { iniziali: Record<string, string> }) {
  const [d, setD] = useState(iniziali);
  const [cambiato, setCambiato] = useState(false);
  const [msg, setMsg] = useState('');
  async function salva() {
    setMsg('Salvataggio…');
    const r = await salvaContatti(d).catch(() => ({ ok: false, errore: 'rete assente' }));
    setMsg(r.ok ? 'Salvato' : r.errore ?? 'Non salvato: riprova.');
    if (r.ok) setCambiato(false);
  }
  return (
    <form onSubmit={(e) => { e.preventDefault(); salva(); }}>
      <div className="grid gap-3 sm:grid-cols-3">
        {CAMPI.map(([k, l, tipo]) => (
          <label key={k} className="text-sm font-medium">{l}
            <input id={`fam-${k}`} type={tipo} className="campo mt-1" value={d[k] ?? ''} autoComplete="off"
              onChange={(e) => { setD({ ...d, [k]: e.target.value }); setCambiato(true); setMsg(''); }} />
          </label>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button className="bottone" disabled={!cambiato}>Salva</button>
        <span role="status" className="text-sm text-grigio">{msg || (cambiato ? 'Modifiche da salvare' : '')}</span>
      </div>
    </form>
  );
}
