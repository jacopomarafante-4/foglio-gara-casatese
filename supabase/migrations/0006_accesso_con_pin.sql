-- =====================================================================
-- Scouting Hub · 0006 · Accesso unico col PIN
-- Da eseguire in Supabase → SQL Editor, DOPO la 0005
-- =====================================================================

-- Dalla pagina d'ingresso si digita solo il PIN. Per gli account personali
-- (scout, direttori: tabella codici_accesso, PIN = password) serve sapere a
-- quale account appartiene il PIN, per poi fare il login vero con quell'email.
-- Restituisce l'email solo a chi conosce già il PIN, e rallenta chi prova
-- PIN a caso (stesso ritardo di coach_team per le squadre).
create or replace function public.email_per_pin(p_pin text)
returns text language plpgsql volatile security definer set search_path = public as $$
declare v text;
begin
  select p.email into v
  from public.codici_accesso c
  join public.profiles p on p.id = c.profilo_id
  where coalesce(p_pin, '') <> '' and c.pin = p_pin and p.attivo
  limit 1;
  if v is null and coalesce(p_pin, '') <> '' then perform pg_sleep(1); end if;
  return v;
end $$;

revoke all on function public.email_per_pin(text) from public;
grant execute on function public.email_per_pin(text) to anon, authenticated;
