'use client';
// "Ci sarà" / "Non ci sarà" di una convocazione: arriva subito al mister (Convocazioni) e si può cambiare
import { useState } from 'react';
import { rispondi } from '@/app/famiglia/actions';

export function Risposta({ partita, iniziale }: { partita: string; iniziale?: 'si' | 'no' }) {
  const [r, setR] = useState(iniziale);
  const [msg, setMsg] = useState('');
  async function manda(v: 'si' | 'no') {
    const prima = r; setR(v); setMsg('Invio…');
    const esito = await rispondi(partita, v).catch(() => ({ ok: false, errore: 'rete assente' }));
    if (!esito.ok) { setR(prima); setMsg(esito.errore ?? 'Non mandata: riprova.'); return; }
    setMsg('Risposta mandata al mister.');
  }
  const b = 'min-h-11 flex-1 rounded-xl border px-4 py-2 font-semibold';
  return (
    <div className="mt-3">
      <div className="flex gap-2">
        <button type="button" aria-pressed={r === 'si'} onClick={() => manda('si')} className={`${b} ${r === 'si' ? 'border-verde bg-verde text-white' : 'border-linea bg-white hover:border-verde'}`}>✓ Ci sarà</button>
        <button type="button" aria-pressed={r === 'no'} onClick={() => manda('no')} className={`${b} ${r === 'no' ? 'border-rosso bg-rosso text-white' : 'border-linea bg-white hover:border-rosso'}`}>✗ Non ci sarà</button>
      </div>
      <p role="status" className="mt-1.5 text-sm text-grigio">{msg || (r ? `Risposta mandata: ${r === 'si' ? 'ci sarà' : 'non ci sarà'}. Potete cambiarla.` : 'Fate sapere al mister se ci sarà.')}</p>
    </div>
  );
}
