-- =====================================================================
-- 0035 · Carriera dei giocatori: in quali società ha giocato, stagione per stagione
-- Da eseguire in Supabase → SQL Editor, DOPO la 0034
-- =====================================================================
-- Ogni cambio di società di un giocatore osservato lascia una riga (chi, quando, da quale stagione).
-- Le stagioni passate si possono aggiungere a mano. La società la cambiano solo admin, direttori e scout
-- (gli scout anche sui giocatori segnalati da altri, con cambia_societa()); i mister no.
-- Le stagioni viste nelle distinte non si copiano qui: la scheda le mostra accanto.

-- Stagione sportiva di una data: dal 1° luglio si passa alla successiva ("2025/26")
create or replace function public.stagione_di(d date)
returns text language sql immutable as $$
  select case when extract(month from d) >= 7
    then extract(year from d)::int || '/' || lpad(((extract(year from d)::int + 1) % 100)::text, 2, '0')
    else (extract(year from d)::int - 1) || '/' || lpad((extract(year from d)::int % 100)::text, 2, '0') end
$$;

create table if not exists public.carriera (
  id            bigint generated always as identity primary key,
  giocatore_id  uuid not null references public.giocatori (id) on delete cascade,
  societa_id    uuid references public.societa (id) on delete set null,
  societa_nome  text not null,                 -- il nome di allora (resta anche se la società sparisce)
  stagione      text not null check (stagione ~ '^\d{4}/\d{2}$'),
  categoria     text,
  dal           date,
  origine       text not null default 'manuale' check (origine in ('iniziale', 'cambio', 'manuale')),
  nota          text,
  autore_id     uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now()
);
create index if not exists carriera_giocatore_idx on public.carriera (giocatore_id);

alter table public.carriera enable row level security;

-- Legge chi vede il giocatore; aggiungono a mano admin, direttori e scout; correggono o tolgono
-- le proprie righe (admin e direttori tutte). Le righe automatiche le scrive il trigger.
drop policy if exists "carriera: lettura" on public.carriera;
create policy "carriera: lettura" on public.carriera
  for select to authenticated
  using (exists (select 1 from public.giocatori g where g.id = giocatore_id));
drop policy if exists "carriera: inserimento" on public.carriera;
create policy "carriera: inserimento" on public.carriera
  for insert to authenticated
  with check (public.puo_segnalare() and origine = 'manuale' and autore_id = auth.uid()
              and exists (select 1 from public.giocatori g where g.id = giocatore_id));
drop policy if exists "carriera: modifica" on public.carriera;
create policy "carriera: modifica" on public.carriera
  for update to authenticated
  using (public.puo_segnalare() and (public.vede_tutto() or autore_id = auth.uid()))
  with check (public.puo_segnalare() and (public.vede_tutto() or autore_id = auth.uid()));
drop policy if exists "carriera: eliminazione" on public.carriera;
create policy "carriera: eliminazione" on public.carriera
  for delete to authenticated
  using (public.puo_segnalare() and (public.vede_tutto() or autore_id = auth.uid()));

-- La società di un giocatore la cambiano solo admin, direttori e scout
-- (auth.uid() nullo = script con la chiave di servizio o funzioni del Portale: consentito)
create or replace function public.controlla_cambio_societa()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.societa_id is distinct from old.societa_id and auth.uid() is not null and not public.puo_segnalare() then
    raise exception 'La società di un giocatore la cambiano solo admin, direttori e scout' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists giocatori_controlla_societa on public.giocatori;
create trigger giocatori_controlla_societa
  before update of societa_id on public.giocatori
  for each row execute function public.controlla_cambio_societa();

-- Riga automatica: società alla creazione della scheda (se osservato), a ogni cambio, e quando un
-- ragazzo visto solo nelle distinte diventa osservato. Un secondo cambio nello stesso giorno corregge il primo.
create or replace function public.registra_carriera()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_origine text; u public.carriera;
begin
  if coalesce(current_setting('app.unione', true), '') = 'on' then return new; end if;
  if tg_op = 'INSERT' then
    if not new.osservato then return new; end if;
    v_origine := 'iniziale';
  elsif new.societa_id is distinct from old.societa_id then
    v_origine := 'cambio';
  elsif new.osservato and not old.osservato
        and not exists (select 1 from public.carriera where giocatore_id = new.id) then
    v_origine := 'iniziale';
  else
    return new;
  end if;
  if new.societa_id is null then return new; end if;

  select * into u from public.carriera
   where giocatore_id = new.id and origine = 'cambio' order by created_at desc, id desc limit 1;
  if v_origine = 'cambio' and u.id is not null and (u.created_at at time zone 'Europe/Rome')::date = (now() at time zone 'Europe/Rome')::date then
    update public.carriera set societa_id = new.societa_id,
      societa_nome = (select nome from public.societa where id = new.societa_id), autore_id = auth.uid()
     where id = u.id;
    return new;
  end if;

  insert into public.carriera (giocatore_id, societa_id, societa_nome, stagione, categoria, dal, origine, autore_id)
  values (new.id, new.societa_id, (select nome from public.societa where id = new.societa_id),
          public.stagione_di((now() at time zone 'Europe/Rome')::date), new.categoria,
          (now() at time zone 'Europe/Rome')::date, v_origine, coalesce(auth.uid(), new.creato_da));
  return new;
end $$;
drop trigger if exists giocatori_carriera on public.giocatori;
create trigger giocatori_carriera
  after insert or update of societa_id, osservato on public.giocatori
  for each row execute function public.registra_carriera();

-- Cambio di società dalla scheda (anche per gli scout sui giocatori segnalati da altri):
-- da quando (facoltativo, decide la stagione) e una nota
create or replace function public.cambia_societa(p_giocatore uuid, p_societa uuid, p_dal date default null, p_nota text default null)
returns void language plpgsql volatile security definer set search_path = public as $$
declare g public.giocatori;
begin
  if not public.puo_segnalare() then
    raise exception 'La società di un giocatore la cambiano solo admin, direttori e scout' using errcode = '42501';
  end if;
  select * into g from public.giocatori where id = p_giocatore;
  if g.id is null or not public.puo_vedere_annata(g.annata) then raise exception 'Giocatore non trovato'; end if;
  if p_societa is null or not exists (select 1 from public.societa where id = p_societa) then
    raise exception 'Società non trovata';
  end if;
  if g.societa_id = p_societa then raise exception 'È già la sua società'; end if;

  update public.giocatori set societa_id = p_societa where id = p_giocatore;
  update public.carriera set
      dal      = coalesce(p_dal, dal),
      stagione = public.stagione_di(coalesce(p_dal, dal, current_date)),
      nota     = nullif(trim(coalesce(p_nota, '')), '')
   where id = (select id from public.carriera where giocatore_id = p_giocatore and origine = 'cambio'
                order by created_at desc, id desc limit 1);
end $$;
revoke all on function public.cambia_societa(uuid, uuid, date, text) from public, anon;
grant execute on function public.cambia_societa(uuid, uuid, date, text) to authenticated;

-- Unioni (0017, 0018): la carriera segue la società o la scheda tenuta, e l'unione non conta come cambio
create or replace function public.unisci_societa(p_tenere uuid, p_togliere uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v public.societa; q record; doppia uuid;
begin
  if not (public.vede_tutto() or coalesce(auth.role(), '') = 'service_role') then
    raise exception 'Solo admin e direttori possono unire le società' using errcode = '42501';
  end if;
  if p_tenere is null or p_togliere is null or p_tenere = p_togliere then return; end if;
  select * into v from public.societa where id = p_togliere;
  if not found then return; end if;
  if not exists (select 1 from public.societa where id = p_tenere) then
    raise exception 'Società da tenere inesistente';
  end if;

  perform set_config('app.unione', 'on', true);   -- 0035: l'unione non è un cambio di società
  update public.carriera           set societa_id   = p_tenere where societa_id   = p_togliere;
  update public.giocatori          set societa_id   = p_tenere where societa_id   = p_togliere;
  update public.gare               set casa_id      = p_tenere where casa_id      = p_togliere;
  update public.gare               set trasferta_id = p_tenere where trasferta_id = p_togliere;
  update public.distinte_giocatori set societa_id   = p_tenere where societa_id   = p_togliere;

  -- Squadre seguite: se la stessa (categoria) c'è già, resta quella
  delete from public.squadre_seguite s
   where s.societa_id = p_togliere
     and exists (select 1 from public.squadre_seguite t
                  where t.societa_id = p_tenere
                    and lower(coalesce(t.categoria, '')) = lower(coalesce(s.categoria, '')));
  update public.squadre_seguite set societa_id = p_tenere where societa_id = p_togliere;

  -- Squadre (società + categoria + stagione): se esiste già, distinte e presenze passano a quella
  for q in select * from public.squadre where societa_id = p_togliere loop
    select id into doppia from public.squadre
     where societa_id = p_tenere and lower(categoria) = lower(q.categoria) and stagione = q.stagione;
    if doppia is null then
      update public.squadre set societa_id = p_tenere where id = q.id;
    else
      update public.distinte           set casa_id      = doppia where casa_id      = q.id;
      update public.distinte           set trasferta_id = doppia where trasferta_id = q.id;
      update public.distinte_giocatori set squadra_id   = doppia where squadra_id   = q.id;
      delete from public.squadre where id = q.id;
    end if;
  end loop;

  delete from public.societa where id = p_togliere;
  update public.societa t set
    alias     = (select coalesce(array_agg(distinct a), '{}') from unnest(t.alias || v.nome || v.alias) a
                  where a is not null and a <> t.nome),
    comune    = coalesce(t.comune, v.comune),
    campo     = coalesce(t.campo, v.campo),
    indirizzo = coalesce(t.indirizzo, v.indirizzo),
    lat       = coalesce(t.lat, v.lat),
    lon       = coalesce(t.lon, v.lon)
  where t.id = p_tenere;
end $$;

create or replace function public.unisci_giocatori(p_tieni uuid, p_togli uuid)
returns void language plpgsql volatile security definer set search_path = public as $$
declare t public.giocatori; k public.giocatori; v_nome text;
begin
  if not public.vede_tutto() then
    raise exception 'Solo admin e direttori possono unire due schede' using errcode = '42501';
  end if;
  if p_tieni is null or p_togli is null or p_tieni = p_togli then
    raise exception 'Scegli due schede diverse';
  end if;
  select * into k from public.giocatori where id = p_tieni for update;
  select * into t from public.giocatori where id = p_togli for update;
  if k.id is null or t.id is null then raise exception 'Scheda non trovata'; end if;

  perform set_config('app.unione', 'on', true);   -- 0035: l'unione non è un cambio di società
  update public.carriera         set giocatore_id = p_tieni where giocatore_id = p_togli;
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

-- Punto di partenza: la società attuale dei giocatori osservati, nella stagione in cui è stata creata la scheda
insert into public.carriera (giocatore_id, societa_id, societa_nome, stagione, categoria, dal, origine, autore_id)
select g.id, g.societa_id, s.nome, public.stagione_di((g.created_at at time zone 'Europe/Rome')::date), g.categoria,
       (g.created_at at time zone 'Europe/Rome')::date, 'iniziale', g.creato_da
  from public.giocatori g join public.societa s on s.id = g.societa_id
 where g.osservato and not exists (select 1 from public.carriera c where c.giocatore_id = g.id);
