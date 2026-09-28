// Per le prove (node --test): Node legge i file TypeScript da solo (toglie i tipi), ma non conosce gli indirizzi
// abbreviati del progetto ("@/lib/utili") né gli import senza estensione ("./google-calendar"). Questo li traduce.
import { register } from 'node:module';
register('./risolvi.mjs', import.meta.url);
