# Changelog

## 0.1.1 — 2026-09-28

- Landing statica per seomcp.contentisking.guru in `site/`: nessuna risorsa esterna, nessun tracker, tema chiaro/scuro, JSON-LD, sitemap, llms.txt.
- Configurazione Nginx e istruzioni di deploy in `deploy/`.

## 0.1.0 — non ancora pubblicata

- Prima versione: server MCP (stdio) e libreria.
- Search Console: `gsc_list_sites`, `gsc_performance`, `gsc_compare_periods`, `gsc_striking_distance`, `gsc_inspect_url`, `gsc_list_sitemaps`.
- Bing Webmaster: `bing_list_sites`, `bing_query_stats`, `bing_page_stats`, `bing_keyword_stats`.
- Autenticazione Google tramite service account oppure OAuth con client dell'utente (loopback + PKCE), scope in sola lettura.
- Comando `doctor` per diagnosticare la configurazione.
