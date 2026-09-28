# Configurare Bing Webmaster Tools

Bastano due minuti.

1. Accedi a [bing.com/webmasters](https://www.bing.com/webmasters). Se il sito è già in Search Console, puoi importarlo da lì con un clic.
2. Apri le **Impostazioni** (icona a ingranaggio in alto a destra) e vai su **Accesso API → Chiave API → Genera**.
3. Copia la chiave e impostala come variabile d'ambiente:
   ```
   BING_WEBMASTER_API_KEY=la-tua-chiave
   ```

La chiave dà accesso a tutti i siti del tuo account Bing. Trattala come una password: non committarla e non incollarla in chat. Se pensi che sia stata esposta, rigenerala dallo stesso menu.

## Il formato del sito

Usa l'URL esatto con cui il sito compare in Bing Webmaster Tools, ad esempio `https://www.tuosito.it/`. Per vedere l'elenco dei tuoi siti esegui `npx @contentisking/seomcp doctor`.

## Volumi di ricerca

`bing_keyword_stats` usa di default il mercato **Italia / italiano** (`it` / `it-IT`). Per altri mercati imposta `SEOMCP_COUNTRY` e `SEOMCP_LANGUAGE`, oppure chiedilo direttamente a Claude ("volumi in Spagna").
