# Changelog

## 0.1.27 — 2026-09-29

- Sito: pagina `/tecnico/` per i controlli tecnici, nel menu "Novità" (ora 5 voci).

## 0.1.26 — 2026-09-29

- Libreria: `checkUrlStatus` (stato di un URL senza seguire i redirect) e `analyzeHreflang` esportate come funzioni autonome.

## 0.1.25 — 2026-09-29

- **Controlli tecnici**: 2 nuovi tool senza credenziali.
  - `tech_page_audit`: catena di redirect, TTFB, peso e compressione, indicizzabilità, canonical, meta, viewport, hreflang (codici, x-default, autoreferenza, link di ritorno a campione), Open Graph e Twitter, immagini, gerarchia dei titoli, link, header di sicurezza.
  - `tech_site_check`: sitemap (indice, URL, lastmod, duplicati, altri domini), campione di URL, pagina 404 (soft 404), link interni rotti o reindirizzati.
- Prompt `audit-tecnico`.
- `fetchPage` misura il TTFB; l'estrattore HTML raccoglie hreflang, immagini e tutti i titoli.
- Sito: la sezione dei tool della landing è un elenco semplice; aggiunta l'area "Controlli tecnici".

## 0.1.24 — 2026-09-29

- Sito: corretti i testi "Richiede" della pagina `/tool/`.

## 0.1.23 — 2026-09-29

- Sito: nella landing i tool sono riassunti in sei aree; il dettaglio di tutti i 23 tool e 7 prompt è nella nuova pagina `/tool/`.

## 0.1.22 — 2026-09-29

- Libreria: esportate anche `fetchPage`, `isPrivateIp`, `parseRobots`, `botAccess`, `AI_BOTS`, `analyzeLlmsTxt`, `jsonLdNodes`, `domainInfo`, `httpsInfo`, `registeredDomain`, `siteTrust`, `extractPage`.
- Il pacchetto si può caricare anche con `require()` da progetti CommonJS (Node 22+).

## 0.1.21 — 2026-09-28

- Sito: le novità sono raggruppate in un unico menu a tendina "Novità" (schema.org, GEO/AEO, Core Web Vitals, Google Analytics 4), che funziona anche senza JavaScript e si chiude con Esc o cliccando fuori.

## 0.1.20 — 2026-09-28

- **Validatore schema.org** (`schema_validate`), su URL o JSON-LD incollato, in locale:
  - sintassi (JSON, `@context`, `@type`, `@graph`, riferimenti `@id`);
  - vocabolario ufficiale schema.org 30.1 incluso nel pacchetto: tipi e proprietà esistenti e ammessi (con ereditarietà), formati di date, URL ed enumerazioni, termini superati, refusi con correzione suggerita;
  - requisiti di Google per 14 tipi di risultati avanzati, applicando la regola più specifica;
  - coerenza con la pagina: date, FAQ visibili, headline e H1.
- Prompt `correggi-dati-strutturati`: valida, spiega e propone il JSON-LD corretto, ricontrollandolo.
- Script `npm run schema:update` per aggiornare il vocabolario.
- Sito: pagina `/schema/` con etichetta "Novità"; guida `docs/schema-validator.md`.

## 0.1.19 — 2026-09-28

- **GEO e AEO**: 3 tool di misura oggettiva, senza credenziali:
  - `geo_ai_access`: permessi dei crawler AI da robots.txt (RFC 9309), divisi per scopo; llms.txt, Content Signals, TDMRep, meta robots e X-Robots-Tag;
  - `geo_page_metrics`: struttura, risposta in apertura, sezioni, dati, freschezza, autore, fonti, dati strutturati, entità; per il sito HTTPS ed età del dominio (RDAP, WHOIS per i .it);
  - `geo_page_sections`: il testo diviso per sezioni, con le misure di ciascuna.
- **6 prompt** narrativi: audit GEO, domande degli utenti, confronto concorrenti, permessi AI, passaggio citabile, piano editoriale.
- Scaricamento sicuro delle pagine: blocco di indirizzi locali e privati anche dopo i redirect (controllo al momento della connessione), limiti di dimensione, tempo e redirect.
- Nuova dipendenza `htmlparser2` per leggere l'HTML.
- Sito: pagina `/geo/` con etichetta "Novità"; menu adattivo su schermi medi; guida `docs/geo.md`.

## 0.1.18 — 2026-09-28

- **Core Web Vitals e PageSpeed**: 3 nuovi tool (`crux_query`, `crux_history`, `psi_analyze`) basati su Chrome UX Report e PageSpeed Insights, con `PageSpeedClient` esportato come libreria.
- Nuova variabile `SEOMCP_GOOGLE_API_KEY` (API key gratuita, dati pubblici); `doctor` la verifica.
- Messaggio dedicato per API key Google non valida.
- Sito: pagina `/core-web-vitals/` con etichetta "Novità"; guida `docs/pagespeed-setup.md`.

## 0.1.17 — 2026-09-28

- Sito: tutti i link esterni si aprono in una nuova scheda.

## 0.1.16 — 2026-09-28

- **Google Analytics 4**: 5 nuovi tool in sola lettura (`ga_list_properties`, `ga_report`, `ga_organic_landing_pages`, `ga_compare_periods`, `ga_realtime`), con `GaClient` esportato anche come libreria.
- Stesse credenziali Google di Search Console; scope aggiunto `analytics.readonly`. Chi usa OAuth deve ripetere `auth google`.
- `doctor` controlla anche Analytics (facoltativo); nuova variabile `SEOMCP_GA_PROPERTY`.
- Errori Google più precisi: API non abilitata, permessi mancanti e scope insufficiente ora danno indicazioni diverse (prima un'API disabilitata veniva segnalata come permesso mancante).
- Sito: pagina dedicata `/google-analytics/` con etichetta "Novità" nel menu; guida `docs/google-analytics-setup.md`.

## 0.1.15 — 2026-09-28

- Guide riorganizzate: una pagina per AI (Claude, ChatGPT, GitHub Copilot, Gemini, Mistral), con una sezione per ogni prodotto.
- Lista degli assistenti semplificata: solo i nomi.
- Redirect 301 dalle vecchie pagine per prodotto e pagina 404 personalizzata (`deploy/nginx-seomcp-extra.conf`).

## 0.1.14 — 2026-09-28

- llms.txt: rimosso il link al pacchetto npm non ancora pubblicato.

## 0.1.13 — 2026-09-28

- Landing convertita agli include SSI; il passo 2 porta alle guide dei singoli assistenti.
- Link a Zuzai in una nuova scheda.
- Correzioni mobile: percorso di navigazione visibile, pulsante Copia che non copre il codice.

## 0.1.12 — 2026-09-28

- Guide di installazione dedicate per ogni assistente in `site/installa/`: Claude Code, Claude Desktop, ChatGPT e Codex, GitHub Copilot (VS Code e CLI), Gemini CLI, Mistral Vibe CLI.
- Intestazione, footer e griglia degli assistenti come include SSI in `site/_partials/`; generatore `scripts/build-site.py`.
- README: configurazioni per tutti i client e link alle guide.
- Nginx: `ssi on` e partial accessibili solo via include.

## 0.1.11 — 2026-09-28

- Landing: il link a Zuzai torna alla home.

## 0.1.10 — 2026-09-28

- Landing: il link a Zuzai porta alla registrazione con codice referral SEOMCP.

## 0.1.9 — 2026-09-28

- Landing: riga nel footer che presenta Zuzai, l'URL shortener di Content is King.

## 0.1.8 — 2026-09-28

- Landing: "Licenza MIT · GitHub" allineato a destra nel footer.

## 0.1.7 — 2026-09-28

- Landing: footer "Piattaforma MCP sviluppata in Italia", con licenza e GitHub sulla stessa riga.

## 0.1.6 — 2026-09-28

- Landing e README: installazione da GitHub (`github:davide-cik/seomcp`) in attesa della pubblicazione su npm.
- Landing: le ancore del menu non finiscono più sotto l'intestazione fissa.

## 0.1.5 — 2026-09-28

- Script `prepare`: il pacchetto si può installare direttamente da GitHub (`npx -y github:davide-cik/seomcp`), la build avviene durante l'installazione.

## 0.1.4 — 2026-09-28

- Documentato che le versioni web di Claude e ChatGPT non sono supportate (accettano solo server MCP remoti).

## 0.1.3 — 2026-09-28

- Ragione sociale esatta (Content is King Srl) in `LICENSE` e nel campo `author` di `package.json`.

## 0.1.2 — 2026-09-28

- Supporto documentato per ChatGPT (app desktop e Codex) oltre a Claude: istruzioni in landing e README, configurazione `~/.codex/config.toml`.
- Footer della landing con i dati di Content is King Srl.

## 0.1.1 — 2026-09-28

- Landing statica per seomcp.contentisking.guru in `site/`: nessuna risorsa esterna, nessun tracker, tema chiaro/scuro, JSON-LD, sitemap, llms.txt.
- Configurazione Nginx e istruzioni di deploy in `deploy/`.

## 0.1.0 — non ancora pubblicata

- Prima versione: server MCP (stdio) e libreria.
- Search Console: `gsc_list_sites`, `gsc_performance`, `gsc_compare_periods`, `gsc_striking_distance`, `gsc_inspect_url`, `gsc_list_sitemaps`.
- Bing Webmaster: `bing_list_sites`, `bing_query_stats`, `bing_page_stats`, `bing_keyword_stats`.
- Autenticazione Google tramite service account oppure OAuth con client dell'utente (loopback + PKCE), scope in sola lettura.
- Comando `doctor` per diagnosticare la configurazione.
