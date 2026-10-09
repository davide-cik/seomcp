# Primi passi, senza credenziali

Funzionano appena installato seomcp: leggono solo pagine pubbliche. Sostituisci esempio.it con il tuo sito.

1. **Cosa è configurato in seomcp e cosa mi manca per usare tutte le fonti?**
    - Serve: nessuna credenziale
    - Tool: `seomcp_status`
    - Risposta: Lo stato di ogni fonte e i passaggi per attivare quelle spente.

2. **Il sito https://www.esempio.it è aperto ai crawler AI? Dimmi quali bot può leggerlo e quali sono bloccati, e per quale regola.**
    - Serve: nessuna credenziale
    - Tool: `geo_ai_access`
    - Risposta: Bot per bot, divisi tra addestramento e risposte, con la regola di robots.txt che decide.

3. **Fai un controllo tecnico della home di https://www.esempio.it e dimmi le tre cose da sistemare per prime.**
    - Serve: nessuna credenziale
    - Tool: `tech_page_audit`
    - Risposta: Redirect, indicizzabilità, canonical, meta e titoli, con le correzioni in ordine di priorità.

4. **I dati strutturati della home di https://www.esempio.it sono validi? Sono idonei ai risultati avanzati di Google?**
    - Serve: nessuna credenziale
    - Tool: `schema_validate`
    - Risposta: Errori, avvisi e quali risultati avanzati sono possibili.

5. **Leggi https://www.esempio.it/guida/ come la vede un crawler AI: c'è una risposta chiara in apertura? Quanto è citabile?**
    - Serve: nessuna credenziale
    - Tool: `geo_page_metrics`
    - Risposta: Le misure della pagina con un giudizio su risposta in apertura, sezioni, fonti e autore.

6. **La sitemap di https://www.esempio.it contiene pagine reindirizzate o in errore? La pagina 404 è configurata bene?**
    - Serve: nessuna credenziale
    - Tool: `tech_site_check`
    - Risposta: Un campione di URL della sitemap con il loro stato, più la verifica della pagina 404.

7. **Da quanto tempo esiste il dominio esempio.it e il passaggio da http a https è fatto bene?**
    - Serve: nessuna credenziale
    - Tool: `geo_page_metrics`
    - Risposta: Età del dominio, scadenza e catena di redirect da http.

---

Questo file è generato da `src/library/domande.ts` con `npm run domande`: modifica lì le domande. In seomcp le stesse domande sono disponibili come risorse MCP (`seomcp://domande`).
