import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { REGOLE, text } from './geo.js';

/**
 * Prompt sui dati: Search Console, Analytics, Bing e Core Web Vitals.
 * Ogni prompt dice quali tool usare, in che ordine e in che forma restituire il risultato;
 * se una fonte non è configurata l'assistente lo dice e prosegue con quello che ha.
 */

const sito = z.string().optional().describe('Proprietà Search Console (es. sc-domain:esempio.it). Se omessa usa quella predefinita.');
const giorni = z.string().optional().describe('Periodo in giorni, default 28');

const NON_CONFIGURATA = 'Se una fonte non è configurata, chiama seomcp_status, dillo all\'utente in una riga e prosegui con le fonti disponibili.';

export function registerDatiPrompts(server: McpServer): void {
  server.registerPrompt(
    'calo-traffico',
    {
      title: 'Perché sto perdendo traffico?',
      description: 'Trova pagine e query in calo, distingue tra meno impressioni, CTR più basso o posizioni peggiori, e controlla indicizzazione e Core Web Vitals delle pagine colpite.',
      argsSchema: { sito, giorni },
    },
    ({ sito: s, giorni: g }) =>
      text(`Diagnostica il calo di traffico organico${s ? ` della proprietà ${s}` : ''}.

1. Con gsc_compare_periods (ultimi ${g ?? '28'} giorni contro il periodo precedente, poi contro lo stesso periodo dell'anno prima) trova le pagine e le query che perdono più clic.
2. Per le 5 pagine che perdono di più, scomponi il calo con gsc_performance: meno impressioni (domanda o visibilità), CTR più basso (snippet o risultati concorrenti) o posizione peggiore (ranking).
3. Per le stesse pagine controlla gsc_inspect_url (indicizzazione, canonical scelto da Google) e, se disponibile, crux_query (Core Web Vitals reali).
4. Distingui le cause probabili: stagionalità (presente anche l'anno prima), problema tecnico, perdita di posizioni, cambio dei risultati di Google.
5. Chiudi con una tabella: pagina, clic persi, causa probabile, dato che la dimostra, azione consigliata.

${NON_CONFIGURATA}

${REGOLE}`),
  );

  server.registerPrompt(
    'opportunita-distanza-di-tiro',
    {
      title: 'Opportunità a distanza di tiro',
      description: 'Prende le query in posizione 4-20, legge le pagine che si posizionano e propone cosa aggiungere a ciascuna per salire.',
      argsSchema: { sito, giorni: z.string().optional().describe('Periodo in giorni, default 90') },
    },
    ({ sito: s, giorni: g }) =>
      text(`Trova le ottimizzazioni più rapide${s ? ` per la proprietà ${s}` : ''}.

1. Con gsc_striking_distance (ultimi ${g ?? '90'} giorni) prendi le query in posizione 4-20 ordinate per impressioni e raggruppale per pagina.
2. Scegli le 5 pagine con più potenziale (impressioni delle query vicine alla prima pagina).
3. Per ognuna leggi il contenuto con geo_page_sections e verifica se le query trovano una risposta esplicita: nei titoli, nell'apertura, in una sezione dedicata.
4. Per ogni pagina proponi interventi concreti: sezioni da aggiungere o ampliare con il loro titolo H2, domande da coprire, title e description più aderenti alle query.
5. Chiudi con una tabella: pagina, query principali, posizione media, impressioni, intervento, sforzo stimato.

${NON_CONFIGURATA}

${REGOLE}`),
  );

  server.registerPrompt(
    'title-description-ctr',
    {
      title: 'Title e description che non convincono',
      description: 'Trova le pagine con un CTR più basso del normale per la loro posizione e propone title e description riscritti.',
      argsSchema: { sito, giorni },
    },
    ({ sito: s, giorni: g }) =>
      text(`Migliora il CTR da Google${s ? ` per la proprietà ${s}` : ''}.

1. Con gsc_performance (dimensione page, ultimi ${g ?? '28'} giorni, 500 righe) prendi impressioni, clic, CTR e posizione media.
2. Confronta il CTR di ogni pagina con quello tipico della sua posizione (riferimento orientativo: circa 25-30% in prima posizione, 12-15% in seconda, 8-10% in terza, 2-5% tra la quarta e la decima) e scegli le 10 pagine con più impressioni e CTR molto sotto l'atteso.
3. Per ognuna leggi title e description attuali con tech_page_audit e le query principali con gsc_performance (dimensione query, filtro sulla pagina).
4. Proponi un nuovo title (30-60 caratteri, query principale all'inizio) e una nuova description (70-160 caratteri, beneficio concreto e invito all'azione), spiegando in una riga perché funzionerebbe meglio.
5. Chiudi con una tabella: pagina, CTR attuale e atteso, title attuale → proposto, description proposta.

${NON_CONFIGURATA}

${REGOLE}`),
  );

  server.registerPrompt(
    'cannibalizzazione',
    {
      title: 'Pagine in concorrenza tra loro',
      description: 'Trova le query per cui si posizionano più pagine del sito e indica quale tenere come principale e cosa fare delle altre.',
      argsSchema: { sito, giorni: z.string().optional().describe('Periodo in giorni, default 90') },
    },
    ({ sito: s, giorni: g }) =>
      text(`Cerca la cannibalizzazione delle keyword${s ? ` nella proprietà ${s}` : ''}.

1. Con gsc_performance (dimensioni query e page, ultimi ${g ?? '90'} giorni, 5000 righe) trova le query per cui compaiono due o più pagine del sito con impressioni significative.
2. Escludi i casi normali (la home insieme a una pagina interna per una query di brand) e tieni le query con più impressioni.
3. Per ogni caso indica la pagina più forte (clic, posizione, pertinenza) e cosa fare delle altre: unire i contenuti con un redirect 301, differenziarle su un intento diverso, oppure collegarle con link interni verso la principale.
4. Chiudi con una tabella: query, pagine in concorrenza con posizione e clic, pagina da tenere, azione.

${NON_CONFIGURATA}

${REGOLE}`),
  );

  server.registerPrompt(
    'traffico-che-non-converte',
    {
      title: 'Traffico che non converte',
      description: 'Incrocia Search Console e Analytics: pagine con molti clic da Google ma poche conversioni, con ipotesi concrete leggendo la pagina.',
      argsSchema: { sito, giorni },
    },
    ({ sito: s, giorni: g }) =>
      text(`Trova le pagine che portano visite da Google ma non risultati${s ? ` per la proprietà ${s}` : ''}.

1. Con ga_organic_landing_pages (ultimi ${g ?? '28'} giorni) prendi sessioni, coinvolgimento, eventi chiave e ricavi delle pagine di destinazione organiche.
2. Con gsc_performance (dimensione page, stesso periodo) aggiungi clic e query principali di ciascuna pagina.
3. Scegli le 5 pagine con più traffico organico e il tasso di conversione o il coinvolgimento più bassi rispetto alla media del sito.
4. Per ognuna confronta l'intento delle query con il contenuto (geo_page_sections): chi cerca informazioni e trova una pagina di vendita, o il contrario; invito all'azione assente o nascosto; contenuto che non risponde.
5. Chiudi con una tabella: pagina, sessioni, conversioni, query principale, ipotesi, intervento proposto.

${NON_CONFIGURATA}

${REGOLE}`),
  );

  server.registerPrompt(
    'report-mensile',
    {
      title: 'Report mensile per il cliente',
      description: 'Andamento su Google, pagine e query migliori e peggiori, conversioni organiche e tre azioni per il mese successivo, scritto per chi non fa SEO.',
      argsSchema: { sito, mese: z.string().optional().describe('Mese da raccontare, es. "settembre 2026". Default: gli ultimi 28 giorni') },
    },
    ({ sito: s, mese }) =>
      text(`Prepara un report SEO${s ? ` per la proprietà ${s}` : ''} relativo a ${mese ?? 'gli ultimi 28 giorni'}, da inviare a un cliente che non conosce la SEO.

1. Con gsc_compare_periods confronta il periodo con quello precedente e con lo stesso periodo dell'anno prima: clic, impressioni, CTR, posizione media.
2. Con gsc_performance trova le 5 query e le 5 pagine che crescono e quelle che calano di più.
3. Se Analytics è configurato, con ga_compare_periods e ga_organic_landing_pages aggiungi sessioni organiche, eventi chiave e ricavi.
4. Scrivi il report così: tre righe di sintesi in apertura; un paragrafo "Cosa è andato bene"; un paragrafo "Cosa tenere d'occhio"; una tabella con i numeri principali e la variazione; tre azioni per il mese successivo con il beneficio atteso.
5. Usa frasi brevi, niente gergo (se serve un termine tecnico spiegalo in parentesi) e numeri arrotondati.

${NON_CONFIGURATA}

${REGOLE}`),
  );

  server.registerPrompt(
    'piano-core-web-vitals',
    {
      title: 'Piano per i Core Web Vitals',
      description: 'Dati reali degli utenti e andamento, poi il test di laboratorio sulle pagine peggiori, con le correzioni ordinate per risparmio.',
      argsSchema: { url: z.string().describe('Il sito (origine) o una pagina, es. https://www.esempio.it') },
    },
    ({ url }) =>
      text(`Prepara un piano per migliorare i Core Web Vitals di ${url}.

1. Con crux_query (mobile e desktop) leggi LCP, INP e CLS reali al 75° percentile con il giudizio; con crux_history guarda l'andamento delle ultime settimane.
2. Individua la metrica peggiore e il dispositivo su cui va peggio.
3. Con psi_analyze (mobile) testa la pagina e, se è un sito, anche 2-3 pagine tipo (una scheda, un articolo, una categoria), e raccogli le opportunità con il risparmio stimato.
4. Spiega la differenza tra dati reali (quelli che Google usa per il ranking) e test di laboratorio, se i due non coincidono.
5. Chiudi con un piano in ordine di impatto: intervento, metrica che migliora, risparmio stimato, difficoltà (bassa/media/alta), chi se ne occupa (sviluppatore, grafico, hosting).

Riferimenti: LCP buono sotto 2,5 s, INP sotto 200 ms, CLS sotto 0,1.

${NON_CONFIGURATA}

${REGOLE}`),
  );

  server.registerPrompt(
    'controllo-migrazione',
    {
      title: 'Controllo dopo una migrazione',
      description: 'Dopo un cambio di dominio, di piattaforma o di URL: redirect, canonical, sitemap e indicizzazione delle pagine chiave, più il traffico prima e dopo.',
      argsSchema: {
        url: z.string().describe('La home del sito nuovo'),
        data: z.string().optional().describe('Data della migrazione, es. 2026-09-15'),
      },
    },
    ({ url, data }) =>
      text(`Controlla la migrazione del sito ${url}${data ? `, avvenuta il ${data}` : ''}.

1. Con tech_site_check verifica sitemap, campione di URL, pagina 404 e link interni rotti o reindirizzati.
2. Con gsc_performance individua le 10 pagine che portavano più clic prima della migrazione; per ognuna verifica con tech_page_audit la catena di redirect (un solo salto permanente verso la pagina giusta) e il canonical.
3. Con gsc_inspect_url controlla che le nuove pagine siano indicizzate e che Google scelga il canonical giusto.
4. Con gsc_compare_periods confronta clic e impressioni prima e dopo${data ? ` il ${data}` : ' la migrazione'}, separando le pagine migrate bene da quelle che hanno perso.
   Se Bing è configurato, con bing_crawl controlla anche come Bing scansiona il sito nuovo: redirect, errori 4xx e 5xx, pagine nell'indice.
5. Chiudi con una checklist: cosa è a posto, cosa correggere subito (redirect mancanti o a catena, canonical sbagliati, sitemap con vecchi URL, pagine non indicizzate), cosa monitorare nelle prossime settimane.

${NON_CONFIGURATA}

${REGOLE}`),
  );

  server.registerPrompt(
    'google-vs-bing',
    {
      title: 'Google e Bing a confronto',
      description: 'Query e pagine dove i due motori divergono, con i volumi di ricerca di Bing: dove recuperare traffico e perché Bing conta anche per le AI.',
      argsSchema: { sito, giorni },
    },
    ({ sito: s, giorni: g }) =>
      text(`Confronta la visibilità su Google e su Bing${s ? ` per la proprietà ${s}` : ''} negli ultimi ${g ?? '28'} giorni.

1. Con gsc_performance (dimensione query, 500 righe) e bing_query_stats prendi impressioni, clic e posizione per query sui due motori.
2. Trova le query dove la differenza è più forte: buone su Google e deboli su Bing, e il contrario.
3. Fai lo stesso per le pagine con gsc_performance (dimensione page) e bing_page_stats.
4. Per le 5 query più promettenti su Bing controlla i volumi con bing_keyword_stats.
5. Spiega le cause possibili delle differenze (indicizzazione su Bing, sitemap inviata, segnali diversi) e ricorda che le ricerche Bing alimentano Copilot e altri assistenti AI.
6. Chiudi con una tabella: query o pagina, dati Google, dati Bing, azione.

${NON_CONFIGURATA}

${REGOLE}`),
  );

  server.registerPrompt(
    'ai-che-leggono-il-sito',
    {
      title: 'Quali AI leggono davvero il mio sito?',
      description: 'Confronta i crawler AI che passano davvero sul sito (dati di Cloudflare) con quelli ammessi da robots.txt: chi legge cosa, chi è bloccato, quali pagine interessano ai motori AI.',
      argsSchema: { url: z.string().describe('Il sito, es. https://www.esempio.it'), giorni: z.string().optional().describe('Periodo in giorni, fino a 28, default 28') },
    },
    ({ url, giorni: g }) =>
      text(`Scopri quali motori AI leggono davvero ${url}.

1. Con cf_ai_crawlers (ultimi ${g ?? '28'} giorni) prendi i crawler AI che hanno visitato il sito: richieste, giorni attivi, pagine più lette, stati di risposta.
2. Con geo_ai_access leggi cosa permette robots.txt a ciascun bot, divisi tra addestramento, ricerca e risposte, lettura su richiesta.
3. Incrocia i due dati in una tabella: bot, azienda, scopo, permesso da robots.txt (sì/no), visite reali, pagine più lette.
4. Segnala le incoerenze: bot bloccati che passano comunque (robots.txt non rispettato, o user-agent falsificato), bot permessi che non passano mai, bot di risposta (OAI-SearchBot, PerplexityBot, ChatGPT-User…) che ricevono errori 403/404/5xx.
5. Indica quali pagine interessano di più ai motori AI e se sono quelle che il sito vorrebbe far citare; chiudi con 3 azioni.

Se Cloudflare non è configurato, usa solo geo_ai_access, spiega che senza i dati di traffico si vede solo cosa è permesso, e indica seomcp_status per attivarlo.

${REGOLE}`),
  );

  server.registerPrompt(
    'traffico-dalle-ai',
    {
      title: 'Quanto traffico mi portano le AI?',
      description: 'Visite da ChatGPT, Perplexity, Gemini, Copilot e dagli altri assistenti AI: quante sono, se crescono, su quali pagine arrivano e se convertono, messe accanto ai crawler AI che leggono il sito.',
      argsSchema: { url: z.string().optional().describe('Il sito, es. https://www.esempio.it (per leggere le pagine e i crawler)'), giorni: z.string().optional().describe('Periodo in giorni, default 28') },
    },
    ({ url, giorni: g }) =>
      text(`Misura il traffico che gli assistenti AI portano${url ? ` a ${url}` : ' al sito'}.

1. Con ga_ai_referrals (ultimi ${g ?? '28'} giorni, confronto con il periodo precedente) prendi le visite per assistente: sessioni, variazione, coinvolgimento, eventi chiave, ricavi, e la quota sul traffico totale.
2. Confronta la qualità con il resto del traffico: con ga_report (dimensione sessionDefaultChannelGroup, metriche sessions, engagementRate, sessionKeyEventRate) prendi i valori della ricerca organica e dici se chi arriva dalle AI è più o meno coinvolto e se converte di più o di meno.
3. Elenca le pagine di destinazione più visitate dalle AI: sono le pagine che gli assistenti citano. Per le prime 3 leggi con geo_page_metrics cosa le rende citabili (risposta in apertura, dati, fonti, struttura).
4. Se Cloudflare è configurato, con cf_ai_crawlers metti accanto i crawler degli stessi assistenti (GPTBot, OAI-SearchBot, ChatGPT-User, PerplexityBot…): pagine molto lette dai crawler ma senza visite, o assistenti che passano ma non portano traffico.
5. Chiudi con una tabella per assistente (sessioni, variazione, coinvolgimento, conversioni, pagine principali) e 3 azioni per aumentare le citazioni, partendo dalle pagine che funzionano già.

Ricorda all'utente che il dato è una sottostima: le app degli assistenti spesso non passano il referrer e i clic dalle AI Overviews di Google risultano come ricerca organica.

${NON_CONFIGURATA}

${REGOLE}`),
  );
}
