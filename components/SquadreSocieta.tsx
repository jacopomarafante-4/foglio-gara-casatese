'use client';
// Società → Squadre (tappa 3; era viewSquadre/viewStaff nel Portale): squadre con i mister e i loro PIN personali (shared/teams,
// cambiaSquadre), poi Scouting, Direttori e Segreteria con account e PIN (/api/staff), backup dei documenti del Portale.
// Le modifiche si vedono subito e partono al server una per una; i nomi mentre si scrivono (dopo una pausa).
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { cambiaSquadre, esportaBackup, impostaSegreteriaDirettore, impostaSquadreDirettore } from '@/app/(aree)/docs-actions';
import { RipristinoBackup } from '@/components/RipristinoBackup';
import { nuovoId } from '@/lib/calendario-portale';
import { applicaOpSquadre, type OpSquadre, type SquadraSocieta } from '@/lib/squadre-societa';
import { Messaggio } from '@/components/calendario/salvataggio';

export type PersonaStaff = { id: string; nome: string | null; cognome: string | null; ruolo: string; attivo: boolean; pin: string; squadre?: string[] | null; vedeSegreteria?: boolean };

const piccolo = 'rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-60';
const chiaro = `${piccolo} border-linea bg-white hover:border-blu`;
const pieno = `${piccolo} border-blu bg-blu text-white hover:bg-blu-scuro`;
const croce = 'inline-flex size-9 flex-none items-center justify-center rounded-lg text-xl text-grigio hover:bg-rosso/10 hover:text-rosso';
const PinBox = ({ pin, vuoto }: { pin?: string; vuoto: string }) => pin
  ? <span className="flex-none rounded-md bg-carta px-2 py-1 font-mono text-base font-bold tracking-widest" title="PIN personale">{pin}</span>
  : <span className="flex-none rounded-md border border-dashed border-linea px-2 py-1 text-xs text-grigio">{vuoto}</span>;

export function SquadreSocieta({ squadre: iniziali, staff, io, admin = false, squadreElenco = [] }: {
  squadre: SquadraSocieta[]; staff: PersonaStaff[]; io: string; admin?: boolean;
  /** Elenco per le squadre di competenza di un direttore (id + nome da mostrare), senza Organizzazione né Preparatori */
  squadreElenco?: { id: string; nome: string }[];
}) {
  const [squadre, setSquadre] = useState(iniziali);
  /* un PIN per persona (0050): il mister che usa il PIN personale di uno staff */
  const staffDi = (pin: string) => { const p = pin ? staff.find((x) => x.pin === pin) : undefined; return p ? GRUPPI.find((g) => g.ruolo === p.ruolo)?.titolo.toLowerCase() : ''; };
  const [messaggio, setMessaggio] = useState('');
  const timer = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  /** Applica subito sulla pagina e manda al server (`attesa` > 0: dopo una pausa nella scrittura, per chiave) */
  function fai(op: OpSquadre, attesa = 0, chiave = '') {
    if (op.tipo !== 'pinMister') setSquadre((s) => applicaOpSquadre(s, op, () => '') ?? s);
    setMessaggio('Salvataggio…');
    const manda = async () => {
      const r = await cambiaSquadre(op).catch(() => ({ ok: false, errore: 'rete assente', valore: undefined }));
      setMessaggio(r.ok ? 'Salvato' : `Non salvato: ${r.errore ?? 'riprova'}`);
      // il PIN nuovo lo decide il server (anche per le altre righe della stessa persona): si prendono solo i PIN
      if (r.ok && op.tipo === 'pinMister' && r.valore) {
        const pin = new Map(r.valore.flatMap((t) => t.coaches.map((c) => [`${t.id}|${c.id}`, c.code] as const)));
        setSquadre((s) => s.map((t) => ({ ...t, coaches: t.coaches.map((c) => ({ ...c, code: pin.get(`${t.id}|${c.id}`) ?? c.code })) })));
      }
    };
    clearTimeout(timer.current[chiave]);
    if (attesa) timer.current[chiave] = setTimeout(manda, attesa); else manda();
  }

  return (
    <div className="space-y-4">
      {squadre.length === 0 && <p className="rounded-xl border border-dashed border-linea p-6 text-center text-grigio">Nessuna squadra ancora.</p>}
      {squadre.map((t) => (
        <section key={t.id} className="rounded-xl border border-linea bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h2 className="font-display text-2xl font-bold">
              {t.category || t.name || 'Senza nome'}
              {t.category && t.name && <span className="font-sans text-base font-normal text-grigio"> · {t.name}</span>}
            </h2>
            {!t.organizza && <a href={`/squadra/rosa?squadra=${encodeURIComponent(t.id)}`} className={chiaro}>Apri squadra</a>}
          </div>

          <h3 className="mt-3 text-sm font-semibold uppercase tracking-wide text-grigio">Mister</h3>
          {t.coaches.length === 0 && <p className="text-sm text-grigio">Nessun mister: aggiungilo e genera il suo PIN.</p>}
          <ul className="divide-y divide-linea">
            {t.coaches.map((c) => (
              <li key={c.id} className="py-2">
                <div className="flex flex-wrap items-center gap-2">
                  <input className="campo min-w-0 basis-full py-2 sm:basis-0 sm:flex-1" value={c.name} placeholder="Nome e cognome" aria-label="Nome del mister"
                    onChange={(e) => fai({ tipo: 'nomeMister', id: t.id, mister: c.id, valore: e.target.value }, 700, `n:${c.id}`)} />
                  <PinBox pin={c.code} vuoto="Senza PIN" />
                  {staffDi(c.code) ? (
                    <span className="flex-none text-xs text-grigio" title="Stessa persona: un solo PIN, si cambia dalla riga dello staff">= PIN {staffDi(c.code)}</span>
                  ) : (
                    <button type="button" className={c.code ? chiaro : pieno}
                      onClick={() => (!c.code || confirm(`Rigenerare il PIN di ${c.name || 'questo mister'}? Quello vecchio smette di funzionare (anche nelle altre squadre di questa persona).`)) && fai({ tipo: 'pinMister', id: t.id, mister: c.id })}>
                      {c.code ? 'Rigenera' : 'Genera PIN'}
                    </button>
                  )}
                  <button type="button" className={croce} aria-label={`Togli ${c.name || 'mister'}`}
                    onClick={() => confirm(`Togliere ${c.name || 'questo mister'}? Il suo PIN smette di funzionare.`) && fai({ tipo: 'togliMister', id: t.id, mister: c.id })}>×</button>
                </div>
                {t.vedeTutte && (
                  <label className="mt-1.5 flex items-center gap-2 text-sm text-grigio">
                    Portieri di: Under
                    <input className="campo w-40 py-1.5" inputMode="numeric" placeholder="Es. 15, 14, 11" defaultValue={(c.eta ?? []).join(', ')}
                      onChange={(e) => fai({ tipo: 'etaMister', id: t.id, mister: c.id, valore: e.target.value }, 700, `e:${c.id}`)} />
                  </label>
                )}
              </li>
            ))}
          </ul>
          <button type="button" className={`${chiaro} mt-2`} onClick={() => fai({ tipo: 'aggiungiMister', id: t.id, mister: nuovoId('m_') })}>+ Aggiungi mister</button>

          {t.code && (
            <p className="mt-3 rounded-lg bg-carta p-3 text-sm">
              PIN di squadra condiviso (vecchio): <b className="font-mono">{t.code}</b>{' '}
              <button type="button" className="font-semibold text-blu underline"
                onClick={() => confirm('Disattivare il PIN di squadra? Chi lo usa ancora non potrà più entrare: servirà il PIN personale.') && fai({ tipo: 'disattivaPinSquadra', id: t.id })}>
                Disattiva</button> — quando ogni mister ha il suo PIN, disattivalo.
            </p>
          )}

          <details className="mt-3">
            <summary className="cursor-pointer font-semibold text-blu">Nome, categoria, elimina</summary>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-medium">Nome squadra
                <input className="campo mt-1" value={t.name ?? ''} onChange={(e) => fai({ tipo: 'campo', id: t.id, campo: 'name', valore: e.target.value }, 700, `name:${t.id}`)} />
              </label>
              <label className="text-sm font-medium">Categoria
                <input className="campo mt-1" value={t.category ?? ''} placeholder="Es. Under 15"
                  onChange={(e) => fai({ tipo: 'campo', id: t.id, campo: 'category', valore: e.target.value }, 700, `cat:${t.id}`)} />
              </label>
            </div>
            <label className="mt-3 flex items-center gap-2 text-sm">
              <input type="checkbox" className="size-5" checked={!!t.vedeTutte} onChange={(e) => fai({ tipo: 'flag', id: t.id, flag: 'vedeTutte', valore: e.target.checked })} />
              Preparatori dei portieri: vedono tutte le squadre in sola lettura
            </label>
            <label className="mt-2 flex items-center gap-2 text-sm">
              <input type="checkbox" className="size-5" checked={!!t.organizza} onChange={(e) => fai({ tipo: 'flag', id: t.id, flag: 'organizza', valore: e.target.checked })} />
              Responsabile organizzativo: calendari di tutte le squadre, eventi e avvisi
            </label>
            <button type="button" className="mt-3 rounded-lg px-2 py-1.5 text-sm font-semibold text-rosso hover:bg-rosso/5"
              onClick={() => confirm(`Eliminare la squadra "${t.category || t.name}"? Rosa e formazione non saranno più accessibili.`) && fai({ tipo: 'eliminaSquadra', id: t.id })}>Elimina squadra</button>
          </details>
        </section>
      ))}
      <button type="button" className={pieno} onClick={() => fai({ tipo: 'aggiungiSquadra', id: nuovoId('t_') })}>Aggiungi squadra</button>

      {/* si ridisegna quando arrivano i dati nuovi dal server (router.refresh dopo ogni cambio) */}
      <Staff key={staff.map((p) => [p.id, p.nome, p.cognome, p.attivo, p.pin, (p.squadre ?? []).join(','), p.vedeSegreteria].join()).join('|')}
        staff={staff} io={io} squadreElenco={squadreElenco} />

      <section className="rounded-xl border border-linea bg-white p-4">
        <h2 className="font-display text-2xl font-bold">Backup</h2>
        <p className="mt-1 text-sm text-grigio">Scarica un file con tutti i dati attuali (squadre, rose, schemi, formazioni): una copia di sicurezza da tenere da parte.</p>
        <button type="button" className={`${chiaro} mt-3`} onClick={async () => {
          setMessaggio('Preparo il backup…');
          const r = await esportaBackup().catch(() => ({ ok: false, errore: 'rete assente', valore: undefined }));
          if (!r.ok || !r.valore) { setMessaggio(`Backup non riuscito: ${r.errore ?? 'riprova'}`); return; }
          const a = document.createElement('a');
          a.href = URL.createObjectURL(new Blob([r.valore], { type: 'application/json' }));
          a.download = `foglio-gara-backup-${new Date().toISOString().slice(0, 10)}.json`;
          a.click(); URL.revokeObjectURL(a.href);
          setMessaggio('Backup pronto');
        }}>Esporta backup</button>
        {admin && <RipristinoBackup />}
      </section>
      <Messaggio testo={messaggio} />
    </div>
  );
}

/* Scouting, Direttori e Segreteria, mostrati come le squadre: ogni persona col suo PIN (= password dell'account) */
const GRUPPI = [
  { ruolo: 'scout', titolo: 'Scouting', sotto: 'Academy Casatese Merate', chi: 'scout' },
  { ruolo: 'direttore', titolo: 'Direttori', sotto: 'a capo di squadre e scout', chi: 'direttore' },
  { ruolo: 'segreteria', titolo: 'Segreteria', sotto: 'tesserati, famiglie, iscrizioni e quote', chi: 'addetto di segreteria' },
];

function Staff({ staff, io, squadreElenco }: { staff: PersonaStaff[]; io: string; squadreElenco: { id: string; nome: string }[] }) {
  const router = useRouter();
  const [occupato, setOccupato] = useState(false);
  const [errore, setErrore] = useState('');
  const [nuovo, setNuovo] = useState<Record<string, string | undefined>>({});
  const [squadreMsg, setSquadreMsg] = useState('');

  async function cambiaSquadreDirettore(id: string, squadre: string[] | null) {
    setSquadreMsg('Salvataggio…');
    const r = await impostaSquadreDirettore(id, squadre).catch(() => ({ ok: false, errore: 'rete assente' }));
    setSquadreMsg(r.ok ? 'Salvato' : `Non salvato: ${r.errore ?? 'riprova'}`);
    router.refresh();
  }
  async function cambiaSegreteriaDirettore(id: string, vede: boolean) {
    setSquadreMsg('Salvataggio…');
    const r = await impostaSegreteriaDirettore(id, vede).catch(() => ({ ok: false, errore: 'rete assente' }));
    setSquadreMsg(r.ok ? 'Salvato' : `Non salvato: ${r.errore ?? 'riprova'}`);
    router.refresh();
  }

  async function azione(body: Record<string, unknown>) {
    setOccupato(true); setErrore('');
    try {
      const r = await fetch('/api/staff', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const j = await r.json().catch(() => ({ errore: 'Sessione scaduta: rientra dalla pagina d’ingresso.' }));
      if (!r.ok || j.errore) setErrore(j.errore || 'Operazione non riuscita.');
      else if (body.azione === 'crea') setNuovo((n) => ({ ...n, [String(body.ruolo)]: undefined }));
    } catch { setErrore('Operazione non riuscita: controlla la connessione.'); }
    setOccupato(false); router.refresh();
  }
  const nomeDi = (p: PersonaStaff) => [p.nome, p.cognome].filter(Boolean).join(' ');

  return (
    <>
      {errore && <p role="alert" className="rounded-lg border border-rosso bg-rosso/10 p-3 font-semibold text-rosso">{errore}</p>}
      {squadreMsg && <p role="status" className="text-sm text-grigio">{squadreMsg}</p>}
      {GRUPPI.map((g) => {
        const persone = staff.filter((p) => p.ruolo === g.ruolo);
        return (
          <section key={g.ruolo} className="rounded-xl border border-linea bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h2 className="font-display text-2xl font-bold">{g.titolo} <span className="font-sans text-base font-normal text-grigio">· {g.sotto}</span></h2>
              {g.ruolo === 'scout' && <a href="/home" className={chiaro}>Apri Scouting</a>}
            </div>
            {persone.length === 0 && <p className="mt-2 text-sm text-grigio">Nessun {g.chi}: aggiungilo e genera il suo PIN.</p>}
            <ul className="mt-2 divide-y divide-linea">
              {persone.map((p) => (
                <li key={p.id} className={`py-2 ${p.attivo ? '' : 'opacity-60'}`}>
                  <div className="flex items-center gap-2">
                    <input className="campo min-w-0 flex-1 py-2" defaultValue={nomeDi(p)} placeholder="Nome e cognome" aria-label="Nome" disabled={occupato}
                      onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== nomeDi(p)) azione({ azione: 'nome', id: p.id, nome: v }); }} />
                    <PinBox pin={p.attivo ? p.pin : ''} vuoto={p.attivo ? 'Senza PIN' : 'Sospeso'} />
                    {p.attivo ? (
                      <>
                        <button type="button" className={p.pin ? chiaro : pieno} disabled={occupato}
                          onClick={() => (!p.pin || confirm(`Rigenerare il codice di ${nomeDi(p)}? Quello vecchio smette di funzionare.`)) && azione({ azione: 'pin', id: p.id })}>
                          {p.pin ? 'Rigenera' : 'Genera PIN'}
                        </button>
                        {p.id !== io && (
                          <button type="button" className={croce} disabled={occupato} aria-label={`Sospendi ${nomeDi(p)}`} title="Sospendi l'accesso"
                            onClick={() => confirm(`Sospendere ${nomeDi(p)}? Non potrà più entrare finché non lo riattivi.`) && azione({ azione: 'stato', id: p.id, attivo: false })}>×</button>
                        )}
                      </>
                    ) : (
                      <button type="button" className={chiaro} disabled={occupato} onClick={() => azione({ azione: 'stato', id: p.id, attivo: true })}>Riattiva</button>
                    )}
                  </div>
                  {g.ruolo === 'direttore' && squadreElenco.length > 0 && (
                    <details className="mt-1.5">
                      <summary className="cursor-pointer text-sm text-grigio">
                        Squadre di competenza: {p.squadre === null || p.squadre === undefined ? 'tutte' : p.squadre.length ? p.squadre.length : 'nessuna (solo Segreteria, Società e Scouting)'}
                      </summary>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        <button type="button" aria-pressed={p.squadre == null} onClick={() => cambiaSquadreDirettore(p.id, null)}
                          className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${p.squadre == null ? 'border-blu bg-blu text-white' : 'border-linea bg-white'}`}>Tutte</button>
                        {squadreElenco.map((t) => {
                          const scelta = !!p.squadre?.includes(t.id);
                          return (
                            <button key={t.id} type="button" aria-pressed={scelta}
                              onClick={() => cambiaSquadreDirettore(p.id, (p.squadre ?? []).includes(t.id) ? (p.squadre ?? []).filter((x) => x !== t.id) : [...(p.squadre ?? []), t.id])}
                              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${scelta ? 'border-blu bg-blu text-white' : 'border-linea bg-white'}`}>{t.nome}</button>
                          );
                        })}
                      </div>
                      <p className="mt-1 text-xs text-grigio">Società, Scouting e Segreteria restano sempre completi; questo limita solo Squadra (con la Distinta), Home e Programma gare.</p>
                    </details>
                  )}
                  {g.ruolo === 'direttore' && (
                    <label className="mt-1.5 flex items-center gap-2 text-sm text-grigio">
                      <input type="checkbox" className="size-5" checked={!!p.vedeSegreteria}
                        onChange={(e) => cambiaSegreteriaDirettore(p.id, e.target.checked)} />
                      Vede la Segreteria (tesserati, famiglie, iscrizioni e quote)
                    </label>
                  )}
                </li>
              ))}
            </ul>
            {nuovo[g.ruolo] !== undefined ? (
              <form className="mt-2 flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); const n = (nuovo[g.ruolo] ?? '').trim(); if (n) azione({ azione: 'crea', nome: n, ruolo: g.ruolo }); }}>
                <input className="campo min-w-0 flex-1 py-2" autoFocus value={nuovo[g.ruolo]} placeholder={`Nome e cognome del nuovo ${g.chi}`} aria-label={`Nuovo ${g.chi}`}
                  onChange={(e) => setNuovo((x) => ({ ...x, [g.ruolo]: e.target.value }))} />
                <button className={pieno} disabled={occupato}>Crea e genera PIN</button>
              </form>
            ) : (
              <button type="button" className={`${chiaro} mt-2`} onClick={() => setNuovo((x) => ({ ...x, [g.ruolo]: '' }))}>+ Aggiungi {g.chi}</button>
            )}
          </section>
        );
      })}
    </>
  );
}
