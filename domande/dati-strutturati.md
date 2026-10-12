# Dati strutturati

JSON-LD validato con il vocabolario ufficiale di schema.org e i requisiti di Google per i risultati avanzati.

1. **Valida i dati strutturati di https://www.esempio.it/prodotto/ e dammi il JSON-LD corretto, pronto da incollare.**
    - Serve: nessuna credenziale
    - Tool: `schema_validate`
    - Risposta: Errori spiegati e il JSON-LD corretto, ricontrollato.

2. **Questo JSON-LD è corretto prima che lo pubblichi? [incolla qui il codice]**
    - Serve: nessuna credenziale
    - Tool: `schema_validate`
    - Risposta: Errori e avvisi sul codice incollato, senza bisogno di una pagina.

3. **Le schede prodotto hanno tutti i campi per comparire con prezzo e disponibilità nei risultati di Google?**
    - Serve: nessuna credenziale
    - Tool: `schema_validate`
    - Risposta: Campi obbligatori e consigliati mancanti per i risultati avanzati dei prodotti.

4. **I dati strutturati dicono le stesse cose della pagina? Prezzo, autore, date e valutazioni coincidono con il testo?**
    - Serve: nessuna credenziale
    - Tool: `schema_validate`
    - Risposta: Le incoerenze tra JSON-LD e contenuto visibile.

5. **Quali risultati avanzati potrei ottenere su https://www.esempio.it/ con i dati strutturati che ho già, e quali aggiungeresti?**
    - Serve: nessuna credenziale
    - Tool: `schema_validate`
    - Risposta: Risultati avanzati già idonei e quelli raggiungibili con poche aggiunte.

6. **Google rileva i risultati avanzati su https://www.esempio.it/ricetta/? Confronta con quello che dichiara la pagina.**
    - Serve: Search Console
    - Tool: `gsc_inspect_url`, `schema_validate`
    - Risposta: Risultati avanzati secondo Google e secondo il validatore, a confronto.

7. **L'Organization nel JSON-LD della home di https://www.esempio.it ha i sameAs giusti verso Wikidata, Wikipedia e i profili social? Scrivimi quello corretto.**
    - Serve: nessuna credenziale
    - Tool: `geo_entity`, `schema_validate`
    - Risposta: I sameAs mancanti o sbagliati e il JSON-LD corretto, pronto da incollare.

8. **Scrivimi il JSON-LD FAQPage per https://www.esempio.it/servizio/ usando solo domande e risposte già presenti nella pagina, e validalo.**
    - Serve: nessuna credenziale
    - Tool: `geo_page_sections`, `schema_validate`
    - Risposta: Il codice pronto e validato, con la nota che Google mostra le FAQ come risultato avanzato solo per pochi siti.

9. **La pagina dell'evento https://www.esempio.it/evento/ ha tutti i campi richiesti da Google: data, luogo, stato e biglietti?**
    - Serve: nessuna credenziale
    - Tool: `schema_validate`
    - Risposta: I campi obbligatori e consigliati per l'evento, con quelli mancanti.

10. **Per un'attività locale: il JSON-LD LocalBusiness della home ha indirizzo, telefono, orari e coordinate coerenti con la pagina?**
    - Serve: nessuna credenziale
    - Tool: `schema_validate`
    - Risposta: I dati dell'attività controllati e il JSON-LD corretto.

---

Questo file è generato da `src/library/domande.ts` con `npm run domande`: modifica lì le domande. In seomcp le stesse domande sono disponibili come risorse MCP (`seomcp://domande`).
