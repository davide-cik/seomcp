# Configurare Google Search Console

> Vuoi anche Google Analytics 4? Completa prima questa guida, poi segui la [guida Analytics](google-analytics-setup.md): usa le stesse credenziali.

Hai due strade. Scegline una.

| | Service account | OAuth con client tuo |
|---|---|---|
| Ideale per | team, server, più persone | singolo professionista |
| Accesso | solo alle proprietà dove lo aggiungi come utente | a tutte le proprietà del tuo account Google |
| Rinnovo | nessuno | nessuno, dopo la prima autorizzazione |

In entrambi i casi l'accesso è **in sola lettura**.

> 📸 *Screenshot in arrivo. Se vuoi contribuire con i tuoi, vedi [CONTRIBUTING.md](../CONTRIBUTING.md).*

## Passaggi comuni

1. Vai su [console.cloud.google.com](https://console.cloud.google.com) e crea un progetto, per esempio `seomcp`.
2. Apri **API e servizi → Libreria**, cerca **Google Search Console API** e clicca **Abilita**.

## Strada A: service account

3. Vai su **IAM e amministrazione → Service account → Crea service account**. Dagli un nome, ad esempio `seomcp`. Non servono ruoli sul progetto: premi **Fine**.
4. Apri il service account appena creato e vai su **Chiavi → Aggiungi chiave → Crea nuova chiave → JSON**. Il browser scarica il file.
5. Sposta il file in un posto sicuro, fuori da qualsiasi repository, e proteggilo:
   ```bash
   mkdir -p ~/.config/seomcp && mv ~/Download/seomcp-*.json ~/.config/seomcp/service-account.json
   chmod 600 ~/.config/seomcp/service-account.json
   ```
6. Copia l'email del service account, che ha la forma `seomcp@nome-progetto.iam.gserviceaccount.com`.
7. In [Search Console](https://search.google.com/search-console), per ogni proprietà vai su **Impostazioni → Utenti e autorizzazioni → Aggiungi utente**. Incolla l'email e scegli il permesso **Con restrizioni**, che basta per leggere i dati.
8. Imposta la variabile d'ambiente:
   ```
   GOOGLE_APPLICATION_CREDENTIALS=/home/tuonome/.config/seomcp/service-account.json
   ```

> Se la tua organizzazione Google Workspace blocca la creazione di chiavi per i service account (policy `iam.disableServiceAccountKeyCreation`), usa la strada B.

## Strada B: OAuth con un client tuo

3. Vai su **API e servizi → Schermata consenso OAuth**. Scegli il tipo **Esterno**, oppure **Interno** se hai Google Workspace, e compila i campi obbligatori.
4. Con il tipo **Esterno**, porta lo stato di pubblicazione a **In produzione**. In stato "Test" Google fa scadere l'autorizzazione dopo 7 giorni. Dato che l'app la usi solo tu, non serve farla verificare: al login vedrai un avviso "app non verificata", clicca **Avanzate → Vai a seomcp**.
5. Vai su **Credenziali → Crea credenziali → ID client OAuth** e scegli **App desktop** come tipo di applicazione. Copia **ID client** e **Client secret**.
6. Imposta le variabili e autorizza, una volta sola:
   ```bash
   export SEOMCP_GOOGLE_CLIENT_ID="xxx.apps.googleusercontent.com"
   export SEOMCP_GOOGLE_CLIENT_SECRET="xxx"
   npx @contentisking/seomcp auth google
   ```
   Si apre il browser: accedi con l'account che vede le proprietà in Search Console. Il token viene salvato in `~/.config/seomcp/google-token.json`, leggibile solo dal tuo utente.
7. Nella configurazione di Claude passa le stesse due variabili (`SEOMCP_GOOGLE_CLIENT_ID` e `SEOMCP_GOOGLE_CLIENT_SECRET`).

Per revocare l'accesso in qualsiasi momento: [myaccount.google.com/permissions](https://myaccount.google.com/permissions).

## Il formato del sito

Il valore di `siteUrl` / `SEOMCP_GSC_SITE` deve coincidere con la proprietà in Search Console:

- proprietà **di dominio** → `sc-domain:tuosito.it`
- proprietà **con prefisso URL** → `https://www.tuosito.it/` (con la `/` finale)

Se non sei sicuro, esegui `npx @contentisking/seomcp doctor`: mostra l'elenco esatto delle proprietà accessibili.
