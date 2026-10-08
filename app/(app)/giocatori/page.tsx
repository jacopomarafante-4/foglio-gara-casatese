import Link from 'next/link';
import { FiltriAuto } from '@/components/FiltriAuto';
import { Fragment } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { getProfilo } from '@/lib/auth';
import { gestisce, puoSegnalare } from '@/lib/ruoli';
import {
  annateDisponibili, GIUDIZI, IMPRESSIONI, PIEDI, RUOLI_CAMPO, STATI, valoreValido, type Giudizio, type Impressione, type Piede, type RuoloCampo, type RuoloPreciso, etichettaRuolo, type StatoGiocatore,
} from '@/lib/tipi';
import { istanteTraOre, perRicerca } from '@/lib/utili';
import { categoriaDaAnnata, giocaInGara } from '@/lib/categorie';
import { StatoBadge } from '@/components/StatoBadge';
import { elencoSocieta, idNostraSocieta } from '@/lib/societa';
import { VistaGiocatori } from '@/components/VistaGiocatori';
import { ContattoFlag } from '@/components/ContattoFlag';
import { conContatto } from '@/lib/contatti';
import { SlotValutazioni, valutatori, SOGLIA_VALUTAZIONI } from '@/components/Autore';
import { medieAree } from '@/lib/valutazioni';
import { Annata, coloreAnnata } from '@/components/Annata';

type Riga = {
  id: string;
  cognome: string | null;
  nome: string | null;
  descrizione: string | null;
  annata: number;
  ruolo: RuoloCampo | null;
  ruolo_preciso: RuoloPreciso | null;
  piede: Piede | null;
  stato: StatoGiocatore;
  osservato: boolean;
  categoria: string | null;
  societa_id: string | null;
  updated_at: string;
  societa: { nome: string } | null;
  segnalazioni: { data: string; impressione: Impressione | null; piede: Piede | null; tecnica: number | null; motoria: number | null; tattica: number | null; mentale: number | null }[];
  valutazioni: {
    tecnica: number | null; motoria: number | null; tattica: number | null; mentale: number | null; giudizio: Giudizio; data: string;
    autore_id: string | null; autore_squadra: string | null; autore: { nome: string | null; cognome: string | null; email: string } | null;
  }[];
};

type GaraBreve = {
  id: string; data_ora: string; ora_da_definire: boolean | null; categoria: string;
  casa_id: string | null; trasferta_id: string | null; casa_nome: string; trasferta_nome: string;
};

const PER_PAGINA = 30;
const ORDINE_RUOLI = Object.keys(RUOLI_CAMPO);
const ORDINE_STATI = Object.keys(STATI);
const ORDINE_PIEDI = Object.keys(PIEDI);
const PIEDI_BREVI: Record<Piede, string> = { destro: 'Destro', sinistro: 'Sinistro', ambidestro: 'Entrambi' };
/* Nella tabella da computer il piede in sigla: la colonna stretta lascia spazio al nome */
const PIEDI_SIGLA: Record<Piede, string> = { destro: 'Dx', sinistro: 'Sx', ambidestro: 'Dx-Sx' };

/* Prima impressione dell'ultima segnalazione che ne ha una (0042) */
const ORDINE_IMPRESSIONI: Impressione[] = ['positiva', 'da_rivedere', 'negativa'];
const COLORI_IMPRESSIONE: Record<Impressione, string> = {
  positiva: 'bg-blu/10 text-blu', da_rivedere: 'bg-oro/25 text-inchiostro', negativa: 'bg-rosso/10 text-rosso',
};
function impressioneDi(g: { segnalazioni?: { data: string; impressione: Impressione | null }[] }): Impressione | null {
  return [...(g.segnalazioni ?? [])].filter((x) => x.impressione).sort((a, b) => b.data.localeCompare(a.data))[0]?.impressione ?? null;
}

const COLORI_GIUDIZIO: Record<Giudizio, string> = {
  da_prendere: 'bg-blu text-white',
  da_rivedere: 'bg-oro/25 text-inchiostro',
  non_a_livello: 'bg-rosso/10 text-rosso',
};

/** Colonne ordinabili (clic sull'intestazione, o "Ordina per" da telefono) */
const COLONNE = {
  anno: 'Anno',
  giocatore: 'Giocatore',
  ruolo: 'Ruolo',
  piede: 'Piede',
  stato: 'Stato',
  impressione: 'Segnalazione',
  valutazione: 'Valutazioni',
  segnalato: 'Ultima segnalazione',
  valutato: 'Ultima valutazione',
  squadra: 'Squadra',
  gara: 'Prossima gara',
} as const;
type Colonna = keyof typeof COLONNE;
/* Da computer: l'annata sta accanto al nome, squadra e prossima gara in una colonna su due righe (la tabella è larga 1000 px) */
const COLONNE_TABELLA: [Colonna, string][] = [
  ['giocatore', 'Giocatore'], ['ruolo', 'Ruolo e piede'], ['stato', 'Stato'],
  ['impressione', 'Segnalazione'], ['segnalato', 'Segnalato'], ['valutazione', 'Valutazioni'], ['valutato', 'Valutato'], ['squadra', 'Squadra e gara'],
];

/** Istante della gara → "dom 27/09 10:30" (ora italiana) */
function dataGara(iso: string, senzaOra: boolean) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('it-IT', {
    timeZone: 'Europe/Rome', weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  }).formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return `${p.weekday} ${p.day}/${p.month}${senzaOra ? '' : ` ${p.hour}:${p.minute}`}`;
}

/* Voto globale delle segnalazioni (media dei voti per area, 0043) e giudizio dell'ultima valutazione */
const ORDINE_GIUDIZI: Giudizio[] = ['da_prendere', 'da_rivedere', 'non_a_livello'];
function sintesiValutazioni(g: Pick<Riga, 'valutazioni' | 'segnalazioni'>) {
  const m = medieAree(g.segnalazioni ?? []);
  const ultima = [...g.valutazioni].sort((a, b) => b.data.localeCompare(a.data))[0];
  return { media: m.media, quante: m.quanti, giudizio: ultima?.giudizio ?? null };
}
/* Piede: quello della scheda, se no dell'ultima segnalazione che lo indica */
function piedeDi(g: Pick<Riga, 'piede' | 'segnalazioni'>): Piede | null {
  return g.piede ?? [...(g.segnalazioni ?? [])].filter((x) => x.piede).sort((a, b) => b.data.localeCompare(a.data))[0]?.piede ?? null;
}

/** Prossime gare (60 giorni) delle società indicate: a blocchi, per non superare i limiti delle richieste */
async function gareDelleSocieta(supabase: SupabaseClient, ids: string[]) {
  const out: GaraBreve[] = [];
  for (let i = 0; i < ids.length; i += 40) {
    const blocco = ids.slice(i, i + 40).join(',');
    for (let da = 0; ; da += 1000) {
      const { data } = await supabase
        .from('gare')
        .select('id, data_ora, ora_da_definire, categoria, casa_id, trasferta_id, casa_nome, trasferta_nome')
        .or(`casa_id.in.(${blocco}),trasferta_id.in.(${blocco})`)
        .gte('data_ora', istanteTraOre(-2))
        .lte('data_ora', istanteTraOre(24 * 60))
        .order('data_ora')
        .range(da, da + 999);
      out.push(...((data as GaraBreve[] | null) ?? []));
      if (!data || data.length < 1000) break;
    }
  }
  return out.sort((a, b) => a.data_ora.localeCompare(b.data_ora));
}

export default async function Giocatori({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const filtri = await searchParams;
  const profilo = (await getProfilo())!;
  const supabase = await createClient();

  const pagina = Math.max(1, Number(filtri.pagina) || 1);
  const ordina = (filtri.ordina && filtri.ordina in COLONNE ? filtri.ordina : null) as Colonna | null;
  const discendente = filtri.verso === 'giu';

  // Tutti i giocatori dei filtri (sono qualche centinaio): l'ordinamento per valutazione o
  // prossima gara si calcola qui, poi si prende la pagina
  const societa = await elencoSocieta(supabase);
  const nostra = idNostraSocieta(societa);
  const tuttiIGiocatori = filtri.chi === 'tutti';
  const costruisci = () => {
    let q = supabase
      .from('giocatori')
      .select(
        'id, cognome, nome, descrizione, annata, ruolo, ruolo_preciso, piede, stato, osservato, categoria, societa_id, updated_at, societa(nome), ' +
          'segnalazioni(data, impressione, piede, tecnica, motoria, tattica, mentale), ' +
          'valutazioni(tecnica, motoria, tattica, mentale, giudizio, data, autore_id, autore_squadra, autore:profiles(nome, cognome, email))',
      )
      .order('updated_at', { ascending: false });
    const annata = Number(filtri.annata);
    if (Number.isInteger(annata) && annata > 0) q = q.eq('annata', annata);
    const ruolo = valoreValido(RUOLI_CAMPO, filtri.ruolo);
    if (ruolo) q = q.eq('ruolo', ruolo);
    const stato = valoreValido(STATI, filtri.stato);
    if (stato) q = q.eq('stato', stato);
    if (filtri.societa) q = q.eq('societa_id', filtri.societa);
    // Di norma solo i ragazzi osservati e non dell'Academy; "Tutti i giocatori" = anche i nostri e quelli
    // visti solo nelle distinte (0014). Scegliendo l'Academy come società si vedono comunque i nostri.
    if (!tuttiIGiocatori) {
      q = q.eq('osservato', true);
      if (nostra && filtri.societa !== nostra) q = q.or(`societa_id.is.null,societa_id.neq.${nostra}`);
    }
    const cerca = filtri.q ? perRicerca(filtri.q) : '';
    if (cerca) q = q.or(`cognome.ilike.%${cerca}%,nome.ilike.%${cerca}%,descrizione.ilike.%${cerca}%`);
    return q;
  };
  const tutti: Riga[] = [];
  let error: { message: string } | null = null;
  for (let da = 0; ; da += 1000) {
    const r = await costruisci().range(da, da + 999);
    if (r.error) { error = r.error; break; }
    tutti.push(...((r.data as unknown as Riga[]) ?? []));
    if ((r.data?.length ?? 0) < 1000) break;
  }

  // filtro per prima impressione (dell'ultima segnalazione che ne ha una): si calcola qui, come l'ordinamento
  if (filtri.impressione) {
    const tenuti = tutti.filter((g) => (filtri.impressione === 'nessuna' ? !impressioneDi(g) : impressioneDi(g) === filtri.impressione));
    tutti.splice(0, tutti.length, ...tenuti);
  }

  const nomeDi = (g: Riga) => [g.cognome, g.nome].filter(Boolean).join(' ') || g.descrizione || 'Senza nome';
  const categoriaDi = (g: Riga) => (g.categoria ?? categoriaDaAnnata(g.annata).split(' - ')[0]).replace(/^Under\s*/i, 'U');
  const sintesi = new Map(tutti.map((g) => [g.id, sintesiValutazioni(g)]));

  // Prossime gare: di tutti se si ordina per gara, se no solo della pagina
  const perGara = ordina === 'gara';
  const idSocieta = (lista: Riga[]) => [...new Set(lista.map((g) => g.societa_id).filter(Boolean))] as string[];
  let gare = perGara ? await gareDelleSocieta(supabase, idSocieta(tutti)) : [];
  const prossimaGara = (g: Riga) => (g.societa_id ? gare.find((x) => giocaInGara(g, x)) : undefined);

  if (ordina) {
    const it = new Intl.Collator('it', { sensitivity: 'base' });
    const chiaveGara = new Map(perGara ? tutti.map((g) => [g.id, prossimaGara(g)?.data_ora ?? null]) : []);
    // Valori mancanti sempre in fondo, in tutti e due i versi
    const confronta = (a: Riga, b: Riga): number => {
      const valore = (g: Riga): string | number | null => {
        switch (ordina) {
          case 'anno': return g.annata;
          case 'giocatore': return nomeDi(g);
          case 'ruolo': return g.ruolo ? ORDINE_RUOLI.indexOf(g.ruolo) : null;
          case 'stato': return g.osservato ? ORDINE_STATI.indexOf(g.stato) : null;
          case 'piede': { const p = piedeDi(g); return p ? ORDINE_PIEDI.indexOf(p) : null; }
          // impressione, poi voto globale (più alto prima)
          case 'impressione': { const i = impressioneDi(g); const m = sintesi.get(g.id)?.media; return i || m != null ? (i ? ORDINE_IMPRESSIONI.indexOf(i) : 3) * 10 - (m ?? 0) : null; }
          case 'squadra': return g.societa ? `${g.societa.nome} ${categoriaDi(g)}` : null;
          // quante persone l'hanno valutato, poi il giudizio dell'ultima
          case 'valutazione': { const n = valutatori(g.valutazioni).length; const gi = sintesi.get(g.id)?.giudizio; return n ? n * 10 - (gi ? ORDINE_GIUDIZI.indexOf(gi) : 3) : null; }
          case 'gara': return chiaveGara.get(g.id) ?? null;
          case 'segnalato': return (g.segnalazioni ?? []).map((x) => x.data).filter(Boolean).sort().at(-1) ?? null;
          case 'valutato': return (g.valutazioni ?? []).map((x) => x.data).filter(Boolean).sort().at(-1) ?? null;
        }
      };
      const [x, y] = [valore(a), valore(b)];
      if (x === null || y === null) return x === y ? 0 : x === null ? 1 : -1;
      const c = typeof x === 'number' && typeof y === 'number' ? x - y : it.compare(String(x), String(y));
      return discendente ? -c : c;
    };
    tutti.sort(confronta);
  } else {
    // di base: raggruppati per annata (dalla più giovane), dentro l'annata i modificati di recente
    tutti.sort((a, b) => b.annata - a.annata);
  }
  const perAnnata = !ordina;

  const totale = tutti.length;
  const totalePagine = Math.max(1, Math.ceil(totale / PER_PAGINA));
  const giocatori = tutti.slice((pagina - 1) * PER_PAGINA, pagina * PER_PAGINA);
  if (!perGara) gare = await gareDelleSocieta(supabase, idSocieta(giocatori));
  const valuta = puoSegnalare(profilo.ruolo);
  const contatto = await conContatto(supabase, giocatori.map((g) => g.id));   // 0037: solo sì/no

  const link = (cambi: Record<string, string | null>) => {
    const sp = new URLSearchParams(Object.entries(filtri).filter(([, v]) => v !== undefined) as [string, string][]);
    for (const [k, v] of Object.entries(cambi)) if (v === null) sp.delete(k); else sp.set(k, v);
    return `?${sp.toString()}`;
  };
  // Primo clic: A→Z (o dal più alto per la valutazione); secondo clic: al contrario
  const primoVerso = (c: Colonna) => (c === 'valutazione' || c === 'segnalato' || c === 'valutato' ? 'giu' : 'su');   // date: le più recenti prima   // segnalazione: su = positiva e voto alto prima
  const linkOrdina = (c: Colonna) =>
    link({ ordina: c, verso: ordina === c ? (discendente ? 'su' : 'giu') : primoVerso(c), pagina: null });
  const freccia = (c: Colonna) => (ordina === c ? (discendente ? ' ▼' : ' ▲') : ' ⇅');

  const righe = giocatori.map((g) => {
    const v = sintesi.get(g.id)!;
    const firme = valutatori(g.valutazioni);   // persone diverse che l'hanno valutato (3 caselle, 0040)
    const gara = prossimaGara(g);
    const inCasa = gara && gara.casa_id === g.societa_id;
    return {
      g,
      firme,
      completo: firme.length >= SOGLIA_VALUTAZIONI,
      nome: nomeDi(g),
      squadra: [g.societa?.nome ?? 'Società ?', categoriaDi(g)].join(' · '),
      v,
      gara,
      testoGara: gara
        ? `${dataGara(gara.data_ora, !!gara.ora_da_definire)} · ${inCasa ? `casa, ${gara.trasferta_nome}` : `a ${gara.casa_nome}`}`
        : g.societa_id ? 'Nessuna in calendario' : '–',
      href: `/giocatori/${g.id}`,
    };
  });

  /* Segnalazione: prima impressione e voto globale (media dei voti per area delle segnalazioni) */
  /* data dell'ultima segnalazione / valutazione: "12/09/26" */
  const ultimaData = (xs: { data?: string | null }[] | null | undefined) => (xs ?? []).map((x) => x.data).filter((d): d is string => !!d).sort().at(-1);
  const quando = (d?: string) => d ? <span className="whitespace-nowrap font-semibold tabular-nums">{d.slice(8, 10)}/{d.slice(5, 7)}/{d.slice(2, 4)}</span> : <span className="text-grigio">–</span>;
  const valutazioni = (r: (typeof righe)[number]) => (
    <span className="flex items-center gap-1.5">{colonnaValutazione(r)}</span>
  );
  const segnalazione = (r: (typeof righe)[number]) => {
    const i = impressioneDi(r.g), m = r.v.media, d = ultimaData(r.g.segnalazioni);
    if (!i && m === null && !d) return <span className="text-grigio">–</span>;
    return (
      <span className="flex items-center gap-1.5">
        {i && <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${COLORI_IMPRESSIONE[i]}`}>{IMPRESSIONI[i]}</span>}
        {m !== null && (
          <span className="font-display text-base font-bold text-blu" title={`Voto globale: media dei voti per area di ${r.v.quante} ${r.v.quante === 1 ? 'segnalazione' : 'segnalazioni'} (1–5)`}>
            {m.toFixed(1).replace('.', ',')}
          </span>
        )}
      </span>
    );
  };
  const stato = (g: Riga) =>
    g.osservato ? (
      <StatoBadge stato={g.stato} />
    ) : (
      <span className="rounded-full border border-linea px-2.5 py-0.5 text-xs font-semibold text-grigio">Da distinta</span>
    );
  /* Titolo di gruppo quando cambia l'annata (elenco di base, per annata) */
  const nuovaAnnata = (i: number) => perAnnata && (i === 0 || righe[i - 1].g.annata !== righe[i].g.annata);
  const quantiAnnata = (a: number) => tutti.filter((g) => g.annata === a).length;
  const titoloAnnata = (a: number) => (
    <span className="flex items-center gap-2">
      <Annata annata={a} grande />
      <span className="font-display text-base font-bold">{categoriaDaAnnata(a).split(' - ')[0]}</span>
      <span className="text-xs text-grigio">{quantiAnnata(a)} {quantiAnnata(a) === 1 ? 'giocatore' : 'giocatori'}</span>
    </span>
  );
  /* Le 3 caselle delle valutazioni, poi il giudizio dell'ultima (o il pulsante Valuta) */
  const colonnaValutazione = (r: (typeof righe)[number]) => (
    <span className="flex items-center gap-2">
      <SlotValutazioni firme={r.firme} piccolo />
      {r.v.giudizio ? (
        <span className={`truncate rounded-full px-2 py-0.5 text-xs font-semibold ${COLORI_GIUDIZIO[r.v.giudizio]}`}>{GIUDIZI[r.v.giudizio]}</span>
      ) : pulsanteValuta(r.href)}
    </span>
  );
  const pulsanteValuta = (href: string) =>
    valuta ? (
      <Link href={`${href}/valuta`} className="relative z-10 inline-block rounded-lg border border-blu px-3 py-1 text-sm font-semibold text-blu hover:bg-blu/5">
        Valuta
      </Link>
    ) : (
      <span className="text-grigio">Da valutare</span>
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl font-bold">Giocatori</h1>
          <p className="text-grigio">
            {totale} {totale === 1 ? 'giocatore' : 'giocatori'}
            {totalePagine > 1 && ` – pagina ${pagina} di ${totalePagine}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <VistaGiocatori attiva="elenco" admin={gestisce(profilo.ruolo)} />
          {puoSegnalare(profilo.ruolo) && (
            <Link href="/segnala" className="bottone">Segnala un giocatore</Link>
          )}
        </div>
      </div>

      <FiltriAuto className="grid grid-cols-2 gap-x-3 gap-y-2 rounded-xl border border-linea bg-white p-4 sm:grid-cols-3 lg:grid-cols-4">
        <label className="col-span-2 sm:col-span-3 lg:col-span-4"><span className="mb-1 block text-sm font-semibold text-grigio">Cerca</span>
          <input name="q" defaultValue={filtri.q} placeholder="Cognome, nome o descrizione, poi Invio" className="campo" /></label>
        <label><span className="mb-1 block text-sm font-semibold text-grigio">Annata</span>
          <select name="annata" defaultValue={filtri.annata ?? ''} className="campo"><option value="">Tutte</option>
            {annateDisponibili().map((a) => <option key={a} value={a}>{a}</option>)}</select></label>
        <label><span className="mb-1 block text-sm font-semibold text-grigio">Ruolo</span>
          <select name="ruolo" defaultValue={filtri.ruolo ?? ''} className="campo"><option value="">Tutti</option>
            {Object.entries(RUOLI_CAMPO).map(([v, e]) => <option key={v} value={v}>{e}</option>)}</select></label>
        <label><span className="mb-1 block text-sm font-semibold text-grigio">Stato</span>
          <select name="stato" defaultValue={filtri.stato ?? ''} className="campo"><option value="">Tutti</option>
            {Object.entries(STATI).map(([v, e]) => <option key={v} value={v}>{e}</option>)}</select></label>
        <label><span className="mb-1 block text-sm font-semibold text-grigio">Prima impressione</span>
          <select name="impressione" defaultValue={filtri.impressione ?? ''} className="campo"><option value="">Tutte</option>
            {Object.entries(IMPRESSIONI).map(([v, e]) => <option key={v} value={v}>{e}</option>)}<option value="nessuna">Senza impressione</option></select></label>
        <label><span className="mb-1 block text-sm font-semibold text-grigio">Società</span>
          <select name="societa" defaultValue={filtri.societa ?? ''} className="campo"><option value="">Tutte</option>
            {societa.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}</select></label>
        <label><span className="mb-1 block text-sm font-semibold text-grigio">Quali giocatori</span>
          <select name="chi" defaultValue={filtri.chi ?? ''} className="campo"><option value="">Solo osservati, senza Academy</option>
            <option value="tutti">Tutti, anche da distinta e Academy</option></select></label>
        {/* Ordinamento: da computer si tocca l'intestazione della tabella; qui per telefono e tablet (e per tenerlo filtrando) */}
        <label className="lg:hidden"><span className="mb-1 block text-sm font-semibold text-grigio">Ordina per</span>
          <select name="ordina" defaultValue={ordina ?? ''} className="campo"><option value="">Annata</option>
            {Object.entries(COLONNE).map(([v, e]) => <option key={v} value={v}>{e}</option>)}</select></label>
        <label className="lg:hidden"><span className="mb-1 block text-sm font-semibold text-grigio">Verso</span>
          <select name="verso" defaultValue={filtri.verso ?? ''} className="campo"><option value="">Dal primo (A→Z, dal più vecchio)</option>
            <option value="giu">Dall’ultimo (Z→A, dal più recente)</option></select></label>
        <div className="col-span-2 flex items-end justify-end sm:col-span-3 lg:col-span-1">
          <Link href="/giocatori" className="rounded-lg px-4 py-3 text-sm font-semibold text-grigio hover:bg-carta">Azzera i filtri</Link>
        </div>
      </FiltriAuto>
      <p className="-mt-4 text-sm text-grigio">I filtri si applicano appena scegli. Da computer tocca il titolo di una colonna (⇅) per ordinare.</p>

      {error && <p className="text-rosso">Errore nel caricamento: {error.message}</p>}

      {giocatori.length === 0 ? (
        <div className="rounded-xl border border-dashed border-linea p-10 text-center text-grigio">
          Nessun giocatore con questi filtri.
          {puoSegnalare(profilo.ruolo) && (
            <>
              {' '}
              <Link href="/segnala" className="font-medium text-blu underline">Segnalane uno</Link>.
            </>
          )}
        </div>
      ) : (
        <>
          {/* Computer: tabella a righe singole, colonne ordinabili cliccando l'intestazione */}
          <div className="hidden overflow-hidden rounded-xl border border-linea bg-white lg:block">
            <table className="w-full table-fixed text-left text-sm">
              <colgroup>
                <col />
                <col className="w-32" />
                <col className="w-28" />
                <col className="w-28" />
                <col className="w-[5.5rem]" />
                <col className="w-36" />
                <col className="w-[5.5rem]" />
                <col className="w-32" />
              </colgroup>
              <thead className="border-b border-linea bg-carta text-xs uppercase tracking-wide text-grigio">
                <tr>
                  {COLONNE_TABELLA.map(([c, titolo]) => (
                    <th
                      key={c}
                      scope="col"
                      aria-sort={ordina === c ? (discendente ? 'descending' : 'ascending') : undefined}
                      className="p-0 font-semibold first:pl-2"
                    >
                      <Link
                        href={linkOrdina(c)}
                        className={`block whitespace-nowrap px-2 py-2 hover:text-inchiostro ${ordina === c ? 'text-inchiostro' : ''}`}
                        title={`Ordina per ${COLONNE[c].toLowerCase()}`}
                      >
                        {titolo}{freccia(c)}
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-linea">
                {righe.map((r, i) => {
                  const cella = (contenuto: React.ReactNode, title?: string, extra = '') => (
                    <td className={`p-0 first:pl-2 ${extra}`}>
                      <Link href={r.href} tabIndex={-1} title={title} className="block truncate px-2 py-2.5">{contenuto}</Link>
                    </td>
                  );
                  return (
                    <Fragment key={r.g.id}>
                    {nuovaAnnata(i) && (
                      <tr className="bg-carta" style={{ borderLeft: `4px solid ${coloreAnnata(r.g.annata)[1]}` }}>
                        <td colSpan={8} className="px-2 py-1.5">{titoloAnnata(r.g.annata)}</td>
                      </tr>
                    )}
                    <tr className={r.completo ? 'bg-verde/[0.07] hover:bg-verde/10' : 'hover:bg-carta'}>
                      <td className="p-0 pl-2">
                        <Link href={r.href} title={r.nome} className={`flex items-center gap-1.5 px-2 py-2.5 font-semibold ${r.g.cognome ? '' : 'italic'}`}>
                          <Annata annata={r.g.annata} />
                          {/* nome intero: se è lungo va a capo (al massimo due righe) invece di finire con "…" */}
                          <span className="line-clamp-2 min-w-0 break-words leading-tight">{r.nome}</span>
                          {contatto.has(r.g.id) && <ContattoFlag presente breve />}
                        </Link>
                      </td>
                      {cella(<>{etichettaRuolo(r.g) ?? <span className="text-grigio">–</span>}{piedeDi(r.g) && <span className="text-grigio"> · {PIEDI_SIGLA[piedeDi(r.g)!]}</span>}</>,
                        [etichettaRuolo(r.g), piedeDi(r.g) && 'piede ' + PIEDI_BREVI[piedeDi(r.g)!].toLowerCase()].filter(Boolean).join(', ') || undefined)}
                      {cella(stato(r.g))}
                      {cella(segnalazione(r))}
                      {cella(quando(ultimaData(r.g.segnalazioni)))}
                      <td className="px-2 py-1.5">{valutazioni(r)}</td>
                      {cella(quando(ultimaData(r.g.valutazioni)))}
                      <td className="p-0">
                        <Link href={r.href} tabIndex={-1} title={`${r.squadra}\nProssima gara: ${r.testoGara}`} className="block px-2 py-1.5 leading-tight">
                          <span className="block truncate">{r.squadra}</span>
                          <span className={`block truncate text-xs ${r.gara ? 'text-inchiostro/80' : 'text-grigio'}`}>{r.testoGara}</span>
                        </Link>
                      </td>
                    </tr>
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Telefono e tablet: una scheda verticale per giocatore */}
          <ul className="space-y-2 lg:hidden">
            {righe.map((r, i) => (
              <Fragment key={r.g.id}>
              {nuovaAnnata(i) && (
                <li className="rounded-lg bg-carta px-3 py-2" style={{ borderLeft: `4px solid ${coloreAnnata(r.g.annata)[1]}` }}>{titoloAnnata(r.g.annata)}</li>
              )}
              <li className={`relative rounded-xl bg-white p-4 ${r.completo ? 'border-2 border-verde' : 'border border-linea'}`}
                style={{ borderLeftWidth: 5, borderLeftColor: coloreAnnata(r.g.annata)[1] }}>
                <Link href={r.href} className="absolute inset-0 rounded-xl" aria-label={`Apri ${r.nome}`} />
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className={`flex items-center gap-1.5 font-semibold ${r.g.cognome ? '' : 'italic'}`}>
                      <span className="truncate">{r.nome}</span>
                      {contatto.has(r.g.id) && <ContattoFlag presente breve />}
                    </p>
                    <p className="text-sm text-grigio">
                      <Annata annata={r.g.annata} />
                      {etichettaRuolo(r.g) && ` · ${etichettaRuolo(r.g)}`}
                      {piedeDi(r.g) && ` · piede ${PIEDI_BREVI[piedeDi(r.g)!].toLowerCase()}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">{stato(r.g)}</div>
                </div>
                <dl className="mt-3 grid grid-cols-[6.5rem_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-sm">
                  <dt className="self-center text-grigio">Segnalazione</dt>
                  <dd>{segnalazione(r)}</dd>
                  <dt className="self-center text-grigio">Segnalato il</dt>
                  <dd>{quando(ultimaData(r.g.segnalazioni))}</dd>
                  <dt className="self-center text-grigio">Valutazioni</dt>
                  <dd>{valutazioni(r)}</dd>
                  <dt className="self-center text-grigio">Valutato il</dt>
                  <dd>{quando(ultimaData(r.g.valutazioni))}</dd>
                  <dt className="text-grigio">Squadra</dt>
                  <dd className="truncate">{r.squadra}</dd>
                  <dt className="text-grigio">Prossima gara</dt>
                  <dd className={r.gara ? '' : 'text-grigio'}>{r.testoGara}</dd>
                </dl>
              </li>
              </Fragment>
            ))}
          </ul>
        </>
      )}

      {totalePagine > 1 && (
        <div className="flex items-center justify-between gap-3">
          {pagina > 1 ? (
            <Link href={link({ pagina: String(pagina - 1) })} className="rounded-lg border border-linea px-4 py-2 text-sm font-medium hover:border-blu">
              ‹ Precedenti
            </Link>
          ) : <span />}
          <span className="text-sm text-grigio">Pagina {pagina} di {totalePagine}</span>
          {pagina < totalePagine ? (
            <Link href={link({ pagina: String(pagina + 1) })} className="rounded-lg border border-linea px-4 py-2 text-sm font-medium hover:border-blu">
              Successivi ›
            </Link>
          ) : <span />}
        </div>
      )}
    </div>
  );
}
