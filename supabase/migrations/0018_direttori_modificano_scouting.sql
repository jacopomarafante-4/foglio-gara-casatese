-- =====================================================================
-- 0018 · Direttori: nello Scouting modificano come l'admin (nel Portale restano in sola lettura)
-- Da eseguire in Supabase → SQL Editor, DOPO la 0017
-- =====================================================================

-- Annulla la 0009 per lo Scouting: il direttore segnala, valuta, cambia gli stati, gestisce gare,
-- squadre seguite, distinte e doppioni. Nel Portale squadre (tabella docs) NON cambia niente:
-- lì resta in sola lettura (0011). Account, PIN e Società restano solo all'admin.
-- Regola usata: public.vede_tutto() = admin o direttore attivo.

-- Segnalare, valutare, aggiungere giocatori/società/contatti, prenotarsi alle gare
create or replace function public.puo_segnalare()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.mio_ruolo() in ('admin', 'direttore', 'scout'), false)
$$;

-- Cambio di stato dei giocatori: admin e direttori
create or replace function public.controlla_cambio_stato()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.stato is distinct from old.stato
     and auth.uid() is not null
     and not public.vede_tutto() then
    raise exception 'Solo admin e direttori possono cambiare lo stato di un giocatore';
  end if;
  return new;
end;
$$;

drop policy if exists "societa: modifica" on public.societa;
create policy "societa: modifica" on public.societa
  for update to authenticated using (public.vede_tutto()) with check (public.vede_tutto());
drop policy if exists "societa: eliminazione" on public.societa;
create policy "societa: eliminazione" on public.societa
  for delete to authenticated using (public.vede_tutto());

drop policy if exists "giocatori: modifica" on public.giocatori;
create policy "giocatori: modifica" on public.giocatori
  for update to authenticated
  using (public.vede_tutto() or (creato_da = auth.uid() and public.puo_segnalare()))
  with check (public.vede_tutto() or (creato_da = auth.uid() and public.puo_segnalare()));
drop policy if exists "giocatori: eliminazione" on public.giocatori;
create policy "giocatori: eliminazione" on public.giocatori
  for delete to authenticated using (public.vede_tutto());

drop policy if exists "contatti: modifica" on public.contatti;
create policy "contatti: modifica" on public.contatti
  for update to authenticated
  using (public.vede_tutto() or (creato_da = auth.uid() and public.puo_segnalare()))
  with check (public.vede_tutto() or (creato_da = auth.uid() and public.puo_segnalare()));
drop policy if exists "contatti: eliminazione" on public.contatti;
create policy "contatti: eliminazione" on public.contatti
  for delete to authenticated
  using (public.vede_tutto() or (creato_da = auth.uid() and public.puo_segnalare()));

drop policy if exists "segnalazioni: modifica" on public.segnalazioni;
create policy "segnalazioni: modifica" on public.segnalazioni
  for update to authenticated
  using (autore_id = auth.uid() or public.vede_tutto()) with check (autore_id = auth.uid() or public.vede_tutto());
drop policy if exists "segnalazioni: eliminazione" on public.segnalazioni;
create policy "segnalazioni: eliminazione" on public.segnalazioni
  for delete to authenticated using (autore_id = auth.uid() or public.vede_tutto());

drop policy if exists "valutazioni: modifica" on public.valutazioni;
create policy "valutazioni: modifica" on public.valutazioni
  for update to authenticated
  using (autore_id = auth.uid() or public.vede_tutto()) with check (autore_id = auth.uid() or public.vede_tutto());
drop policy if exists "valutazioni: eliminazione" on public.valutazioni;
create policy "valutazioni: eliminazione" on public.valutazioni
  for delete to authenticated using (autore_id = auth.uid() or public.vede_tutto());

drop policy if exists "eventi: modifica" on public.eventi_giocatore;
create policy "eventi: modifica" on public.eventi_giocatore
  for update to authenticated
  using ((autore_id = auth.uid() and public.puo_segnalare()) or public.vede_tutto())
  with check ((autore_id = auth.uid() and public.puo_segnalare()) or public.vede_tutto());
drop policy if exists "eventi: eliminazione" on public.eventi_giocatore;
create policy "eventi: eliminazione" on public.eventi_giocatore
  for delete to authenticated
  using ((autore_id = auth.uid() and public.puo_segnalare()) or public.vede_tutto());

drop policy if exists "doppioni esclusi: gestione" on public.doppioni_esclusi;
create policy "doppioni esclusi: gestione" on public.doppioni_esclusi
  for all to authenticated using (public.vede_tutto()) with check (public.vede_tutto());

drop policy if exists "sedi: gestione" on public.sedi;
create policy "sedi: gestione" on public.sedi
  for all to authenticated using (public.vede_tutto()) with check (public.vede_tutto());

drop policy if exists "squadre seguite: gestione" on public.squadre_seguite;
create policy "squadre seguite: gestione" on public.squadre_seguite
  for all to authenticated using (public.vede_tutto()) with check (public.vede_tutto());

drop policy if exists "gare: gestione" on public.gare;
create policy "gare: gestione" on public.gare
  for all to authenticated using (public.vede_tutto()) with check (public.vede_tutto());

drop policy if exists "prenotazioni: inserimento" on public.gare_osservatori;
create policy "prenotazioni: inserimento" on public.gare_osservatori
  for insert to authenticated
  with check ((profilo_id = auth.uid() and public.puo_segnalare()) or public.vede_tutto());
drop policy if exists "prenotazioni: eliminazione" on public.gare_osservatori;
create policy "prenotazioni: eliminazione" on public.gare_osservatori
  for delete to authenticated
  using ((profilo_id = auth.uid() and public.puo_segnalare()) or public.vede_tutto());

drop policy if exists "squadre: gestione" on public.squadre;
create policy "squadre: gestione" on public.squadre
  for all to authenticated using (public.vede_tutto()) with check (public.vede_tutto());
drop policy if exists "distinte: gestione" on public.distinte;
create policy "distinte: gestione" on public.distinte
  for all to authenticated using (public.vede_tutto()) with check (public.vede_tutto());
drop policy if exists "presenze in distinta: gestione" on public.distinte_giocatori;
create policy "presenze in distinta: gestione" on public.distinte_giocatori
  for all to authenticated using (public.vede_tutto()) with check (public.vede_tutto());

-- Unione di schede doppie e di società doppie: admin e direttori
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
