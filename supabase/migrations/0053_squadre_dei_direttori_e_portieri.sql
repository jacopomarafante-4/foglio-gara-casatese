-- =====================================================================
-- 0053 · Ogni direttore vede le SUE squadre; i preparatori dei portieri lavorano sui portieri delle LORO categorie
-- Da eseguire in Supabase → SQL Editor, DOPO la 0052
-- =====================================================================
-- Direttori: profiles.squadre = le squadre che vedono (id di shared/teams). NULL = tutte (come prima); '{}' = nessuna (es. chi segue
-- solo la segreteria). Rose, fogli partita e registri delle altre squadre non si leggono più; calendari (Tutte le squadre), Società,
-- Scouting e Segreteria restano come prima. Le squadre di un direttore le sceglie solo l'admin (imposta_squadre_direttore).
-- Preparatori dei portieri (squadra con vedeTutte, 0028): continuano a vedere tutte le squadre, ma segnano chi è portiere, le
-- presenze e i tabellini dei soli portieri solo nelle squadre delle loro categorie (coaches[].eta in Società → "Portieri di").

alter table public.profiles add column if not exists squadre text[];

-- squadra di un documento del Portale ("roster/t_u15" → "t_u15"; i documenti condivisi e i calendari non hanno una squadra da limitare)
create or replace function public.direttore_vede_doc(p_path text)
returns boolean language sql stable security definer set search_path = public as $$
  select case when p_path !~ '^(roster|sheet|registro)/' then true
              else coalesce((select squadre is null or split_part(p_path, '/', 2) = any(squadre) from public.profiles where id = auth.uid()), false) end
$$;
revoke all on function public.direttore_vede_doc(text) from public, anon;
grant execute on function public.direttore_vede_doc(text) to authenticated;

drop policy if exists "direttori: sola lettura" on public.docs;
create policy "direttori: sola lettura" on public.docs
  for select to authenticated
  using (coalesce(public.mio_ruolo() = 'direttore', false) and public.direttore_vede_doc(path));

-- l'admin sceglie le squadre di un direttore (NULL = tutte)
create or replace function public.imposta_squadre_direttore(p_profilo uuid, p_squadre text[])
returns void language plpgsql volatile security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Solo l''admin sceglie le squadre dei direttori' using errcode = '42501'; end if;
  update public.profiles set squadre = p_squadre, updated_at = now() where id = p_profilo and ruolo = 'direttore';
end $$;
revoke all on function public.imposta_squadre_direttore(uuid, text[]) from public, anon;
grant execute on function public.imposta_squadre_direttore(uuid, text[]) to authenticated;

-- ---------- Preparatori dei portieri ----------
-- età di una squadra dalla categoria ("Under 15 - Provinciale" → 15)
create or replace function public.eta_squadra(p_team text)
returns int language sql stable security definer set search_path = public as $$
  select (substring(t ->> 'category' from '(?i)under\s*(\d+)'))::int
  from public.docs d, jsonb_array_elements(coalesce(d.data -> 'items', '[]'::jsonb)) t
  where d.path = 'shared/teams' and t ->> 'id' = p_team limit 1
$$;
revoke all on function public.eta_squadra(text) from public, anon, authenticated;

-- il preparatore (PIN di una squadra con vedeTutte) può lavorare sui portieri di questa squadra? La sua squadra sì, le altre solo se
-- l'età è tra le sue categorie (coaches[].eta)
create or replace function public.preparatore_puo(p_pin text, p_team text)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare v_team text;
begin
  v_team := public.team_for_pin(p_pin);
  if v_team is null or not public.vede_tutte_squadre(v_team) then return false; end if;
  if p_team = v_team then return true; end if;
  return exists (
    select 1 from public.docs d, jsonb_array_elements(coalesce(d.data -> 'items', '[]'::jsonb)) t,
                  jsonb_array_elements(coalesce(t -> 'coaches', '[]'::jsonb)) c, jsonb_array_elements_text(coalesce(c -> 'eta', '[]'::jsonb)) e
    where d.path = 'shared/teams' and t ->> 'id' = v_team and c ->> 'code' = p_pin and e::int = public.eta_squadra(p_team));
end $$;
revoke all on function public.preparatore_puo(text, text) from public, anon, authenticated;

-- coach_portiere (0050) solo nelle squadre delle sue categorie
create or replace function public.coach_portiere(p_pin text, p_squadra text, p_giocatore text, p_portiere boolean)
returns void language plpgsql volatile security definer set search_path = public as $$
declare v_team text; v_reg jsonb; v_gk jsonb; v_ruoli jsonb;
begin
  v_team := public.team_for_pin(p_pin);
  if v_team is null then perform pg_sleep(1); raise exception 'PIN non valido' using errcode = '28000'; end if;
  if not public.vede_tutte_squadre(v_team) then raise exception 'Solo i preparatori dei portieri' using errcode = '42501'; end if;
  if not public.preparatore_puo(p_pin, p_squadra) then raise exception 'Questa squadra non è tra le tue categorie' using errcode = '42501'; end if;
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

-- presenza di un portiere a un allenamento (P, A, MAL, INF, SCU, FAM, ING; vuoto = toglie)
create or replace function public.coach_presenza_portiere(p_pin text, p_squadra text, p_allenamento text, p_giocatore text, p_valore text)
returns void language plpgsql volatile security definer set search_path = public as $$
declare v_reg jsonb; v_tr jsonb;
begin
  if public.team_for_pin(p_pin) is null then perform pg_sleep(1); raise exception 'PIN non valido' using errcode = '28000'; end if;
  if not public.preparatore_puo(p_pin, p_squadra) then raise exception 'Questa squadra non è tra le tue categorie' using errcode = '42501'; end if;
  if coalesce(p_valore, '') not in ('', 'P', 'A', 'MAL', 'INF', 'SCU', 'FAM', 'ING') then raise exception 'Presenza non valida'; end if;
  select data into v_reg from public.docs where path = 'registro/' || p_squadra for update;
  if v_reg is null or not coalesce(v_reg -> 'gk', '[]'::jsonb) ? p_giocatore then raise exception 'Solo i portieri della squadra' using errcode = '42501'; end if;
  select jsonb_agg(case when t ->> 'id' = p_allenamento
           then jsonb_set(t, '{att}', case when coalesce(p_valore, '') = '' then coalesce(t -> 'att', '{}'::jsonb) - p_giocatore
                                          else coalesce(t -> 'att', '{}'::jsonb) || jsonb_build_object(p_giocatore, p_valore) end)
           else t end)
    into v_tr from jsonb_array_elements(coalesce(v_reg -> 'trainings', '[]'::jsonb)) t;
  if not exists (select 1 from jsonb_array_elements(coalesce(v_reg -> 'trainings', '[]'::jsonb)) t where t ->> 'id' = p_allenamento) then
    raise exception 'Allenamento non trovato';
  end if;
  perform set_config('app.chi', coalesce(nullif(public.mister_for_pin(p_pin), ''), 'Preparatore'), true);
  update public.docs set data = v_reg || jsonb_build_object('trainings', v_tr), updated_at = now() where path = 'registro/' || p_squadra;
end $$;

-- tabellino di un portiere in una partita: minuti e gol subiti (il tabellino lo crea il mister)
create or replace function public.coach_tabellino_portiere(p_pin text, p_squadra text, p_gara text, p_giocatore text, p_min int, p_gc int)
returns void language plpgsql volatile security definer set search_path = public as $$
declare v_reg jsonb; v_games jsonb;
begin
  if public.team_for_pin(p_pin) is null then perform pg_sleep(1); raise exception 'PIN non valido' using errcode = '28000'; end if;
  if not public.preparatore_puo(p_pin, p_squadra) then raise exception 'Questa squadra non è tra le tue categorie' using errcode = '42501'; end if;
  if (p_min is not null and (p_min < 0 or p_min > 200)) or (p_gc is not null and (p_gc < 0 or p_gc > 50)) then raise exception 'Valori non validi'; end if;
  select data into v_reg from public.docs where path = 'registro/' || p_squadra for update;
  if v_reg is null or not coalesce(v_reg -> 'gk', '[]'::jsonb) ? p_giocatore then raise exception 'Solo i portieri della squadra' using errcode = '42501'; end if;
  if not exists (select 1 from jsonb_array_elements(coalesce(v_reg -> 'games', '[]'::jsonb)) g where g ->> 'id' = p_gara) then
    raise exception 'Tabellino non trovato: lo crea il mister';
  end if;
  select jsonb_agg(case when g ->> 'id' = p_gara then jsonb_set(g, '{pl}', coalesce(g -> 'pl', '{}'::jsonb) || jsonb_build_object(p_giocatore,
           jsonb_strip_nulls(coalesce(g -> 'pl' -> p_giocatore, '{}'::jsonb) || jsonb_build_object('min', p_min, 'gc', p_gc, 'gk', true))))
           else g end)
    into v_games from jsonb_array_elements(v_reg -> 'games') g;
  perform set_config('app.chi', coalesce(nullif(public.mister_for_pin(p_pin), ''), 'Preparatore'), true);
  update public.docs set data = v_reg || jsonb_build_object('games', v_games), updated_at = now() where path = 'registro/' || p_squadra;
end $$;

revoke all on function public.coach_presenza_portiere(text, text, text, text, text) from public;
grant execute on function public.coach_presenza_portiere(text, text, text, text, text) to anon, authenticated;
revoke all on function public.coach_tabellino_portiere(text, text, text, text, int, int) from public;
grant execute on function public.coach_tabellino_portiere(text, text, text, text, int, int) to anon, authenticated;
