#!/usr/bin/env python3
"""Genera le pagine di installazione per ogni AI in site/installa/.

Intestazione e footer vengono presi da site/index.html, così restano allineati.
Uso: python3 scripts/build-site.py
"""
import html
import shutil
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "site"
BASE = "https://seomcp.contentisking.guru"
PKG = "github:davide-cik/seomcp"  # diventerà @contentisking/seomcp dopo la pubblicazione su npm
REPO = "https://github.com/davide-cik/seomcp"

ENV = [
    ("GOOGLE_APPLICATION_CREDENTIALS", "/percorso/service-account.json"),
    ("BING_WEBMASTER_API_KEY", "la-tua-chiave"),
    ("SEOMCP_GSC_SITE", "sc-domain:tuosito.it"),
    ("SEOMCP_GA_PROPERTY", "123456789"),
    ("SEOMCP_GOOGLE_API_KEY", "la-tua-api-key"),
]


def env_json(indent: int) -> str:
    pad = " " * indent
    return ",\n".join(f'{pad}"{k}": "{v}"' for k, v in ENV)


def mcp_servers_json(extra_before: str = "", extra_after: str = "", key: str = "mcpServers") -> str:
    return (
        "{\n"
        f'  "{key}": {{\n'
        '    "seomcp": {\n'
        f"{extra_before}"
        '      "command": "npx",\n'
        f'      "args": ["-y", "{PKG}"],\n'
        '      "env": {\n'
        f"{env_json(8)}\n"
        "      }"
        f"{extra_after}\n"
        "    }\n"
        "  }\n"
        "}"
    )


WINDOWS_NPX = (
    "<strong>Windows:</strong> se il server non parte, sostituisci <code>\"command\": \"npx\"</code> con "
    "<code>\"command\": \"cmd\"</code> e metti <code>\"/c\", \"npx\"</code> all'inizio di <code>args</code>."
)
MAC_NVM = (
    "<strong>macOS con nvm, fnm o Volta:</strong> le app desktop non vedono il PATH del terminale. "
    "Se il server non parte, in <code>command</code> metti il percorso completo di npx, che ottieni con "
    "<code>which npx</code>."
)

CLIENTS = [
    {
        "slug": "claude-code",
        "name": "Claude Code",
        "vendor": "Anthropic",
        "kind": "riga di comando",
        "intro": "Claude Code aggiunge i server MCP con un solo comando da terminale.",
        "open": "Apri un terminale. Non serve modificare file: il comando <code>claude mcp add</code> scrive la configurazione al posto tuo.",
        "lang": "bash",
        "code": "claude mcp add seomcp -s user \\\n"
        + "".join(f"  -e {k}={v} \\\n" for k, v in ENV)
        + f"  -- npx -y {PKG}",
        "code_note": "L'opzione <code>-s user</code> rende seomcp disponibile in tutti i tuoi progetti, non solo in quello corrente.",
        "verify": "Avvia <code>claude</code> e digita <code>/mcp</code>: <code>seomcp</code> deve risultare connesso.",
        "tips": [],
    },
    {
        "slug": "claude-desktop",
        "name": "Claude Desktop",
        "vendor": "Anthropic",
        "kind": "app desktop",
        "intro": "Claude Desktop, per macOS e Windows, legge i server MCP da un file di configurazione JSON.",
        "open": "Apri <em>Impostazioni → Sviluppatore → Modifica configurazione</em>. Si apre il file <code>claude_desktop_config.json</code>:"
        "<ul><li>macOS: <code>~/Library/Application Support/Claude/claude_desktop_config.json</code></li>"
        "<li>Windows: <code>%APPDATA%\\Claude\\claude_desktop_config.json</code></li></ul>",
        "lang": "json",
        "code": mcp_servers_json(),
        "code_note": "Se il file contiene già altri server, aggiungi solo il blocco <code>\"seomcp\"</code> dentro <code>mcpServers</code>.",
        "verify": "Chiudi Claude Desktop del tutto (non basta chiudere la finestra) e riaprilo. Nel menu degli strumenti della chat deve comparire <code>seomcp</code>.",
        "tips": [MAC_NVM, WINDOWS_NPX],
    },
    {
        "slug": "chatgpt",
        "name": "ChatGPT e Codex",
        "vendor": "OpenAI",
        "kind": "app desktop e riga di comando",
        "intro": "L'app desktop di ChatGPT, Codex CLI e l'estensione per IDE condividono la stessa configurazione MCP.",
        "open": "Nell'app desktop vai su <em>Impostazioni → MCP servers → Add server</em>, scegli <strong>STDIO</strong> e inserisci comando, argomenti e variabili. "
        "In alternativa modifica direttamente il file <code>~/.codex/config.toml</code>:",
        "lang": "toml",
        "code": '[mcp_servers.seomcp]\ncommand = "npx"\nargs = ["-y", "' + PKG + '"]\n\n[mcp_servers.seomcp.env]\n'
        + "\n".join(f'{k} = "{v}"' for k, v in ENV),
        "code_note": "",
        "verify": "Riavvia l'app o Codex: i tool di seomcp saranno disponibili nelle nuove conversazioni.",
        "tips": [MAC_NVM],
        "web": "ChatGPT sul web (chatgpt.com) accetta solo server MCP remoti: serve l'app desktop o Codex.",
    },
    {
        "slug": "vscode-copilot",
        "name": "GitHub Copilot in VS Code",
        "vendor": "GitHub / Microsoft",
        "kind": "editor",
        "intro": "In VS Code i server MCP sono disponibili nella chat di GitHub Copilot, in modalità Agent.",
        "open": "Apri la palette dei comandi (<kbd>Ctrl</kbd>/<kbd>Cmd</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd>) ed esegui <em>MCP: Open User Configuration</em>. Si apre il file <code>mcp.json</code> del tuo profilo.",
        "lang": "json",
        "code": mcp_servers_json(extra_before='      "type": "stdio",\n', key="servers"),
        "code_note": "Attenzione: in VS Code la chiave principale è <code>servers</code>, non <code>mcpServers</code>.",
        "verify": "Esegui <em>MCP: List Servers</em> dalla palette e avvia <code>seomcp</code>. Poi apri la chat di Copilot in modalità <strong>Agent</strong>: i tool compaiono nell'elenco degli strumenti.",
        "tips": [],
    },
    {
        "slug": "copilot-cli",
        "name": "GitHub Copilot CLI",
        "vendor": "GitHub",
        "kind": "riga di comando",
        "intro": "Copilot CLI legge i server MCP dal proprio file di configurazione nella tua cartella utente.",
        "open": "Apri (o crea) il file <code>~/.copilot/mcp-config.json</code>.",
        "lang": "json",
        "code": mcp_servers_json(extra_before='      "type": "local",\n', extra_after=',\n      "tools": ["*"]'),
        "code_note": "<code>\"type\": \"local\"</code> indica un server avviato sul tuo computer. <code>\"tools\": [\"*\"]</code> abilita tutti i tool.",
        "verify": "Riavvia Copilot CLI: i tool di seomcp saranno disponibili nella sessione.",
        "tips": [],
    },
    {
        "slug": "gemini-cli",
        "name": "Gemini CLI",
        "vendor": "Google",
        "kind": "riga di comando",
        "intro": "Gemini CLI legge i server MCP dal file <code>settings.json</code>.",
        "open": "Apri (o crea) il file <code>~/.gemini/settings.json</code>. Per un solo progetto puoi usare invece <code>.gemini/settings.json</code> nella cartella del progetto.",
        "lang": "json",
        "code": mcp_servers_json(),
        "code_note": "Se il file contiene già altre impostazioni, aggiungi solo il blocco <code>mcpServers</code>.",
        "verify": "Avvia <code>gemini</code> e digita <code>/mcp</code>: <code>seomcp</code> deve comparire con i suoi 11 tool.",
        "tips": ["Dal giugno 2026 Gemini CLI richiede una chiave API Gemini a pagamento o una licenza enterprise."],
        "web": "L'app Gemini sul web non supporta server MCP locali: serve Gemini CLI.",
    },
    {
        "slug": "mistral-vibe",
        "name": "Mistral Vibe CLI",
        "vendor": "Mistral AI",
        "kind": "riga di comando",
        "intro": "Mistral Vibe CLI legge i server MCP dal file <code>config.toml</code>.",
        "open": "Apri (o crea) il file <code>~/.vibe/config.toml</code>. Per un solo progetto puoi usare <code>.vibe/config.toml</code> nella cartella del progetto.",
        "lang": "toml",
        "code": '[[mcp_servers]]\nname = "seomcp"\ntransport = "stdio"\ncommand = "npx"\nargs = ["-y", "'
        + PKG
        + '"]\nenv = { '
        + ", ".join(f'"{k}" = "{v}"' for k, v in ENV)
        + " }",
        "code_note": "",
        "verify": "Riavvia <code>vibe</code>: i tool di seomcp saranno disponibili nella sessione.",
        "tips": [],
        "web": "Mistral Vibe sul web (l'ex Le Chat) accetta solo connettori MCP remoti: serve Vibe CLI.",
    },
]


# Una pagina per AI; ogni pagina ha una sezione per ciascun prodotto.
VENDORS = [
    {"slug": "claude", "name": "Claude", "vendor": "Anthropic", "products": ["claude-code", "claude-desktop"]},
    {"slug": "chatgpt", "name": "ChatGPT", "vendor": "OpenAI", "products": ["chatgpt"]},
    {"slug": "copilot", "name": "GitHub Copilot", "vendor": "GitHub", "products": ["vscode-copilot", "copilot-cli"]},
    {"slug": "gemini", "name": "Gemini", "vendor": "Google", "products": ["gemini-cli"]},
    {"slug": "mistral", "name": "Mistral", "vendor": "Mistral AI", "products": ["mistral-vibe"]},
]
BY_SLUG = {c["slug"]: c for c in CLIENTS}


INCLUDE = '<!--#include virtual="/_partials/{name}.html" -->'


def page(title, description, path, body):
    """Pagina completa. Intestazione e footer sono include SSI risolti da Nginx."""
    url = f"{BASE}/{path.strip('/')}/"
    return f"""<!doctype html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{html.escape(title)}</title>
  <meta name="description" content="{html.escape(description)}">
  <link rel="canonical" href="{url}">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <meta property="og:type" content="article">
  <meta property="og:title" content="{html.escape(title)}">
  <meta property="og:description" content="{html.escape(description)}">
  <meta property="og:url" content="{url}">
  <meta property="og:locale" content="it_IT">
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <a class="skip" href="#main">Vai al contenuto</a>
  {INCLUDE.format(name="header")}

  <main id="main" class="doc">
    <div class="wrap">
{body}
    </div>
  </main>

  {INCLUDE.format(name="footer")}
  <script src="/app.js" defer></script>
</body>
</html>
"""


PREREQ = f"""      <section class="doc-block">
        <h2>Prima di iniziare</h2>
        <ul class="checklist">
          <li><strong>Node.js 22 o superiore</strong> (<a href="https://nodejs.org/it/download" target="_blank" rel="noopener">scarica</a>) e <strong>git</strong> (<a href="https://git-scm.com/downloads" target="_blank" rel="noopener">scarica</a>).</li>
          <li><strong>Le credenziali</strong> delle fonti che vuoi usare: <a href="{REPO}/blob/main/docs/google-setup.md" target="_blank" rel="noopener">Google Search Console</a>, <a href="/google-analytics/">Google Analytics 4</a>, <a href="{REPO}/blob/main/docs/bing-setup.md" target="_blank" rel="noopener">Bing Webmaster Tools</a> e la API key per i <a href="/core-web-vitals/">Core Web Vitals</a>. Sono tutte facoltative.</li>
        </ul>
        <p class="small">Il pacchetto npm è in arrivo: per ora seomcp si installa direttamente da GitHub. Il primo avvio richiede qualche secondo in più, perché il codice viene compilato sul tuo computer.</p>
      </section>"""


def product_section(c, multi):
    note = f'\n            <p class="small">{c["code_note"]}</p>' if c["code_note"] else ""
    heading = f'      <h2>{html.escape(c["name"])}</h2>\n      <p>{c["intro"]}</p>\n' if multi else ""
    return f"""      <section class="doc-block" id="{c['slug']}">
{heading}        <ol class="steps">
          <li>
            <h3>Apri la configurazione</h3>
            <p>{c['open']}</p>
          </li>
          <li>
            <h3>Aggiungi seomcp</h3>
<pre class="code"><code>{html.escape(c['code'], quote=False)}</code></pre>
            <p class="small">Sostituisci percorso, chiave, sito e proprietà con i tuoi. Togli le variabili delle fonti che non usi.</p>{note}
          </li>
          <li>
            <h3>Verifica</h3>
            <p>{c['verify']}</p>
          </li>
        </ol>
      </section>"""


def vendor_body(v):
    prods = [BY_SLUG[p] for p in v["products"]]
    multi = len(prods) > 1
    names = " e ".join(p["name"] for p in prods)
    lead = (f"Istruzioni per {names}. Ci vogliono due minuti, credenziali a parte." if multi
            else f"{prods[0]['intro']} Ci vogliono due minuti, credenziali a parte.")
    tips, seen = [], set()
    for p in prods:
        for t in p["tips"]:
            if t not in seen:
                seen.add(t); tips.append(t)
    webs = [p["web"] for p in prods if p.get("web")]
    web = f'\n      <p class="small"><strong>Versione web:</strong> {webs[0]}</p>' if webs else ""
    tips_html = "".join(f"\n          <li>{t}</li>" for t in tips)
    sections = "\n\n".join(product_section(p, multi) for p in prods)
    return f"""      <nav class="crumbs" aria-label="Percorso"><a href="/">seomcp</a> › <a href="/installa/">Installa</a> › {html.escape(v['name'])}</nav>
      <p class="eyebrow">{html.escape(v['vendor'])}</p>
      <h1>seomcp in {html.escape(v['name'])}</h1>
      <p class="lead">{lead}</p>

{PREREQ}

{sections}{web}

      <section class="doc-block">
        <h2>Prova con una domanda</h2>
        <ul class="prompts">
          <li>Quali query sono in posizione 4-20 negli ultimi 90 giorni?</li>
          <li>Confronta questo mese con lo stesso periodo dell'anno scorso.</li>
        </ul>
      </section>

      <section class="doc-block">
        <h2>Se qualcosa non va</h2>
        <p>Questo comando controlla la configurazione e prova ogni fonte, dicendoti esattamente cosa manca:</p>
<pre class="code"><code>npx -y {PKG} doctor</code></pre>
        <ul class="tips">{tips_html}
          <li>Le variabili d'ambiente vanno impostate nella configurazione dell'assistente, non nel terminale: è l'assistente ad avviare seomcp.</li>
          <li>Ancora bloccato? <a href="{REPO}/issues/new/choose" target="_blank" rel="noopener">Apri una segnalazione</a>, allegando l'output di <code>doctor</code> senza chiavi.</li>
        </ul>
      </section>

      <section class="doc-block">
        <h2>Altri assistenti</h2>
        {INCLUDE.format(name='clients')}
      </section>"""


def clients_partial():
    items = "\n".join(f'  <li><a href="/installa/{v["slug"]}/">{html.escape(v["name"])}</a></li>' for v in VENDORS)
    return f'<ul class="ai-list">\n{items}\n</ul>\n'


GA_PAGE = f"""      <nav class="crumbs" aria-label="Percorso"><a href="/">seomcp</a> › Google Analytics</nav>
      <p class="eyebrow">Novità</p>
      <h1>Google Analytics 4 nel tuo assistente</h1>
      <p class="lead">Search Console ti dice quali query portano clic. Analytics ti dice cosa succede dopo: quanto restano i visitatori, quanti convertono, quanto fatturano. Con seomcp l'assistente vede entrambe le cose insieme.</p>

      <section class="doc-block">
        <h2>Cosa puoi chiedere</h2>
        <ul class="prompts">
          <li>Quali pagine ricevono molti clic da Google ma convertono poco?</li>
          <li>Il traffico organico di questo mese è calato rispetto all'anno scorso? Su quali pagine di destinazione?</li>
          <li>Da Bing arrivano visitatori più o meno coinvolti rispetto a Google?</li>
          <li>Quante persone stanno leggendo il nuovo articolo in questo momento?</li>
        </ul>
      </section>

      <section class="doc-block">
        <h2>I 5 tool</h2>
        <dl class="tools">
          <dt><code>ga_organic_landing_pages</code></dt><dd>Pagine di destinazione della ricerca organica, anche per singolo motore: sessioni, coinvolgimento, eventi chiave, ricavi.</dd>
          <dt><code>ga_compare_periods</code></dt><dd>Confronto con il periodo precedente o con l'anno prima, su qualsiasi metrica, con i cali e le crescite più forti.</dd>
          <dt><code>ga_report</code></dt><dd>Report libero con dimensioni, metriche e filtri a scelta, per le domande che gli altri tool non coprono.</dd>
          <dt><code>ga_realtime</code></dt><dd>Utenti attivi negli ultimi 30 minuti, per pagina, paese o dispositivo.</dd>
          <dt><code>ga_list_properties</code></dt><dd>Le proprietà GA4 a cui hai accesso, con il loro ID.</dd>
        </dl>
        <p class="small">Tutti in sola lettura: seomcp chiede a Google solo lo scope <code>analytics.readonly</code>.</p>
      </section>

      <section class="doc-block">
        <h2>Attivalo in 3 passi</h2>
        <p>Usa le stesse credenziali Google di Search Console. Se non le hai ancora, parti dalla <a href="{REPO}/blob/main/docs/google-setup.md" target="_blank" rel="noopener">guida Google</a>.</p>
        <ol class="steps">
          <li>
            <h3>Abilita le API</h3>
            <p>In Google Cloud Console, nello stesso progetto di Search Console, apri <em>API e servizi → Libreria</em> e abilita <strong>Google Analytics Data API</strong> e <strong>Google Analytics Admin API</strong>.</p>
          </li>
          <li>
            <h3>Dai accesso alla proprietà</h3>
            <p><strong>Service account:</strong> in Analytics apri <em>Amministrazione → Gestione dell'accesso alla proprietà</em>, aggiungi l'email del service account con ruolo <strong>Visualizzatore</strong>.</p>
            <p><strong>OAuth:</strong> se avevi già autorizzato seomcp, ripeti una volta l'autorizzazione per includere Analytics:</p>
<pre class="code"><code>npx -y {PKG} auth google</code></pre>
          </li>
          <li>
            <h3>Indica la proprietà</h3>
            <p>In Analytics apri <em>Amministrazione → Dettagli proprietà</em> e copia l'<strong>ID proprietà</strong>, un numero come <code>123456789</code> (non l'ID <code>G-XXXX</code>). Aggiungilo alla configurazione del tuo assistente:</p>
<pre class="code"><code>SEOMCP_GA_PROPERTY=123456789</code></pre>
            <p class="small">Facoltativo: senza, l'assistente può elencare le proprietà e chiederti quale usare.</p>
          </li>
        </ol>
      </section>

      <section class="doc-block">
        <h2>Verifica</h2>
<pre class="code"><code>npx -y {PKG} doctor</code></pre>
        <p>Deve comparire la riga <strong>Google Analytics OK</strong> con l'elenco delle proprietà. Se una API non è abilitata o manca un permesso, <code>doctor</code> ti dice esattamente cosa fare.</p>
      </section>

      <section class="doc-block">
        <h2>Configura il tuo assistente</h2>
        {INCLUDE.format(name="clients")}
      </section>"""


CWV_PAGE = f"""      <nav class="crumbs" aria-label="Percorso"><a href="/">seomcp</a> › Core Web Vitals</nav>
      <p class="eyebrow">Novità</p>
      <h1>Core Web Vitals e PageSpeed nel tuo assistente</h1>
      <p class="lead">Due punti di vista sulle prestazioni. Il <strong>Chrome UX Report</strong> dà i dati reali degli utenti Chrome, quelli che Google usa per il ranking. <strong>PageSpeed Insights</strong> fa un test di laboratorio e dice cosa correggere.</p>

      <section class="doc-block">
        <h2>Cosa puoi chiedere</h2>
        <ul class="prompts">
          <li>Il sito supera i Core Web Vitals su mobile?</li>
          <li>L'LCP è migliorato dopo il cambio di tema del mese scorso?</li>
          <li>Testa la home con PageSpeed e dimmi le tre correzioni che valgono di più.</li>
          <li>Le pagine con Core Web Vitals scarsi hanno perso posizioni su Google?</li>
        </ul>
      </section>

      <section class="doc-block">
        <h2>I 3 tool</h2>
        <dl class="tools">
          <dt><code>crux_query</code></dt><dd>Core Web Vitals reali degli ultimi 28 giorni (LCP, INP, CLS, più FCP e TTFB) per una pagina o per tutto il sito: 75° percentile, giudizio, distribuzione ed esito complessivo.</dd>
          <dt><code>crux_history</code></dt><dd>Andamento settimanale fino a 40 settimane, per vedere l'effetto di un intervento o scoprire un peggioramento.</dd>
          <dt><code>psi_analyze</code></dt><dd>Test PageSpeed Insights su mobile o desktop: punteggi, metriche, opportunità ordinate per risparmio e controlli SEO non superati.</dd>
        </dl>
        <p class="small">Uniti a Search Console, permettono di collegare prestazioni e posizioni.</p>
      </section>

      <section class="doc-block">
        <h2>Attivalo in 3 passi</h2>
        <p>Serve solo una <strong>API key gratuita</strong> di Google Cloud. I dati sono pubblici: la chiave non dà accesso al tuo account.</p>
        <ol class="steps">
          <li>
            <h3>Abilita le API</h3>
            <p>In Google Cloud Console apri <em>API e servizi → Libreria</em> e abilita <strong>Chrome UX Report API</strong> e <strong>PageSpeed Insights API</strong>.</p>
          </li>
          <li>
            <h3>Crea la chiave</h3>
            <p>In <em>API e servizi → Credenziali → Crea credenziali → Chiave API</em>. Poi, nelle <em>Restrizioni API</em>, limitala alle due API qui sopra.</p>
          </li>
          <li>
            <h3>Aggiungila alla configurazione</h3>
<pre class="code"><code>SEOMCP_GOOGLE_API_KEY=la-tua-api-key</code></pre>
          </li>
        </ol>
      </section>

      <section class="doc-block">
        <h2>Verifica</h2>
<pre class="code"><code>npx -y {PKG} doctor</code></pre>
        <p>Deve comparire la riga <strong>Chrome UX Report OK</strong>. Da sapere: CrUX pubblica dati solo per pagine e siti con abbastanza visite da Chrome. Se una pagina non ne ha, chiedi i dati di tutto il sito.</p>
      </section>

      <section class="doc-block">
        <h2>Configura il tuo assistente</h2>
        {INCLUDE.format(name="clients")}
      </section>"""


GEO_PAGE = f"""      <nav class="crumbs" aria-label="Percorso"><a href="/">seomcp</a> › GEO e AEO</nav>
      <p class="eyebrow">Novità</p>
      <h1>GEO e AEO: farsi citare dai motori AI</h1>
      <p class="lead">ChatGPT, Claude, Perplexity e AI Overviews rispondono citando pagine web. seomcp misura cosa leggono i loro crawler e quanto le tue pagine sono pronte a essere citate, poi aiuta l'assistente a ragionarci sopra.</p>

      <section class="doc-block">
        <h2>Numeri, non opinioni</h2>
        <p>I tool restituiscono <strong>solo misure oggettive</strong>, uguali per chiunque le lanci e confrontabili tra pagine e con i concorrenti. La pagina viene letta come fanno i crawler AI: l'HTML che arriva dal server, <strong>senza eseguire JavaScript</strong>.</p>
        <dl class="tools">
          <dt><code>geo_ai_access</code></dt><dd>Per ogni bot AI (GPTBot, ClaudeBot, PerplexityBot, Google-Extended…) consentito o bloccato e da quale regola, diviso tra addestramento, risposte e letture su richiesta. Più llms.txt, Content Signals di Cloudflare e riserva TDM europea.</dd>
          <dt><code>geo_page_metrics</code></dt><dd>Struttura, titoli a domanda, risposta in apertura, sezioni, dati numerici, freschezza, autore, fonti citate, dati strutturati con le proprietà mancanti, entità con sameAs. E per il sito: HTTPS ed età del dominio.</dd>
          <dt><code>geo_page_sections</code></dt><dd>Il testo della pagina diviso per titoli, con le misure di ogni sezione: la materia prima per valutare le risposte passaggio per passaggio.</dd>
        </dl>
        <p class="small">Funzionano subito, senza credenziali: le pagine analizzate sono pubbliche.</p>
      </section>

      <section class="doc-block">
        <h2>Spunti di conversazione</h2>
        <p>Sei prompt pronti guidano l'assistente dall'analisi dei numeri al racconto e alle azioni. Si richiamano dal menu del tuo assistente (in Claude Code con <code>/</code>).</p>
        <ul class="prompts plain">
          <li><strong>Audit GEO della pagina</strong>: le misure interpretate, con le correzioni in ordine di impatto.</li>
          <li><strong>Rispondo alle domande dei miei utenti?</strong> Le query a domanda di Search Console confrontate con le sezioni della pagina.</li>
          <li><strong>Perché citano loro e non me?</strong> Le tue misure accanto a quelle dei concorrenti.</li>
          <li><strong>Il mio sito è aperto alle AI?</strong> I permessi spiegati in chiaro, anche per la normativa europea.</li>
          <li><strong>Rendi citabile questo passaggio</strong>: una sezione riscritta perché regga da sola.</li>
          <li><strong>Piano editoriale per le risposte AI</strong>: dalle domande senza risposta ai contenuti da scrivere.</li>
        </ul>
      </section>

      <section class="doc-block">
        <h2>Dati strutturati</h2>
        <p>Per controllare a fondo i dati strutturati c'è il <a href="/schema/">validatore schema.org</a>, con il prompt che propone il codice corretto.</p>
      </section>

      <section class="doc-block">
        <h2>Da sapere</h2>
        <ul class="tips">
          <li>I riferimenti usati nei prompt, come una risposta in apertura di 40-60 parole, sono pratiche diffuse: i motori AI non pubblicano i loro criteri.</li>
          <li>robots.txt dichiara le tue intenzioni ai bot, ma non li blocca fisicamente.</li>
          <li>Nessun motore AI offre un'API pubblica per sapere quando vieni citato: seomcp misura quanto sei citabile, non le citazioni.</li>
          <li>Per sicurezza seomcp analizza solo siti pubblici e non raggiunge mai indirizzi della rete locale.</li>
        </ul>
        <p><a href="{REPO}/blob/main/docs/geo.md" target="_blank" rel="noopener">Tutte le misure nel dettaglio →</a></p>
      </section>

      <section class="doc-block">
        <h2>Configura il tuo assistente</h2>
        {INCLUDE.format(name="clients")}
      </section>"""


SCHEMA_PAGE = f"""      <nav class="crumbs" aria-label="Percorso"><a href="/">seomcp</a> › Validatore schema.org</nav>
      <p class="eyebrow">Novità</p>
      <h1>Validatore schema.org nel tuo assistente</h1>
      <p class="lead">Controlla i dati strutturati di una pagina, o il JSON-LD che stai per pubblicare, e fatti proporre la versione corretta pronta da incollare. Tutto in locale, senza credenziali.</p>

      <section class="doc-block">
        <h2>Quattro livelli di controllo</h2>
        <dl class="tools">
          <dt>Sintassi</dt><dd>JSON valido, <code>@context</code> di schema.org, <code>@type</code>, <code>@graph</code> e riferimenti <code>@id</code>.</dd>
          <dt>Vocabolario schema.org</dt><dd>Tipi e proprietà esistenti e ammessi per il tipo, ereditarietà compresa; date ISO 8601, URL assoluti, valori delle enumerazioni; termini superati. Per i refusi suggerisce la correzione: <code>priceCurency</code> → <code>priceCurrency</code>.</dd>
          <dt>Risultati avanzati di Google</dt><dd>Proprietà obbligatorie e consigliate per articoli, breadcrumb, prodotti, recensioni, organizzazioni, attività locali, eventi, ricette, video, FAQ, app e offerte di lavoro, con il link alla documentazione di Google.</dd>
          <dt>Coerenza con la pagina</dt><dd>Date plausibili, domande FAQ davvero visibili nella pagina, headline in linea con l'H1.</dd>
        </dl>
        <p class="small">Il vocabolario ufficiale di schema.org è incluso in seomcp: la validazione funziona offline e indica sempre la versione usata.</p>
      </section>

      <section class="doc-block">
        <h2>Cosa puoi chiedere</h2>
        <ul class="prompts">
          <li>Valida i dati strutturati della home e dimmi se sono idonei ai risultati avanzati.</li>
          <li>Questo JSON-LD prodotto è corretto prima che lo pubblichi?</li>
          <li>Correggi i dati strutturati della pagina e dammi il codice da incollare.</li>
          <li>Quali pagine del blog non hanno autore e data nei dati strutturati?</li>
        </ul>
        <p>Il prompt <strong>Correggi i miei dati strutturati</strong> fa tutto il percorso: valida, spiega i problemi, scrive il JSON-LD corretto e lo ricontrolla finché non ci sono errori.</p>
      </section>

      <section class="doc-block">
        <h2>Funziona subito</h2>
        <p>Il tool <code>schema_validate</code> non richiede credenziali: basta avere seomcp installato. Per le pagine già indicizzate si affianca a <code>gsc_inspect_url</code>, che restituisce il verdetto di Google.</p>
        <p><a href="{REPO}/blob/main/docs/schema-validator.md" target="_blank" rel="noopener">Tutti i controlli nel dettaglio →</a></p>
      </section>

      <section class="doc-block">
        <h2>Configura il tuo assistente</h2>
        {INCLUDE.format(name="clients")}
      </section>"""


WEB_NOTE = ("<strong>Versioni web non supportate.</strong> claude.ai, chatgpt.com, l'app Gemini, Microsoft 365 Copilot e Mistral Vibe sul web "
            "accettano solo server MCP remoti. seomcp gira in locale per non far uscire le tue credenziali dal computer, quindi servono le app desktop o la riga di comando.")


def main():
    out = SITE / "installa"
    out.mkdir(exist_ok=True)
    (SITE / "_partials" / "clients.html").write_text(clients_partial())

    # Rimuove pagine di assistenti non più presenti in VENDORS.
    keep = {v["slug"] for v in VENDORS}
    for d in out.iterdir():
        if d.is_dir() and d.name not in keep:
            shutil.rmtree(d)

    hub = f"""      <nav class="crumbs" aria-label="Percorso"><a href="/">seomcp</a> › Installa</nav>
      <h1>Installa seomcp</h1>
      <p class="lead">Scegli il tuo assistente.</p>
      {INCLUDE.format(name="clients")}
      <p class="small">{WEB_NOTE}</p>
{PREREQ}"""
    (out / "index.html").write_text(
        page("Installa seomcp: Claude, ChatGPT, GitHub Copilot, Gemini, Mistral",
             "Guide di installazione di seomcp, il server MCP per Search Console e Bing Webmaster, per ogni assistente AI.",
             "installa", hub))

    for v in VENDORS:
        d = out / v["slug"]
        d.mkdir(exist_ok=True)
        title = f"seomcp in {v['name']}: Search Console e Bing Webmaster"
        desc = f"Come collegare Google Search Console e Bing Webmaster Tools a {v['name']} con seomcp, il server MCP open source. Configurazione pronta da copiare."
        (d / "index.html").write_text(page(title, desc, f"installa/{v['slug']}", vendor_body(v)))

    # 301 dalle vecchie pagine per prodotto alla pagina della loro AI.
    lines = ["# Generato da scripts/build-site.py: non modificare a mano.", "",
             "error_page 404 /404.html;", "location = /404.html { internal; }", ""]
    for v in VENDORS:
        for prod in v["products"]:
            if prod == v["slug"]:
                continue
            target = f"/installa/{v['slug']}/" + (f"#{prod}" if len(v["products"]) > 1 else "")
            lines.append(f"location ~ ^/installa/{prod}/?$ {{ return 301 {target}; }}")
    (ROOT / "deploy" / "nginx-seomcp-extra.conf").write_text("\n".join(lines) + "\n")

    not_found = f"""      <p class="eyebrow">Errore 404</p>
      <h1>Pagina non trovata</h1>
      <p class="lead">L'indirizzo che hai aperto non esiste, oppure è stato spostato.</p>
      <p><a class="btn btn-primary" href="/">Torna alla home</a></p>
      <section class="doc-block">
        <h2>Installa seomcp</h2>
        {INCLUDE.format(name="clients")}
      </section>"""
    (SITE / "404.html").write_text(page("Pagina non trovata · seomcp", "La pagina richiesta non esiste.", "404", not_found)
                                   .replace('<link rel="canonical" href="https://seomcp.contentisking.guru/404/">', '<meta name="robots" content="noindex">'))

    ga_dir = SITE / "google-analytics"
    ga_dir.mkdir(exist_ok=True)
    (ga_dir / "index.html").write_text(
        page("Google Analytics 4 nel tuo assistente AI · seomcp",
             "Collega Google Analytics 4 a Claude, ChatGPT e agli altri assistenti AI con seomcp: traffico organico, conversioni e confronti, in sola lettura.",
             "google-analytics", GA_PAGE))

    cwv_dir = SITE / "core-web-vitals"
    cwv_dir.mkdir(exist_ok=True)
    (cwv_dir / "index.html").write_text(
        page("Core Web Vitals e PageSpeed nel tuo assistente AI · seomcp",
             "Core Web Vitals reali degli utenti Chrome (CrUX) e test PageSpeed Insights dentro Claude, ChatGPT e gli altri assistenti AI, con seomcp.",
             "core-web-vitals", CWV_PAGE))

    geo_dir = SITE / "geo"
    geo_dir.mkdir(exist_ok=True)
    (geo_dir / "index.html").write_text(
        page("GEO e AEO: farsi citare dai motori AI · seomcp",
             "Misure oggettive e prompt per la GEO e l'AEO: cosa leggono i crawler AI, quanto è citabile una pagina, se risponde alle domande degli utenti.",
             "geo", GEO_PAGE))

    schema_dir = SITE / "schema"
    schema_dir.mkdir(exist_ok=True)
    (schema_dir / "index.html").write_text(
        page("Validatore schema.org nel tuo assistente AI · seomcp",
             "Valida i dati strutturati JSON-LD con il vocabolario ufficiale schema.org e i requisiti di Google per i risultati avanzati, e fatti proporre la correzione.",
             "schema", SCHEMA_PAGE))

    today = date.today().isoformat()
    urls = ["/", "/geo/", "/schema/", "/google-analytics/", "/core-web-vitals/", "/installa/"] + [f"/installa/{v['slug']}/" for v in VENDORS]
    (SITE / "sitemap.xml").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "".join(f"  <url><loc>{BASE}{u}</loc><lastmod>{today}</lastmod></url>\n" for u in urls)
        + "</urlset>\n")
    print(f"Generate {len(VENDORS) + 1} pagine, partial clients.html e sitemap ({len(urls)} URL)")


if __name__ == "__main__":
    main()
