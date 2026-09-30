// Informativa sulla privacy, pubblica (senza PIN): la chiede Google per il collegamento con Google Calendar (0049).
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Privacy · Academy Casatese Merate' };

export default function Privacy() {
  const h2 = 'mt-8 font-display text-2xl font-bold';
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 leading-relaxed">
      <h1 className="font-display text-4xl font-bold">Informativa sulla privacy</h1>
      <p className="mt-2 text-grigio">App del settore giovanile Academy Casatese Merate</p>

      <h2 className={h2}>Chi usa l’app</h2>
      <p className="mt-2">
        L’app serve solo allo staff della società (amministratore, direttori, mister, scout, segreteria) e alle famiglie dei
        tesserati, ognuno col suo PIN personale. Non è aperta al pubblico e non contiene pubblicità.
      </p>

      <h2 className={h2}>Quali dati tratta</h2>
      <p className="mt-2">
        Rose, calendari, presenze e statistiche delle squadre; per lo scouting, osservazioni tecniche e sportive sui giocatori.
        I contatti delle famiglie sono in un archivio protetto, leggibile solo da chi ne ha bisogno per il proprio ruolo.
        I dati restano nei sistemi usati dalla società per l’app e non si vendono né si cedono a terzi.
      </p>

      <h2 className={h2}>Google Calendar</h2>
      <p className="mt-2">
        Se l’amministratore collega Google Calendar, l’app legge e scrive solo gli eventi dei calendari della società che
        l’amministratore sceglie (partite, amichevoli, tornei, eventi), per tenerli allineati con il calendario dell’app. Non legge
        altri calendari né altri dati dell’account Google. Il permesso è salvato cifrato e si può togliere in ogni momento
        dall’app (“Scollega”) o dall’account Google (Sicurezza → App di terze parti).
      </p>
      <p className="mt-2">
        L’uso delle informazioni ricevute dalle API di Google rispetta le Norme sui dati utente dei servizi API di Google, compresi i
        requisiti di uso limitato.
      </p>

      <h2 className={h2}>Diritti e contatti</h2>
      <p className="mt-2">
        Per vedere, correggere o cancellare i propri dati ci si rivolge alla segreteria della società Academy Casatese Merate.
      </p>
    </main>
  );
}
