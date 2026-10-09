# Analytics e conversioni

Cosa fanno le persone dopo aver cliccato: sessioni, coinvolgimento, eventi chiave e ricavi.

1. **Quali pagine ricevono molti clic da Google ma convertono poco?**
    - Serve: Search Console + Google Analytics 4
    - Tool: `gsc_performance`, `ga_organic_landing_pages`
    - Risposta: Le pagine con traffico organico alto e conversioni basse.

2. **Quali pagine di destinazione della ricerca organica portano più ricavi negli ultimi 90 giorni?**
    - Serve: Google Analytics 4
    - Tool: `ga_organic_landing_pages`
    - Risposta: Classifica delle pagine organiche per ricavi ed eventi chiave.

3. **Il traffico organico è cresciuto o calato rispetto all'anno scorso? E le conversioni?**
    - Serve: Google Analytics 4
    - Tool: `ga_compare_periods`
    - Risposta: Variazioni di sessioni e conversioni organiche, con le pagine che pesano di più.

4. **Quanto traffico organico arriva da Bing rispetto a Google, e converte allo stesso modo?**
    - Serve: Google Analytics 4
    - Tool: `ga_organic_landing_pages`
    - Risposta: Sessioni e conversioni per motore di ricerca a confronto.

5. **Quante persone sono sul sito in questo momento e su quali pagine?**
    - Serve: Google Analytics 4
    - Tool: `ga_realtime`
    - Risposta: Utenti attivi negli ultimi 30 minuti, per pagina.

6. **Dividi le sessioni per canale (organico, diretto, social, referral) e dimmi quale cresce di più.**
    - Serve: Google Analytics 4
    - Tool: `ga_report`, `ga_compare_periods`
    - Risposta: Sessioni per canale con la variazione rispetto al periodo precedente.

7. **Quali pagine organiche hanno un tasso di coinvolgimento basso? Leggile e dimmi perché le persone se ne vanno.**
    - Serve: Google Analytics 4
    - Tool: `ga_organic_landing_pages`, `geo_page_sections`
    - Risposta: Le pagine poco coinvolgenti con ipotesi concrete sul testo.

---

Questo file è generato da `src/library/domande.ts` con `npm run domande`: modifica lì le domande. In seomcp le stesse domande sono disponibili come risorse MCP (`seomcp://domande`).
