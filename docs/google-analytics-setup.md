# Configurare Google Analytics 4

> Stessi passaggi con i link diretti e la configurazione già pronta per il tuo assistente: [seomcp.contentisking.guru/credenziali](https://seomcp.contentisking.guru/credenziali/).

seomcp usa le **stesse credenziali Google** di Search Console: service account oppure OAuth. Se hai già configurato Search Console, ti bastano tre passaggi. Altrimenti parti dalla [guida Google](google-setup.md).

L'accesso è **in sola lettura** (scope `analytics.readonly`): seomcp non può modificare nulla in Analytics.

## 1. Abilita le due API di Analytics

Se hai usato il [link di abilitazione](https://console.cloud.google.com/flows/enableapi?apiid=searchconsole.googleapis.com,analyticsdata.googleapis.com,analyticsadmin.googleapis.com,chromeuxreport.googleapis.com,pagespeedonline.googleapis.com) della guida Search Console sono già attive. Altrimenti, nello stesso progetto, abilita:

- **Google Analytics Data API**, per i report;
- **Google Analytics Admin API**, per elencare le proprietà.

## 2. Dai accesso alla proprietà GA4

- **Con il service account:** in [Google Analytics → Amministrazione](https://analytics.google.com/analytics/web/#/?pagename=admin) apri **Amministrazione → Gestione dell'accesso alla proprietà → + → Aggiungi utenti**. Incolla l'email del service account (`...@...iam.gserviceaccount.com`) e scegli il ruolo **Visualizzatore**.
- **Con OAuth:** se avevi autorizzato seomcp prima dell'arrivo di Analytics, ripeti una volta l'autorizzazione, così includi anche Analytics:
  ```bash
  npx -y @contentisking/seomcp auth google
  ```

## 3. Trova l'ID della proprietà

In Google Analytics apri **Amministrazione → Dettagli proprietà**: l'**ID proprietà** è un numero, per esempio `123456789`. Non va confuso con l'ID di misurazione `G-XXXXXXX`.

Aggiungi l'ID alla configurazione del tuo assistente come variabile d'ambiente:

```
SEOMCP_GA_PROPERTY=123456789
```

Non è obbligatorio: senza, basta chiedere all'assistente di usare `ga_list_properties` e indicare la proprietà nella domanda.

## Verifica

```bash
npx -y @contentisking/seomcp doctor
```

Deve comparire una riga `Google Analytics OK` con l'elenco delle proprietà accessibili.
