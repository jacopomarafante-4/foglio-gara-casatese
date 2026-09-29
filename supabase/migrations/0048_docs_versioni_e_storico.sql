-- =====================================================================
-- 0048 · Portale: nessuna modifica persa (versioni) e storico delle schede
-- Da eseguire in Supabase → SQL Editor, DOPO la 0047
-- =====================================================================
-- Ogni scheda del Portale (tabella docs: rosa, registro, calendario, foglio gara, squadre, schemi, eventi, avvisi) ha un
-- numero di versione che sale a ogni modifica. Chi salva indica la versione da cui è partito: se nel frattempo qualcun
-- altro l'ha cambiata, il salvataggio non sovrascrive ma restituisce la scheda aggiornata; il Portale unisce le due
-- modifiche (js/unisci.js) e riprova.
-- docs_storico tiene le versioni precedenti (al massimo una ogni 10 minuti per scheda, per 30 giorni): l'admin le vede
-- e le ripristina in Società → Storico modifiche. Anche script e sincronizzazione Google alzano la versione (trigger).

alter table public.docs add column if not exists versione bigint not null default 1;
alter table public.docs add column if not exists modificato_da text;

create table if not exists public.docs_storico (
  id          bigserial primary key,
  path        text not null,
  data        jsonb,
  versione    bigint,
  salvato_il  timestamptz,          -- quando era stata salvata questa versione
  da          text,                 -- chi l'aveva salvata
  sostituita  timestamptz not null default now()
);
create index if not exists docs_storico_path_idx on public.docs_storico (path, sostituita desc);
alter table public.docs_storico enable row level security;
drop policy if exists "storico docs: lettura admin" on public.docs_storico;
create policy "storico docs: lettura admin" on public.docs_storico for select to authenticated using (public.is_admin());

-- Chi salva: il mister (impostato da coach_salva), se no il nome dell'account
create or replace function public.chi_salva()
returns text language sql stable security definer set search_path = public as $$
  select coalesce(nullif(current_setting('app.chi', true), ''),
                  (select nullif(trim(concat_ws(' ', nome, cognome)), '') from public.profiles where id = auth.uid()),
                  case when auth.uid() is null then 'sistema' end)
$$;

create or replace function public.docs_versione()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.versione := 1; new.modificato_da := public.chi_salva();
    return new;
  end if;
  if new.data is not distinct from old.data then return new; end if;
  new.versione := old.versione + 1;
  new.modificato_da := public.chi_salva();
  if not exists (select 1 from public.docs_storico where path = old.path and sostituita > now() - interval '10 minutes') then
    insert into public.docs_storico (path, data, versione, salvato_il, da)
    values (old.path, old.data, old.versione, old.updated_at, old.modificato_da);
  end if;
  delete from public.docs_storico where path = old.path and sostituita < now() - interval '30 days';
  return new;
end $$;
drop trigger if exists docs_versione on public.docs;
create trigger docs_versione before insert or update on public.docs
  for each row execute function public.docs_versione();

-- Admin e direttori (con i loro permessi, RLS): salva solo se la scheda è ancora alla versione indicata
create or replace function public.salva_doc(p_path text, p_data jsonb, p_versione bigint default null)
returns jsonb language plpgsql volatile security invoker set search_path = public as $$
declare r record; v bigint;
begin
  select data, versione into r from public.docs where path = p_path;
  if not found then
    insert into public.docs (path, data, updated_at) values (p_path, p_data, now()) returning versione into v;
    return jsonb_build_object('ok', true, 'versione', v);
  end if;
  if p_versione is not null and r.versione <> p_versione then
    return jsonb_build_object('ok', false, 'data', r.data, 'versione', r.versione);
  end if;
  update public.docs set data = p_data, updated_at = now()
  where path = p_path and (p_versione is null or versione = p_versione)
  returning versione into v;
  if v is null then
    -- cambiata proprio adesso da qualcun altro, oppure non si ha il permesso di modificarla
    select data, versione into r from public.docs where path = p_path;
    if r.versione is distinct from p_versione and p_versione is not null then
      return jsonb_build_object('ok', false, 'data', r.data, 'versione', r.versione);
    end if;
    raise exception 'Documento non consentito' using errcode = '42501';
  end if;
  return jsonb_build_object('ok', true, 'versione', v);
end $$;

-- Mister col PIN: lettura con la versione, salvataggio con controllo (stessi permessi di coach_get / coach_set)
create or replace function public.coach_leggi(p_pin text, p_path text)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare d jsonb;
begin
  d := public.coach_get(p_pin, p_path);
  return jsonb_build_object('data', d, 'versione', (select versione from public.docs where path = p_path));
end $$;

create or replace function public.coach_salva(p_pin text, p_path text, p_data jsonb, p_versione bigint default null)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare v_attuale bigint;
begin
  if public.team_for_pin(p_pin) is null then perform pg_sleep(1); raise exception 'PIN non valido' using errcode = '28000'; end if;
  select versione into v_attuale from public.docs where path = p_path for update;
  if found and p_versione is not null and v_attuale <> p_versione then
    return jsonb_build_object('ok', false, 'data', public.coach_get(p_pin, p_path), 'versione', v_attuale);
  end if;
  perform set_config('app.chi', coalesce(nullif(public.mister_for_pin(p_pin), ''), 'Mister'), true);
  perform public.coach_set(p_pin, p_path, p_data);
  return jsonb_build_object('ok', true, 'versione', (select versione from public.docs where path = p_path));
end $$;

grant execute on function public.salva_doc(text, jsonb, bigint) to authenticated;
grant execute on function public.coach_leggi(text, text) to anon, authenticated;
grant execute on function public.coach_salva(text, text, jsonb, bigint) to anon, authenticated;

-- Ripristino (solo admin): la versione scelta torna attuale come nuova versione (anche il ripristino si può annullare)
create or replace function public.ripristina_doc(p_storico bigint)
returns bigint language plpgsql volatile security definer set search_path = public as $$
declare s record; v bigint;
begin
  if not public.is_admin() then raise exception 'Solo l''admin ripristina' using errcode = '42501'; end if;
  select path, data into s from public.docs_storico where id = p_storico;
  if not found then raise exception 'Versione non trovata'; end if;
  perform set_config('app.chi', 'Ripristino admin', true);
  update public.docs set data = s.data, updated_at = now() where path = s.path returning versione into v;
  return v;
end $$;
grant execute on function public.ripristina_doc(bigint) to authenticated;
