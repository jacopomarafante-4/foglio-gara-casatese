-- =====================================================================
-- 0012 · Eventi del giocatore (open day, provini) · Unione delle schede doppie
-- Da eseguire in Supabase → SQL Editor, DOPO la 0011
-- =====================================================================

-- 1. Eventi: stanno nella scheda del giocatore ---------------------------
create type public.tipo_evento as enum ('open_day', 'provino', 'allenamento_prova', 'altro');
create type public.esito_evento as enum ('positivo', 'da_rivedere', 'negativo');

create table public.eventi_giocatore (
  id            uuid primary key default gen_random_uuid(),
  giocatore_id  uuid not null references public.giocatori (id) on delete cascade,
  tipo          public.tipo_evento not null,
  data          date not null default current_date,
  presente      boolean,              -- null = non ancora saputo
  esito         public.esito_evento,  -- null = da decidere
  note          text,
  autore_id     uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now()
);
create index eventi_giocatore_idx on public.eventi_giocatore (giocatore_id);

alter table public.eventi_giocatore enable row level security;

create policy "eventi: lettura" on public.eventi_giocatore
  for select to authenticated
  using (exists (select 1 from public.giocatori g where g.id = giocatore_id));
create policy "eventi: inserimento" on public.eventi_giocatore
  for insert to authenticated
  with check (public.puo_segnalare() and autore_id = auth.uid());
create policy "eventi: modifica" on public.eventi_giocatore
  for update to authenticated
  using ((autore_id = auth.uid() and public.puo_segnalare()) or public.is_admin())
  with check ((autore_id = auth.uid() and public.puo_segnalare()) or public.is_admin());
create policy "eventi: eliminazione" on public.eventi_giocatore
  for delete to authenticated
  using ((autore_id = auth.uid() and public.puo_segnalare()) or public.is_admin());

-- 2. Coppie segnate "sono persone diverse": non vengono più proposte -----
create table public.doppioni_esclusi (
  a           uuid not null references public.giocatori (id) on delete cascade,
  b           uuid not null references public.giocatori (id) on delete cascade,
  autore_id   uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  primary key (a, b),
  check (a < b)
);

alter table public.doppioni_esclusi enable row level security;

create policy "doppioni esclusi: lettura" on public.doppioni_esclusi
  for select to authenticated using (public.vede_tutto());
create policy "doppioni esclusi: gestione" on public.doppioni_esclusi
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- 3. Unione di due schede (solo admin) -----------------------------------
-- Tutto passa su p_tieni (segnalazioni, valutazioni, contatti, eventi, storico);
-- i dati mancanti di p_tieni si completano con quelli di p_togli, le note si sommano;
-- p_togli viene cancellata. Lo stato resta quello di p_tieni.
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

  v_nome := coalesce(nullif(trim(concat_ws(' ', t.cognome, t.nome)), ''), t.descrizione, 'senza nome');
  update public.giocatori set
    cognome         = coalesce(k.cognome, t.cognome),
    nome            = coalesce(k.nome, t.nome),
    descrizione     = coalesce(k.descrizione, t.descrizione),
    data_nascita    = coalesce(k.data_nascita, t.data_nascita),
    ruolo           = coalesce(k.ruolo, t.ruolo),
    piede           = coalesce(k.piede, t.piede),
    societa_id      = coalesce(k.societa_id, t.societa_id),
    segnalato_da_squadra = coalesce(k.segnalato_da_squadra, t.segnalato_da_squadra),
    note            = concat_ws(E'\n\n', k.note, t.note,
                        'Unita con la scheda "' || v_nome || '" (' || t.annata || ') il ' || to_char(current_date, 'DD/MM/YYYY'))
  where id = p_tieni;

  delete from public.giocatori where id = p_togli;
end $$;

revoke all on function public.unisci_giocatori(uuid, uuid) from public, anon;
grant execute on function public.unisci_giocatori(uuid, uuid) to authenticated;
