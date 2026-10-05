'use client';
// Nell'intestazione di tutte le pagine: manda al server le modifiche rimaste sul telefono senza rete (lib/coda-offline.ts)
// all'apertura, quando torna la rete e ogni minuto, e dice quante ne aspettano ancora.
import { useEffect, useState } from 'react';
import { alCambio, impostaProprietario, inAttesa, invia } from '@/lib/coda-offline';

export function InviaInSospeso({ chi }: { chi: string }) {
  impostaProprietario(chi);
  const [n, setN] = useState(0);
  const [rete, setRete] = useState(true);

  useEffect(() => {
    const conta = () => setN(inAttesa());
    const prova = () => { setRete(navigator.onLine); if (navigator.onLine && inAttesa()) invia().then(conta); };
    conta(); prova();
    const via = alCambio(conta);
    window.addEventListener('online', prova);
    window.addEventListener('offline', prova);
    const ogni = setInterval(prova, 60_000);
    return () => { via(); window.removeEventListener('online', prova); window.removeEventListener('offline', prova); clearInterval(ogni); };
  }, [chi]);

  if (!n && rete) return null;
  return (
    <p role="status" className="bg-oro px-4 py-1 text-center text-sm font-semibold text-inchiostro">
      {!rete ? 'Senza rete' : 'Rete tornata'}
      {n > 0 && ` · ${n === 1 ? '1 modifica salvata sul telefono' : `${n} modifiche salvate sul telefono`}, ${rete ? 'le mando ora' : 'partono quando torna la rete'}`}
    </p>
  );
}
