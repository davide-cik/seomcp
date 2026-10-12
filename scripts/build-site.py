#!/usr/bin/env python3
"""Genera le pagine di installazione per ogni AI in site/installa/.

Intestazione e footer vengono presi da site/index.html, così restano allineati.
Uso: python3 scripts/build-site.py
"""
import hashlib
import html
import re
import shutil
import subprocess
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "site"
BASE = "https://seomcp.contentisking.guru"
PKG = "@contentisking/seomcp"
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
        "verify": "Avvia <code>gemini</code> e digita <code>/mcp</code>: <code>seomcp</code> deve comparire con i suoi tool.",
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
          <li><strong>Node.js 22 o superiore</strong> (<a href="https://nodejs.org/it/download" target="_blank" rel="noopener">scarica</a>).</li>
          <li><strong>Le credenziali</strong> delle fonti che vuoi usare: <a href="/credenziali/#search-console">Search Console</a>, <a href="/credenziali/#google-analytics">Google Analytics 4</a>, <a href="/credenziali/#api-key">Core Web Vitals</a> e <a href="/credenziali/#bing">Bing Webmaster Tools</a>, con i link diretti nella pagina <a href="/credenziali/">Credenziali</a>. Sono tutte facoltative: GEO, schema.org e controlli tecnici funzionano senza.</li>
        </ul>
        <p>La via più rapida è la configurazione guidata: fa le domande una alla volta, prova le credenziali e scrive la configurazione dell'assistente al posto tuo.</p>
<pre class="code"><code>npx -y {PKG} setup</code></pre>
        <p class="small">seomcp è pubblicato su npm come <a href="https://www.npmjs.com/package/@contentisking/seomcp" target="_blank" rel="noopener"><code>@contentisking/seomcp</code></a>: <code>npx</code> lo scarica al primo avvio e lo tiene aggiornato.</p>
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
          <li>L'avviso <code>npm warn deprecated node-domexception</code> al primo avvio si può ignorare: arriva dalla libreria ufficiale di Google per l'autenticazione e non serve con Node 22. Sparirà quando Google aggiornerà le sue dipendenze.</li>
          <li>Ancora bloccato? <a href="{REPO}/issues/new/choose" target="_blank" rel="noopener">Apri una segnalazione</a>, allegando l'output di <code>doctor</code> senza chiavi.</li>
        </ul>
      </section>

      <section class="doc-block">
        <h2>Altri assistenti</h2>
        {INCLUDE.format(name='clients')}
      </section>"""


def clients_partial():
    items = "\n".join(f'  <li><a href="/installa/{v["slug"]}/">{html.escape(v["name"])}</a></li>' for v in VENDORS)
    m365 = f'  <li><a href="/installa/{M365_SLUG}/">Microsoft 365 Copilot <span class="ai-note">non ancora</span></a></li>'
    return f'<ul class="ai-list">\n{items}\n{m365}\n</ul>\n'


M365_SLUG = "microsoft-365-copilot"
CONTACT = "https://contentisking.guru/contattaci/"
M365_PAGE = f"""      <nav class="crumbs" aria-label="Percorso"><a href="/">seomcp</a> › <a href="/installa/">Installa</a> › Microsoft 365 Copilot</nav>
      <p class="eyebrow">Microsoft</p>
      <h1>seomcp e Microsoft 365 Copilot</h1>
      <p class="lead">Microsoft 365 Copilot ora si collega ai server MCP con i <strong>connettori federati</strong>. seomcp però, per ora, non si può aggiungere: ecco perché e cosa usare nel frattempo.</p>

      <section class="doc-block">
        <h2>Perché non ancora</h2>
        <ul class="tips">
          <li><strong>Copilot accetta solo server MCP remoti.</strong> Il connettore si crea indicando l'indirizzo web del server (<code>https://…</code>). seomcp invece gira sul tuo computer e parla con l'assistente direttamente, senza un indirizzo web: è il motivo per cui le tue credenziali Google e Bing non lasciano mai il computer.</li>
          <li><strong>Lo configura l'amministratore, non il singolo utente.</strong> I connettori si aggiungono dal centro di amministrazione di Microsoft 365 (Copilot → Connettori), con il ruolo di Global Administrator o AI Administrator e l'accesso protetto da Microsoft Entra o OAuth.</li>
          <li><strong>Serve una licenza Microsoft 365 Copilot</strong> che includa i connettori federati: controlla il tuo piano con l'amministratore.</li>
        </ul>
      </section>

      <section class="doc-block">
        <h2>Cosa usare adesso</h2>
        <p>Se lavori nel mondo Microsoft, <a href="/installa/copilot/">GitHub Copilot in VS Code</a> supporta già seomcp: stessi tool e stessi prompt, nella chat di Copilot in modalità Agent. Funzionano anche Claude, ChatGPT, Gemini CLI e Mistral Vibe.</p>
        {INCLUDE.format(name="clients")}
      </section>

      <section class="doc-block">
        <h2>Per le aziende</h2>
        <p>Una versione di seomcp da installare sul server della tua organizzazione, con accesso protetto da Microsoft Entra e pubblicata come connettore federato per tutti i colleghi, è possibile. Se ti interessa, <a href="{CONTACT}" target="_blank" rel="noopener">scrivici</a>.</p>
        <p class="small">Fonte: <a href="https://learn.microsoft.com/en-us/microsoft-365/copilot/connectors/set-up-custom-federated-connectors" target="_blank" rel="noopener">Microsoft Learn, Set up custom federated connectors</a>.</p>
      </section>"""


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
          <li>Quante visite mi portano ChatGPT, Perplexity e gli altri assistenti AI, e su quali pagine arrivano?</li>
        </ul>
      </section>

      <section class="doc-block">
        <h2>I 6 tool</h2>
        <dl class="tools">
          <dt><code>ga_organic_landing_pages</code></dt><dd>Pagine di destinazione della ricerca organica, anche per singolo motore: sessioni, coinvolgimento, eventi chiave, ricavi.</dd>
          <dt><code>ga_compare_periods</code></dt><dd>Confronto con il periodo precedente o con l'anno prima, su qualsiasi metrica, con i cali e le crescite più forti.</dd>
          <dt><code>ga_report</code></dt><dd>Report libero con dimensioni, metriche e filtri a scelta, per le domande che gli altri tool non coprono.</dd>
          <dt><code>ga_realtime</code></dt><dd>Utenti attivi negli ultimi 30 minuti, per pagina, paese o dispositivo.</dd>
          <dt><code>ga_ai_referrals</code></dt><dd>Visite dagli assistenti AI (ChatGPT, Perplexity, Gemini, Copilot, Claude…): per assistente sessioni, coinvolgimento, conversioni, ricavi e pagine di destinazione, con il confronto sul periodo prima. È una sottostima: le app spesso non passano il referrer.</dd>
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
          <dt><code>geo_entity</code></dt><dd>Il brand è un'entità riconosciuta da Wikidata e dal Knowledge Graph di Google, con il sito come sito ufficiale? E l'Organization nei dati strutturati del sito ha i sameAs verso Wikidata e Wikipedia? Le AI citano più volentieri fonti che sanno attribuire.</dd>
          <dt><code>geo_common_crawl</code></dt><dd>Le pagine del sito sono in Common Crawl, l'archivio pubblico con cui si addestrano molti modelli? Pagine, home e risposte negli ultimi crawl.</dd>
        </dl>
        <p class="small">Funzionano subito, senza credenziali: le pagine analizzate sono pubbliche. Solo il Knowledge Graph di Google chiede la <a href="/credenziali/#api-key">API key</a> di PageSpeed, con la Knowledge Graph Search API abilitata.</p>
      </section>

      <section class="doc-block">
        <h2>Spunti di conversazione</h2>
        <p>Sette prompt pronti guidano l'assistente dall'analisi dei numeri al racconto e alle azioni. Si richiamano dal menu del tuo assistente (in Claude Code con <code>/</code>).</p>
        <ul class="prompts plain">
          <li><strong>Le AI sanno chi sono?</strong> Entità su Wikidata e Google, sameAs del sito e presenza in Common Crawl.</li>
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
        <p>Per controllare a fondo i dati strutturati c'è il <a href="/schema/">validatore schema.org</a>, con il prompt che propone il codice corretto. Per farsi scegliere come risposta, partendo dalle domande vere degli utenti, c'è la pagina <a href="/aeo/">AEO</a>.</p>
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


TOOL_GROUPS = [
    ("search-console", "Google Search Console", "credenziali Google (service account o OAuth).", None, [
        ("gsc_performance", "Clic, impressioni, CTR e posizione media, raggruppati per query, pagina, paese, dispositivo, data o aspetto nei risultati. Con filtri e fino a 25.000 righe."),
        ("gsc_compare_periods", "Confronto con il periodo precedente o con lo stesso periodo dell'anno prima: i cali e le crescite di clic più forti, con i totali."),
        ("gsc_striking_distance", "Query per cui il sito è già visibile ma non in cima (posizione 4-20), ordinate per impressioni: le ottimizzazioni più rapide."),
        ("gsc_question_queries", "Le domande vere degli utenti: query a domanda (come, cosa, perché, quanto, quale, differenza…) con tipo, pagina, impressioni, clic, CTR e posizione, raggruppate per tipo e per pagina. Il punto di partenza dell'AEO."),
        ("gsc_inspect_url", "Stato di indicizzazione di un URL secondo Google: copertura, ultima scansione, canonical scelto da Google, robots.txt, risultati avanzati."),
        ("gsc_list_sitemaps", "Sitemap inviate, con data di ultimo download, URL inviati, errori e avvisi."),
        ("gsc_list_sites", "Le proprietà Search Console a cui hai accesso."),
    ]),
    ("google-analytics", "Google Analytics 4", "le stesse credenziali Google di Search Console.", "/google-analytics/", [
        ("ga_organic_landing_pages", "Pagine di destinazione della ricerca organica, anche per singolo motore: sessioni, coinvolgimento, eventi chiave e ricavi."),
        ("ga_compare_periods", "Confronto tra periodi su qualsiasi metrica, con i cali e le crescite più forti."),
        ("ga_report", "Report libero con dimensioni, metriche e filtri a scelta."),
        ("ga_realtime", "Utenti attivi negli ultimi 30 minuti, per pagina, paese o dispositivo."),
        ("ga_ai_referrals", "Visite dagli assistenti AI (ChatGPT, Perplexity, Gemini, Copilot, Claude, Le Chat…): per assistente sessioni, coinvolgimento, conversioni, ricavi e pagine di destinazione, con il confronto sul periodo prima e la quota sul traffico totale."),
        ("ga_list_properties", "Le proprietà GA4 accessibili, con il loro ID."),
    ]),
    ("bing", "Bing Webmaster Tools", "una API key di Bing Webmaster Tools.", None, [
        ("bing_query_stats", "Impressioni, clic e posizione media per query su Bing, per periodo o aggregate."),
        ("bing_page_stats", "Impressioni, clic e posizione media per pagina su Bing."),
        ("bing_keyword_stats", "Volumi di ricerca storici di una keyword su Bing, di default per Italia e italiano."),
        ("bing_inbound_links", "Link in entrata secondo l'indice di Bing (Search Console non li dà via API): pagine più linkate, siti di provenienza e testi dei link. È una fotografia attuale, senza storico."),
        ("bing_crawl", "Come Bing scansiona il sito: pagine scansionate e nell'indice giorno per giorno, risposte 2xx, 3xx, 4xx e 5xx, blocchi di robots.txt, e gli URL con problemi di scansione ordinati per link interni."),
        ("bing_list_sites", "I siti del tuo account Bing Webmaster Tools."),
    ]),
    ("core-web-vitals", "Core Web Vitals", "una API key gratuita di Google Cloud.", "/core-web-vitals/", [
        ("crux_query", "Core Web Vitals reali degli utenti Chrome negli ultimi 28 giorni (LCP, INP, CLS, FCP, TTFB): 75° percentile, giudizio e distribuzione."),
        ("crux_history", "Andamento settimanale dei Core Web Vitals reali, fino a 40 settimane."),
        ("psi_analyze", "Test PageSpeed Insights su mobile o desktop: punteggi, metriche, correzioni ordinate per risparmio e controlli SEO non superati."),
    ]),
    ("geo", "GEO e AEO", "nessuna credenziale, le pagine sono pubbliche.", "/geo/", [
        ("geo_ai_access", "Per ogni crawler AI, diviso per scopo, se può leggere il sito e per quale regola di robots.txt. Più llms.txt, Content Signals, riserva TDM europea e direttive della pagina."),
        ("geo_page_metrics", "Misure della pagina come la legge un crawler AI: struttura, risposta in apertura, sezioni, dati, freschezza, autore, fonti, dati strutturati, entità. Più HTTPS ed età del dominio."),
        ("geo_page_sections", "Il testo della pagina diviso per titoli, con le misure di ogni sezione e la leggibilità Gulpease."),
        ("geo_entity", "Il brand è un'entità riconosciuta? Wikidata e Knowledge Graph di Google: descrizione, tipo, sito ufficiale, pagine Wikipedia, profili; più i sameAs dell'Organization nei dati strutturati del sito."),
        ("geo_common_crawl", "Le pagine del sito sono in Common Crawl, l'archivio con cui si addestrano molti modelli? Pagine, home e risposte negli ultimi crawl."),
    ]),
    ("aeo", "AEO", "nessuna credenziale, le pagine sono pubbliche.", "/aeo/", [
        ("aeo_answer_check", "La pagina risponde a questa domanda? Sezione che risponde, posizione, prima frase, lunghezza del paragrafo iniziale, elenchi, tabelle, leggibilità Gulpease, forma adatta al tipo di domanda e FAQPage nei dati strutturati."),
    ]),
    ("schema", "Validatore schema.org", "nessuna credenziale.", "/schema/", [
        ("schema_validate", "Valida il JSON-LD di una pagina o incollato: sintassi, vocabolario ufficiale schema.org, requisiti di Google per i risultati avanzati, coerenza con la pagina."),
    ]),
    ("tecnico", "Controlli tecnici", "nessuna credenziale, le pagine sono pubbliche.", "/tecnico/", [
        ("tech_page_audit", "Controlli tecnici della pagina: catena di redirect, TTFB, peso e compressione, indicizzabilità, canonical, title e description, viewport, hreflang con link di ritorno, Open Graph e Twitter Card, immagini, gerarchia dei titoli, link, header di sicurezza."),
        ("tech_site_check", "Controlli tecnici del sito: sitemap (URL, lastmod, duplicati), un campione di URL della sitemap, la pagina 404 e un campione di link interni rotti o reindirizzati."),
    ]),
    ("cloudflare", "Cloudflare", "un token Cloudflare in sola lettura.", "/cloudflare/", [
        ("cf_traffic", "Visite, richieste e pagine viste giorno per giorno secondo Cloudflare, che vede ogni richiesta: anche chi rifiuta i cookie o blocca gli script, che Analytics non conta."),
        ("cf_ai_crawlers", "Quali crawler AI (GPTBot, ClaudeBot, PerplexityBot, OAI-SearchBot, ChatGPT-User…) passano davvero sul sito, quante volte, su quali pagine e con quali risposte."),
        ("cf_errors", "Le pagine che rispondono 404 o 5xx ai visitatori veri, con quante volte e in quanti giorni."),
    ]),
    ("diagnostica", "Diagnostica", "", None, [
        ("seomcp_status", "Verifica quali fonti sono configurate e funzionanti, e spiega cosa fare per quelle che non lo sono."),
        ("seomcp_guida", "Cosa posso chiedere: restituisce i prompt divisi per obiettivo (capire i dati, migliorare i risultati, farsi citare dalle AI, controlli e correzioni), con cosa serve e la domanda equivalente."),
    ]),
]

# Ogni prompt: (nome, titolo, descrizione, argomenti, tool usati, credenziali, domanda equivalente)
# Credenziali: (etichetta, ancora in /credenziali/) oppure None.
GSC = ("Google Search Console", "search-console")
GA = ("Google Analytics 4", "google-analytics")
BING = ("Bing Webmaster Tools", "bing")
KEY = ("API key Google", "api-key")
CF = ("Cloudflare", "cloudflare")
U = "https://www.tuosito.it"
# Categorie per intento, come la Prompt Guide di Bing Webmaster Tools.
# Ogni prompt: (nome, titolo, descrizione, argomenti, tool, credenziali, domanda equivalente);
# credenziali = None oppure una lista di (etichetta, ancora in /credenziali/).
PROMPT_AREAS = [
    ("capire-i-dati", "Capire i dati", "Cosa sta succedendo al sito: andamento, cali, conversioni, confronto tra motori e domande degli utenti.", [
        ("calo-traffico", "Perché sto perdendo traffico?",
         "Trova pagine e query in calo, distingue tra meno impressioni, CTR più basso o posizioni peggiori, e controlla indicizzazione e Core Web Vitals delle pagine colpite.",
         [("sito", "la proprietà Search Console, facoltativa"), ("giorni", "il periodo, di default 28")],
         ["gsc_compare_periods", "gsc_performance", "gsc_inspect_url", "crux_query"], [GSC],
         "Perché il sito ha perso clic nelle ultime 4 settimane? Dimmi quali pagine e la causa più probabile."),
        ("report-mensile", "Report mensile per il cliente",
         "Andamento su Google, pagine e query migliori e peggiori, conversioni organiche e tre azioni per il mese successivo, scritto per chi non fa SEO.",
         [("sito", "la proprietà Search Console, facoltativa"), ("mese", "il mese da raccontare, di default gli ultimi 28 giorni")],
         ["gsc_compare_periods", "gsc_performance", "ga_compare_periods", "ga_organic_landing_pages"], [GSC, GA],
         "Preparami il report di settembre per il cliente, comprensibile per chi non fa SEO."),
        ("traffico-che-non-converte", "Traffico che non converte",
         "Incrocia Search Console e Analytics: pagine con molti clic da Google ma poche conversioni, con ipotesi concrete leggendo la pagina.",
         [("sito", "la proprietà Search Console, facoltativa"), ("giorni", "il periodo, di default 28")],
         ["ga_organic_landing_pages", "gsc_performance", "geo_page_sections"], [GSC, GA],
         "Quali pagine ricevono molti clic da Google ma convertono poco, e perché?"),
        ("google-vs-bing", "Google e Bing a confronto",
         "Query e pagine dove i due motori divergono, con i volumi di ricerca di Bing: dove recuperare traffico e perché Bing conta anche per le AI.",
         [("sito", "la proprietà Search Console, facoltativa"), ("giorni", "il periodo, di default 28")],
         ["gsc_performance", "bing_query_stats", "bing_page_stats", "bing_keyword_stats"], [GSC, BING],
         "Dove vado bene su Google e male su Bing, e il contrario?"),
        ("domande-utenti", "Rispondo alle domande dei miei utenti?",
         "Prende da Search Console le query a domanda che portano alla pagina e verifica, sezione per sezione, se trovano risposta.",
         [("url", "la pagina"), ("giorni", "il periodo da considerare, di default 90")],
         ["gsc_performance", "geo_page_sections"], [GSC],
         "Quali domande fanno le persone che arrivano su questa pagina, e a quali non rispondo?"),
    ]),
    ("migliorare", "Migliorare i risultati", "Dove si guadagna di più con meno lavoro: posizioni, CTR, contenuti in concorrenza, velocità e nuovi contenuti.", [
        ("opportunita-distanza-di-tiro", "Opportunità a distanza di tiro",
         "Prende le query in posizione 4-20, legge le pagine che si posizionano e propone cosa aggiungere a ciascuna per salire.",
         [("sito", "la proprietà Search Console, facoltativa"), ("giorni", "il periodo, di default 90")],
         ["gsc_striking_distance", "geo_page_sections"], [GSC],
         "Quali pagine sono quasi in prima pagina e cosa aggiungo a ciascuna per salire?"),
        ("title-description-ctr", "Title e description che non convincono",
         "Trova le pagine con un CTR più basso del normale per la loro posizione e propone title e description riscritti.",
         [("sito", "la proprietà Search Console, facoltativa"), ("giorni", "il periodo, di default 28")],
         ["gsc_performance", "tech_page_audit"], [GSC],
         "Quali pagine hanno un CTR troppo basso per la loro posizione? Riscrivimi title e description."),
        ("cannibalizzazione", "Pagine in concorrenza tra loro",
         "Trova le query per cui si posizionano più pagine del sito e indica quale tenere come principale e cosa fare delle altre.",
         [("sito", "la proprietà Search Console, facoltativa"), ("giorni", "il periodo, di default 90")],
         ["gsc_performance"], [GSC],
         "Ci sono query per cui più pagine del sito si fanno concorrenza?"),
        ("piano-core-web-vitals", "Piano per i Core Web Vitals",
         "Dati reali degli utenti e andamento, poi il test di laboratorio sulle pagine peggiori, con le correzioni ordinate per risparmio.",
         [("url", "il sito o una pagina")],
         ["crux_query", "crux_history", "psi_analyze"], [KEY],
         f"Il sito supera i Core Web Vitals? Fammi un piano per migliorarli, partendo da {U}."),
        ("piano-editoriale-ai", "Piano editoriale per le risposte AI",
         "Dalle domande degli utenti che il sito non soddisfa ricava le nuove sezioni, le FAQ e le pagine da scrivere.",
         [("sito", "la proprietà Search Console o l'URL del sito"), ("giorni", "il periodo da considerare, di default 90")],
         ["gsc_performance", "geo_page_sections"], [GSC],
         "Fammi un piano editoriale con le domande degli utenti a cui il sito non risponde ancora."),
    ]),
    ("farsi-citare", "Farsi citare dalle AI", "GEO e AEO: farsi leggere, capire e citare da ChatGPT, Perplexity, Gemini e dalle AI Overviews di Google.", [
        ("ottimizza-risposte", "Ottimizza le risposte (AEO)",
         "Parte dalle domande vere degli utenti in Search Console, verifica se le pagine rispondono in modo estraibile da snippet, assistenti vocali e risposte AI, e riscrive i blocchi risposta nella forma giusta per ogni tipo di domanda.",
         [("sito", "la proprietà Search Console, facoltativa"), ("pagina", "una sezione del sito, es. /blog/, facoltativa"), ("giorni", "il periodo, di default 90")],
         ["gsc_question_queries", "aeo_answer_check", "schema_validate"], [GSC],
         "Quali domande fanno gli utenti su Google, e le mie pagine rispondono in modo che le scelgano snippet e assistenti AI?"),
        ("traffico-dalle-ai", "Quanto traffico mi portano le AI?",
         "Visite da ChatGPT, Perplexity, Gemini, Copilot e dagli altri assistenti: quante sono, se crescono, su quali pagine arrivano e se convertono, accanto ai crawler AI che leggono il sito.",
         [("url", "il sito, facoltativo"), ("giorni", "il periodo, di default 28")],
         ["ga_ai_referrals", "ga_report", "geo_page_metrics", "cf_ai_crawlers"], [GA],
         "Quante visite mi portano ChatGPT, Perplexity e gli altri assistenti AI, su quali pagine, e convertono?"),
        ("le-ai-sanno-chi-sono", "Le AI sanno chi sono?",
         "Il brand è un'entità riconosciuta da Wikidata e dal Knowledge Graph di Google? Il sito è collegato con i sameAs? Le pagine sono in Common Crawl, l'archivio con cui si addestrano molti modelli?",
         [("url", "la home del sito"), ("nome", "il nome del brand, facoltativo")],
         ["geo_entity", "geo_common_crawl", "geo_ai_access", "schema_validate"], None,
         f"Il mio brand è riconosciuto come entità da Wikidata e da Google? E le pagine di {U} sono in Common Crawl?"),
        ("audit-geo-pagina", "Audit GEO della pagina",
         "Interpreta le misure GEO di una pagina (risposta in apertura, sezioni, dati, fonti, autore, freschezza, accesso dei crawler AI) e propone le correzioni in ordine di impatto.",
         [("url", "la pagina da analizzare")],
         ["geo_page_metrics", "geo_ai_access", "geo_page_sections"], None,
         "Analizza https://www.tuosito.it/guida dal punto di vista GEO: cosa cambio per farmi citare?"),
        ("ai-che-leggono-il-sito", "Quali AI leggono davvero il mio sito?",
         "Confronta i crawler AI che passano davvero sul sito (dati di Cloudflare) con quelli ammessi da robots.txt: chi legge cosa, chi è bloccato, quali pagine interessano ai motori AI.",
         [("url", "il sito"), ("giorni", "il periodo, fino a 28, di default 28")],
         ["cf_ai_crawlers", "geo_ai_access"], [CF],
         "Quali crawler AI passano davvero sul mio sito, su quali pagine, e quali sto bloccando?"),
        ("sito-aperto-alle-ai", "Il mio sito è aperto alle AI?",
         "Spiega bot per bot quali crawler AI possono leggere il sito e per quale regola, distinguendo addestramento e risposte, anche alla luce della normativa europea.",
         [("url", "una pagina qualsiasi del sito")],
         ["geo_ai_access"], None,
         "Quali crawler AI possono leggere il mio sito? E quali sto bloccando senza volerlo?"),
        ("confronto-concorrenti", "Perché citano loro e non me?",
         "Mette a confronto le misure della tua pagina con quelle dei concorrenti e racconta solo le differenze che contano.",
         [("url", "la tua pagina"), ("concorrenti", "gli URL dei concorrenti, separati da virgola")],
         ["geo_page_metrics"], None,
         "Perché ChatGPT cita la pagina del mio concorrente e non la mia? Confronta le due pagine."),
        ("passaggio-citabile", "Rendi citabile questo passaggio",
         "Riscrive una sezione della pagina perché un motore AI possa estrarla e citarla da sola, senza il contesto intorno.",
         [("url", "la pagina"), ("sezione", "il titolo, o parte del titolo, della sezione")],
         ["geo_page_sections"], None,
         "Riscrivi la sezione \"Quanto costa\" di questa pagina perché un assistente AI possa citarla."),
    ]),
    ("controlli", "Controlli e correzioni", "Verifiche tecniche con la lista delle correzioni pronta: prima di pubblicare, dopo una migrazione, quando qualcosa non torna.", [
        ("audit-tecnico", "Audit tecnico del sito",
         "Controlla pagina e sito (redirect, indicizzabilità, sitemap, 404, link rotti, prestazioni, dati strutturati) e chiude con una tabella di correzioni in ordine di priorità.",
         [("url", "la pagina da cui partire, di solito la home")],
         ["tech_page_audit", "tech_site_check", "psi_analyze", "crux_query", "schema_validate"], None,
         "Fai un audit tecnico di https://www.tuosito.it e dimmi le cinque correzioni più urgenti."),
        ("correggi-dati-strutturati", "Correggi i miei dati strutturati",
         "Valida il JSON-LD della pagina, spiega i problemi in chiaro e scrive il codice corretto, ricontrollandolo finché non ci sono errori.",
         [("url", "la pagina da correggere")],
         ["schema_validate"], None,
         "Valida i dati strutturati di https://www.tuosito.it/prodotto e dammi il JSON-LD corretto."),
        ("controllo-migrazione", "Controllo dopo una migrazione",
         "Dopo un cambio di dominio, di piattaforma o di URL: redirect, canonical, sitemap e indicizzazione delle pagine chiave, più il traffico prima e dopo.",
         [("url", "la home del sito nuovo"), ("data", "la data della migrazione, facoltativa")],
         ["tech_site_check", "tech_page_audit", "gsc_inspect_url", "gsc_compare_periods", "gsc_performance"], [GSC],
         "Ho appena migrato il sito: controlla redirect, canonical, sitemap e indicizzazione delle pagine più importanti."),
    ]),
]
PROMPTS = [p for *_, items in PROMPT_AREAS for p in items]
# Domande dell'archivio, contate dal sorgente (una chiamata q(...) per domanda).
DOMANDE = len(re.findall(r"^\s*q\('", (ROOT / "src" / "library" / "domande.ts").read_text(), re.M))

# Tool e prompt già nel repository ma non ancora nel pacchetto npm (la versione pubblicata la legge published_version()).
# Il sito li segna "in arrivo": dopo il rilascio svuota l'insieme e rigenera il sito.
IN_ARRIVO: set[str] = set()
SOON = '<span class="badge-soon" title="Disponibile con la prossima versione del pacchetto npm">in arrivo</span>'
SOON_NOTE = ('<p class="small">Le voci segnate ' + SOON + ' sono pronte e arrivano con la prossima versione del pacchetto npm: '
             'chi installa oggi con <code>npx</code> non le vede ancora.</p>')


def soon(name: str) -> str:
    return f" {SOON}" if name in IN_ARRIVO else ""


# Gruppo di tool → ancora della pagina tool e sezione delle credenziali


CRED_FOR_GROUP = {
    "search-console": ("credenziali Google: service account o OAuth", "search-console"),
    "google-analytics": ("le stesse credenziali Google di Search Console", "google-analytics"),
    "bing": ("una API key di Bing Webmaster Tools", "bing"),
    "core-web-vitals": ("una API key gratuita di Google Cloud", "api-key"),
    "geo": ("nessuna credenziale, le pagine sono pubbliche", "senza-credenziali"),
    "schema": ("nessuna credenziale", "senza-credenziali"),
    "tecnico": ("nessuna credenziale, le pagine sono pubbliche", "senza-credenziali"),
    "aeo": ("nessuna credenziale, le pagine sono pubbliche", "senza-credenziali"),
    "cloudflare": ("un token Cloudflare in sola lettura", "cloudflare"),
}


def tools_page() -> str:
    groups = []
    for anchor, name, _needs, page_url, tools in TOOL_GROUPS:
        title = f'<a class="plain" href="{page_url}">{html.escape(name)}</a>' if page_url else html.escape(name)
        items = "\n".join(f'          <dt id="{t}"><code>{t}</code>{soon(t)}</dt><dd>{html.escape(d)}</dd>' for t, d in tools)
        group_soon = f" {SOON}" if all(t in IN_ARRIVO for t, _d in tools) else ""
        cred = CRED_FOR_GROUP.get(anchor)
        needs_html = (f'\n        <p class="small">Richiede: <a href="/credenziali/#{cred[1]}">{html.escape(cred[0])}</a>.</p>'
                      if cred else "")
        groups.append(f"""      <section class="doc-block" id="{anchor}">
        <h2>{title} <span class="area-count">{len(tools)} tool</span>{group_soon}</h2>{needs_html}
        <dl class="tools">
{items}
        </dl>
      </section>""")
    total = sum(len(t) for *_, t in TOOL_GROUPS)
    links = [f'<a href="/prompt/#{a}">{n}</a>' for a, n, _d, _p in PROMPT_AREAS]
    areas = ", ".join(links[:-1]) + " e " + links[-1]
    return f"""      <nav class="crumbs" aria-label="Percorso"><a href="/">seomcp</a> › Tool</nav>
      <h1>{total} tool e {len(PROMPTS)} prompt</h1>
      <p class="lead">Tutti in sola lettura: seomcp legge i dati, non modifica nulla. Collega solo le fonti che usi: ogni gruppo indica cosa serve, e la pagina <a href="/credenziali/">Credenziali</a> spiega come ottenerlo con i link diretti.</p>
      {SOON_NOTE if IN_ARRIVO else ""}

{chr(10).join(groups)}

      <section class="doc-block" id="prompt">
        <h2>I prompt <span class="area-count">{len(PROMPTS)}</span></h2>
        <p>Oltre ai tool ci sono {len(PROMPTS)} prompt: analisi già impostate che combinano più tool e guidano l'assistente dai numeri alle correzioni. Sono divisi per {areas}.</p>
        <p class="area-more"><a href="/prompt/">Tutti i prompt in dettaglio →</a></p>
      </section>

      <section class="doc-block">
        <h2>Configura il tuo assistente</h2>
        {INCLUDE.format(name="clients")}
      </section>"""

# Novità per la pagina /novita/, dalla più recente. Ogni voce: (data, titolo, testo, link, nomi di tool o prompt).
# Se uno dei nomi è in IN_ARRIVO la voce mostra il badge "in arrivo". Va aggiornata a ogni funzionalità nuova.
NOVITA = [
    ("2026-10-12", "AEO: farsi scegliere come risposta",
     "Le domande che gli utenti fanno davvero su Google, prese da Search Console e divise per tipo. Per ogni domanda, se la pagina risponde: in quale sezione, con quale prima frase, con quale lunghezza e nella forma giusta (passaggi, tabella, numero, sì o no). "
     "La leggibilità Gulpease, pensata per l'italiano, per ogni sezione. E il prompt «Ottimizza le risposte», che scrive i blocchi risposta pronti da incollare.",
     [("/aeo/", "AEO"), ("/prompt/#ottimizza-risposte", "Il prompt")], ["gsc_question_queries", "aeo_answer_check"]),
    ("2026-10-12", "108 domande pronte",
     "L'archivio di domande da copiare nell'assistente passa a 108, in 10 temi: e-commerce e attività locali, incroci tra Search Console, Analytics, Bing e Cloudflare, visibilità nelle AI, report per il cliente. Più di un terzo funziona senza credenziali.",
     [("https://github.com/davide-cik/seomcp/tree/main/domande", "Le domande su GitHub"), ("/prompt/", "I prompt")], []),
    ("2026-10-12", "Visite dalle AI, entità e Common Crawl",
     "Quattro tool per l'ultimo tratto della GEO. Quante visite portano davvero ChatGPT, Perplexity, Gemini, Copilot e gli altri assistenti, su quali pagine e se convertono. "
     "Se il brand è un'entità riconosciuta da Wikidata e dal Knowledge Graph di Google, e se il sito è collegato con i sameAs. "
     "Se le pagine sono in Common Crawl, l'archivio con cui si addestrano molti modelli. E come Bing scansiona e indicizza il sito. Con due prompt nuovi: «Quanto traffico mi portano le AI?» e «Le AI sanno chi sono?».",
     [("/geo/", "GEO e AEO"), ("/google-analytics/", "Google Analytics 4"), ("/tool/#bing_crawl", "bing_crawl")],
     ["ga_ai_referrals", "geo_entity", "geo_common_crawl", "bing_crawl"]),
    ("2026-10-12", "Cloudflare: visite reali e crawler AI che passano davvero",
     "Se il sito passa da Cloudflare, anche con il piano gratuito: le visite di chi rifiuta i cookie, i crawler AI che leggono davvero il sito e su quali pagine, gli errori 404 e 5xx visti dai visitatori. "
     "Insieme, i link in entrata secondo Bing.",
     [("/cloudflare/", "Cloudflare"), ("/tool/#bing_inbound_links", "bing_inbound_links")], ["cf_traffic", "bing_inbound_links"]),
    ("2026-10-12", "Guida ai prompt e 10 nuovi prompt sui dati",
     "I prompt divisi per obiettivo: capire i dati, migliorare i risultati, farsi citare dalle AI, controlli e correzioni. Nuove analisi pronte: calo di traffico, opportunità a distanza di tiro, CTR, cannibalizzazione, traffico che non converte, report mensile, piano per i Core Web Vitals, controllo dopo una migrazione, Google e Bing a confronto, quali AI leggono il sito. "
     "Alla domanda «cosa posso chiedere?» l'assistente risponde con la guida.",
     [("/prompt/", "I prompt")], ["calo-traffico", "seomcp_guida"]),
    ("2026-10-09", "Archivio di domande pronte",
     "Domande da copiare nell'assistente, divise in 10 temi, ciascuna con le credenziali che servono, i tool che usa e cosa aspettarsi. Dentro seomcp sono anche risorse MCP.",
     [("https://github.com/davide-cik/seomcp/tree/main/domande", "Le domande su GitHub")], []),
    ("2026-10-09", "Su npm: si installa con un comando",
     "seomcp è pubblicato come @contentisking/seomcp: serve solo Node.js, npx fa il resto. Niente git, niente compilazione.",
     [("/installa/", "Installa")], []),
    ("2026-10-09", "Configurazione guidata",
     "Il comando seomcp setup fa le domande una alla volta, apre le pagine giuste delle console, prova subito ogni credenziale e aggiunge seomcp all'assistente scelto, senza chiavi nei suoi file.",
     [("/credenziali/", "Credenziali")], []),
    ("2026-09-29", "Controlli tecnici",
     "Redirect, TTFB, indicizzabilità, canonical, hreflang, Open Graph, immagini, titoli e header di sicurezza della pagina; sitemap, pagina 404 e link interni rotti del sito. Senza credenziali.",
     [("/tecnico/", "Controlli tecnici")], []),
    ("2026-09-28", "Validatore schema.org",
     "Valida il JSON-LD di una pagina o incollato con il vocabolario ufficiale di schema.org e i requisiti di Google per i risultati avanzati, e propone il codice corretto.",
     [("/schema/", "Validatore schema.org")], []),
    ("2026-09-28", "GEO e AEO",
     "Misure oggettive di come i crawler AI vedono sito e pagine: chi può leggere cosa, risposta in apertura, sezioni, dati, fonti, autore, freschezza. Con i prompt per farsi citare.",
     [("/geo/", "GEO e AEO")], []),
    ("2026-09-28", "Core Web Vitals e PageSpeed",
     "I dati reali degli utenti Chrome, con l'andamento fino a 40 settimane, e il test di PageSpeed Insights con le correzioni ordinate per risparmio.",
     [("/core-web-vitals/", "Core Web Vitals")], []),
    ("2026-09-28", "Google Analytics 4",
     "Pagine di destinazione organiche, conversioni, confronti tra periodi, report liberi e utenti in tempo reale, accanto ai dati di Search Console.",
     [("/google-analytics/", "Google Analytics 4")], []),
    ("2026-09-28", "La prima versione",
     "Search Console e Bing Webmaster Tools nell'assistente AI, in sola lettura e con le credenziali sul tuo computer.",
     [("/tool/", "Tutti i tool")], []),
]

MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"]


def data_it(iso: str) -> str:
    y, m, d = iso.split("-")
    return f"{int(d)} {MESI[int(m) - 1]} {y}"


def novita_page() -> str:
    items = []
    for iso, title, text, links, names in NOVITA:
        badge = f" {SOON}" if any(n in IN_ARRIVO for n in names) else ""
        link_html = " ".join(
            ext(u, label) if u.startswith("http") else f'<a href="{u}">{html.escape(label)} →</a>' for u, label in links)
        items.append(f"""        <li class="news-item">
          <time datetime="{iso}">{data_it(iso)}</time>
          <h2>{html.escape(title)}{badge}</h2>
          <p>{html.escape(text)}</p>
          <p class="links">{link_html}</p>
        </li>""")
    return f"""      <nav class="crumbs" aria-label="Percorso"><a href="/">seomcp</a> › Novità</nav>
      <h1>Novità</h1>
      <p class="lead">Cosa è cambiato in seomcp, dalla novità più recente alla prima versione. Ogni voce porta alla pagina che spiega cosa puoi chiedere. Il dettaglio tecnico di ogni versione è nel <a href="{REPO}/blob/main/CHANGELOG.md" target="_blank" rel="noopener">CHANGELOG</a>.</p>
      {SOON_NOTE if IN_ARRIVO else ""}
      <ol class="news">
{chr(10).join(items)}
      </ol>

      <section class="doc-block">
        <h2>Configura il tuo assistente</h2>
        {INCLUDE.format(name="clients")}
      </section>"""


GCP = "https://console.cloud.google.com"
GOOGLE_APIS = ["searchconsole.googleapis.com", "analyticsdata.googleapis.com", "analyticsadmin.googleapis.com",
               "chromeuxreport.googleapis.com", "pagespeedonline.googleapis.com", "kgsearch.googleapis.com"]


def ext(url: str, label: str) -> str:
    return f'<a class="go" href="{html.escape(url)}" target="_blank" rel="noopener">{label} ↗</a>'


def credentials_page() -> str:
    count = {anchor: len(tools) for anchor, _n, _r, _u, tools in TOOL_GROUPS}
    free_tools = count["geo"] + count["schema"] + count["tecnico"]
    free_prompts = sum(1 for p in PROMPTS if p[5] is None)
    vendor_of = {c: v["slug"] for v in VENDORS for c in v["products"]}
    options = "\n".join(
        f'              <option value="{c["slug"]}" data-guide="/installa/{vendor_of[c["slug"]]}/#{c["slug"]}">{html.escape(c["name"])}</option>'
        for c in CLIENTS)
    return f"""      <nav class="crumbs" aria-label="Percorso"><a href="/">seomcp</a> › Credenziali</nav>
      <h1>Credenziali</h1>
      <p class="lead">Cosa serve per collegare ogni fonte, con i link diretti alle pagine giuste di Google e Bing. Sono tutte facoltative: configura solo quelle che usi. In fondo trovi la configurazione già pronta da incollare nel tuo assistente.</p>

      <div class="table-wrap">
        <table class="cred-table">
          <thead><tr><th>Fonte</th><th>Cosa serve</th><th>Tempo</th><th>Sblocca</th></tr></thead>
          <tbody>
            <tr><td><a href="#senza-credenziali">GEO, schema.org, controlli tecnici</a></td><td>Niente</td><td>0 minuti</td><td><a href="/tool/#geo">{free_tools} tool</a> e <a href="/prompt/">{free_prompts} prompt</a></td></tr>
            <tr><td><a href="#search-console">Search Console</a></td><td>Service account o OAuth</td><td>10 minuti</td><td><a href="/tool/#search-console">{count["search-console"]} tool</a></td></tr>
            <tr><td><a href="#google-analytics">Analytics 4</a></td><td>Le stesse credenziali Google</td><td>3 minuti</td><td><a href="/tool/#google-analytics">{count["google-analytics"]} tool</a></td></tr>
            <tr><td><a href="#api-key">Core Web Vitals</a></td><td>API key Google Cloud</td><td>3 minuti</td><td><a href="/tool/#core-web-vitals">{count["core-web-vitals"]} tool</a></td></tr>
            <tr><td><a href="#cloudflare">Cloudflare</a></td><td>Token in sola lettura</td><td>3 minuti</td><td><a href="/tool/#cloudflare">{count["cloudflare"]} tool</a></td></tr>
            <tr><td><a href="#bing">Bing Webmaster</a></td><td>API key Bing</td><td>2 minuti</td><td><a href="/tool/#bing">{count["bing"]} tool</a></td></tr>
          </tbody>
        </table>
      </div>
      <p class="small">I link a Google e Bing aprono le pagine nel tuo account: se non hai fatto l'accesso, prima ti chiedono di farlo.</p>

      <div class="notice" role="note">
        <p><strong>Preferisci il terminale?</strong> La configurazione guidata fa questi passaggi con te: apre le pagine giuste, prova ogni chiave appena la inserisci e aggiunge seomcp al tuo assistente, senza chiavi nei suoi file.</p>
<pre class="code"><code>npx -y {PKG} setup</code></pre>
      </div>

      <section class="doc-block" id="senza-credenziali">
        <h2>Senza credenziali</h2>
        <p>I tool <a href="/geo/">GEO e AEO</a>, il <a href="/schema/">validatore schema.org</a> e i <a href="/tecnico/">controlli tecnici</a> leggono pagine pubbliche: funzionano appena installi seomcp, senza configurare niente. Se vuoi solo questi, salta direttamente a <a href="#configura">Configura l'assistente</a>.</p>
      </section>

      <section class="doc-block" id="google-cloud">
        <h2>1. Progetto Google Cloud</h2>
        <p>Serve per Search Console, Analytics e Core Web Vitals. Un solo progetto basta per tutto.</p>
        <ol class="steps">
          <li>
            <h3>Crea il progetto</h3>
            <p>Chiamalo, per esempio, <code>seomcp</code>. Se ne hai già uno, puoi usarlo: selezionalo dal menu in alto nella console.</p>
            <p class="links">{ext(f"{GCP}/projectcreate", "Crea un progetto")}</p>
          </li>
          <li>
            <h3>Abilita le API con un clic</h3>
            <p>Il link ti chiede di scegliere il progetto e poi abilita insieme le sei API: Search Console, Analytics Data, Analytics Admin, Chrome UX Report, PageSpeed Insights e Knowledge Graph Search. Abilitarle tutte non costa nulla e da sole non danno accesso a niente.</p>
            <p class="links">{ext(f"{GCP}/flows/enableapi?apiid=" + ",".join(GOOGLE_APIS), f"Abilita le {len(GOOGLE_APIS)} API")}</p>
          </li>
        </ol>
      </section>

      <section class="doc-block" id="search-console">
        <h2>2. Search Console</h2>
        <p>Scegli una delle due strade. L'accesso è sempre <strong>in sola lettura</strong>.</p>
        <div class="table-wrap">
          <table class="cred-table">
            <thead><tr><th></th><th><a href="#service-account">Service account</a></th><th><a href="#oauth">OAuth con un client tuo</a></th></tr></thead>
            <tbody>
              <tr><td>Ideale per</td><td>team, server, più persone</td><td>singolo professionista</td></tr>
              <tr><td>Vede</td><td>solo le proprietà dove lo aggiungi come utente</td><td>tutte le proprietà del tuo account Google</td></tr>
              <tr><td>Rinnovo</td><td>nessuno</td><td>nessuno, dopo la prima autorizzazione</td></tr>
            </tbody>
          </table>
        </div>

        <h3 id="service-account">Strada A: service account</h3>
        <ol class="steps">
          <li>
            <h3>Crea il service account</h3>
            <p>Scegli il progetto, poi dagli un nome, per esempio <code>seomcp</code>. Non servono ruoli sul progetto: premi <strong>Fine</strong>.</p>
            <p class="links">{ext(f"{GCP}/projectselector/iam-admin/serviceaccounts/create", "Crea il service account")}</p>
          </li>
          <li>
            <h3>Scarica la chiave JSON</h3>
            <p>Nell'elenco apri il service account, vai su <strong>Chiavi → Aggiungi chiave → Crea nuova chiave → JSON</strong>. Copia anche la sua email, del tipo <code>seomcp@nome-progetto.iam.gserviceaccount.com</code>.</p>
            <p class="links">{ext(f"{GCP}/iam-admin/serviceaccounts", "Elenco dei service account")}</p>
            <p>Sposta il file in un posto sicuro, fuori da qualsiasi repository (macOS e Linux):</p>
<pre class="code"><code>mkdir -p ~/.config/seomcp
mv ~/Downloads/seomcp-*.json ~/.config/seomcp/service-account.json
chmod 600 ~/.config/seomcp/service-account.json</code></pre>
            <p class="small">Su Windows, per esempio, <code>C:\\Users\\tuonome\\.config\\seomcp\\service-account.json</code>. Se la tua organizzazione blocca la creazione di chiavi (policy <code>iam.disableServiceAccountKeyCreation</code>), usa la strada B.</p>
          </li>
          <li>
            <h3>Aggiungilo come utente in Search Console</h3>
            <p>Scegli la proprietà dal selettore in alto, poi <strong>Aggiungi utente</strong>: incolla l'email del service account con il permesso <strong>Con restrizioni</strong>, che basta per leggere i dati (se ricevi un errore 403, usa <strong>Completo</strong>). Ripeti per ogni proprietà.</p>
            <p class="links">{ext("https://search.google.com/search-console/users", "Utenti e autorizzazioni")}</p>
          </li>
        </ol>
        <p>Variabile da impostare: <code>GOOGLE_APPLICATION_CREDENTIALS</code> con il percorso del file.</p>

        <h3 id="oauth">Strada B: OAuth con un client tuo</h3>
        <ol class="steps">
          <li>
            <h3>Dai un nome all'app</h3>
            <p>Compila nome dell'app (per esempio <code>seomcp</code>) e la tua email.</p>
            <p class="links">{ext(f"{GCP}/auth/branding", "Informazioni sull'app")}</p>
          </li>
          <li>
            <h3>Pubblicala</h3>
            <p>Scegli il pubblico <strong>Esterno</strong> (o <strong>Interno</strong> se hai Google Workspace) e, con Esterno, premi <strong>Pubblica app</strong> per portarla in produzione: in stato di test Google fa scadere l'autorizzazione dopo 7 giorni. Non serve la verifica, perché la usi solo tu: al login vedrai l'avviso "app non verificata", clicca <strong>Avanzate → Vai a seomcp</strong>.</p>
            <p class="links">{ext(f"{GCP}/auth/audience", "Pubblico")}</p>
          </li>
          <li>
            <h3>Crea il client</h3>
            <p>Premi <strong>Crea client</strong> e scegli il tipo di applicazione <strong>App desktop</strong>. Copia <strong>ID client</strong> e <strong>Client secret</strong>.</p>
            <p class="links">{ext(f"{GCP}/auth/clients", "Client OAuth")}</p>
          </li>
          <li>
            <h3>Autorizza, una volta sola</h3>
<pre class="code"><code>export SEOMCP_GOOGLE_CLIENT_ID="xxx.apps.googleusercontent.com"
export SEOMCP_GOOGLE_CLIENT_SECRET="xxx"
npx -y {PKG} auth google</code></pre>
            <p>Si apre il browser: accedi con l'account che vede le proprietà. Il token resta in <code>~/.config/seomcp/google-token.json</code>, leggibile solo dal tuo utente.</p>
          </li>
        </ol>
        <p>Variabili da impostare: <code>SEOMCP_GOOGLE_CLIENT_ID</code> e <code>SEOMCP_GOOGLE_CLIENT_SECRET</code>.</p>

        <h3>La proprietà predefinita</h3>
        <p>Facoltativa: <code>SEOMCP_GSC_SITE</code> deve coincidere con la proprietà in Search Console. Per una proprietà <strong>di dominio</strong> scrivi <code>sc-domain:tuosito.it</code>, per una <strong>con prefisso URL</strong> <code>https://www.tuosito.it/</code>, con la barra finale. Il comando <code>doctor</code> mostra l'elenco esatto.</p>
      </section>

      <section class="doc-block" id="google-analytics">
        <h2>3. Google Analytics 4</h2>
        <p>Usa le stesse credenziali di Search Console e le API sono già abilitate dal passo 1. Restano due cose.</p>
        <ol class="steps">
          <li>
            <h3>Dai accesso alla proprietà</h3>
            <p><strong>Service account:</strong> in Analytics apri <strong>Amministrazione → Gestione dell'accesso alla proprietà → + → Aggiungi utenti</strong>, incolla l'email del service account e scegli il ruolo <strong>Visualizzatore</strong>.<br>
            <strong>OAuth:</strong> se avevi autorizzato seomcp prima di attivare Analytics, ripeti <code>auth google</code> una volta.</p>
            <p class="links">{ext("https://analytics.google.com/analytics/web/#/?pagename=admin", "Amministrazione di Analytics")}</p>
          </li>
          <li>
            <h3>Copia l'ID della proprietà</h3>
            <p>In <strong>Amministrazione → Dettagli proprietà</strong>: è un numero come <code>123456789</code>, da non confondere con l'ID di misurazione <code>G-XXXXXXX</code>. Va in <code>SEOMCP_GA_PROPERTY</code>, facoltativa: senza, l'assistente elenca le proprietà e chiede quale usare.</p>
          </li>
        </ol>
        <p class="small">Cosa puoi chiedere con Analytics: <a href="/google-analytics/">pagina Google Analytics 4</a>.</p>
      </section>

      <section class="doc-block" id="api-key">
        <h2>4. API key per i Core Web Vitals</h2>
        <p>Una chiave gratuita per PageSpeed Insights e Chrome UX Report, e facoltativamente per il Knowledge Graph di Google (il tool <a href="/tool/#geo_entity"><code>geo_entity</code></a>). I dati sono pubblici: la chiave non dà accesso al tuo account.</p>
        <ol class="steps">
          <li>
            <h3>Crea la chiave</h3>
            <p><strong>Crea credenziali → Chiave API</strong>.</p>
            <p class="links">{ext(f"{GCP}/apis/credentials", "Credenziali del progetto")}</p>
          </li>
          <li>
            <h3>Limitala</h3>
            <p>Apri la chiave appena creata e in <strong>Restrizioni API</strong> scegli <strong>Limita chiave</strong> con le sole <em>Chrome UX Report API</em> e <em>PageSpeed Insights API</em>, più la <em>Knowledge Graph Search API</em> se vuoi il controllo delle entità: se finisse nelle mani sbagliate, non servirebbe ad altro.</p>
          </li>
        </ol>
        <p>Variabile da impostare: <code>SEOMCP_GOOGLE_API_KEY</code>. Cosa puoi chiedere: <a href="/core-web-vitals/">pagina Core Web Vitals</a>.</p>
      </section>

      <section class="doc-block" id="bing">
        <h2>5. Bing Webmaster Tools</h2>
        <ol class="steps">
          <li>
            <h3>Accedi a Bing Webmaster</h3>
            <p>Se il sito non c'è ancora, puoi importarlo da Search Console con un clic.</p>
            <p class="links">{ext("https://www.bing.com/webmasters/", "Apri Bing Webmaster Tools")}</p>
          </li>
          <li>
            <h3>Genera la chiave</h3>
            <p>Icona a ingranaggio in alto a destra → <strong>Accesso API → Chiave API → Genera</strong>. La chiave vale per tutti i siti del tuo account.</p>
          </li>
        </ol>
        <p>Variabile da impostare: <code>BING_WEBMASTER_API_KEY</code>. Facoltativa <code>SEOMCP_BING_SITE</code>, con l'URL esatto del sito come compare in Bing, per esempio <code>https://www.tuosito.it/</code>.</p>
      </section>

      <section class="doc-block" id="cloudflare">
        <h2>6. Cloudflare{soon("cf_traffic")}</h2>
        <p>Solo se il sito passa da Cloudflare, anche con il piano gratuito. Cloudflare vede ogni richiesta: visite reali (anche di chi rifiuta i cookie), crawler AI che passano davvero ed errori 404 e 5xx. Il token è in sola lettura e non tocca il sito.</p>
        <ol class="steps">
          <li>
            <h3>Crea un token personalizzato</h3>
            <p><strong>Crea token → Token personalizzato</strong>, con due permessi: <strong>Zona → Zona → Lettura</strong> e <strong>Zona → Analisi → Lettura</strong> (in inglese <em>Zone → Zone → Read</em> e <em>Zone → Analytics → Read</em>). In <strong>Risorse della zona</strong> scegli i siti che ti interessano.</p>
            <p class="links">{ext("https://dash.cloudflare.com/profile/api-tokens", "Token API di Cloudflare")}</p>
            <p class="small"><strong>Filtro indirizzo IP del client: facoltativo.</strong> seomcp chiama Cloudflare dal computer su cui gira, quindi limita il token solo a un IP fisso, come quello di un server. Con le connessioni domestiche l'IP è quasi sempre dinamico e cambia nel tempo: lascia il filtro vuoto, altrimenti il token smette di funzionare al primo cambio. Il token resta comunque in sola lettura.</p>
          </li>
          <li>
            <h3>Copia il token</h3>
            <p>Cloudflare lo mostra una sola volta. Da sapere: i bot sono riconosciuti dallo user-agent, che si può falsificare, e i numeri sono stime su un campione.</p>
          </li>
        </ol>
        <p>Variabile da impostare: <code>SEOMCP_CLOUDFLARE_TOKEN</code>. Facoltativa <code>SEOMCP_CLOUDFLARE_ZONE</code>, il dominio predefinito, per esempio <code>tuosito.it</code>.</p>
      </section>

      <section class="doc-block" id="configura">
        <h2>7. Configura l'assistente</h2>
        <p>Compila solo quello che hai e copia il risultato. <strong>I valori restano nel tuo browser:</strong> questa pagina non li salva e non li invia da nessuna parte. Se preferisci, lascia vuote le chiavi e scrivile direttamente nel file.</p>
        <form class="cfg" id="cfg" autocomplete="off" onsubmit="return false">
          <label class="cfg-wide">Assistente
            <select name="client">
{options}
            </select>
          </label>
          <fieldset class="cfg-wide">
            <legend>Accesso Google</legend>
            <label class="cfg-radio"><input type="radio" name="google" value="sa" checked> Service account</label>
            <label class="cfg-radio"><input type="radio" name="google" value="oauth"> OAuth</label>
            <label class="cfg-radio"><input type="radio" name="google" value="none"> Nessuno</label>
          </fieldset>
          <label data-when="sa">File JSON del service account <input name="GOOGLE_APPLICATION_CREDENTIALS" placeholder="/Users/tuonome/.config/seomcp/service-account.json" spellcheck="false"></label>
          <label data-when="oauth">ID client OAuth <input name="SEOMCP_GOOGLE_CLIENT_ID" placeholder="xxx.apps.googleusercontent.com" spellcheck="false"></label>
          <label data-when="oauth">Client secret <input name="SEOMCP_GOOGLE_CLIENT_SECRET" spellcheck="false"></label>
          <label data-when="google">Proprietà Search Console <input name="SEOMCP_GSC_SITE" placeholder="sc-domain:tuosito.it" spellcheck="false"></label>
          <label data-when="google">ID proprietà GA4 <input name="SEOMCP_GA_PROPERTY" placeholder="123456789" inputmode="numeric" spellcheck="false"></label>
          <label>API key Google (Core Web Vitals) <input name="SEOMCP_GOOGLE_API_KEY" spellcheck="false"></label>
          <label>API key Bing <input name="BING_WEBMASTER_API_KEY" spellcheck="false"></label>
          <label>Sito Bing <input name="SEOMCP_BING_SITE" placeholder="https://www.tuosito.it/" spellcheck="false"></label>
          <label>Token Cloudflare <input name="SEOMCP_CLOUDFLARE_TOKEN" spellcheck="false"></label>
          <label>Dominio su Cloudflare <input name="SEOMCP_CLOUDFLARE_ZONE" placeholder="tuosito.it" spellcheck="false"></label>
        </form>
<pre class="code" id="cfg-out"><code>Attiva JavaScript per generare la configurazione, oppure copiala dalla pagina del tuo assistente.</code></pre>
        <p class="small" id="cfg-guide">Dove incollarla: <a href="/installa/">guida del tuo assistente</a>.</p>
      </section>

      <section class="doc-block" id="verifica">
        <h2>8. Verifica</h2>
        <p>Prova ogni fonte configurata e ti dice esattamente cosa manca:</p>
<pre class="code"><code>npx -y {PKG} doctor</code></pre>
        <p>Il comando legge le variabili dal terminale: per usarlo, impostale anche lì, oppure chiedi all'assistente di usare il tool <code>seomcp_status</code>, che fa lo stesso controllo.</p>
        <ul class="tips">
          <li>Tratta chiavi e file JSON come password: non metterli in un repository e non incollarli nella chat con l'assistente.</li>
          <li>Per revocare l'accesso: <a href="https://myaccount.google.com/linkedapps" target="_blank" rel="noopener">autorizzazioni del tuo account Google</a> per OAuth, eliminazione della chiave dal service account, rigenerazione della chiave Bing.</li>
        </ul>
      </section>
      <script src="/credenziali.js" defer></script>"""


def prompts_page() -> str:
    def tool_link(t: str) -> str:
        return f'<a href="/tool/#{t}"><code>{t}</code></a>'

    toc = "\n".join(
        f'        <li><div class="area-head"><a href="#{a}">{n}</a> <span class="area-count">{len(items)} prompt</span></div><p>{html.escape(d)}</p></li>'
        for a, n, d, items in PROMPT_AREAS)
    sections = []
    for anchor, name, desc, items in PROMPT_AREAS:
        cards = []
        for pname, title, pdesc, args, tools, cred, ask in items:
            args_html = ", ".join(f"<code>{a}</code> ({html.escape(d)})" for a, d in args)
            cred_html = (" + ".join(f'<a href="/credenziali/#{c[1]}">{html.escape(c[0])}</a>' for c in cred) if cred
                         else '<a href="/credenziali/#senza-credenziali">nessuna</a>')
            if pname == "ottimizza-risposte":
                cred_html += ' (senza, controlla con <code>aeo_answer_check</code> le domande che indichi tu)'
            if pname == "traffico-dalle-ai":
                cred_html += ' (con <a href="/credenziali/#cloudflare">Cloudflare</a> aggiunge i crawler AI reali)'
            if pname == "le-ai-sanno-chi-sono":
                cred_html += ' (con la <a href="/credenziali/#api-key">API key Google</a> aggiunge il Knowledge Graph)'
            if pname == "audit-tecnico":
                cred_html += ' (con la <a href="/credenziali/#api-key">API key Google</a> aggiunge anche PageSpeed e i Core Web Vitals reali)'
            cards.append(f"""        <article class="prompt-card" id="{pname}">
          <h3>{html.escape(title)}{soon(pname)}</h3>
          <p>{html.escape(pdesc)}</p>
          <dl class="prompt-meta">
            <dt>Comando</dt><dd><code>{pname}</code></dd>
            <dt>Gli dai</dt><dd>{args_html}</dd>
            <dt>Usa</dt><dd>{", ".join(tool_link(t) for t in tools)}</dd>
            <dt>Credenziali</dt><dd>{cred_html}</dd>
          </dl>
          <p class="prompt-ask"><span>Oppure chiedilo così:</span> «{html.escape(ask)}»</p>
        </article>""")
        sections.append(f"""      <section class="doc-block" id="{anchor}">
        <h2>{name} <span class="area-count">{len(items)} prompt</span></h2>
        <p>{html.escape(desc)}</p>
{chr(10).join(cards)}
      </section>""")
    return f"""      <nav class="crumbs" aria-label="Percorso"><a href="/">seomcp</a> › Prompt</nav>
      <h1>{len(PROMPTS)} prompt per SEO, GEO e AEO</h1>
      <p class="lead">I <a href="/tool/">tool</a> misurano, i prompt ragionano sulle misure. Ogni prompt è un'analisi già impostata: combina i tool giusti, cita i numeri che ha trovato e chiude con le correzioni in ordine di impatto. Sono divisi per obiettivo; dentro l'assistente la stessa guida è la risorsa <code>seomcp://prompt</code>.</p>
      {SOON_NOTE if IN_ARRIVO else ""}
      <ul class="area-list">
{toc}
      </ul>

      <section class="doc-block" id="come-si-usano">
        <h2>Come si usano</h2>
        <ul class="tips">
          <li><strong>Claude Code:</strong> digita <code>/</code> e cerca il nome, per esempio <code>/mcp__seomcp__audit-tecnico</code>.</li>
          <li><strong>Claude Desktop:</strong> dal pulsante <strong>+</strong> della chat scegli seomcp e poi il prompt.</li>
          <li><strong>GitHub Copilot in VS Code:</strong> nella chat digita <code>/mcp.seomcp.</code> e scegli il prompt.</li>
          <li><strong>Altri assistenti:</strong> se non mostrano i prompt, fai la stessa domanda a parole. Ogni prompt qui sotto ha l'esempio pronto: i tool sono gli stessi, cambia solo che l'analisi la imposti tu.</li>
          <li><strong>Altre {DOMANDE} domande pronte</strong>, divise per tema, sono dentro seomcp come risorse MCP (<code>seomcp://domande</code>) e su <a href="https://github.com/davide-cik/seomcp/tree/main/domande" target="_blank" rel="noopener">GitHub</a>. Oppure chiedi all'assistente: «Cosa posso chiedere a seomcp?».</li>
        </ul>
      </section>

{chr(10).join(sections)}

      <section class="doc-block">
        <h2>Configura il tuo assistente</h2>
        <p>I prompt senza credenziali funzionano subito. Per quelli che usano Search Console, Analytics, Bing o la API key segui la pagina <a href="/credenziali/">Credenziali</a>.</p>
        {INCLUDE.format(name="clients")}
      </section>"""


CF_PAGE = f"""      <nav class="crumbs" aria-label="Percorso"><a href="/">seomcp</a> › Cloudflare</nav>
      <p class="eyebrow">Novità</p>
      <h1>Cloudflare nel tuo assistente</h1>
      <p class="lead">Se il sito passa da Cloudflare, Cloudflare vede ogni richiesta: anche chi rifiuta i cookie, chi blocca gli script e i crawler dei motori AI, che Google Analytics non conta. Con seomcp l'assistente legge questi dati e li mette accanto a Search Console, Analytics e robots.txt.</p>

      <section class="doc-block">
        <h2>Cosa puoi chiedere</h2>
        <ul class="prompts">
          <li>Quali crawler AI hanno visitato davvero il sito questo mese, e quali pagine hanno letto?</li>
          <li>Quali crawler AI passano sul sito e quali sto bloccando con robots.txt senza volerlo?</li>
          <li>Quante visite reali ha avuto il sito negli ultimi 7 giorni, comprese quelle di chi rifiuta i cookie? Confrontale con Google Analytics.</li>
          <li>Quali pagine rispondono 404 o 5xx ai visitatori veri? Separa le pagine reali dai tentativi dei bot.</li>
        </ul>
      </section>

      <section class="doc-block">
        <h2>I 3 tool</h2>
        <dl class="tools">
          <dt><code>cf_traffic</code></dt><dd>Richieste, visite e pagine viste giorno per giorno, fino a 28 giorni. Comprende chi rifiuta i cookie o blocca gli script: confrontato con Analytics, mostra quanta parte del traffico Analytics non vede.</dd>
          <dt><code>cf_ai_crawlers</code></dt><dd>Bot per bot (GPTBot, ClaudeBot, PerplexityBot, OAI-SearchBot, ChatGPT-User…): quante richieste, in quanti giorni, su quali pagine e con quali risposte. Diviso per scopo: addestramento, ricerca, letture su richiesta degli utenti.</dd>
          <dt><code>cf_errors</code></dt><dd>Le pagine che rispondono 404 o 5xx a chi visita davvero il sito, con quante volte e in quanti giorni. Comprende anche bot e scanner, che spesso cercano indirizzi inesistenti: l'assistente li separa dalle pagine da correggere.</dd>
        </dl>
        <p class="small">Tutti in sola lettura: il token che crei può solo leggere le statistiche, non tocca il sito né le impostazioni di Cloudflare.</p>
      </section>

      <section class="doc-block">
        <h2>Permesso e realtà: i crawler AI</h2>
        <p>robots.txt dice quali crawler AI <em>possono</em> leggere il sito; Cloudflare dice quali passano <em>davvero</em>, e su quali pagine. Il prompt <a href="/prompt/#ai-che-leggono-il-sito">Quali AI leggono davvero il mio sito?</a> mette insieme le due cose: <a href="/tool/#cf_ai_crawlers"><code>cf_ai_crawlers</code></a> per le visite reali, <a href="/tool/#geo_ai_access"><code>geo_ai_access</code></a> per le regole. Così scopri i bot che bloccavi senza volerlo, quelli che passano nonostante il divieto e le pagine che interessano di più ai motori AI. L'ultimo passo sono le visite: con Google Analytics, <a href="/tool/#ga_ai_referrals"><code>ga_ai_referrals</code></a> dice quante persone arrivano davvero da ChatGPT, Perplexity e gli altri assistenti.</p>
        <p class="links"><a href="/geo/">GEO e AEO: farsi citare dai motori AI →</a></p>
      </section>

      <section class="doc-block">
        <h2>Attivalo in 3 passi</h2>
        <p>Serve solo che il sito passi da Cloudflare, anche con il piano gratuito.</p>
        <ol class="steps">
          <li>
            <h3>Crea un token in sola lettura</h3>
            <p>Nella pagina dei token di Cloudflare scegli <strong>Crea token → Token personalizzato</strong>, con due permessi: <strong>Zona → Zona → Lettura</strong> e <strong>Zona → Analisi → Lettura</strong>. In <strong>Risorse della zona</strong> scegli i siti che ti interessano.</p>
            <p class="links">{ext("https://dash.cloudflare.com/profile/api-tokens", "Token API di Cloudflare")}</p>
            <p class="small"><strong>Filtro indirizzo IP del client: facoltativo.</strong> seomcp chiama Cloudflare dal computer su cui gira, quindi limita il token solo a un IP fisso, come quello di un server. Con le connessioni domestiche l'IP è quasi sempre dinamico e cambia nel tempo: lascia il filtro vuoto, altrimenti il token smette di funzionare al primo cambio. Il token resta comunque in sola lettura.</p>
          </li>
          <li>
            <h3>Copia il token</h3>
            <p>Cloudflare lo mostra una sola volta. Aggiungilo alla configurazione del tuo assistente, oppure lascia fare a <code>npx -y {PKG} setup</code>:</p>
<pre class="code"><code>SEOMCP_CLOUDFLARE_TOKEN=il-tuo-token</code></pre>
          </li>
          <li>
            <h3>Indica il sito</h3>
            <p>Facoltativo: il dominio da usare quando non ne indichi uno. Senza, l'assistente te lo chiede.</p>
<pre class="code"><code>SEOMCP_CLOUDFLARE_ZONE=tuosito.it</code></pre>
          </li>
        </ol>
        <p class="small">Dettagli nella pagina <a href="/credenziali/#cloudflare">Credenziali</a>, con il generatore della configurazione.</p>
      </section>

      <section class="doc-block">
        <h2>Da sapere</h2>
        <ul class="tips">
          <li><strong>Sono stime.</strong> Cloudflare campiona le richieste: i numeri sono affidabili per tendenze e confronti, non al singolo accesso.</li>
          <li><strong>I bot si riconoscono dallo user-agent</strong>, che si può falsificare. La verifica dei bot di Cloudflare richiede Bot Management, un servizio a pagamento.</li>
          <li><strong>Google-Extended non compare:</strong> è solo una regola di robots.txt, Google legge il sito come Googlebot.</li>
          <li><strong>Al massimo 28 giorni:</strong> Cloudflare conserva circa un mese di dati.</li>
        </ul>
      </section>

      <section class="doc-block">
        <h2>Verifica</h2>
<pre class="code"><code>npx -y {PKG} doctor</code></pre>
        <p>Deve comparire la riga di Cloudflare con l'elenco dei siti che il token può leggere. Se un permesso manca, <code>doctor</code> ti dice cosa fare.</p>
      </section>

      <section class="doc-block">
        <h2>Configura il tuo assistente</h2>
        {INCLUDE.format(name="clients")}
      </section>"""


AEO_PAGE = f"""      <nav class="crumbs" aria-label="Percorso"><a href="/">seomcp</a> › AEO</nav>
      <p class="eyebrow">Novità</p>
      <h1>AEO: farsi scegliere come risposta</h1>
      <p class="lead">Snippet in evidenza, «Le persone chiedono anche», assistenti vocali, risposte AI: tutti cercano nella pagina una risposta breve, chiara e facile da estrarre. seomcp parte dalle domande che gli utenti fanno davvero su Google e misura se le tue pagine rispondono nel modo giusto.</p>

      <section class="doc-block">
        <h2>Cosa puoi chiedere</h2>
        <ul class="prompts">
          <li>Quali domande fanno gli utenti che arrivano sul mio sito da Google, e su quali pagine?</li>
          <li>La guida risponde a «come scegliere le scarpe da trekking»? In quale sezione, e con quale prima frase?</li>
          <li>Quali domande hanno molte impressioni ma un CTR basso? Riscrivimi le risposte.</li>
          <li>Le mie pagine sono troppo difficili da leggere? Dammi l'indice Gulpease sezione per sezione.</li>
        </ul>
      </section>

      <section class="doc-block">
        <h2>I tool</h2>
        <dl class="tools">
          <dt><code>gsc_question_queries</code></dt><dd>Le query a domanda che portano impressioni al sito (come, cosa, perché, quanto, quale, differenza, dove, quando, chi, si può…), prese da Search Console con un filtro regex: tipo di domanda, pagina, impressioni, clic, CTR, posizione e pagine in concorrenza. Raggruppate per tipo, con la forma di risposta che di solito viene estratta meglio.</dd>
          <dt><code>aeo_answer_check</code></dt><dd>Data una pagina e una domanda, trova la sezione che risponde e la misura: posizione, titolo che riprende la domanda, prima frase, lunghezza del primo paragrafo (gli snippet stanno di solito tra 40 e 60 parole), elenchi, tabelle, numeri, leggibilità, e se FAQPage o QAPage contengono la domanda. Senza credenziali.</dd>
          <dt><code>geo_page_sections</code></dt><dd>Ora con l'indice Gulpease di ogni sezione e della pagina: la leggibilità pensata per l'italiano. Sotto 60 il testo è difficile per molti lettori.</dd>
        </dl>
      </section>

      <section class="doc-block">
        <h2>La forma giusta per ogni domanda</h2>
        <ul class="tips">
          <li><strong>Come:</strong> passaggi numerati, con una frase di sintesi prima.</li>
          <li><strong>Cosa:</strong> la definizione in una frase all'inizio.</li>
          <li><strong>Quanto:</strong> il numero (prezzo, durata, quantità) già nella prima frase.</li>
          <li><strong>Differenza e quale:</strong> la risposta diretta, poi una tabella di confronto.</li>
          <li><strong>Si può, conviene:</strong> «Sì» o «No» come prima parola, poi il perché.</li>
        </ul>
        <p class="small">Sono indicazioni di buona pratica, non regole di Google: aeo_answer_check misura, il giudizio lo dà l'assistente.</p>
      </section>

      <section class="doc-block">
        <h2>Il prompt</h2>
        <p><a href="/prompt/#ottimizza-risposte"><strong>Ottimizza le risposte (AEO)</strong></a>: prende le domande da Search Console, controlla le pagine, classifica le risposte (assente, nascosta, nella forma sbagliata, buona) e scrive i blocchi pronti da incollare, con il JSON-LD FAQPage validato dove ha senso. Con <a href="/prompt/#domande-utenti">Rispondo alle domande dei miei utenti?</a> lavori su una pagina sola.</p>
      </section>

      <section class="doc-block">
        <h2>Da sapere</h2>
        <ul class="tips">
          <li><strong>Search Console nasconde le query rare</strong> per privacy: le domande reali sono di più di quelle che vedi.</li>
          <li><strong>Chi occupa oggi lo snippet</strong> e le domande di «Le persone chiedono anche» non sono disponibili con dati ufficiali: servirebbero API di SERP a pagamento. seomcp resta sui dati del proprietario del sito.</li>
          <li><strong>FAQ nei risultati di Google:</strong> oggi compaiono come risultato avanzato solo per pochi siti, ma domande e risposte esplicite restano utili agli assistenti AI.</li>
        </ul>
        <p class="links"><a href="/geo/">GEO: farsi citare dai motori AI →</a></p>
      </section>

      <section class="doc-block">
        <h2>Configura il tuo assistente</h2>
        <p><code>aeo_answer_check</code> funziona subito, senza credenziali. Per le domande di Search Console segui la pagina <a href="/credenziali/#search-console">Credenziali</a>.</p>
        {INCLUDE.format(name="clients")}
      </section>"""


TECH_PAGE = f"""      <nav class="crumbs" aria-label="Percorso"><a href="/">seomcp</a> › Controlli tecnici</nav>
      <p class="eyebrow">Novità</p>
      <h1>Controlli tecnici SEO nel tuo assistente</h1>
      <p class="lead">Redirect, indicizzabilità, sitemap, pagina 404, link rotti: i controlli che un SEO fa a ogni nuovo sito, misurati in pochi secondi e spiegati dall'assistente. Senza credenziali, perché le pagine sono pubbliche.</p>

      <section class="doc-block">
        <h2>Cosa puoi chiedere</h2>
        <ul class="prompts">
          <li>Fai un audit tecnico del sito e dimmi le cinque correzioni più urgenti.</li>
          <li>La versione http reindirizza bene a https, con un solo passaggio?</li>
          <li>La sitemap contiene pagine reindirizzate o in errore?</li>
          <li>Gli hreflang delle versioni in altre lingue sono reciproci?</li>
        </ul>
      </section>

      <section class="doc-block">
        <h2>I 2 tool</h2>
        <dl class="tools">
          <dt><code>tech_page_audit</code></dt><dd>La pagina: catena di redirect, TTFB, peso e compressione, indicizzabilità (meta robots, X-Robots-Tag), canonical, title e description, viewport, hreflang con verifica dei link di ritorno, Open Graph e Twitter Card, immagini (alt, dimensioni, formati), gerarchia dei titoli, link, header di sicurezza.</dd>
          <dt><code>tech_site_check</code></dt><dd>Il sito: sitemap (URL, lastmod, duplicati, URL di altri domini), un campione di URL della sitemap, la pagina 404 (soft 404 compresi) e un campione di link interni rotti o reindirizzati.</dd>
        </dl>
        <p>Il prompt <strong>Audit tecnico del sito</strong> li combina con PageSpeed e il validatore schema.org, e chiude con una tabella di interventi in ordine di priorità.</p>
      </section>

      <section class="doc-block">
        <h2>Rispettosi dei siti analizzati</h2>
        <ul class="tips">
          <li>Le richieste sono distanziate: il controllo del sito richiede circa 15-30 secondi, per non pesare sul server.</li>
          <li>Nessuna richiesta verso indirizzi della rete locale, nemmeno seguendo un redirect.</li>
          <li>I servizi di Cloudflare che funzionano solo con JavaScript (come la protezione delle email) non vengono contati come link rotti.</li>
        </ul>
      </section>

      <section class="doc-block">
        <h2>Configura il tuo assistente</h2>
        {INCLUDE.format(name="clients")}
      </section>"""


WEB_NOTE = ("<strong>Versioni web non supportate.</strong> claude.ai, chatgpt.com, l'app Gemini, <a href='/installa/microsoft-365-copilot/'>Microsoft 365 Copilot</a> e Mistral Vibe sul web "
            "accettano solo server MCP remoti. seomcp gira in locale per non far uscire le tue credenziali dal computer, quindi servono le app desktop o la riga di comando.")


def main():
    out = SITE / "installa"
    out.mkdir(exist_ok=True)
    (SITE / "_partials" / "clients.html").write_text(clients_partial())

    # Rimuove pagine di assistenti non più presenti in VENDORS.
    keep = {v["slug"] for v in VENDORS} | {M365_SLUG}
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

    tech_dir = SITE / "tecnico"
    tech_dir.mkdir(exist_ok=True)
    (tech_dir / "index.html").write_text(
        page("Controlli tecnici SEO nel tuo assistente AI · seomcp",
             "Redirect, indicizzabilità, canonical, hreflang, sitemap, pagina 404 e link rotti: i controlli tecnici SEO di seomcp, senza credenziali.",
             "tecnico", TECH_PAGE))

    cf_dir = SITE / "cloudflare"
    cf_dir.mkdir(exist_ok=True)
    (cf_dir / "index.html").write_text(
        page("Cloudflare nel tuo assistente AI · seomcp",
             "Visite reali, crawler AI che passano davvero sul sito ed errori 404 e 5xx visti da Cloudflare, dentro Claude, ChatGPT e gli altri assistenti AI con seomcp. Token in sola lettura, anche con il piano gratuito.",
             "cloudflare", CF_PAGE))

    aeo_dir = SITE / "aeo"
    aeo_dir.mkdir(exist_ok=True)
    (aeo_dir / "index.html").write_text(
        page("AEO: farsi scegliere come risposta · seomcp",
             "Le domande vere degli utenti da Search Console e il controllo delle risposte: snippet in evidenza, assistenti vocali e risposte AI, con la leggibilità Gulpease. Dentro Claude, ChatGPT e gli altri assistenti, con seomcp.",
             "aeo", AEO_PAGE))

    nov_dir = SITE / "novita"
    nov_dir.mkdir(exist_ok=True)
    (nov_dir / "index.html").write_text(
        page("Novità · seomcp",
             "Le novità di seomcp in ordine, dalla più recente: visite dagli assistenti AI, entità e Common Crawl, Cloudflare, prompt, controlli tecnici, validatore schema.org, GEO, Core Web Vitals, Google Analytics.",
             "novita", novita_page()))

    tool_dir = SITE / "tool"
    tool_dir.mkdir(exist_ok=True)
    (tool_dir / "index.html").write_text(
        page("Tutti i tool e i prompt · seomcp",
             f"I {sum(len(t) for *_, t in TOOL_GROUPS)} tool e i {len(PROMPTS)} prompt di seomcp in dettaglio: Search Console, Analytics 4, Bing Webmaster, Cloudflare, Core Web Vitals, GEO/AEO, validatore schema.org e controlli tecnici.",
             "tool", tools_page()))

    m365_dir = out / M365_SLUG
    m365_dir.mkdir(exist_ok=True)
    (m365_dir / "index.html").write_text(
        page("seomcp e Microsoft 365 Copilot",
             "Microsoft 365 Copilot si collega ai server MCP remoti con i connettori federati: perché seomcp, che gira in locale, non si può ancora aggiungere e cosa usare nel frattempo.",
             f"installa/{M365_SLUG}", M365_PAGE))

    for slug, title, desc, body in [
        ("prompt", "Prompt per SEO, GEO e AEO · seomcp",
         f"I {len(PROMPTS)} prompt di seomcp per SEO, GEO e AEO, divisi per obiettivo: capire i dati, migliorare i risultati, farsi citare dalle AI, controlli e correzioni.",
         prompts_page()),
        ("credenziali", "Credenziali: Google e Bing con i link diretti · seomcp",
         "Come ottenere le credenziali per Search Console, Google Analytics 4, Core Web Vitals e Bing Webmaster Tools, con i link diretti e la configurazione pronta per il tuo assistente.",
         credentials_page()),
    ]:
        d = SITE / slug
        d.mkdir(exist_ok=True)
        (d / "index.html").write_text(page(title, desc, slug, body))

    today = date.today().isoformat()
    urls = ["/", "/tool/", "/prompt/", "/credenziali/", "/tecnico/", "/geo/", "/schema/", "/google-analytics/", "/core-web-vitals/", "/cloudflare/", "/aeo/", "/novita/", "/installa/"] + [f"/installa/{v['slug']}/" for v in VENDORS] + [f"/installa/{M365_SLUG}/"]
    (SITE / "sitemap.xml").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "".join(f"  <url><loc>{BASE}{u}</loc><lastmod>{today}</lastmod></url>\n" for u in urls)
        + "</urlset>\n")
    print(f"Generate {len(VENDORS) + 1} pagine, partial clients.html e sitemap ({len(urls)} URL)")


def published_version() -> str | None:
    """Ultima versione su npm (None se il registro non risponde: resta quella già scritta nelle pagine)."""
    try:
        out = subprocess.run(["npm", "view", PKG, "version"], capture_output=True, text=True, timeout=30)
        v = out.stdout.strip()
        return v if re.fullmatch(r"\d+\.\d+\.\d+", v) else None
    except (OSError, subprocess.SubprocessError):
        return None


def set_version() -> None:
    """Scrive la versione pubblicata negli elementi <span class="npm-ver"> di home e footer."""
    v = published_version()
    if not v:
        print("Versione npm non disponibile: lasciata quella attuale")
        return
    for f in (SITE / "index.html", SITE / "_partials" / "footer.html"):
        old = f.read_text()
        new = re.sub(r'(<span class="npm-ver">)[^<]*(</span>)', rf"\g<1>{v}\g<2>", old)
        if new != old:
            f.write_text(new)
    print(f"Versione npm: {v}")


ASSETS = ("style.css", "app.js", "demo.js", "credenziali.js")


def bust_cache() -> None:
    """Aggiunge ?v=<hash> a CSS e JS in tutte le pagine: i file restano in cache 7 giorni,
    così a ogni modifica il browser scarica la versione nuova invece di mescolare vecchio e nuovo."""
    ver = {a: hashlib.sha256((SITE / a).read_bytes()).hexdigest()[:10] for a in ASSETS}
    pattern = re.compile(r'((?:href|src)=")/?(' + "|".join(re.escape(a) for a in ASSETS) + r')(?:\?v=[0-9a-f]*)?"')
    for f in list(SITE.rglob("*.html")):
        text = f.read_text()
        new = pattern.sub(lambda m: f'{m.group(1)}/{m.group(2)}?v={ver[m.group(2)]}"', text)
        if new != text:
            f.write_text(new)


if __name__ == "__main__":
    main()
    set_version()
    bust_cache()
