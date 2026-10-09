# Report e analisi a più passaggi

Domande lunghe che combinano più fonti: utili per un cliente, per il capo o per la riunione del lunedì.

1. **Preparami un report mensile per il cliente: andamento su Google, pagine e query migliori e peggiori, conversioni organiche, tre azioni per il mese prossimo. Scrivilo in modo comprensibile per chi non fa SEO.**
    - Serve: Search Console + Google Analytics 4
    - Tool: `gsc_compare_periods`, `gsc_performance`, `ga_organic_landing_pages`
    - Risposta: Un report pronto da inviare, con numeri e azioni.

2. **Fai un check-up completo di https://www.esempio.it: tecnico, dati strutturati, prestazioni e accesso delle AI. Chiudi con una tabella di interventi ordinata per impatto e fatica.**
    - Serve: API key Google (PageSpeed e CrUX)
    - Tool: `tech_page_audit`, `tech_site_check`, `schema_validate`, `psi_analyze`, `geo_ai_access`
    - Risposta: Una tabella di interventi con priorità.

3. **Confronta, poi approfondisci: trova le 3 pagine che calano di più su Google, leggile, controlla i loro Core Web Vitals e proponi cosa cambiare in ciascuna.**
    - Serve: Search Console + API key Google (PageSpeed e CrUX)
    - Tool: `gsc_compare_periods`, `geo_page_sections`, `crux_query`
    - Risposta: Per ogni pagina in calo, una diagnosi e le modifiche.

4. **Sto per pubblicare una nuova pagina su https://www.esempio.it/nuova/: controllala prima del lancio (tecnico, dati strutturati, citabilità) e dammi una checklist.**
    - Serve: nessuna credenziale
    - Tool: `tech_page_audit`, `schema_validate`, `geo_page_metrics`
    - Risposta: Una checklist di pubblicazione con quello che manca.

5. **Ho appena fatto la migrazione del sito: controlla redirect, canonical, sitemap e indicizzazione delle 5 pagine più importanti, e confronta il traffico prima e dopo.**
    - Serve: Search Console
    - Tool: `tech_page_audit`, `tech_site_check`, `gsc_inspect_url`, `gsc_compare_periods`
    - Risposta: Un controllo post migrazione con i problemi trovati e l'effetto sul traffico.

6. **Scegli le 10 query con più potenziale, verifica su Bing quanto sono cercate e dimmi quali contenuti scrivere o aggiornare per prime.**
    - Serve: Search Console + Bing Webmaster Tools
    - Tool: `gsc_striking_distance`, `bing_keyword_stats`
    - Risposta: Una lista di contenuti ordinata per potenziale.

7. **Riassumi in 5 righe come sta andando il sito questa settimana rispetto alla precedente, per un messaggio al team.**
    - Serve: Search Console + Google Analytics 4
    - Tool: `gsc_compare_periods`, `ga_compare_periods`
    - Risposta: Un breve aggiornamento con i numeri essenziali.

---

Questo file è generato da `src/library/domande.ts` con `npm run domande`: modifica lì le domande. In seomcp le stesse domande sono disponibili come risorse MCP (`seomcp://domande`).
