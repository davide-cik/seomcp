# Bozze di "good first issue"

Da aprire su GitHub al lancio, con l'etichetta `good first issue`. Ognuna è piccola, ben delimitata e ha un test di riferimento da copiare.

---

### 1. Bing: tool `bing_crawl_issues`
Esporre `GetCrawlIssues` della Bing Webmaster API (URL con errori di scansione). Aggiungere il metodo a `src/core/bing.ts`, registrare il tool in `src/tools/bing.ts` e scrivere un test con `fetch` finto come in `tests/bing.test.ts`.

### 2. Bing: tool `bing_url_info`
Esporre `GetUrlInfo` (stato di un singolo URL nell'indice Bing), l'equivalente di `gsc_inspect_url`.

### 3. Bing: tool `bing_crawl_stats`
Esporre `GetCrawlStats`: pagine scansionate, errori e pagine bloccate da robots.txt, per giorno.

### 4. Search Console: paginazione oltre 25.000 righe
Oggi `gsc_performance` si ferma a 25.000 righe, il limite di una singola richiesta. Aggiungere un'opzione `fetchAll` che usi `startRow` fino a un tetto ragionevole (es. 100.000).

### 5. Test per la mappatura degli errori Google
`toSeoMcpError` in `src/core/gsc.ts` non è coperta da test. Verificare che 401, 403 e 429 producano il codice e il suggerimento giusti.

### 6. Screenshot per la guida Google
`docs/google-setup.md` è la parte in cui gli utenti si bloccano. Servono screenshot per ogni passaggio (Google Cloud in italiano), salvati in `docs/img/`.

### 7. IndexNow per Bing *(un po' più impegnativa)*
Tool `indexnow_submit` per notificare URL nuovi o aggiornati. Richiede che l'utente pubblichi un file-chiave sul sito: il tool deve verificarne la presenza prima dell'invio. Va marcato `readOnlyHint: false` e documentato come unico tool in scrittura.
