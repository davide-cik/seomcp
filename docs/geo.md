# GEO e AEO: come misura seomcp

GEO (Generative Engine Optimization) e AEO (Answer Engine Optimization) servono a farsi **trovare e citare dai motori AI**: ChatGPT, Claude, Perplexity, Gemini, AI Overviews di Google e Copilot.

seomcp divide il lavoro in due parti:

- **i tool misurano:** numeri oggettivi, uguali per chiunque li lanci e confrontabili tra pagine e con i concorrenti;
- **i prompt interpretano:** spunti di conversazione che guidano l'assistente a ragionare su quei numeri.

Non servono credenziali: le pagine sono pubbliche.

## La pagina come la vede un crawler AI

I crawler AI (GPTBot, ClaudeBot, PerplexityBot…) **non eseguono JavaScript**: leggono l'HTML che arriva dal server. seomcp fa lo stesso. Se un sito carica i contenuti via JavaScript, per le AI è quasi vuoto, e la metrica `likelyNeedsJavaScript` lo segnala.

## I tool

### `geo_ai_access`: cosa possono leggere le AI

| Misura | Fonte |
|---|---|
| Permesso per ogni bot, con la regola decisiva | `robots.txt`, interpretato secondo lo standard RFC 9309 |
| Bot divisi per scopo | addestramento, ricerca e risposte, lettura su richiesta, motori di ricerca (che alimentano anche AI Overviews e Copilot) |
| Content Signals (`search`, `ai-input`, `ai-train`) | righe `Content-Signal` di Cloudflare in `robots.txt` |
| `llms.txt` e `llms-full.txt` | presenza, titolo, sommario, sezioni, link |
| Riserva TDM | `/.well-known/tdmrep.json`, header e meta `tdm-reservation` (standard europeo per il text and data mining) |
| Direttive della pagina | meta robots, `X-Robots-Tag`, `noai` / `noimageai` |

### `geo_page_metrics`: le misure della pagina

| Area | Misure |
|---|---|
| Leggibilità per le AI | parole nel contenuto e nella pagina, rapporto testo/HTML, segnali di framework JavaScript |
| Meta | title, description, lingua, canonical |
| Struttura | H1, H2 e H3, titoli a domanda, liste, tabelle, paragrafi e loro lunghezza |
| Risposta in apertura | parole del paragrafo introduttivo e del primo paragrafo dopo ogni H2 e H3 |
| Sezioni | numero, parole per sezione, sezioni con dati, liste e tabelle |
| Dati | numeri, percentuali, prezzi, anni, numeri ogni 100 parole |
| Freschezza | `datePublished`, `dateModified`, `Last-Modified`, giorni dall'ultima modifica |
| Autore | autori nello schema (con `url` e `sameAs`), meta author, `rel=author`, firme |
| Fonti | link nel contenuto, domini esterni, fonti istituzionali e di riferimento, `nofollow` |
| Dati strutturati | tipi JSON-LD, proprietà chiave presenti e mancanti, domande `FAQPage`, errori |
| Entità | `Organization` e `Person` con `sameAs` e piattaforme collegate |
| Sito | HTTPS, redirect da http, HSTS, contenuti misti; età, scadenza e registrar del dominio (RDAP, o WHOIS per i `.it`) |

### `geo_page_sections`: il testo, sezione per sezione

Il contenuto principale diviso per titoli, con le misure di ogni sezione. È la materia prima per valutare se la pagina risponde alle domande.

### `geo_entity`: il brand è un'entità riconosciuta?

Cerca il brand su **Wikidata** (pubblica, senza credenziali) e nel **Knowledge Graph di Google** (con la API key di PageSpeed e la Knowledge Graph Search API abilitata): descrizione, tipo di entità, sito ufficiale dichiarato, pagine Wikipedia, profili social. Riconosce l'entità giusta dal sito ufficiale, anche quando ci sono omonimi. Legge poi l'`Organization` nei dati strutturati della home e controlla se i `sameAs` puntano a Wikidata e Wikipedia. Le AI citano più volentieri fonti che sanno attribuire a un'entità chiara.

### `geo_common_crawl`: il sito è nei dati di addestramento?

Interroga l'indice pubblico di **Common Crawl**, l'archivio del web usato per addestrare molti modelli linguistici: per gli ultimi crawl (circa uno al mese) quante pagine del sito ci sono, se c'è la home e con quali risposte. Completa `geo_ai_access`, che dice solo se CCBot è ammesso. L'indice è spesso lento o sovraccarico: ogni crawl riporta il suo esito e un errore non blocca gli altri.

### AEO: farsi scegliere come risposta

`gsc_question_queries` prende da Search Console le query a domanda (come, cosa, perché, quanto, quale, differenza, dove, quando, chi, si può…, anche in inglese) con un filtro regex, e le raggruppa per tipo e per pagina. `aeo_answer_check` prende una pagina e una domanda, trova la sezione che risponde e misura posizione, titolo, prima frase, lunghezza del paragrafo iniziale (gli snippet stanno di solito tra 40 e 60 parole), elenchi, tabelle, numeri, leggibilità e FAQPage nei dati strutturati. `geo_page_sections` riporta l'indice Gulpease, la leggibilità pensata per l'italiano. Il prompt `ottimizza-risposte` combina tutto e scrive i blocchi risposta.

### Le visite dagli assistenti AI

L'ultimo anello della catena è in Google Analytics: `ga_ai_referrals` conta le visite da ChatGPT, Perplexity, Gemini, Copilot, Claude e dagli altri assistenti, con le pagine di destinazione e le conversioni. È una sottostima: le app spesso non passano il referrer e i clic dalle AI Overviews di Google risultano come ricerca organica.

## I prompt

| Prompt | Cosa fa |
|---|---|
| `audit-geo-pagina` | Interpreta le misure e propone le correzioni in ordine di impatto |
| `domande-utenti` | Verifica se la pagina risponde alle query a domanda di Search Console |
| `confronto-concorrenti` | Confronta le misure con quelle dei concorrenti |
| `sito-aperto-alle-ai` | Spiega i permessi AI in chiaro, anche per la normativa europea |
| `passaggio-citabile` | Riscrive una sezione perché sia citabile da sola |
| `piano-editoriale-ai` | Dalle domande senza risposta ricava un piano di contenuti |
| `ottimizza-risposte` | AEO: dalle domande di Search Console ai blocchi risposta pronti da incollare |
| `le-ai-sanno-chi-sono` | Entità su Wikidata e Google, sameAs del sito e presenza in Common Crawl |
| `traffico-dalle-ai` | Visite dagli assistenti AI, accanto ai crawler che leggono il sito |
| `ai-che-leggono-il-sito` | Crawler AI reali (Cloudflare) a confronto con i permessi di robots.txt |

In Claude Code i prompt compaiono come comandi `/mcp__seomcp__...`; in Claude Desktop nel menu `+` della chat.

## Limiti da conoscere

- I **riferimenti** usati dai prompt (per esempio "risposta in apertura di 40-60 parole") sono pratiche diffuse, non regole ufficiali: i motori AI non pubblicano i loro criteri.
- `robots.txt` è una **dichiarazione di intenti**: i bot seri la rispettano, ma non la impone nessuno. Chi vuole bloccare davvero deve farlo anche a livello di server o CDN.
- seomcp **non sa quando vieni citato**: nessun motore AI offre un'API pubblica per saperlo.

## Sicurezza

Le pagine analizzate sono contenuto esterno non affidabile. seomcp le **legge soltanto**, con limiti di 2 MB e 15 secondi e al massimo 5 redirect. Non raggiunge mai indirizzi di rete locale o privati, controllati anche dopo ogni redirect. Il testo restituito all'assistente è marcato come dato, non come istruzioni.
