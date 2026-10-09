# Configurare PageSpeed Insights e Chrome UX Report

> Stessi passaggi con i link diretti e la configurazione già pronta per il tuo assistente: [seomcp.contentisking.guru/credenziali](https://seomcp.contentisking.guru/credenziali/).

Due fonti di dati sulle prestazioni, con una sola **API key** gratuita di Google Cloud:

- **Chrome UX Report (CrUX):** i Core Web Vitals **reali** degli utenti Chrome negli ultimi 28 giorni, con lo storico settimanale. Sono i dati che Google usa per il ranking.
- **PageSpeed Insights:** il test di laboratorio Lighthouse di una pagina, con punteggi e suggerimenti.

I dati sono pubblici e la chiave non dà accesso a nulla del tuo account: non servono il service account né OAuth.

## 1. Crea la chiave

1. Nello stesso progetto di Search Console abilita, se non lo hai già fatto con il [link unico](https://console.cloud.google.com/flows/enableapi?apiid=searchconsole.googleapis.com,analyticsdata.googleapis.com,analyticsadmin.googleapis.com,chromeuxreport.googleapis.com,pagespeedonline.googleapis.com):
   - **Chrome UX Report API**
   - **PageSpeed Insights API**
2. Apri le [credenziali del progetto](https://console.cloud.google.com/apis/credentials) e scegli **Crea credenziali → Chiave API**.
3. Clicca sulla chiave appena creata e, in **Restrizioni API**, scegli **Limita chiave** e seleziona solo le due API qui sopra. Così, se la chiave finisse nelle mani sbagliate, non servirebbe ad altro.

Senza chiave PageSpeed Insights usa una quota condivisa tra tutti, che in pratica è quasi sempre esaurita: la chiave serve anche per quello.

## 2. Aggiungila alla configurazione

Nella configurazione del tuo assistente aggiungi la variabile:

```
SEOMCP_GOOGLE_API_KEY=la-tua-api-key
```

## 3. Verifica

```bash
npx -y @contentisking/seomcp doctor
```

Deve comparire la riga `Chrome UX Report OK`.

## Da sapere

- **CrUX ha dati solo per URL e siti con abbastanza visite da Chrome.** Se una pagina non ne ha, prova con l'origine, cioè tutto il sito: `https://www.tuosito.it`.
- Un test PageSpeed richiede **10-30 secondi**.
- Quote gratuite: 25.000 richieste al giorno per PageSpeed Insights e 150 al minuto per CrUX. Per un uso normale non si raggiungono.
