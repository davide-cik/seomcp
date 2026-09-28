# Contribuire a seomcp

Grazie! Ogni aiuto conta: codice, documentazione, screenshot per le guide, segnalazioni di bug. Puoi scrivere in italiano o in inglese.

## Come proporre una modifica

1. Per modifiche non banali **apri prima una issue**, così ne parliamo prima che tu ci lavori.
2. Fai un fork, crea un branch e installa le dipendenze:
   ```bash
   npm install
   npm test          # test
   npm run typecheck # controllo dei tipi
   npm run doctor    # prova la configurazione in locale
   ```
3. Apri una pull request con una descrizione breve di cosa cambia e perché.

Se cerchi da dove iniziare, guarda le issue con l'etichetta [`good first issue`](https://github.com/davide-cik/seomcp/labels/good%20first%20issue).

## Principi del progetto

Sono il motivo per cui qualcuno si fida a darci le proprie credenziali. Le PR che non li rispettano non verranno accettate.

- **Sola lettura per default.** Un tool che scrive (per esempio l'invio a IndexNow) va dichiarato esplicitamente, con `readOnlyHint: false`.
- **Solo librerie ufficiali** o chiamate HTTP dirette. Niente dipendenze che non si possono verificare in pochi minuti.
- **Nessuna telemetria**, nessuna chiamata a server diversi da quelli di Google e Microsoft.
- **Mai credenziali nei log o nei messaggi di errore.** Ricorda che stdout è riservato al protocollo MCP: i log vanno su stderr.
- **Nessun uso della Google Indexing API** per pagine che non siano offerte di lavoro o dirette video.
- **Il core (`src/core/`) non legge file né variabili d'ambiente**, così resta utilizzabile come libreria.
- **Messaggi d'errore utili:** dicono cosa fare, non solo cosa è andato storto.

## Aggiungere un tool

1. Aggiungi il metodo al client in `src/core/` (`gsc.ts` o `bing.ts`).
2. Registra il tool in `src/tools/`, con descrizione chiara e schema Zod.
3. Aggiungi un test in `tests/`: il client Bing accetta un `fetch` finto, il server si testa in memoria (vedi `tests/server.test.ts`).
4. Aggiorna la tabella dei tool nei due README.
