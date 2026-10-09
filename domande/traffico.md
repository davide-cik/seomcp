# Traffico e andamento

Come va il sito su Google: clic, impressioni, posizioni e confronti tra periodi.

1. **Come è andato il sito negli ultimi 28 giorni rispetto ai 28 precedenti? Dammi i totali e le 10 query che calano di più.**
    - Serve: Search Console
    - Tool: `gsc_compare_periods`
    - Risposta: Totali a confronto e l'elenco dei cali più forti.

2. **Confronta questo mese con lo stesso periodo dell'anno scorso e segnala le pagine che hanno perso più del 30% dei clic.**
    - Serve: Search Console
    - Tool: `gsc_compare_periods`
    - Risposta: Le pagine in calo rispetto all'anno prima, con la variazione percentuale.

3. **Mostrami l'andamento giorno per giorno dei clic negli ultimi 90 giorni e dimmi se ci sono cali improvvisi.**
    - Serve: Search Console
    - Tool: `gsc_performance`
    - Risposta: La serie giornaliera e i giorni anomali da indagare.

4. **Da quali paesi e da quali dispositivi arrivano i clic? Qualcosa è cambiato negli ultimi tre mesi?**
    - Serve: Search Console
    - Tool: `gsc_performance`, `gsc_compare_periods`
    - Risposta: Ripartizione per paese e dispositivo, con le differenze tra periodi.

5. **Quali sono le 20 pagine con più clic da Google e qual è la loro posizione media?**
    - Serve: Search Console
    - Tool: `gsc_performance`
    - Risposta: Classifica delle pagine con clic, impressioni, CTR e posizione.

6. **Quanto traffico arriva da Google Immagini e da Discover, e su quali pagine?**
    - Serve: Search Console
    - Tool: `gsc_performance`
    - Risposta: I dati per tipo di ricerca immagini e Discover, pagina per pagina.

7. **Quanta parte dei clic viene dal brand? Separa le query che contengono il nome del sito da tutte le altre.**
    - Serve: Search Console
    - Tool: `gsc_performance`
    - Risposta: Clic e impressioni di brand e non brand, con le quote.

8. **Il calo di clic delle ultime settimane dipende da meno impressioni, da un CTR più basso o da posizioni peggiori?**
    - Serve: Search Console
    - Tool: `gsc_compare_periods`, `gsc_performance`
    - Risposta: Una diagnosi del calo scomposta tra impressioni, CTR e posizione.

---

Questo file è generato da `src/library/domande.ts` con `npm run domande`: modifica lì le domande. In seomcp le stesse domande sono disponibili come risorse MCP (`seomcp://domande`).
