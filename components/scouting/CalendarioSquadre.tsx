// Calendario delle nostre squadre nello Scouting (0038, poi unito a Gare in un unico pannello): tutte le annate,
// con i colori del Portale (Merate blu, Cernusco oro, Trasferta rosso). Si legge con calendari_squadre().
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { oggiIso } from '@/lib/utili';
import { fineStagione } from '@/lib/categorie';
import { CALENDARI, calendarioDi } from '@/lib/condivisi';   // stesse regole e colori del Portale

type Partita = {
  id: string; date: string | null; time: string | null; opponent: string | null; home: boolean;
  venue: string | null; address: string | null; friendly: boolean; tipo: string | null;
};
type Squadra = { id: string; name: string | null; category: string | null; matches: Partita[] };
type Riga = Partita & { squadra: Squadra; eta: number };

const etaDi = (s: Squadra) => Number(String(s.category ?? '').match(/under\s*(\d+)/i)?.[1]) || 0;
const sigla = (s: Squadra) => (etaDi(s) ? `U${etaDi(s)}` : s.name ?? '');

const PERIODI = { weekend: 'Questo weekend', due: 'Prossime 2 settimane', stagione: 'Fino a fine stagione' } as const;
type Periodo = keyof typeof PERIODI;

const piu = (iso: string, giorni: number) => {
  const d = new Date(`${iso}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + giorni); return d.toISOString().slice(0, 10);
};
/** Sabato e domenica della settimana in corso (da lunedì a domenica) */
function weekend(oggi: string) {
  const g = new Date(`${oggi}T12:00:00Z`).getUTCDay();   // 0 domenica … 6 sabato
  const sab = piu(oggi, 5 - ((g + 6) % 7));
  return [sab, piu(sab, 1)];
}
const giorno = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });

export async function CalendarioSquadre({ squadra: scelta, periodo: p }: { squadra?: string; periodo?: string }) {
  const periodo: Periodo = p && p in PERIODI ? (p as Periodo) : 'due';

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('calendari_squadre');
  const squadre = ((data as Squadra[] | null) ?? []).filter((s) => etaDi(s)).sort((a, b) => etaDi(b) - etaDi(a));

  const oggi = oggiIso();
  const [sab, dom] = weekend(oggi);
  const dal = periodo === 'weekend' ? sab : oggi;
  const al = periodo === 'weekend' ? dom : periodo === 'due' ? piu(oggi, 14) : `${fineStagione()}-06-30`;

  const righe: Riga[] = squadre
    .filter((s) => !scelta || s.id === scelta)
    .flatMap((s) => s.matches.map((m) => ({ ...m, squadra: s, eta: etaDi(s) })))
    .filter((m) => m.date && m.date >= dal && m.date <= al)
    .sort((a, b) => a.date!.localeCompare(b.date!) || (a.time || '99').localeCompare(b.time || '99') || b.eta - a.eta);
  const giorni = [...new Set(righe.map((m) => m.date!))];

  const link = (cambi: Record<string, string | null>) => {
    const sp = new URLSearchParams({ vista: 'calendario', ...(scelta ? { squadra: scelta } : {}), periodo });
    for (const [k, v] of Object.entries(cambi)) if (v === null) sp.delete(k); else sp.set(k, v);
    return `/gare?${sp}`;
  };
  const chip = (attivo: boolean) => `rounded-full px-3 py-1.5 text-sm font-semibold ${attivo ? 'bg-blu text-white' : 'border border-linea bg-white'}`;

  return (
    <div className="space-y-5">
      <p className="text-grigio">Le partite delle nostre squadre, tutte le annate.</p>

      {error && <p className="text-rosso">Calendario non ancora attivo: serve la migrazione 0038.</p>}

      <div className="flex flex-wrap gap-2" role="group" aria-label="Periodo">
        {(Object.keys(PERIODI) as Periodo[]).map((k) => (
          <Link key={k} href={link({ periodo: k })} className={chip(periodo === k)}>{PERIODI[k]}</Link>
        ))}
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Squadra">
        <Link href={link({ squadra: null })} className={chip(!scelta)}>Tutte</Link>
        {squadre.map((s) => (
          <Link key={s.id} href={link({ squadra: s.id })} className={chip(scelta === s.id)}>{sigla(s)}</Link>
        ))}
      </div>
      <div className="flex flex-wrap gap-4 text-sm">
        {Object.values(CALENDARI).map((c) => (
          <span key={c.nome} className="flex items-center gap-1.5">
            <i className="inline-block h-3 w-3 rounded-sm" style={{ background: c.colore }} />{c.nome}
          </span>
        ))}
      </div>

      {!giorni.length ? (
        <p className="rounded-xl border border-dashed border-linea p-8 text-center text-grigio">Nessuna partita in questo periodo.</p>
      ) : (
        giorni.map((d) => (
          <section key={d}>
            <h2 className="mb-2 font-display text-xl font-bold first-letter:uppercase">{giorno(d)}</h2>
            <ul className="space-y-2">
              {righe.filter((m) => m.date === d).map((m) => {
                const cal = CALENDARI[calendarioDi(m)];
                return (
                  <li key={`${m.squadra.id}|${m.id}`} className="flex gap-3 rounded-lg border border-linea bg-white p-3"
                    style={{ borderLeft: `5px solid ${cal.colore}` }}>
                    <div className="w-14 shrink-0">
                      <p className="font-display text-lg font-bold">{m.time ? m.time.padStart(5, '0') : 'ora ?'}</p>
                      <p className="text-xs font-bold" style={{ color: cal.colore }}>{cal.nome}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold">
                        <span className="mr-1.5 rounded bg-blu px-1.5 py-0.5 text-xs font-bold text-white">{sigla(m.squadra)}</span>
                        {m.home ? `Academy – ${m.opponent || 'Avversario'}` : `${m.opponent || 'Avversario'} – Academy`}
                      </p>
                      <p className="text-sm text-grigio">
                        {[m.friendly ? (m.tipo || 'Amichevole') : 'Campionato', m.venue, m.address].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
