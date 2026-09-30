'use client';
// Segnala un giocatore: mentre si scrivono annata e cognome, i giocatori già in lista con quel cognome
// (anche scritto un po' diverso: accenti, apostrofi, spazi). "Valuta questo" apre subito la valutazione
// con quello che si è già scritto (0032); se è un altro ragazzo si continua con la segnalazione.
// Staff: cerca nella tabella dei giocatori. Mister (tessera, niente account): cerca in `elenco`, gli osservati della sua
// annata già letti dal server con coach_giocatori, e la valutazione si apre su `valuta` (":id" = giocatore).
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { normalizza } from '@/lib/utili';

export type Trovato = { id: string; cognome: string | null; nome: string | null; annata: number; societa: { nome: string } | null };

export function GiaInLista({ formId, elenco, valuta: percorso = '/giocatori/:id/valuta' }: { formId: string; elenco?: Trovato[]; valuta?: string }) {
  const [chiave, setChiave] = useState({ annata: '', cognome: '', nome: '' });
  const [trovati, setTrovati] = useState<Trovato[]>([]);
  const [chiuso, setChiuso] = useState('');
  const router = useRouter();

  // legge annata, cognome e nome dal modulo della pagina (form server, niente stato React lì)
  useEffect(() => {
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (!form) return;
    const leggi = () => {
      const v = (n: string) => String((form.elements.namedItem(n) as HTMLInputElement | null)?.value ?? '').trim();
      setChiave({ annata: v('annata'), cognome: v('cognome'), nome: v('nome') });
    };
    form.addEventListener('input', leggi);
    form.addEventListener('change', leggi);
    return () => { form.removeEventListener('input', leggi); form.removeEventListener('change', leggi); };
  }, [formId]);

  useEffect(() => {
    const c = normalizza(chiave.cognome);
    if (!chiave.annata || c.length < 3) return;
    let annullato = false;
    const t = setTimeout(async () => {
      const data = elenco ? elenco.filter((g) => String(g.annata) === chiave.annata) : (await createClient().from('giocatori')
        .select('id, cognome, nome, annata, societa(nome)')
        .eq('annata', Number(chiave.annata)).eq('osservato', true)
        .ilike('cognome', `${chiave.cognome.slice(0, 1)}%`).limit(300)).data as unknown as Trovato[] | null;
      if (annullato) return;
      const n = normalizza(chiave.nome);
      const simili = (data ?? [])
        .filter((g) => normalizza(g.cognome ?? '').startsWith(c) || c.startsWith(normalizza(g.cognome ?? '')))
        // prima quelli con lo stesso nome
        .sort((a, b) => Number(!!n && normalizza(b.nome ?? '').startsWith(n)) - Number(!!n && normalizza(a.nome ?? '').startsWith(n)));
      setTrovati(simili.slice(0, 5));
    }, 700);   // aspetta una pausa nella scrittura prima di aprire la finestra
    return () => { annullato = true; clearTimeout(t); };
  }, [chiave, elenco]);

  const attivi = chiave.annata && normalizza(chiave.cognome).length >= 3 ? trovati : [];
  const firma = attivi.map((g) => g.id).join();
  if (!attivi.length || chiuso === firma) return null;

  const valuta = (id: string) => {
    const form = document.getElementById(formId) as HTMLFormElement | null;
    const v = (n: string) => String((form?.elements.namedItem(n) as HTMLInputElement | null)?.value ?? '').trim();
    const q = new URLSearchParams({ gia: '1', nota: v('testo'), ...(v('contesto') ? { contesto: v('contesto') } : {}), ...(v('data') ? { data: v('data') } : {}) });
    router.push(`${percorso.replace(':id', id)}?${q}`);
  };

  // finestra sopra la pagina: "Vuoi valutare?"
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="gia-titolo">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <h2 id="gia-titolo" className="font-display text-2xl font-bold">Già in lista. Vuoi valutare?</h2>
        <p className="mt-1 text-sm text-grigio">
          {attivi.length === 1 ? 'Questo ragazzo è' : 'Questi ragazzi sono'} già nell&apos;archivio: se è lui, niente nuova segnalazione, lo valuti
          (quello che hai scritto va nel commento).
        </p>
        <ul className="mt-3 divide-y divide-linea">
          {attivi.map((g) => (
            <li key={g.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span>
                <strong>{[g.cognome, g.nome].filter(Boolean).join(' ')}</strong>
                <span className="text-sm text-grigio"> · {g.annata}{g.societa?.nome ? ` · ${g.societa.nome}` : ''}</span>
              </span>
              <button type="button" onClick={() => valuta(g.id)} className="bottone px-4 py-2 text-sm">Sì, valuta</button>
            </li>
          ))}
        </ul>
        <button type="button" onClick={() => setChiuso(firma)} className="mt-3 w-full rounded-lg border border-linea px-4 py-3 font-semibold">
          No, è un altro giocatore
        </button>
      </div>
    </div>
  );
}
