-- 0030: nuovo ruolo "segreteria" (account personale col PIN, come scout e direttori).
-- Da sola: un valore nuovo di un tipo enum non si può usare nella stessa esecuzione in cui si aggiunge (lo usa la 0031).
alter type public.ruolo add value if not exists 'segreteria';
