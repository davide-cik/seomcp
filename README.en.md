# seomcp

**Google Search Console, Google Analytics 4, Bing Webmaster Tools and Core Web Vitals inside your AI assistant.** Open source, free, made in Italy.

[🇮🇹 Versione italiana](README.md) · [Website](https://seomcp.contentisking.guru) · [MIT](LICENSE) license

`seomcp` is an [MCP](https://modelcontextprotocol.io) server that lets your AI assistant (Claude, ChatGPT, GitHub Copilot, Gemini CLI, Mistral Vibe and other MCP clients) read your sites' data from Search Console, Google Analytics 4, Bing Webmaster Tools, PageSpeed Insights and the Chrome UX Report. Ask things like:

> Which queries rank in positions 4-20 over the last 90 days, and which pages should I optimize first?
>
> Compare this month with the same period last year and flag click drops above 30%.
>
> Is this page indexed? Which canonical did Google pick?

## Why you can trust it

- **Read-only.** It only requests the `webmasters.readonly` and `analytics.readonly` Google scopes and cannot change anything in your properties.
- **Your credentials stay on your machine.** No intermediate server, no third-party gateway, no telemetry.
- **Official libraries only:** the MCP SDK, `@googleapis/searchconsole`, `@googleapis/analyticsdata`, `@googleapis/analyticsadmin`, `@googleapis/pagespeedonline`, `@googleapis/chromeuxreport` and `google-auth-library`. Bing is a plain REST call.
- **Small, readable codebase.** About 2,000 lines of TypeScript in [`src/`](src), easy to audit before you install it.
- **No misuse of the Google Indexing API**, which Google reserves for job postings and livestreams.

## Tools

| Tool | What it does |
|---|---|
| `seomcp_status` | Checks what is configured and explains what is missing |
| `gsc_list_sites` | Accessible Search Console properties |
| `gsc_performance` | Clicks, impressions, CTR and position by query, page, country, device and date, with filters |
| `gsc_compare_periods` | Compare against the previous period or the year before: losers and gainers |
| `gsc_striking_distance` | "Striking distance" queries (positions 4-20), sorted by potential |
| `gsc_inspect_url` | Index status, canonical, last crawl, rich results |
| `gsc_list_sitemaps` | Submitted sitemaps, errors and warnings |
| `ga_list_properties` | Accessible Google Analytics 4 properties and their IDs |
| `ga_report` | Free-form report: any dimensions, metrics and filters |
| `ga_organic_landing_pages` | Organic search landing pages: sessions, engagement, key events, revenue |
| `ga_compare_periods` | Period comparison on any metric: losers and gainers |
| `ga_realtime` | Active users in the last 30 minutes |
| `crux_query` | Real-user Core Web Vitals from Chrome (LCP, INP, CLS): rating and distribution |
| `crux_history` | Weekly trend of real-user Core Web Vitals, up to 40 weeks |
| `psi_analyze` | PageSpeed Insights test: scores, metrics, opportunities and SEO audits |
| `bing_list_sites` | Sites in your Bing Webmaster account |
| `bing_query_stats` | Bing performance by query |
| `bing_page_stats` | Bing performance by page |
| `bing_keyword_stats` | Keyword search volume (defaults to Italy / Italian; set `country` and `language` for other markets) |

## Install

> **Try it now from GitHub.** The npm package is not published yet. Meanwhile, replace `@contentisking/seomcp` with `github:davide-cik/seomcp` in the commands below (e.g. `npx -y github:davide-cik/seomcp doctor`). The first run builds the code on your machine and requires git.

Requires **Node.js 22+**. Configure only the sources you use.

1. **Credentials:** see the setup guides for [Google](docs/google-setup.md), [Google Analytics](docs/google-analytics-setup.md), [PageSpeed/CrUX](docs/pagespeed-setup.md) and [Bing](docs/bing-setup.md). They are in Italian, and the steps are the same in English UIs.
2. **Claude Code:**

   ```bash
   claude mcp add seomcp -s user \
     -e GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json \
     -e BING_WEBMASTER_API_KEY=your-key \
     -e SEOMCP_GSC_SITE=sc-domain:yoursite.com \
     -e SEOMCP_COUNTRY=us -e SEOMCP_LANGUAGE=en-US \
     -- npx -y @contentisking/seomcp
   ```

   **Other clients:** the same `npx -y @contentisking/seomcp` command works in Claude Desktop, the ChatGPT desktop app and Codex, GitHub Copilot (VS Code and CLI), Gemini CLI and Mistral Vibe CLI. Step-by-step guides for each one (in Italian) are at [seomcp.contentisking.guru/installa](https://seomcp.contentisking.guru/installa/), and ready-to-copy configs are in the [Italian README](README.md#2-collegalo-al-tuo-assistente).

   > **Web versions are not supported.** claude.ai, chatgpt.com, the Gemini app, Microsoft 365 Copilot and Mistral Vibe on the web only accept remote MCP servers. `seomcp` runs locally so your credentials never leave your machine: use the desktop apps or the CLI.

3. **Check:** `npx @contentisking/seomcp doctor`

All environment variables are listed in the [Italian README](README.md#configurazione).

## Use as a library

The clients work without MCP and never read files or environment variables. You can therefore embed them in your own multi-user app:

```ts
import { GscClient, BingClient } from '@contentisking/seomcp';
const gsc = new GscClient(oauth2ClientWithUserRefreshToken);
```

## Status

Maintained by [Content is King](https://contentisking.guru) **in our spare time**, with no support guarantees. Issues and pull requests are welcome: see [CONTRIBUTING.md](CONTRIBUTING.md).

Independent project, not affiliated with Google, Microsoft, Anthropic or OpenAI.
