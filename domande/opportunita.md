# Opportunità SEO

Dove si guadagna di più con meno lavoro: query vicine alla prima pagina, CTR bassi, pagine in concorrenza tra loro.

1. **Quali query sono in posizione 4-20 negli ultimi 90 giorni? Dammi le 10 con più potenziale e la pagina da ottimizzare per ciascuna.**
    - Serve: Search Console
    - Tool: `gsc_striking_distance`
    - Risposta: Query a distanza di tiro ordinate per impressioni, con la pagina che si posiziona.

2. **Quali pagine hanno molte impressioni ma un CTR molto più basso della media per la loro posizione? Proponi title e description migliori.**
    - Serve: Search Console
    - Tool: `gsc_performance`
    - Risposta: Le pagine con CTR sotto le attese e proposte di title e description.

3. **Ci sono query per cui si posizionano più pagine del sito, in concorrenza tra loro?**
    - Serve: Search Console
    - Tool: `gsc_performance`
    - Risposta: Le query con più pagine in classifica e quale pagina tenere come principale.

4. **Quali domande (chi, come, perché, quanto) portano impressioni al sito ma pochi clic?**
    - Serve: Search Console
    - Tool: `gsc_performance`
    - Risposta: Le query a domanda con poco CTR, spunti per nuove sezioni o FAQ.

5. **Nella cartella /blog/, quali articoli sono quasi in prima pagina e cosa aggiungeresti a ciascuno?**
    - Serve: Search Console
    - Tool: `gsc_striking_distance`, `geo_page_sections`
    - Risposta: Gli articoli vicini alla prima pagina, con le sezioni da ampliare.

6. **Quali query nuove sono comparse negli ultimi 28 giorni rispetto al periodo precedente?**
    - Serve: Search Console
    - Tool: `gsc_compare_periods`
    - Risposta: Le query in crescita o nuove, segnali di temi emergenti.

7. **Prendi le 5 pagine che hanno perso più clic quest'anno: leggile e dimmi cosa è invecchiato nei contenuti.**
    - Serve: Search Console
    - Tool: `gsc_compare_periods`, `geo_page_sections`
    - Risposta: Per ogni pagina in calo, cosa aggiornare nel testo.

8. **Su Bing quanto viene cercata la keyword "scarpe da trekking" in Italia, e il mio sito per quali query simili compare già su Google?**
    - Serve: Bing Webmaster Tools + Search Console
    - Tool: `bing_keyword_stats`, `gsc_performance`
    - Risposta: Volume della keyword su Bing e le query correlate già presenti su Google.

---

Questo file è generato da `src/library/domande.ts` con `npm run domande`: modifica lì le domande. In seomcp le stesse domande sono disponibili come risorse MCP (`seomcp://domande`).
