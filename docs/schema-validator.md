# Validatore schema.org

`schema_validate` controlla i dati strutturati JSON-LD di una pagina, oppure del codice incollato **prima di pubblicarlo**. Lavora in locale, senza servizi esterni e senza credenziali.

## I quattro livelli di controllo

| Livello | Cosa verifica | Esempio di segnalazione |
|---|---|---|
| **Sintassi** | JSON valido, `@context` di schema.org, `@type` presente, `@graph`, riferimenti `@id` | "Un blocco contiene JSON non valido ed è ignorato dai motori" |
| **Vocabolario schema.org** | tipi e proprietà esistenti; proprietà ammessa per il tipo, ereditarietà compresa; formato dei valori (date ISO 8601, URL assoluti, valori delle enumerazioni); termini superati; refusi, con la correzione suggerita | "`priceCurency` non esiste. Forse intendevi `priceCurrency`?" |
| **Risultati avanzati di Google** | proprietà obbligatorie e consigliate per articoli, breadcrumb, prodotti, recensioni, organizzazioni, attività locali, eventi, ricette, video, FAQ, app, offerte di lavoro | "Snippet prodotto: manca `review`, `aggregateRating` oppure `offers`" |
| **Coerenza con la pagina** | `dateModified` non precedente a `datePublished`, date nel futuro, domande FAQ visibili nella pagina, headline in linea con l'H1 | "La domanda non compare nel testo visibile: Google richiede che le FAQ siano visibili" |

Ogni segnalazione ha una gravità: **errore** (il dato viene frainteso o ignorato), **avviso** (funziona ma va corretto) oppure **info**. Le segnalazioni identiche ripetute, per esempio in ogni recensione, vengono raggruppate con il numero di occorrenze.

## Il vocabolario

Il vocabolario ufficiale di schema.org è incluso nel pacchetto, in forma compatta. Per questo la validazione funziona offline e dà sempre lo stesso risultato. La versione usata compare in ogni risposta, per esempio `schema.org 30.1`. Per aggiornarla:

```bash
npm run schema:update
```

## I requisiti di Google

Sono trascritti dalla [documentazione ufficiale di Google](https://developers.google.com/search/docs/appearance/structured-data) in `src/core/google-rich-results.ts`, e ogni regola porta il link alla propria fonte. Google li aggiorna periodicamente: se noti una differenza, apri una segnalazione.

Per le pagine già indicizzate, `gsc_inspect_url` restituisce anche il verdetto di Google sui risultati avanzati: i due strumenti si completano.

## Il prompt

`correggi-dati-strutturati` valida la pagina, spiega i problemi e propone il JSON-LD corretto pronto da incollare. Poi lo ricontrolla con il validatore finché non ci sono più errori. Per le proprietà mancanti usa segnaposto come `[URL del logo]` e non inventa dati.

## Limiti

- Valida solo **JSON-LD**, il formato consigliato da Google. Se la pagina usa microdata, lo segnala.
- Non esegue JavaScript: i dati strutturati inseriti via JavaScript non vengono visti. Google li legge, ma molti crawler AI no.
