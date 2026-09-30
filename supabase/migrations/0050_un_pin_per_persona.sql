-- =====================================================================
-- 0050 · Un PIN per persona (tranne l'admin) e portieri segnati dai preparatori
-- Da eseguire in Supabase → SQL Editor, DOPO la 0049
-- =====================================================================
-- Prima: un PIN = una squadra. Ora la stessa persona usa un solo PIN per tutti i suoi incarichi:
-- - mister di più squadre (es. Under 18 e Under 19): lo stesso PIN su ognuna; l'app dice quale squadra è aperta con
--   l'intestazione "x-squadra" della richiesta e team_for_pin sceglie quella, se è tra le sue (se no la prima). Un'intestazione
--   falsa non dà niente di più: si sceglie solo tra le squadre di quel PIN;
-- - staff che è anche mister (es. direttore e mister Under 15): il mister ha come PIN il PIN personale dello staff; si entra
--   come staff (tipo_pin ora controlla prima i PIN personali) e l'app dà anche la tessera del mister per le sue squadre.
-- I preparatori dei portieri (squadra con vedeTutte, 0028) segnano chi è portiere nelle rose di tutte le squadre: coach_portiere.

-- Squadra del PIN: se il PIN è di più squadre, quella chiesta dall'app (x-squadra), altrimenti la prima dell'elenco
create or replace function public.team_for_pin(p_pin text)
returns text language plpgsql volatile security definer set search_path = public as $$
declare v text; v_scelta text;
begin
  if coalesce(p_pin, '') = '' then return null; end if;
  perform public.controlla_blocco_pin();
  begin
    v_scelta := current_setting('request.headers', true)::json ->> 'x-squadra';
  exception when others then v_scelta := null;
  end;
  select x.t ->> 'id' into v
  from public.docs d, jsonb_array_elements(coalesce(d.data -> 'items', '[]'::jsonb)) with ordinality as x(t, n)
  where d.path = 'shared/teams'
    and (x.t ->> 'code' = p_pin
         or exists (select 1 from jsonb_array_elements(coalesce(x.t -> 'coaches', '[]'::jsonb)) c where c ->> 'code' = p_pin))
  order by (x.t ->> 'id' = v_scelta) desc nulls last, x.n
  limit 1;
  if v is null then insert into public.pin_errati default values; end if;
  return v;
end $$;

-- Tutte le squadre di un PIN (senza PIN né dati riservati): per scegliere quale aprire
create or replace function public.coach_squadre(p_pin text)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
begin
  if public.team_for_pin(p_pin) is null then raise exception 'PIN non valido' using errcode = '28000'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', x.t ->> 'id', 'name', x.t ->> 'name', 'category', x.t ->> 'category',
             'organizza', coalesce((x.t ->> 'organizza')::boolean, false), 'vedeTutte', coalesce((x.t ->> 'vedeTutte')::boolean, false))
             order by x.n)
    from public.docs d, jsonb_array_elements(coalesce(d.data -> 'items', '[]'::jsonb)) with ordinality as x(t, n)
    where d.path = 'shared/teams'
      and (x.t ->> 'code' = p_pin
           or exists (select 1 from jsonb_array_elements(coalesce(x.t -> 'coaches', '[]'::jsonb)) c where c ->> 'code' = p_pin))
  ), '[]'::jsonb);
end $$;

-- Che PIN è? Prima i PIN personali (scout, direttori, segreteria): chi è anche mister entra come staff e l'app gli dà
-- anche la tessera del mister. Poi mister, poi famiglie. Un solo errore annotato se il PIN non esiste (come nella 0031).
create or replace function public.tipo_pin(p_pin text)
returns text language plpgsql volatile security definer set search_path = public as $$
begin
  if coalesce(p_pin, '') = '' then return null; end if;
  perform public.controlla_blocco_pin();
  if exists (select 1 from public.codici_accesso c join public.profiles p on p.id = c.profilo_id where c.pin = p_pin and p.attivo) then
    return 'personale';
  end if;
  if public.team_for_pin_senza_errori(p_pin) is not null then return 'mister'; end if;
  if exists (select 1 from public.tesserati where pin = p_pin and attivo) then return 'famiglia'; end if;
  insert into public.pin_errati default values;
  perform pg_sleep(1);
  return null;
end $$;

-- Preparatori dei portieri: segnano o tolgono "portiere" a un giocatore della rosa di qualsiasi squadra (registro.gk e
-- registro.ruoli della squadra). Solo col PIN di un preparatore (squadra vedeTutte); il resto del registro non si tocca.
create or replace function public.coach_portiere(p_pin text, p_squadra text, p_giocatore text, p_portiere boolean)
returns void language plpgsql volatile security definer set search_path = public as $$
declare v_team text; v_reg jsonb; v_gk jsonb; v_ruoli jsonb;
begin
  v_team := public.team_for_pin(p_pin);
  if v_team is null then perform pg_sleep(1); raise exception 'PIN non valido' using errcode = '28000'; end if;
  if not public.vede_tutte_squadre(v_team) then raise exception 'Solo i preparatori dei portieri' using errcode = '42501'; end if;
  if not exists (select 1 from public.docs d, jsonb_array_elements(coalesce(d.data -> 'players', '[]'::jsonb)) p
                 where d.path = 'roster/' || p_squadra and p ->> 'id' = p_giocatore) then
    raise exception 'Giocatore non trovato nella rosa';
  end if;
  select coalesce(data, '{}'::jsonb) into v_reg from public.docs where path = 'registro/' || p_squadra;
  v_reg := coalesce(v_reg, '{}'::jsonb);
  v_gk := coalesce((select jsonb_agg(g) from jsonb_array_elements(coalesce(v_reg -> 'gk', '[]'::jsonb)) g where g #>> '{}' <> p_giocatore), '[]'::jsonb);
  v_ruoli := coalesce(v_reg -> 'ruoli', '{}'::jsonb);
  if p_portiere then
    v_gk := v_gk || to_jsonb(p_giocatore);
    v_ruoli := v_ruoli || jsonb_build_object(p_giocatore, 'portiere');
  elsif v_ruoli ->> p_giocatore = 'portiere' then
    v_ruoli := v_ruoli - p_giocatore;
  end if;
  v_reg := v_reg || jsonb_build_object('gk', v_gk, 'ruoli', v_ruoli);
  perform set_config('app.chi', coalesce(nullif(public.mister_for_pin(p_pin), ''), 'Preparatore'), true);
  insert into public.docs (path, data, updated_at) values ('registro/' || p_squadra, v_reg, now())
  on conflict (path) do update set data = excluded.data, updated_at = now();
end $$;

-- Chi è appena entrato col PIN personale è anche mister (il suo PIN è quello di un mister)? Senza annotare errori di PIN
create or replace function public.sono_anche_mister()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.codici_accesso c, public.docs d,
      jsonb_array_elements(coalesce(d.data -> 'items', '[]'::jsonb)) t, jsonb_array_elements(coalesce(t -> 'coaches', '[]'::jsonb)) m
    where c.profilo_id = auth.uid() and d.path = 'shared/teams' and m ->> 'code' = c.pin)
$$;
revoke all on function public.sono_anche_mister() from public;
grant execute on function public.sono_anche_mister() to authenticated;

revoke all on function public.coach_squadre(text), public.coach_portiere(text, text, text, boolean) from public;
grant execute on function public.coach_squadre(text), public.coach_portiere(text, text, text, boolean) to anon, authenticated;
