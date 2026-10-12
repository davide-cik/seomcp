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

4. **Quante visite mi portano ChatGPT, Perplexity e gli altri assistenti AI questo mese, su quali pagine arrivano e convertono?**
    - Serve: Google Analytics 4
    - Tool: `ga_ai_referrals`
    - Risposta: Visite per assistente con la variazione sul mese prima, le pagine di destinazione e la quota sul traffico totale.

5. **Il mio brand è riconosciuto come entità su Wikidata e da Google? Il sito https://www.esempio.it è collegato con i sameAs?**
    - Serve: nessuna credenziale
    - Tool: `geo_entity`
    - Risposta: L'entità trovata, il sito ufficiale dichiarato, le pagine Wikipedia e i sameAs che mancano nei dati strutturati.

6. **Le pagine di https://www.esempio.it sono in Common Crawl, l'archivio con cui si addestrano molti modelli AI?**
    - Serve: nessuna credenziale
    - Tool: `geo_common_crawl`
    - Risposta: Quante pagine ci sono negli ultimi crawl, se c'è la home e con quali risposte.

7. **Il mio robots.txt blocca i bot che servono per comparire nelle risposte delle AI, oltre a quelli di addestramento?**
    - Serve: nessuna credenziale
    - Tool: `geo_ai_access`
    - Risposta: Quali bot di risposta sono bloccati, distinti da quelli di addestramento.

8. **Ho un llms.txt? È fatto bene? Se manca, scrivimene uno per il mio sito.**
    - Serve: nessuna credenziale
    - Tool: `geo_ai_access`
    - Risposta: Stato del file llms.txt e una proposta pronta da pubblicare.

9. **Analizza https://www.esempio.it/guida/ sezione per sezione: quali sezioni sono troppo lunghe, senza dati o senza fonti?**
    - Serve: nessuna credenziale
    - Tool: `geo_page_sections`
    - Risposta: Le misure di ogni sezione con le correzioni da fare.

10. **Quali domande fanno le persone che arrivano su https://www.esempio.it/guida/, e a quali la pagina non risponde?**
    - Serve: Search Console
    - Tool: `gsc_performance`, `geo_page_sections`
    - Risposta: Le query a domanda della pagina, divise tra coperte e scoperte.

11. **Fammi un piano editoriale con le domande degli utenti a cui il sito non risponde ancora.**
    - Serve: Search Console
    - Tool: `gsc_performance`, `geo_page_sections`
    - Risposta: Nuove sezioni, FAQ e pagine da scrivere, in ordine di priorità.

12. **La pagina ha un autore riconoscibile, una data di aggiornamento recente e dati strutturati coerenti con il testo?**
    - Serve: nessuna credenziale
    - Tool: `geo_page_metrics`, `schema_validate`
    - Risposta: Segnali di autorevolezza e freschezza, con cosa manca.

13. **Il sito usa Content Signals o la riserva TDM europea? Cosa comporta per l'uso dei contenuti da parte delle AI?**
    - Serve: nessuna credenziale
    - Tool: `geo_ai_access`
    - Risposta: Le preferenze dichiarate sul sito e cosa significano.

14. **Quali pagine leggono i crawler di OpenAI e Perplexity, e quali ricevono davvero visite da ChatGPT e Perplexity? Ci sono pagine lette ma mai cliccate?**
    - Serve: token Cloudflare (sola lettura) + Google Analytics 4
    - Tool: `cf_ai_crawlers`, `ga_ai_referrals`
    - Risposta: Le pagine lette dai crawler messe accanto a quelle che portano visite, con quelle da migliorare.

15. **Su Wikidata ci sono più entità con il nome del mio brand? Rischio di essere confuso con qualcos'altro?**
    - Serve: nessuna credenziale
    - Tool: `geo_entity`
    - Risposta: Le entità omonime, quale è collegata al sito e come evitare la confusione.

16. **Quali pagine danno la risposta subito e quali la nascondono in fondo? Analizza la home di https://www.esempio.it e le 3 guide principali.**
    - Serve: nessuna credenziale
    - Tool: `geo_page_metrics`
    - Risposta: La risposta in apertura pagina per pagina, con le riscritture più urgenti.

17. **Le pagine più visitate dagli assistenti AI hanno autore, data di aggiornamento e dati strutturati?**
    - Serve: Google Analytics 4
    - Tool: `ga_ai_referrals`, `geo_page_metrics`
    - Risposta: Le pagine che le AI già citano, con i segnali di autorevolezza che mancano.

18. **Se blocco GPTBot ma lascio OAI-SearchBot e ChatGPT-User, cosa cambia per il mio sito? Verifica cosa dice oggi il mio robots.txt.**
    - Serve: nessuna credenziale
    - Tool: `geo_ai_access`
    - Risposta: La differenza tra addestramento e risposte, con le righe di robots.txt da usare.

---

Questo file è generato da `src/library/domande.ts` con `npm run domande`: modifica lì le domande. In seomcp le stesse domande sono disponibili come risorse MCP (`seomcp://domande`).
