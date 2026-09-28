# Changelog

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
