# Prestazioni e Core Web Vitals

Dati reali degli utenti Chrome (quelli che Google usa per il ranking) e test di laboratorio con i suggerimenti.

1. **Il sito supera i Core Web Vitals su mobile? Dammi LCP, INP e CLS con il giudizio.**
    - Serve: API key Google (PageSpeed e CrUX)
    - Tool: `crux_query`
    - Risposta: I valori reali al 75° percentile con il giudizio buono, da migliorare o scarso.

2. **Com'è cambiato l'LCP del sito nelle ultime 25 settimane? C'è stato un peggioramento?**
    - Serve: API key Google (PageSpeed e CrUX)
    - Tool: `crux_history`
    - Risposta: L'andamento settimanale con i punti di svolta.

3. **Fai un test PageSpeed su mobile di https://www.esempio.it/ e dimmi le tre correzioni che fanno risparmiare più tempo.**
    - Serve: API key Google (PageSpeed e CrUX)
    - Tool: `psi_analyze`
    - Risposta: Punteggi, metriche e le opportunità ordinate per risparmio.

4. **Confronta i Core Web Vitals reali su mobile e su desktop: dove va peggio?**
    - Serve: API key Google (PageSpeed e CrUX)
    - Tool: `crux_query`
    - Risposta: Le metriche per dispositivo a confronto.

5. **La pagina https://www.esempio.it/categoria/ è più lenta del resto del sito? Confronta pagina e origine.**
    - Serve: API key Google (PageSpeed e CrUX)
    - Tool: `crux_query`
    - Risposta: Metriche della singola pagina contro quelle di tutto il sito.

6. **Il test di laboratorio e i dati reali degli utenti dicono la stessa cosa? Se no, perché?**
    - Serve: API key Google (PageSpeed e CrUX)
    - Tool: `psi_analyze`, `crux_query`
    - Risposta: Le differenze tra laboratorio e campo, spiegate.

---

Questo file è generato da `src/library/domande.ts` con `npm run domande`: modifica lì le domande. In seomcp le stesse domande sono disponibili come risorse MCP (`seomcp://domande`).
