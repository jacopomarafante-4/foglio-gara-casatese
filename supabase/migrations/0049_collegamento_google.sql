fa-- =====================================================================
-- 0049 · Google Calendar collegato dall'app ("Collega a Google Calendar")
-- Da eseguire in Supabase → SQL Editor, DOPO la 0048
-- =====================================================================
-- L'admin tocca "Collega a Google Calendar", entra con l'account Google dei calendari e dà il permesso: il server riceve un
-- "token di rinnovo" e lo salva qui CIFRATO con SEGRETO_SESSIONE (variabile d'ambiente che il database non conosce): letto da
-- solo non serve a nulla. Con lui il server legge e scrive i calendari MERATE, CERNUSCO e TRASFERTA (scelti dall'admin).
-- Nessun accesso diretto alla tabella: solo le funzioni qui sotto.

create table if not exists public.google_collegamento (
  id smallint primary key default 1 check (id = 1),   -- un solo collegamento per la società
  token_cifrato text not null,
  account text,                                       -- account Google collegato (per mostrarlo nell'app)
  calendari jsonb not null default '{}'::jsonb,       -- {"MERATE": "<id calendario>", "CERNUSCO": "…", "TRASFERTA": "…"}
  ultima_lettura timestamptz,                         -- ultimo "Aggiorna da Google" (anche automatico)
  collegato_da uuid references auth.users (id) on delete set null,
  aggiornato timestamptz not null default now()
);
alter table public.google_collegamento enable row level security;
revoke all on public.google_collegamento from anon, authenticated;

-- Legge il collegamento: admin e direttori (sessione) o un PIN valido (organizzativo e mister dalle pagine dell'app, sempre
-- attraverso il server). Null se non c'è.
create or replace function public.google_leggi(p_pin text default null)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
begin
  if not (public.vede_tutto() or (p_pin is not null and public.team_for_pin(p_pin) is not null)) then
    raise exception 'Non consentito' using errcode = '42501';
  end if;
  return (select jsonb_build_object('token_cifrato', token_cifrato, 'account', account, 'calendari', calendari,
            'ultima_lettura', ultima_lettura, 'aggiornato', aggiornato) from public.google_collegamento where id = 1);
end $$;

-- Salva o cambia il collegamento (solo admin): token nuovo (null = tiene quello di prima), account, calendari scelti
create or replace function public.google_salva(p_token_cifrato text, p_account text, p_calendari jsonb)
returns void language plpgsql volatile security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Solo l''admin collega Google Calendar' using errcode = '42501'; end if;
  if p_token_cifrato is null then
    -- solo account o calendari scelti: il collegamento deve esserci già
    update public.google_collegamento set account = coalesce(p_account, account), calendari = coalesce(p_calendari, calendari),
      aggiornato = now() where id = 1;
    if not found then raise exception 'Google Calendar non è collegato'; end if;
    return;
  end if;
  insert into public.google_collegamento (id, token_cifrato, account, calendari, collegato_da, aggiornato)
  values (1, p_token_cifrato, p_account, coalesce(p_calendari, '{}'::jsonb), auth.uid(), now())
  on conflict (id) do update set token_cifrato = excluded.token_cifrato, account = excluded.account,
    calendari = excluded.calendari, collegato_da = excluded.collegato_da, aggiornato = now();
end $$;

-- Scollega (solo admin)
create or replace function public.google_scollega()
returns void language plpgsql volatile security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Solo l''admin scollega Google Calendar' using errcode = '42501'; end if;
  delete from public.google_collegamento where id = 1;
end $$;

-- Segna l'ora dell'ultima lettura da Google (stessi permessi della lettura): serve per rileggere da soli ogni 30 minuti
create or replace function public.google_letto(p_pin text default null)
returns void language plpgsql volatile security definer set search_path = public as $$
begin
  if not (public.vede_tutto() or (p_pin is not null and public.team_for_pin(p_pin) is not null)) then
    raise exception 'Non consentito' using errcode = '42501';
  end if;
  update public.google_collegamento set ultima_lettura = now() where id = 1;
end $$;

revoke all on function public.google_leggi(text), public.google_salva(text, text, jsonb), public.google_scollega(),
  public.google_letto(text) from public;
grant execute on function public.google_leggi(text), public.google_letto(text) to anon, authenticated;
grant execute on function public.google_salva(text, text, jsonb), public.google_scollega() to authenticated;
