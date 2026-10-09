/**
 * Archivio di domande pronte: spunti di conversazione da copiare nell'assistente.
 * È la fonte unica per le risorse MCP (seomcp://domande/...) e per i file Markdown
 * in domande/ sul repository (scripts/build-domande.mjs). Ogni domanda usa solo
 * tool che esistono: lo verifica tests/domande.test.ts.
 */

/** Cosa serve per far funzionare la domanda. */
export type Fonte = 'nessuna' | 'search-console' | 'analytics' | 'bing' | 'api-key';

export interface Domanda {
  testo: string;
  fonti: Fonte[];
  tool: string[];
  /** Cosa aspettarsi dalla risposta, in una riga. */
  risposta: string;
}

export interface Tema {
  slug: string;
  titolo: string;
  intro: string;
  domande: Domanda[];
}

export const FONTI: Record<Fonte, string> = {
  nessuna: 'nessuna credenziale',
  'search-console': 'Search Console',
  analytics: 'Google Analytics 4',
  bing: 'Bing Webmaster Tools',
  'api-key': 'API key Google (PageSpeed e CrUX)',
};

const q = (testo: string, fonti: Fonte[], tool: string[], risposta: string): Domanda => ({ testo, fonti, tool, risposta });

export const TEMI: Tema[] = [
  {
    slug: 'primi-passi',
    titolo: 'Primi passi, senza credenziali',
    intro: 'Funzionano appena installato seomcp: leggono solo pagine pubbliche. Sostituisci esempio.it con il tuo sito.',
    domande: [
      q('Cosa è configurato in seomcp e cosa mi manca per usare tutte le fonti?', ['nessuna'], ['seomcp_status'], 'Lo stato di ogni fonte e i passaggi per attivare quelle spente.'),
      q('Il sito https://www.esempio.it è aperto ai crawler AI? Dimmi quali bot può leggerlo e quali sono bloccati, e per quale regola.', ['nessuna'], ['geo_ai_access'], 'Bot per bot, divisi tra addestramento e risposte, con la regola di robots.txt che decide.'),
      q('Fai un controllo tecnico della home di https://www.esempio.it e dimmi le tre cose da sistemare per prime.', ['nessuna'], ['tech_page_audit'], 'Redirect, indicizzabilità, canonical, meta e titoli, con le correzioni in ordine di priorità.'),
      q('I dati strutturati della home di https://www.esempio.it sono validi? Sono idonei ai risultati avanzati di Google?', ['nessuna'], ['schema_validate'], 'Errori, avvisi e quali risultati avanzati sono possibili.'),
      q('Leggi https://www.esempio.it/guida/ come la vede un crawler AI: c\'è una risposta chiara in apertura? Quanto è citabile?', ['nessuna'], ['geo_page_metrics'], 'Le misure della pagina con un giudizio su risposta in apertura, sezioni, fonti e autore.'),
      q('La sitemap di https://www.esempio.it contiene pagine reindirizzate o in errore? La pagina 404 è configurata bene?', ['nessuna'], ['tech_site_check'], 'Un campione di URL della sitemap con il loro stato, più la verifica della pagina 404.'),
      q('Da quanto tempo esiste il dominio esempio.it e il passaggio da http a https è fatto bene?', ['nessuna'], ['geo_page_metrics'], 'Età del dominio, scadenza e catena di redirect da http.'),
    ],
  },
  {
    slug: 'traffico',
    titolo: 'Traffico e andamento',
    intro: 'Come va il sito su Google: clic, impressioni, posizioni e confronti tra periodi.',
    domande: [
      q('Come è andato il sito negli ultimi 28 giorni rispetto ai 28 precedenti? Dammi i totali e le 10 query che calano di più.', ['search-console'], ['gsc_compare_periods'], 'Totali a confronto e l\'elenco dei cali più forti.'),
      q('Confronta questo mese con lo stesso periodo dell\'anno scorso e segnala le pagine che hanno perso più del 30% dei clic.', ['search-console'], ['gsc_compare_periods'], 'Le pagine in calo rispetto all\'anno prima, con la variazione percentuale.'),
      q('Mostrami l\'andamento giorno per giorno dei clic negli ultimi 90 giorni e dimmi se ci sono cali improvvisi.', ['search-console'], ['gsc_performance'], 'La serie giornaliera e i giorni anomali da indagare.'),
      q('Da quali paesi e da quali dispositivi arrivano i clic? Qualcosa è cambiato negli ultimi tre mesi?', ['search-console'], ['gsc_performance', 'gsc_compare_periods'], 'Ripartizione per paese e dispositivo, con le differenze tra periodi.'),
      q('Quali sono le 20 pagine con più clic da Google e qual è la loro posizione media?', ['search-console'], ['gsc_performance'], 'Classifica delle pagine con clic, impressioni, CTR e posizione.'),
      q('Quanto traffico arriva da Google Immagini e da Discover, e su quali pagine?', ['search-console'], ['gsc_performance'], 'I dati per tipo di ricerca immagini e Discover, pagina per pagina.'),
      q('Quanta parte dei clic viene dal brand? Separa le query che contengono il nome del sito da tutte le altre.', ['search-console'], ['gsc_performance'], 'Clic e impressioni di brand e non brand, con le quote.'),
      q('Il calo di clic delle ultime settimane dipende da meno impressioni, da un CTR più basso o da posizioni peggiori?', ['search-console'], ['gsc_compare_periods', 'gsc_performance'], 'Una diagnosi del calo scomposta tra impressioni, CTR e posizione.'),
    ],
  },
  {
    slug: 'opportunita',
    titolo: 'Opportunità SEO',
    intro: 'Dove si guadagna di più con meno lavoro: query vicine alla prima pagina, CTR bassi, pagine in concorrenza tra loro.',
    domande: [
      q('Quali query sono in posizione 4-20 negli ultimi 90 giorni? Dammi le 10 con più potenziale e la pagina da ottimizzare per ciascuna.', ['search-console'], ['gsc_striking_distance'], 'Query a distanza di tiro ordinate per impressioni, con la pagina che si posiziona.'),
      q('Quali pagine hanno molte impressioni ma un CTR molto più basso della media per la loro posizione? Proponi title e description migliori.', ['search-console'], ['gsc_performance'], 'Le pagine con CTR sotto le attese e proposte di title e description.'),
      q('Ci sono query per cui si posizionano più pagine del sito, in concorrenza tra loro?', ['search-console'], ['gsc_performance'], 'Le query con più pagine in classifica e quale pagina tenere come principale.'),
      q('Quali domande (chi, come, perché, quanto) portano impressioni al sito ma pochi clic?', ['search-console'], ['gsc_performance'], 'Le query a domanda con poco CTR, spunti per nuove sezioni o FAQ.'),
      q('Nella cartella /blog/, quali articoli sono quasi in prima pagina e cosa aggiungeresti a ciascuno?', ['search-console'], ['gsc_striking_distance', 'geo_page_sections'], 'Gli articoli vicini alla prima pagina, con le sezioni da ampliare.'),
      q('Quali query nuove sono comparse negli ultimi 28 giorni rispetto al periodo precedente?', ['search-console'], ['gsc_compare_periods'], 'Le query in crescita o nuove, segnali di temi emergenti.'),
      q('Prendi le 5 pagine che hanno perso più clic quest\'anno: leggile e dimmi cosa è invecchiato nei contenuti.', ['search-console'], ['gsc_compare_periods', 'geo_page_sections'], 'Per ogni pagina in calo, cosa aggiornare nel testo.'),
      q('Su Bing quanto viene cercata la keyword "scarpe da trekking" in Italia, e il mio sito per quali query simili compare già su Google?', ['bing', 'search-console'], ['bing_keyword_stats', 'gsc_performance'], 'Volume della keyword su Bing e le query correlate già presenti su Google.'),
    ],
  },
  {
    slug: 'indicizzazione',
    titolo: 'Indicizzazione e controlli tecnici',
    intro: 'Se Google vede e indicizza le pagine giuste, e cosa lo impedisce.',
    domande: [
      q('La pagina https://www.esempio.it/prodotto/ è indicizzata? Quale canonical ha scelto Google e quando l\'ha scansionata l\'ultima volta?', ['search-console'], ['gsc_inspect_url'], 'Stato di indicizzazione, canonical di Google e data dell\'ultima scansione.'),
      q('Le sitemap inviate hanno errori o avvisi? Quando le ha scaricate Google l\'ultima volta?', ['search-console'], ['gsc_list_sitemaps'], 'Elenco delle sitemap con date, URL inviati, errori e avvisi.'),
      q('Fai un audit tecnico di https://www.esempio.it: redirect, sitemap, pagina 404 e link interni rotti, con le correzioni in ordine di urgenza.', ['nessuna'], ['tech_page_audit', 'tech_site_check'], 'Un elenco di problemi tecnici ordinato per impatto.'),
      q('La versione http e quella senza www arrivano alla home con un solo redirect permanente?', ['nessuna'], ['tech_page_audit'], 'La catena di redirect passo per passo, con il tipo di ogni redirect.'),
      q('Il canonical di https://www.esempio.it/categoria/ punta a una pagina che funziona? E Google lo rispetta?', ['nessuna', 'search-console'], ['tech_page_audit', 'gsc_inspect_url'], 'Canonical dichiarato, sua risposta e canonical scelto da Google.'),
      q('Gli hreflang di https://www.esempio.it/ sono corretti? Le versioni nelle altre lingue rimandano a questa pagina?', ['nessuna'], ['tech_page_audit'], 'Codici lingua, x-default, autoreferenza e link di ritorno a campione.'),
      q('Controlla una per una la home e le 5 pagine principali: ci sono noindex nascosti, title mancanti o description troppo lunghe?', ['nessuna'], ['tech_page_audit'], 'Per ogni pagina, i problemi di indicizzabilità e di meta.'),
      q('Quali header di sicurezza mancano sul sito e quanto pesano le pagine principali?', ['nessuna'], ['tech_page_audit'], 'Header di sicurezza presenti e mancanti, peso e compressione delle pagine.'),
    ],
  },
  {
    slug: 'geo-aeo',
    titolo: 'GEO e AEO: farsi citare dalle AI',
    intro: 'Come leggono il sito ChatGPT, Perplexity, Gemini e le AI Overviews, e come rendere le pagine più citabili.',
    domande: [
      q('Perché ChatGPT cita la pagina del mio concorrente https://www.concorrente.it/guida/ e non la mia https://www.esempio.it/guida/? Confronta le due pagine.', ['nessuna'], ['geo_page_metrics'], 'Le differenze misurabili tra le due pagine che contano per la citabilità.'),
      q('Riscrivi la sezione "Quanto costa" di https://www.esempio.it/servizio/ perché un assistente AI possa citarla da sola.', ['nessuna'], ['geo_page_sections'], 'La sezione riscritta, autonoma e con una risposta diretta.'),
      q('Il mio robots.txt blocca i bot che servono per comparire nelle risposte delle AI, oltre a quelli di addestramento?', ['nessuna'], ['geo_ai_access'], 'Quali bot di risposta sono bloccati, distinti da quelli di addestramento.'),
      q('Ho un llms.txt? È fatto bene? Se manca, scrivimene uno per il mio sito.', ['nessuna'], ['geo_ai_access'], 'Stato del file llms.txt e una proposta pronta da pubblicare.'),
      q('Analizza https://www.esempio.it/guida/ sezione per sezione: quali sezioni sono troppo lunghe, senza dati o senza fonti?', ['nessuna'], ['geo_page_sections'], 'Le misure di ogni sezione con le correzioni da fare.'),
      q('Quali domande fanno le persone che arrivano su https://www.esempio.it/guida/, e a quali la pagina non risponde?', ['search-console'], ['gsc_performance', 'geo_page_sections'], 'Le query a domanda della pagina, divise tra coperte e scoperte.'),
      q('Fammi un piano editoriale con le domande degli utenti a cui il sito non risponde ancora.', ['search-console'], ['gsc_performance', 'geo_page_sections'], 'Nuove sezioni, FAQ e pagine da scrivere, in ordine di priorità.'),
      q('La pagina ha un autore riconoscibile, una data di aggiornamento recente e dati strutturati coerenti con il testo?', ['nessuna'], ['geo_page_metrics', 'schema_validate'], 'Segnali di autorevolezza e freschezza, con cosa manca.'),
      q('Il sito usa Content Signals o la riserva TDM europea? Cosa comporta per l\'uso dei contenuti da parte delle AI?', ['nessuna'], ['geo_ai_access'], 'Le preferenze dichiarate sul sito e cosa significano.'),
    ],
  },
  {
    slug: 'dati-strutturati',
    titolo: 'Dati strutturati',
    intro: 'JSON-LD validato con il vocabolario ufficiale di schema.org e i requisiti di Google per i risultati avanzati.',
    domande: [
      q('Valida i dati strutturati di https://www.esempio.it/prodotto/ e dammi il JSON-LD corretto, pronto da incollare.', ['nessuna'], ['schema_validate'], 'Errori spiegati e il JSON-LD corretto, ricontrollato.'),
      q('Questo JSON-LD è corretto prima che lo pubblichi? [incolla qui il codice]', ['nessuna'], ['schema_validate'], 'Errori e avvisi sul codice incollato, senza bisogno di una pagina.'),
      q('Le schede prodotto hanno tutti i campi per comparire con prezzo e disponibilità nei risultati di Google?', ['nessuna'], ['schema_validate'], 'Campi obbligatori e consigliati mancanti per i risultati avanzati dei prodotti.'),
      q('I dati strutturati dicono le stesse cose della pagina? Prezzo, autore, date e valutazioni coincidono con il testo?', ['nessuna'], ['schema_validate'], 'Le incoerenze tra JSON-LD e contenuto visibile.'),
      q('Quali risultati avanzati potrei ottenere su https://www.esempio.it/ con i dati strutturati che ho già, e quali aggiungeresti?', ['nessuna'], ['schema_validate'], 'Risultati avanzati già idonei e quelli raggiungibili con poche aggiunte.'),
      q('Google rileva i risultati avanzati su https://www.esempio.it/ricetta/? Confronta con quello che dichiara la pagina.', ['search-console', 'nessuna'], ['gsc_inspect_url', 'schema_validate'], 'Risultati avanzati secondo Google e secondo il validatore, a confronto.'),
    ],
  },
  {
    slug: 'prestazioni',
    titolo: 'Prestazioni e Core Web Vitals',
    intro: 'Dati reali degli utenti Chrome (quelli che Google usa per il ranking) e test di laboratorio con i suggerimenti.',
    domande: [
      q('Il sito supera i Core Web Vitals su mobile? Dammi LCP, INP e CLS con il giudizio.', ['api-key'], ['crux_query'], 'I valori reali al 75° percentile con il giudizio buono, da migliorare o scarso.'),
      q('Com\'è cambiato l\'LCP del sito nelle ultime 25 settimane? C\'è stato un peggioramento?', ['api-key'], ['crux_history'], 'L\'andamento settimanale con i punti di svolta.'),
      q('Fai un test PageSpeed su mobile di https://www.esempio.it/ e dimmi le tre correzioni che fanno risparmiare più tempo.', ['api-key'], ['psi_analyze'], 'Punteggi, metriche e le opportunità ordinate per risparmio.'),
      q('Confronta i Core Web Vitals reali su mobile e su desktop: dove va peggio?', ['api-key'], ['crux_query'], 'Le metriche per dispositivo a confronto.'),
      q('La pagina https://www.esempio.it/categoria/ è più lenta del resto del sito? Confronta pagina e origine.', ['api-key'], ['crux_query'], 'Metriche della singola pagina contro quelle di tutto il sito.'),
      q('Il test di laboratorio e i dati reali degli utenti dicono la stessa cosa? Se no, perché?', ['api-key'], ['psi_analyze', 'crux_query'], 'Le differenze tra laboratorio e campo, spiegate.'),
    ],
  },
  {
    slug: 'analytics',
    titolo: 'Analytics e conversioni',
    intro: 'Cosa fanno le persone dopo aver cliccato: sessioni, coinvolgimento, eventi chiave e ricavi.',
    domande: [
      q('Quali pagine ricevono molti clic da Google ma convertono poco?', ['search-console', 'analytics'], ['gsc_performance', 'ga_organic_landing_pages'], 'Le pagine con traffico organico alto e conversioni basse.'),
      q('Quali pagine di destinazione della ricerca organica portano più ricavi negli ultimi 90 giorni?', ['analytics'], ['ga_organic_landing_pages'], 'Classifica delle pagine organiche per ricavi ed eventi chiave.'),
      q('Il traffico organico è cresciuto o calato rispetto all\'anno scorso? E le conversioni?', ['analytics'], ['ga_compare_periods'], 'Variazioni di sessioni e conversioni organiche, con le pagine che pesano di più.'),
      q('Quanto traffico organico arriva da Bing rispetto a Google, e converte allo stesso modo?', ['analytics'], ['ga_organic_landing_pages'], 'Sessioni e conversioni per motore di ricerca a confronto.'),
      q('Quante persone sono sul sito in questo momento e su quali pagine?', ['analytics'], ['ga_realtime'], 'Utenti attivi negli ultimi 30 minuti, per pagina.'),
      q('Dividi le sessioni per canale (organico, diretto, social, referral) e dimmi quale cresce di più.', ['analytics'], ['ga_report', 'ga_compare_periods'], 'Sessioni per canale con la variazione rispetto al periodo precedente.'),
      q('Quali pagine organiche hanno un tasso di coinvolgimento basso? Leggile e dimmi perché le persone se ne vanno.', ['analytics', 'nessuna'], ['ga_organic_landing_pages', 'geo_page_sections'], 'Le pagine poco coinvolgenti con ipotesi concrete sul testo.'),
    ],
  },
  {
    slug: 'bing',
    titolo: 'Bing',
    intro: 'Bing conta anche per le AI: le sue ricerche alimentano Copilot e altri assistenti.',
    domande: [
      q('Su Bing come va la query "corso SEO" rispetto a Google?', ['bing', 'search-console'], ['bing_query_stats', 'gsc_performance'], 'Impressioni, clic e posizione sui due motori a confronto.'),
      q('Quali sono le pagine con più clic su Bing negli ultimi tre mesi?', ['bing'], ['bing_page_stats'], 'Classifica delle pagine su Bing.'),
      q('Ci sono query per cui vado bene su Google ma non su Bing, o il contrario?', ['bing', 'search-console'], ['bing_query_stats', 'gsc_performance'], 'Le query con le differenze più forti tra i due motori.'),
      q('Quanto vengono cercate queste keyword su Bing in Italia: "noleggio auto", "noleggio auto lungo termine", "noleggio furgoni"?', ['bing'], ['bing_keyword_stats'], 'Volumi di ricerca storici per ciascuna keyword.'),
      q('Quanto vale la keyword "hotel firenze" in Spagna su Bing?', ['bing'], ['bing_keyword_stats'], 'Il volume nel mercato indicato invece di quello predefinito.'),
    ],
  },
  {
    slug: 'report',
    titolo: 'Report e analisi a più passaggi',
    intro: 'Domande lunghe che combinano più fonti: utili per un cliente, per il capo o per la riunione del lunedì.',
    domande: [
      q('Preparami un report mensile per il cliente: andamento su Google, pagine e query migliori e peggiori, conversioni organiche, tre azioni per il mese prossimo. Scrivilo in modo comprensibile per chi non fa SEO.', ['search-console', 'analytics'], ['gsc_compare_periods', 'gsc_performance', 'ga_organic_landing_pages'], 'Un report pronto da inviare, con numeri e azioni.'),
      q('Fai un check-up completo di https://www.esempio.it: tecnico, dati strutturati, prestazioni e accesso delle AI. Chiudi con una tabella di interventi ordinata per impatto e fatica.', ['nessuna', 'api-key'], ['tech_page_audit', 'tech_site_check', 'schema_validate', 'psi_analyze', 'geo_ai_access'], 'Una tabella di interventi con priorità.'),
      q('Confronta, poi approfondisci: trova le 3 pagine che calano di più su Google, leggile, controlla i loro Core Web Vitals e proponi cosa cambiare in ciascuna.', ['search-console', 'nessuna', 'api-key'], ['gsc_compare_periods', 'geo_page_sections', 'crux_query'], 'Per ogni pagina in calo, una diagnosi e le modifiche.'),
      q('Sto per pubblicare una nuova pagina su https://www.esempio.it/nuova/: controllala prima del lancio (tecnico, dati strutturati, citabilità) e dammi una checklist.', ['nessuna'], ['tech_page_audit', 'schema_validate', 'geo_page_metrics'], 'Una checklist di pubblicazione con quello che manca.'),
      q('Ho appena fatto la migrazione del sito: controlla redirect, canonical, sitemap e indicizzazione delle 5 pagine più importanti, e confronta il traffico prima e dopo.', ['search-console', 'nessuna'], ['tech_page_audit', 'tech_site_check', 'gsc_inspect_url', 'gsc_compare_periods'], 'Un controllo post migrazione con i problemi trovati e l\'effetto sul traffico.'),
      q('Scegli le 10 query con più potenziale, verifica su Bing quanto sono cercate e dimmi quali contenuti scrivere o aggiornare per prime.', ['search-console', 'bing'], ['gsc_striking_distance', 'bing_keyword_stats'], 'Una lista di contenuti ordinata per potenziale.'),
      q('Riassumi in 5 righe come sta andando il sito questa settimana rispetto alla precedente, per un messaggio al team.', ['search-console', 'analytics'], ['gsc_compare_periods', 'ga_compare_periods'], 'Un breve aggiornamento con i numeri essenziali.'),
    ],
  },
];

/** Tutte le domande, nell'ordine dei temi. */
export const TUTTE = TEMI.flatMap((t) => t.domande);

/** Le fonti necessarie; "nessuna credenziale" solo se non ne serve altra. */
export const fontiText = (d: Domanda) => {
  const servono = d.fonti.filter((f) => f !== 'nessuna');
  return servono.length ? servono.map((f) => FONTI[f]).join(' + ') : FONTI.nessuna;
};

/** Il tema in Markdown: è il contenuto della risorsa MCP e del file su GitHub. */
export function temaMarkdown(t: Tema): string {
  const righe = t.domande.map(
    (d, i) => `${i + 1}. **${d.testo}**\n    - Serve: ${fontiText(d)}\n    - Tool: ${d.tool.map((x) => `\`${x}\``).join(', ')}\n    - Risposta: ${d.risposta}`,
  );
  return `# ${t.titolo}\n\n${t.intro}\n\n${righe.join('\n\n')}\n`;
}

/** L'indice dell'archivio, con un link per tema. */
export function indiceMarkdown(link: (t: Tema) => string): string {
  const temi = TEMI.map((t) => `- [${t.titolo}](${link(t)}) — ${t.domande.length} domande`).join('\n');
  const senza = TUTTE.filter((d) => fontiText(d) === FONTI.nessuna).length;
  return `# Domande pronte per seomcp

${TUTTE.length} spunti di conversazione da copiare nel tuo assistente, divisi per tema. ${senza} funzionano senza nessuna credenziale.
Ogni domanda indica cosa serve (Search Console, Analytics, Bing o la API key Google) e quali tool usa: se una fonte non è configurata, chiedi all'assistente di eseguire \`seomcp_status\`.

${temi}

Sostituisci esempio.it con il tuo sito. Le domande sono un punto di partenza: chiedi pure di approfondire, confrontare o riscrivere.
`;
}
