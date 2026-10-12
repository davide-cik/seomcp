# GEO e AEO: farsi citare dalle AI

Come leggono il sito ChatGPT, Perplexity, Gemini e le AI Overviews, e come rendere le pagine più citabili.

1. **Perché ChatGPT cita la pagina del mio concorrente https://www.concorrente.it/guida/ e non la mia https://www.esempio.it/guida/? Confronta le due pagine.**
    - Serve: nessuna credenziale
    - Tool: `geo_page_metrics`
    - Risposta: Le differenze misurabili tra le due pagine che contano per la citabilità.

2. **Riscrivi la sezione "Quanto costa" di https://www.esempio.it/servizio/ perché un assistente AI possa citarla da sola.**
    - Serve: nessuna credenziale
    - Tool: `geo_page_sections`
    - Risposta: La sezione riscritta, autonoma e con una risposta diretta.

3. **Quali crawler AI hanno visitato davvero il sito questo mese, e quali pagine hanno letto?**
    - Serve: token Cloudflare (sola lettura)
    - Tool: `cf_ai_crawlers`
    - Risposta: Bot per bot: richieste, giorni attivi, pagine più lette e risposte ricevute.

4. **Il mio robots.txt blocca i bot che servono per comparire nelle risposte delle AI, oltre a quelli di addestramento?**
    - Serve: nessuna credenziale
    - Tool: `geo_ai_access`
    - Risposta: Quali bot di risposta sono bloccati, distinti da quelli di addestramento.

5. **Ho un llms.txt? È fatto bene? Se manca, scrivimene uno per il mio sito.**
    - Serve: nessuna credenziale
    - Tool: `geo_ai_access`
    - Risposta: Stato del file llms.txt e una proposta pronta da pubblicare.

6. **Analizza https://www.esempio.it/guida/ sezione per sezione: quali sezioni sono troppo lunghe, senza dati o senza fonti?**
    - Serve: nessuna credenziale
    - Tool: `geo_page_sections`
    - Risposta: Le misure di ogni sezione con le correzioni da fare.

7. **Quali domande fanno le persone che arrivano su https://www.esempio.it/guida/, e a quali la pagina non risponde?**
    - Serve: Search Console
    - Tool: `gsc_performance`, `geo_page_sections`
    - Risposta: Le query a domanda della pagina, divise tra coperte e scoperte.

8. **Fammi un piano editoriale con le domande degli utenti a cui il sito non risponde ancora.**
    - Serve: Search Console
    - Tool: `gsc_performance`, `geo_page_sections`
    - Risposta: Nuove sezioni, FAQ e pagine da scrivere, in ordine di priorità.

9. **La pagina ha un autore riconoscibile, una data di aggiornamento recente e dati strutturati coerenti con il testo?**
    - Serve: nessuna credenziale
    - Tool: `geo_page_metrics`, `schema_validate`
    - Risposta: Segnali di autorevolezza e freschezza, con cosa manca.

10. **Il sito usa Content Signals o la riserva TDM europea? Cosa comporta per l'uso dei contenuti da parte delle AI?**
    - Serve: nessuna credenziale
    - Tool: `geo_ai_access`
    - Risposta: Le preferenze dichiarate sul sito e cosa significano.

---

Questo file è generato da `src/library/domande.ts` con `npm run domande`: modifica lì le domande. In seomcp le stesse domande sono disponibili come risorse MCP (`seomcp://domande`).
