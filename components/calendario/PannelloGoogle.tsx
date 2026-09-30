'use client';
// Google Calendar nel Calendario → Tutte le squadre, per l'admin: "Collega a Google Calendar" (se non è collegato), account
// collegato, scelta dei tre calendari (Merate, Cernusco, Trasferta) e "Scollega". Il collegamento è in /api/google/*.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { calendariGoogle, scegliCalendari, scollegaGoogle } from '@/app/(aree)/calendari/google-actions';

const NOMI = { MERATE: 'In casa · Merate', CERNUSCO: 'In casa · Cernusco', TRASFERTA: 'Trasferta' } as const;
type Cal = keyof typeof NOMI;

export function PannelloGoogle({ collegabile, collegato, pronto, account, avviso }: {
  collegabile: boolean; collegato: boolean; pronto: boolean; account: string | null; avviso?: string;
}) {
  const router = useRouter();
  const [scelta, setScelta] = useState<{ elenco: { id: string; nome: string; scrive: boolean }[]; scelti: Partial<Record<Cal, string>> } | null>(null);
  const [esito, setEsito] = useState(avviso === 'collegato' ? 'Google Calendar collegato. Controlla i tre calendari qui sotto.' : avviso ?? '');
  const [occupato, setOccupato] = useState(false);
  const bottone = 'rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-60';

  async function apriScelta() {
    setOccupato(true);
    const r = await calendariGoogle().catch(() => ({ ok: false, errore: 'rete assente', valore: undefined }));
    setOccupato(false);
    if (r.ok && r.valore) setScelta(r.valore); else setEsito(r.errore ?? 'Non riuscito.');
  }
  async function salvaScelta() {
    if (!scelta) return;
    setOccupato(true);
    const r = await scegliCalendari(scelta.scelti).catch(() => ({ ok: false, errore: 'rete assente' }));
    setOccupato(false);
    setEsito(r.ok ? 'Calendari salvati.' : `Non salvato: ${r.errore}`);
    if (r.ok) { setScelta(null); router.refresh(); }
  }
  async function scollega() {
    if (!confirm('Scollegare Google Calendar? Le modifiche dell’app non andranno più su Google finché non lo ricolleghi.')) return;
    setOccupato(true);
    const r = await scollegaGoogle().catch(() => ({ ok: false, errore: 'rete assente' }));
    setOccupato(false);
    setEsito(r.ok ? 'Google Calendar scollegato.' : `Non riuscito: ${r.errore}`);
    router.refresh();
  }

  return (
    <section className="rounded-xl border border-linea bg-white p-4" aria-labelledby="google-titolo">
      <h2 id="google-titolo" className="font-display text-2xl font-bold">Google Calendar</h2>
      {esito && <p role="status" className="mt-2 rounded-lg bg-carta p-3 text-sm font-semibold">{esito}</p>}
      {!collegato ? (
        <>
          <p className="mt-1 text-sm text-grigio">
            Collega i calendari della società (Merate, Cernusco, Trasferta): amichevoli, tornei ed eventi dell’app vanno su Google e
            quello che cambia su Google torna qui.
          </p>
          {collegabile
            ? <a href="/api/google/collega" className={`${bottone} mt-3 inline-block border-blu bg-blu text-white`}>Collega a Google Calendar</a>
            : <p className="mt-3 rounded-lg bg-carta p-3 text-sm">Prima serve la configurazione dell’app su Google Cloud (GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET su Vercel).</p>}
        </>
      ) : (
        <>
          <p className="mt-1 text-sm">
            Collegato{account ? <> con <b>{account}</b></> : null}.{' '}
            {pronto ? 'Si aggiorna nei due sensi.' : <b className="text-rosso">Scegli i tre calendari per attivarlo.</b>}
          </p>
          {scelta ? (
            <div className="mt-3 space-y-2">
              {(Object.keys(NOMI) as Cal[]).map((c) => (
                <label key={c} className="grid gap-1 text-sm font-medium sm:grid-cols-[11rem_1fr] sm:items-center">
                  {NOMI[c]}
                  <select className="campo" value={scelta.scelti[c] ?? ''} onChange={(e) => setScelta({ ...scelta, scelti: { ...scelta.scelti, [c]: e.target.value } })}>
                    <option value="">Scegli il calendario</option>
                    {scelta.elenco.map((x) => <option key={x.id} value={x.id} disabled={!x.scrive}>{x.nome}{x.scrive ? '' : ' (sola lettura)'}</option>)}
                  </select>
                </label>
              ))}
              <div className="flex gap-2 pt-1">
                <button className={`${bottone} border-blu bg-blu text-white`} disabled={occupato} onClick={salvaScelta}>Salva calendari</button>
                <button className={`${bottone} border-linea bg-white`} onClick={() => setScelta(null)}>Annulla</button>
              </div>
            </div>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              <button className={`${bottone} border-linea bg-white hover:border-blu`} disabled={occupato} onClick={apriScelta}>Scegli i calendari</button>
              <a href="/api/google/collega" className={`${bottone} border-linea bg-white hover:border-blu`}>Ricollega</a>
              <button className={`${bottone} border-linea bg-white text-rosso hover:border-rosso`} disabled={occupato} onClick={scollega}>Scollega</button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
