# seomcp

**Search Console, Analytics 4, Bing Webmaster, Core Web Vitals, analisi GEO/AEO, validatore schema.org e controlli tecnici dentro il tuo assistente AI.** Open source, gratuito, in italiano.

[![npm](https://img.shields.io/npm/v/@contentisking/seomcp)](https://www.npmjs.com/package/@contentisking/seomcp)

[🇬🇧 English version](README.en.md) · [Sito](https://seomcp.contentisking.guru) · [npm](https://www.npmjs.com/package/@contentisking/seomcp) · Licenza [MIT](LICENSE)

`seomcp` è un server [MCP](https://modelcontextprotocol.io) che permette al tuo assistente AI (Claude, ChatGPT, GitHub Copilot, Gemini CLI, Mistral Vibe e altri client MCP) di leggere i dati dei tuoi siti da Search Console, Google Analytics 4, Bing Webmaster Tools, PageSpeed Insights e Chrome UX Report, e di analizzare le pagine pubbliche: accesso dei crawler AI, dati strutturati, redirect, canonical, sitemap e link rotti. **25 tool e 8 prompt, tutti in sola lettura.** Così puoi chiedere, in italiano:

> Quali query sono in posizione 4-20 negli ultimi 90 giorni, e quali pagine dovrei ottimizzare per prime?
>
> Confronta questo mese con lo stesso periodo dell'anno scorso e segnala i cali di clic sopra il 30%.
>
> Questa pagina è indicizzata? Quale canonical ha scelto Google?
>
> Su Bing come va rispetto a Google la query "scarpe da trekking"?

## Perché fidarsi

Affidare le credenziali di Search Console a uno strumento è una decisione seria. `seomcp` è costruito per essere facile da verificare:

- **Sola lettura.** Chiede a Google solo gli scope `webmasters.readonly` e `analytics.readonly`: non può modificare nulla nelle tue proprietà.
- **Le credenziali restano sul tuo computer.** Nessun server intermedio, nessun gateway di terzi, nessuna telemetria.
- **Solo librerie ufficiali:** l'SDK MCP, `@googleapis/searchconsole`, `@googleapis/analyticsdata`, `@googleapis/analyticsadmin`, `@googleapis/pagespeedonline`, `@googleapis/chromeuxreport` e `google-auth-library`. Bing è una semplice chiamata REST. Per leggere l'HTML delle pagine: `htmlparser2`, la libreria usata da cheerio.
- **Codice piccolo e leggibile.** Circa 4.800 righe di TypeScript in [`src/`](src): leggerlo prima di installarlo è alla portata di chiunque.
- **Nessun uso improprio della Google Indexing API**, che Google riserva alle offerte di lavoro e alle dirette video.

## Tool disponibili (25)

| Tool | Cosa fa |
|---|---|
| `seomcp_status` | Verifica cosa è configurato e spiega cosa manca |
| `gsc_list_sites` | Proprietà Search Console accessibili |
| `gsc_performance` | Clic, impressioni, CTR e posizione per query, pagina, paese, dispositivo, data, con filtri |
| `gsc_compare_periods` | Confronto con il periodo precedente o con l'anno prima: cali e crescite |
| `gsc_striking_distance` | Query "a distanza di tiro" (posizione 4-20) ordinate per potenziale |
| `gsc_inspect_url` | Stato di indicizzazione, canonical, ultima scansione, rich result |
| `gsc_list_sitemaps` | Sitemap inviate, errori e avvisi |
| `ga_list_properties` | Proprietà Google Analytics 4 accessibili, con il loro ID |
| `ga_report` | Report libero: dimensioni, metriche e filtri a scelta |
| `ga_organic_landing_pages` | Pagine di destinazione della ricerca organica: sessioni, coinvolgimento, conversioni, ricavi |
| `ga_compare_periods` | Confronto tra periodi su qualsiasi metrica: cali e crescite |
| `ga_realtime` | Utenti attivi negli ultimi 30 minuti |
| `crux_query` | Core Web Vitals reali degli utenti Chrome (LCP, INP, CLS): giudizio e distribuzione |
| `crux_history` | Andamento settimanale dei Core Web Vitals reali, fino a 40 settimane |
| `psi_analyze` | Test PageSpeed Insights: punteggi, metriche, opportunità e controlli SEO |
| `geo_ai_access` | GEO: quali crawler AI possono leggere il sito (robots.txt, llms.txt, Content Signals, TDMRep) |
| `geo_page_metrics` | GEO/AEO: misure della pagina come la vede un crawler AI, più HTTPS ed età del dominio |
| `geo_page_sections` | GEO/AEO: il testo della pagina diviso in sezioni, con le misure di ciascuna |
| `schema_validate` | Validatore schema.org: vocabolario ufficiale, requisiti Google per i risultati avanzati, coerenza con la pagina. Anche su JSON-LD incollato |
| `tech_page_audit` | Controlli tecnici della pagina: redirect, TTFB, indicizzabilità, canonical, hreflang, Open Graph, immagini, titoli, header di sicurezza |
| `tech_site_check` | Controlli tecnici del sito: sitemap, campione di URL, pagina 404, link interni rotti |
| `bing_list_sites` | Siti nel tuo account Bing Webmaster |
| `bing_query_stats` | Performance per query su Bing |
| `bing_page_stats` | Performance per pagina su Bing |
| `bing_keyword_stats` | Volumi di ricerca di una keyword (default Italia / italiano) |

Le analisi più complesse (cannibalizzazione, content gap, report) le fa l'assistente ragionando sui dati: non serve codificarle nel server.

### Prompt (8)

Oltre ai tool, seomcp offre otto **prompt**, cioè spunti di conversazione già impostati: audit GEO della pagina, risposte alle domande degli utenti, confronto con i concorrenti, permessi AI del sito, riscrittura di un passaggio citabile, piano editoriale, correzione dei dati strutturati e audit tecnico. Come funzionano: [docs/geo.md](docs/geo.md) e [docs/schema-validator.md](docs/schema-validator.md).

### Domande pronte (71)

Non sai da dove partire? L'archivio [domande/](domande/README.md) raccoglie 71 domande da copiare nell'assistente, divise in 10 temi: primi passi, traffico, opportunità, indicizzazione, GEO e AEO, dati strutturati, prestazioni, Analytics, Bing e report. Per ognuna c'è cosa serve (25 funzionano senza credenziali), quali tool usa e cosa aspettarsi.

Le stesse domande sono anche **risorse MCP** dentro seomcp: `seomcp://domande` è l'indice e `seomcp://domande/<tema>` contiene il singolo tema. Nei client che supportano le risorse si allegano alla chat; in Claude Code si richiamano con `@`. Oppure chiedi all'assistente: «Cosa posso chiedere a seomcp?».

## Installazione

Serve **Node.js 22 o superiore**. Configura solo le fonti che usi: Google e Bing sono entrambe facoltative.

### Il modo più rapido: la configurazione guidata

```bash
npx -y @contentisking/seomcp setup
```

Ti fa le domande una alla volta e apre le pagine giuste di Google e Bing. Prova subito ogni credenziale e ti fa scegliere proprietà e siti predefiniti. Salva tutto in `~/.config/seomcp/config.json`, leggibile solo dal tuo utente. Infine aggiunge seomcp a Claude Code, Claude Desktop, ChatGPT e Codex, GitHub Copilot, Gemini CLI o Mistral Vibe, facendo prima una copia di sicurezza dei file che modifica. Nella configurazione dell'assistente non finisce nessuna chiave.

Preferisci fare a mano? Segui i passaggi qui sotto.

### 1. Prepara le credenziali

La pagina [Credenziali](https://seomcp.contentisking.guru/credenziali/) ha tutti i passaggi con i link diretti e compila la configurazione per il tuo assistente. Le guide qui sotto dicono le stesse cose.

- **Google Search Console:** segui la [guida passo passo](docs/google-setup.md). Puoi scegliere tra un service account (comodo per i team) e OAuth con un client tuo (comodo per il singolo professionista).
- **Google Analytics 4** (facoltativo): stesse credenziali di Search Console, più tre passaggi nella [guida Analytics](docs/google-analytics-setup.md).
- **PageSpeed e Core Web Vitals** (facoltativo): una API key gratuita, come spiegato nella [guida PageSpeed](docs/pagespeed-setup.md).
- **Bing Webmaster Tools:** genera una API key in due minuti, come spiegato nella [guida](docs/bing-setup.md).

### 2. Collegalo al tuo assistente

Il comando è sempre lo stesso, cambia solo dove si scrive. Trovi una guida passo passo per ogni assistente su **[seomcp.contentisking.guru/installa](https://seomcp.contentisking.guru/installa/)**; qui sotto le configurazioni in breve.

#### Claude Code

Da terminale:

```bash
claude mcp add seomcp -s user \
  -e GOOGLE_APPLICATION_CREDENTIALS=/percorso/service-account.json \
  -e BING_WEBMASTER_API_KEY=la-tua-chiave \
  -e SEOMCP_GSC_SITE=sc-domain:tuosito.it \
  -e SEOMCP_GA_PROPERTY=123456789 \
  -e SEOMCP_GOOGLE_API_KEY=la-tua-api-key \
  -- npx -y @contentisking/seomcp
```

Poi verifica con `/mcp` che `seomcp` risulti connesso.

#### Claude Desktop

In `claude_desktop_config.json` (Impostazioni → Sviluppatore → Modifica configurazione):

```json
{
  "mcpServers": {
    "seomcp": {
      "command": "npx",
      "args": ["-y", "@contentisking/seomcp"],
      "env": {
        "GOOGLE_APPLICATION_CREDENTIALS": "/percorso/service-account.json",
        "BING_WEBMASTER_API_KEY": "la-tua-chiave",
        "SEOMCP_GSC_SITE": "sc-domain:tuosito.it",
        "SEOMCP_GA_PROPERTY": "123456789",
        "SEOMCP_GOOGLE_API_KEY": "la-tua-api-key"
      }
    }
  }
}
```

#### ChatGPT (app desktop) e Codex

Da *Impostazioni → MCP servers → Add server → STDIO*, oppure in `~/.codex/config.toml`:

```toml
[mcp_servers.seomcp]
command = "npx"
args = ["-y", "@contentisking/seomcp"]

[mcp_servers.seomcp.env]
GOOGLE_APPLICATION_CREDENTIALS = "/percorso/service-account.json"
BING_WEBMASTER_API_KEY = "la-tua-chiave"
SEOMCP_GSC_SITE = "sc-domain:tuosito.it"
SEOMCP_GA_PROPERTY = "123456789"
SEOMCP_GOOGLE_API_KEY = "la-tua-api-key"
```

#### GitHub Copilot in VS Code

Comando *MCP: Open User Configuration*, poi nel file `mcp.json`:

```json
{
  "servers": {
    "seomcp": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@contentisking/seomcp"],
      "env": {
        "GOOGLE_APPLICATION_CREDENTIALS": "/percorso/service-account.json",
        "BING_WEBMASTER_API_KEY": "la-tua-chiave",
        "SEOMCP_GSC_SITE": "sc-domain:tuosito.it",
        "SEOMCP_GA_PROPERTY": "123456789",
        "SEOMCP_GOOGLE_API_KEY": "la-tua-api-key"
      }
    }
  }
}
```

Usa la chat di Copilot in modalità *Agent*.

#### GitHub Copilot CLI

In `~/.copilot/mcp-config.json`:

```json
{
  "mcpServers": {
    "seomcp": {
      "type": "local",
      "command": "npx",
      "args": ["-y", "@contentisking/seomcp"],
      "env": {
        "GOOGLE_APPLICATION_CREDENTIALS": "/percorso/service-account.json",
        "BING_WEBMASTER_API_KEY": "la-tua-chiave",
        "SEOMCP_GSC_SITE": "sc-domain:tuosito.it",
        "SEOMCP_GA_PROPERTY": "123456789",
        "SEOMCP_GOOGLE_API_KEY": "la-tua-api-key"
      },
      "tools": ["*"]
    }
  }
}
```

#### Gemini CLI

In `~/.gemini/settings.json`:

```json
{
  "mcpServers": {
    "seomcp": {
      "command": "npx",
      "args": ["-y", "@contentisking/seomcp"],
      "env": {
        "GOOGLE_APPLICATION_CREDENTIALS": "/percorso/service-account.json",
        "BING_WEBMASTER_API_KEY": "la-tua-chiave",
        "SEOMCP_GSC_SITE": "sc-domain:tuosito.it",
        "SEOMCP_GA_PROPERTY": "123456789",
        "SEOMCP_GOOGLE_API_KEY": "la-tua-api-key"
      }
    }
  }
}
```

Dal giugno 2026 Gemini CLI richiede una chiave API Gemini a pagamento o una licenza enterprise.

#### Mistral Vibe CLI

In `~/.vibe/config.toml`:

```toml
[[mcp_servers]]
name = "seomcp"
transport = "stdio"
command = "npx"
args = ["-y", "@contentisking/seomcp"]
env = { "GOOGLE_APPLICATION_CREDENTIALS" = "/percorso/service-account.json", "BING_WEBMASTER_API_KEY" = "la-tua-chiave", "SEOMCP_GSC_SITE" = "sc-domain:tuosito.it", "SEOMCP_GA_PROPERTY" = "123456789", "SEOMCP_GOOGLE_API_KEY" = "la-tua-api-key" }
```

> **Versioni web non supportate.** Le versioni web (claude.ai, chatgpt.com, l'app Gemini, Microsoft 365 Copilot, Mistral Vibe sul web) accettano solo server MCP remoti, raggiungibili su internet. `seomcp` gira in locale per non far uscire le tue credenziali dal computer, quindi servono le app desktop o la riga di comando. Microsoft 365 Copilot si collega ai server MCP solo come connettore federato remoto, configurato dall'amministratore: [perché seomcp non si può ancora aggiungere](https://seomcp.contentisking.guru/installa/microsoft-365-copilot/).

### 3. Controlla che funzioni

```bash
npx @contentisking/seomcp doctor
```

Il comando prova ogni fonte e ti dice esattamente cosa manca. Ad esempio: "aggiungi `seomcp@progetto.iam.gserviceaccount.com` come utente della proprietà".

> **Avviso `npm warn deprecated node-domexception`?** Si può ignorare. Arriva dalla libreria ufficiale di Google per l'autenticazione (`google-auth-library` → `gaxios` → `node-fetch`) e serviva solo alle vecchie versioni di Node: con Node 22 non viene usato. Sparirà quando Google aggiornerà le sue dipendenze.

## Configurazione

| Variabile | Descrizione |
|---|---|
| `GOOGLE_APPLICATION_CREDENTIALS` | Percorso del file JSON del service account |
| `SEOMCP_GOOGLE_CLIENT_ID` / `SEOMCP_GOOGLE_CLIENT_SECRET` | Client OAuth tuo, in alternativa al service account |
| `BING_WEBMASTER_API_KEY` | API key di Bing Webmaster Tools |
| `SEOMCP_GSC_SITE` | Proprietà predefinita: `sc-domain:tuosito.it` oppure `https://www.tuosito.it/` |
| `SEOMCP_GA_PROPERTY` | ID numerico della proprietà GA4 predefinita, es. `123456789` |
| `SEOMCP_GOOGLE_API_KEY` | API key Google Cloud per PageSpeed Insights e Chrome UX Report |
| `SEOMCP_BING_SITE` | Sito Bing predefinito, es. `https://www.tuosito.it/` |
| `SEOMCP_COUNTRY` / `SEOMCP_LANGUAGE` | Mercato per i volumi keyword Bing (default `it` / `it-IT`) |
| `SEOMCP_ALLOW_PRIVATE` | Solo sviluppo: `1` per analizzare con i tool GEO anche indirizzi locali (es. staging) |
| `SEOMCP_CONFIG_DIR` | Cartella di configurazione (default `~/.config/seomcp`) |

In alternativa alle variabili d'ambiente puoi usare `~/.config/seomcp/config.json`:

```json
{
  "google": { "serviceAccountFile": "/percorso/service-account.json", "apiKey": "la-tua-api-key" },
  "bing": { "apiKey": "la-tua-chiave" },
  "defaults": { "gscSite": "sc-domain:tuosito.it", "gaProperty": "123456789", "bingSite": "https://www.tuosito.it/" }
}
```

Se il file contiene chiavi, rendilo leggibile solo a te: `chmod 600 ~/.config/seomcp/config.json`.

## Usarlo come libreria

I client funzionano anche senza MCP e non leggono né file né variabili d'ambiente. Per questo puoi usarli dentro un'applicazione tua, anche multi-utente, passando le credenziali di ciascun utente:

```ts
import { GscClient, BingClient, strikingDistance, lastNDays } from '@contentisking/seomcp';
import { OAuth2Client } from 'google-auth-library';

const auth = new OAuth2Client({ clientId, clientSecret });
auth.setCredentials({ refresh_token: utente.googleRefreshToken });

const gsc = new GscClient(auth);
const rows = await gsc.query({ siteUrl: 'sc-domain:esempio.it', ...lastNDays(90), dimensions: ['query', 'page'], rowLimit: 5000 });
const opportunita = strikingDistance(rows);

const bing = new BingClient({ apiKey: utente.bingApiKey });
const stats = await bing.getQueryStats('https://www.esempio.it/');
```

## Stato del progetto e supporto

`seomcp` è mantenuto da [Content is King](https://contentisking.guru) **nel tempo libero**, senza garanzie di supporto. Segnalazioni e pull request sono benvenute: leggi [CONTRIBUTING.md](CONTRIBUTING.md). Per le vulnerabilità segui invece [SECURITY.md](SECURITY.md).

È un progetto indipendente, non affiliato a Google, Microsoft, Anthropic né OpenAI. Search Console, Bing Webmaster Tools, Claude e ChatGPT sono marchi dei rispettivi proprietari.
