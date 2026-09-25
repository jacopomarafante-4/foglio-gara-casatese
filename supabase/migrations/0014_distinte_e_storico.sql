-- =====================================================================
-- 0014 · Distinte e storico: squadre per stagione, partite, presenze
-- Da eseguire in Supabase → SQL Editor, DOPO la 0013
-- =====================================================================

-- Un solo archivio giocatori. Dalle distinte (anche di stagioni passate) entrano tutti i
-- ragazzi in campo: quelli mai osservati hanno osservato = false e di norma non si vedono
-- nell'archivio scouting; diventano osservati alla prima segnalazione, valutazione o evento.
-- Dati presi dalla distinta: cognome, nome, data di nascita, numero di maglia (niente tessere/documenti).

-- 1. Osservato / solo da distinta -----------------------------------------
alter table public.giocatori add column if not exists osservato boolean not null default true;

create or replace function public.segna_osservato()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.giocatori set osservato = true where id = new.giocatore_id and not osservato;
  return new;
end $$;

drop trigger if exists segnalazioni_osservato on public.segnalazioni;
create trigger segnalazioni_osservato after insert on public.segnalazioni
  for each row execute function public.segna_osservato();
drop trigger if exists valutazioni_osservato on public.valutazioni;
create trigger valutazioni_osservato after insert on public.valutazioni
  for each row execute function public.segna_osservato();
drop trigger if exists eventi_osservato on public.eventi_giocatore;
create trigger eventi_osservato after insert on public.eventi_giocatore
  for each row execute function public.segna_osservato();

-- 2. Squadre: società + categoria + stagione ("2026/27") -------------------
create table public.squadre (
  id          uuid primary key default gen_random_uuid(),
  societa_id  uuid not null references public.societa (id) on delete cascade,
  categoria   text not null,          -- es. "Under 14", "Esordienti"
  stagione    text not null,          -- es. "2024/25"
  created_at  timestamptz not null default now()
);
create unique index squadre_unica on public.squadre (societa_id, lower(categoria), stagione);

-- 3. Distinte: una per partita ---------------------------------------------
create table public.distinte (
  id              uuid primary key default gen_random_uuid(),
  data            date not null,
  stagione        text not null,
  categoria       text not null,
  competizione    text,               -- es. "Provinciali girone B", "Amichevole"
  casa_nome       text not null,      -- come scritto nella distinta
  trasferta_nome  text not null,
  casa_id         uuid references public.squadre (id) on delete set null,
  trasferta_id    uuid references public.squadre (id) on delete set null,
  risultato       text,               -- es. "2-1"
  fonte           text,               -- nome del file o nota
  creato_da       uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now()
);
create unique index distinte_unica on public.distinte (data, lower(casa_nome), lower(trasferta_nome), lower(categoria));
create index distinte_data_idx on public.distinte (data);

-- 4. Chi era in distinta, per quale squadra, con che numero --------------
create table public.distinte_giocatori (
  distinta_id   uuid not null references public.distinte (id) on delete cascade,
  giocatore_id  uuid not null references public.giocatori (id) on delete cascade,
  squadra_id    uuid references public.squadre (id) on delete set null,
  numero        smallint,
  titolare      boolean,              -- null = non indicato
  capitano      boolean not null default false,
  primary key (distinta_id, giocatore_id)
);
create index distinte_giocatori_giocatore_idx on public.distinte_giocatori (giocatore_id);

-- 5. Permessi: leggono admin, direttori, scout; scrive l'admin (l'importazione usa lo script) --
alter table public.squadre            enable row level security;
alter table public.distinte           enable row level security;
alter table public.distinte_giocatori enable row level security;

create policy "squadre: lettura" on public.squadre
  for select to authenticated using (public.vede_tutto() or public.puo_segnalare());
create policy "squadre: gestione" on public.squadre
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "distinte: lettura" on public.distinte
  for select to authenticated using (public.vede_tutto() or public.puo_segnalare());
create policy "distinte: gestione" on public.distinte
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "presenze in distinta: lettura" on public.distinte_giocatori
  for select to authenticated
  using (exists (select 1 from public.giocatori g where g.id = giocatore_id));
create policy "presenze in distinta: gestione" on public.distinte_giocatori
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- 6. Unione di schede doppie: sposta anche le presenze in distinta ----------
create or replace function public.unisci_giocatori(p_tieni uuid, p_togli uuid)
returns void language plpgsql volatile security definer set search_path = public as $$
declare t public.giocatori; k public.giocatori; v_nome text;
begin
  if not public.is_admin() then
    raise exception 'Solo l''admin può unire due schede' using errcode = '42501';
  end if;
  if p_tieni is null or p_togli is null or p_tieni = p_togli then
    raise exception 'Scegli due schede diverse';
  end if;
  select * into k from public.giocatori where id = p_tieni for update;
  select * into t from public.giocatori where id = p_togli for update;
  if k.id is null or t.id is null then raise exception 'Scheda non trovata'; end if;

  update public.segnalazioni     set giocatore_id = p_tieni where giocatore_id = p_togli;
  update public.valutazioni      set giocatore_id = p_tieni where giocatore_id = p_togli;
  update public.contatti         set giocatore_id = p_tieni where giocatore_id = p_togli;
  update public.eventi_giocatore set giocatore_id = p_tieni where giocatore_id = p_togli;
  update public.storico_stati    set giocatore_id = p_tieni where giocatore_id = p_togli;
  -- presenze: se erano nella stessa distinta tutte e due, resta quella di p_tieni
  delete from public.distinte_giocatori d
    where d.giocatore_id = p_togli
      and exists (select 1 from public.distinte_giocatori x where x.distinta_id = d.distinta_id and x.giocatore_id = p_tieni);
  update public.distinte_giocatori set giocatore_id = p_tieni where giocatore_id = p_togli;

  v_nome := coalesce(nullif(trim(concat_ws(' ', t.cognome, t.nome)), ''), t.descrizione, 'senza nome');
  update public.giocatori set
    cognome         = coalesce(k.cognome, t.cognome),
    nome            = coalesce(k.nome, t.nome),
    descrizione     = coalesce(k.descrizione, t.descrizione),
    data_nascita    = coalesce(k.data_nascita, t.data_nascita),
    ruolo           = coalesce(k.ruolo, t.ruolo),
    piede           = coalesce(k.piede, t.piede),
    societa_id      = coalesce(k.societa_id, t.societa_id),
    categoria       = coalesce(k.categoria, t.categoria),
    osservato       = k.osservato or t.osservato,
    segnalato_da_squadra = coalesce(k.segnalato_da_squadra, t.segnalato_da_squadra),
    note            = concat_ws(E'\n\n', k.note, t.note,
                        'Unita con la scheda "' || v_nome || '" (' || t.annata || ') il ' || to_char(current_date, 'DD/MM/YYYY'))
  where id = p_tieni;

  delete from public.giocatori where id = p_togli;
end $$;
