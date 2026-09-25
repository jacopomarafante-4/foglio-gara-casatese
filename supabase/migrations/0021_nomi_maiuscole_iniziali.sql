-- =====================================================================
-- 0021 · Cognome e nome dei giocatori sempre con le iniziali maiuscole
-- Da eseguire in Supabase → SQL Editor, DOPO la 0020
-- =====================================================================

-- "ROSSI", "rossi", "rOSSI" → "Rossi". Maiuscola all'inizio di ogni parola e dopo apostrofo
-- e trattino ("D'Angelo", "Rossi-Bianchi", "Maria Elena"), il resto minuscolo; spazi doppi tolti.
-- Stessa regola di maiuscoleIniziali() in lib/utili.ts.
create or replace function public.nome_proprio(s text)
returns text language plpgsql immutable set search_path = public as $$
declare r text := ''; c text; prec text := ' ';
begin
  if s is null or btrim(s) = '' then return s; end if;
  foreach c in array regexp_split_to_array(regexp_replace(btrim(lower(s)), '\s+', ' ', 'g'), '') loop
    r := r || case when prec in (' ', '''', '’', '-') then upper(c) else c end;
    prec := c;
  end loop;
  return r;
end $$;

-- Ogni nuovo giocatore o modifica (Scouting, Portale dei mister, importazioni) passa di qui
create or replace function public.giocatori_nomi()
returns trigger language plpgsql set search_path = public as $$
begin
  new.cognome := public.nome_proprio(new.cognome);
  new.nome := public.nome_proprio(new.nome);
  return new;
end $$;

drop trigger if exists giocatori_nomi on public.giocatori;
create trigger giocatori_nomi before insert or update of cognome, nome on public.giocatori
  for each row execute function public.giocatori_nomi();

-- Nomi già in archivio: si correggono senza cambiare la data di ultima modifica
-- (l'elenco dei giocatori è ordinato per modifica più recente)
alter table public.giocatori disable trigger giocatori_updated_at;
update public.giocatori
   set cognome = public.nome_proprio(cognome), nome = public.nome_proprio(nome)
 where cognome is distinct from public.nome_proprio(cognome) or nome is distinct from public.nome_proprio(nome);
alter table public.giocatori enable trigger giocatori_updated_at;
