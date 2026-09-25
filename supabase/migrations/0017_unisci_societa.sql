-- =====================================================================
-- 0017 · Unire due società doppie ("Bellusco" e "Asd bellusco 1947")
-- Da eseguire in Supabase → SQL Editor, DOPO la 0016
-- =====================================================================

-- Tutto ciò che puntava alla società da togliere passa a quella da tenere: giocatori, gare,
-- squadre seguite, squadre e distinte. Il nome tolto (e i suoi nomi alternativi) diventano
-- nomi alternativi di quella tenuta, così le prossime ricerche e importazioni la ritrovano.
-- Solo l'amministratore (o gli script con la chiave di servizio).

create or replace function public.unisci_societa(p_tenere uuid, p_togliere uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v public.societa; q record; doppia uuid;
begin
  if not (public.is_admin() or coalesce(auth.role(), '') = 'service_role') then
    raise exception 'Solo l''amministratore può unire le società' using errcode = '42501';
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

revoke all on function public.unisci_societa(uuid, uuid) from public, anon;
grant execute on function public.unisci_societa(uuid, uuid) to authenticated, service_role;
