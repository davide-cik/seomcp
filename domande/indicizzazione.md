# Indicizzazione e controlli tecnici

Se Google vede e indicizza le pagine giuste, e cosa lo impedisce.

1. **La pagina https://www.esempio.it/prodotto/ è indicizzata? Quale canonical ha scelto Google e quando l'ha scansionata l'ultima volta?**
    - Serve: Search Console
    - Tool: `gsc_inspect_url`
    - Risposta: Stato di indicizzazione, canonical di Google e data dell'ultima scansione.

2. **Le sitemap inviate hanno errori o avvisi? Quando le ha scaricate Google l'ultima volta?**
    - Serve: Search Console
    - Tool: `gsc_list_sitemaps`
    - Risposta: Elenco delle sitemap con date, URL inviati, errori e avvisi.

3. **Fai un audit tecnico di https://www.esempio.it: redirect, sitemap, pagina 404 e link interni rotti, con le correzioni in ordine di urgenza.**
    - Serve: nessuna credenziale
    - Tool: `tech_page_audit`, `tech_site_check`
    - Risposta: Un elenco di problemi tecnici ordinato per impatto.

4. **La versione http e quella senza www arrivano alla home con un solo redirect permanente?**
    - Serve: nessuna credenziale
    - Tool: `tech_page_audit`
    - Risposta: La catena di redirect passo per passo, con il tipo di ogni redirect.

5. **Il canonical di https://www.esempio.it/categoria/ punta a una pagina che funziona? E Google lo rispetta?**
    - Serve: Search Console
    - Tool: `tech_page_audit`, `gsc_inspect_url`
    - Risposta: Canonical dichiarato, sua risposta e canonical scelto da Google.

6. **Gli hreflang di https://www.esempio.it/ sono corretti? Le versioni nelle altre lingue rimandano a questa pagina?**
    - Serve: nessuna credenziale
    - Tool: `tech_page_audit`
    - Risposta: Codici lingua, x-default, autoreferenza e link di ritorno a campione.

7. **Controlla una per una la home e le 5 pagine principali: ci sono noindex nascosti, title mancanti o description troppo lunghe?**
    - Serve: nessuna credenziale
    - Tool: `tech_page_audit`
    - Risposta: Per ogni pagina, i problemi di indicizzabilità e di meta.

8. **Quali header di sicurezza mancano sul sito e quanto pesano le pagine principali?**
    - Serve: nessuna credenziale
    - Tool: `tech_page_audit`
    - Risposta: Header di sicurezza presenti e mancanti, peso e compressione delle pagine.

---

Questo file è generato da `src/library/domande.ts` con `npm run domande`: modifica lì le domande. In seomcp le stesse domande sono disponibili come risorse MCP (`seomcp://domande`).
