-- =====================================================================
-- Scouting Hub · 0002 · Società, giocatori, segnalazioni, valutazioni
-- Da eseguire in Supabase → SQL Editor, DOPO la 0001
-- =====================================================================

-- 1. Valori ammessi -------------------------------------------------------
create type public.ruolo_campo as enum ('portiere', 'difensore', 'centrocampista', 'attaccante');
create type public.piede as enum ('destro', 'sinistro', 'ambidestro');
create type public.stato_giocatore as enum (
  'segnalato', 'da_rivedere', 'contattato', 'invitato', 'in_prova', 'inserito', 'chiuso'
);
create type public.giudizio as enum ('da_prendere', 'da_rivedere', 'non_a_livello');

-- 2. Permessi di base ------------------------------------------------------
-- Può segnalare e valutare: tutti tranne i mister (sola lettura)
create or replace function public.puo_segnalare()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(public.mio_ruolo() in ('admin', 'responsabile', 'osservatore'), false)
$$;

-- Quali annate può vedere l'utente: tutte, tranne i mister (solo le loro)
create or replace function public.puo_vedere_annata(a int)
returns boolean
language sql stable security definer set search_path = public
as $$
  select case
    when public.mio_ruolo() in ('admin', 'responsabile', 'osservatore') then true
    when public.mio_ruolo() = 'mister' then
      a = any (coalesce((select annate from public.profiles where id = auth.uid()), '{}'))
    else false
  end
$$;

-- 3. Società (una sola riga per società, con i nomi alternativi) --------
create table public.societa (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null unique,
  alias       text[] not null default '{}',   -- es. {Viberonchese, Vibe}
  comune      text,
  campo       text,                            -- nome del campo di casa
  indirizzo   text,
  lat         double precision,                -- coordinate del campo di casa
  lon         double precision,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 4. Giocatori (una sola scheda per ragazzo) -----------------------------
create table public.giocatori (
  id               uuid primary key default gen_random_uuid(),
  cognome          text,
  nome             text,
  descrizione      text,              -- per chi non ha ancora un nome: "N.8, biondo, mancino"
  annata           int not null check (annata between 1990 and 2030),
  data_nascita     date,
  ruolo            public.ruolo_campo,
  piede            public.piede,
  societa_id       uuid references public.societa (id) on delete set null,
  stato            public.stato_giocatore not null default 'segnalato',
  motivo_chiusura  text,
  rivedere_dal     date,              -- promemoria "da rivalutare più avanti"
  note             text,
  creato_da        uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint giocatore_identificabile check (
    nullif(trim(cognome), '') is not null or nullif(trim(descrizione), '') is not null
  )
);

create index giocatori_annata_idx on public.giocatori (annata);
create index giocatori_stato_idx on public.giocatori (stato);
create index giocatori_societa_idx on public.giocatori (societa_id);
create index giocatori_cognome_idx on public.giocatori (lower(cognome));

-- 5. Contatti famiglia (tabella separata e protetta) ---------------------
create table public.contatti (
  id               uuid primary key default gen_random_uuid(),
  giocatore_id     uuid not null references public.giocatori (id) on delete cascade,
  tipo             text not null default 'genitore' check (tipo in ('genitore', 'giocatore', 'altro')),
  nome             text,
  telefono         text,
  email            text,
  consenso_privacy boolean not null default false,
  creato_da        uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at       timestamptz not null default now()
);

create index contatti_giocatore_idx on public.contatti (giocatore_id);

-- 6. Segnalazioni rapide dal campo ---------------------------------------
create table public.segnalazioni (
  id            uuid primary key default gen_random_uuid(),
  giocatore_id  uuid not null references public.giocatori (id) on delete cascade,
  autore_id     uuid default auth.uid() references public.profiles (id) on delete set null,
  data          date not null default current_date,
  contesto      text,                 -- es. "Cambiaghese–Vibe, U12 provinciali"
  testo         text not null,
  voto          smallint check (voto between 1 and 5),
  created_at    timestamptz not null default now()
);

create index segnalazioni_giocatore_idx on public.segnalazioni (giocatore_id);

-- 7. Valutazioni strutturate (le 4 aree del vostro report) ---------------
create table public.valutazioni (
  id            uuid primary key default gen_random_uuid(),
  giocatore_id  uuid not null references public.giocatori (id) on delete cascade,
  autore_id     uuid default auth.uid() references public.profiles (id) on delete set null,
  data          date not null default current_date,
  contesto      text,
  tecnica       smallint not null check (tecnica between 1 and 5),
  tecnica_note  text,
  motoria       smallint not null check (motoria between 1 and 5),
  motoria_note  text,
  tattica       smallint not null check (tattica between 1 and 5),
  tattica_note  text,
  mentale       smallint not null check (mentale between 1 and 5),
  mentale_note  text,
  giudizio      public.giudizio not null,
  commento      text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index valutazioni_giocatore_idx on public.valutazioni (giocatore_id);

-- 8. Storico dei cambi di stato (scritto in automatico) ------------------
create table public.storico_stati (
  id            bigint generated always as identity primary key,
  giocatore_id  uuid not null references public.giocatori (id) on delete cascade,
  da_stato      public.stato_giocatore,
  a_stato       public.stato_giocatore not null,
  motivo        text,
  autore_id     uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now()
);

create index storico_giocatore_idx on public.storico_stati (giocatore_id);

-- Solo admin e responsabili cambiano lo stato
-- (auth.uid() nullo = script dal Mac con chiave di servizio: consentito)
create or replace function public.controlla_cambio_stato()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.stato is distinct from old.stato
     and auth.uid() is not null
     and not public.vede_tutto() then
    raise exception 'Solo admin e responsabili possono cambiare lo stato di un giocatore';
  end if;
  return new;
end;
$$;

create trigger giocatori_controlla_stato
  before update on public.giocatori
  for each row execute function public.controlla_cambio_stato();

create or replace function public.registra_cambio_stato()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' or new.stato is distinct from old.stato then
    insert into public.storico_stati (giocatore_id, da_stato, a_stato, motivo, autore_id)
    values (
      new.id,
      case when tg_op = 'UPDATE' then old.stato end,
      new.stato,
      case when new.stato = 'chiuso' then new.motivo_chiusura end,
      auth.uid()
    );
  end if;
  return new;
end;
$$;

create trigger giocatori_storico_stati
  after insert or update on public.giocatori
  for each row execute function public.registra_cambio_stato();

-- updated_at automatico
create trigger societa_updated_at before update on public.societa
  for each row execute function public.set_updated_at();
create trigger giocatori_updated_at before update on public.giocatori
  for each row execute function public.set_updated_at();
create trigger valutazioni_updated_at before update on public.valutazioni
  for each row execute function public.set_updated_at();

-- 9. Sicurezza (Row Level Security) -------------------------------------
alter table public.societa        enable row level security;
alter table public.giocatori      enable row level security;
alter table public.contatti       enable row level security;
alter table public.segnalazioni   enable row level security;
alter table public.valutazioni    enable row level security;
alter table public.storico_stati  enable row level security;

-- Società: tutti leggono, chi segnala può aggiungerle, admin/responsabili le modificano
create policy "societa: lettura" on public.societa
  for select to authenticated using (true);
create policy "societa: inserimento" on public.societa
  for insert to authenticated with check (public.puo_segnalare());
create policy "societa: modifica" on public.societa
  for update to authenticated using (public.vede_tutto()) with check (public.vede_tutto());
create policy "societa: eliminazione" on public.societa
  for delete to authenticated using (public.is_admin());

-- Giocatori: i mister vedono solo le proprie annate
create policy "giocatori: lettura" on public.giocatori
  for select to authenticated using (public.puo_vedere_annata(annata));
create policy "giocatori: inserimento" on public.giocatori
  for insert to authenticated with check (public.puo_segnalare());
create policy "giocatori: modifica" on public.giocatori
  for update to authenticated
  using (public.vede_tutto() or (creato_da = auth.uid() and public.puo_segnalare()))
  with check (public.vede_tutto() or (creato_da = auth.uid() and public.puo_segnalare()));
create policy "giocatori: eliminazione" on public.giocatori
  for delete to authenticated using (public.is_admin());

-- Contatti: solo admin/responsabili, oppure chi li ha inseriti
create policy "contatti: lettura" on public.contatti
  for select to authenticated using (public.vede_tutto() or creato_da = auth.uid());
create policy "contatti: inserimento" on public.contatti
  for insert to authenticated
  with check (public.puo_segnalare() and creato_da = auth.uid());
create policy "contatti: modifica" on public.contatti
  for update to authenticated
  using (public.vede_tutto() or creato_da = auth.uid())
  with check (public.vede_tutto() or creato_da = auth.uid());
create policy "contatti: eliminazione" on public.contatti
  for delete to authenticated using (public.vede_tutto() or creato_da = auth.uid());

-- Segnalazioni e valutazioni: visibili se il giocatore è visibile;
-- ognuno modifica solo le proprie (l'admin tutte)
create policy "segnalazioni: lettura" on public.segnalazioni
  for select to authenticated
  using (exists (select 1 from public.giocatori g where g.id = giocatore_id));
create policy "segnalazioni: inserimento" on public.segnalazioni
  for insert to authenticated
  with check (public.puo_segnalare() and autore_id = auth.uid());
create policy "segnalazioni: modifica" on public.segnalazioni
  for update to authenticated
  using (autore_id = auth.uid() or public.is_admin())
  with check (autore_id = auth.uid() or public.is_admin());
create policy "segnalazioni: eliminazione" on public.segnalazioni
  for delete to authenticated using (autore_id = auth.uid() or public.is_admin());

create policy "valutazioni: lettura" on public.valutazioni
  for select to authenticated
  using (exists (select 1 from public.giocatori g where g.id = giocatore_id));
create policy "valutazioni: inserimento" on public.valutazioni
  for insert to authenticated
  with check (public.puo_segnalare() and autore_id = auth.uid());
create policy "valutazioni: modifica" on public.valutazioni
  for update to authenticated
  using (autore_id = auth.uid() or public.is_admin())
  with check (autore_id = auth.uid() or public.is_admin());
create policy "valutazioni: eliminazione" on public.valutazioni
  for delete to authenticated using (autore_id = auth.uid() or public.is_admin());

-- Storico: sola lettura (lo scrivono i trigger)
create policy "storico: lettura" on public.storico_stati
  for select to authenticated
  using (exists (select 1 from public.giocatori g where g.id = giocatore_id));
