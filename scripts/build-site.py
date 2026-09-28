#!/usr/bin/env python3
"""Genera le pagine di installazione per ogni client in site/installa/.

Intestazione e footer vengono presi da site/index.html, così restano allineati.
Uso: python3 scripts/build-site.py
"""
import html
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
          <li><strong>Le credenziali</strong> delle fonti che vuoi usare: <a href="{REPO}/blob/main/docs/google-setup.md">Google Search Console</a> e/o <a href="{REPO}/blob/main/docs/bing-setup.md">Bing Webmaster Tools</a>. Sono entrambe facoltative.</li>
        </ul>
        <p class="small">Il pacchetto npm è in arrivo: per ora seomcp si installa direttamente da GitHub. Il primo avvio richiede qualche secondo in più, perché il codice viene compilato sul tuo computer.</p>
      </section>"""


def client_body(c):
    tips = "".join(f"\n          <li>{t}</li>" for t in c["tips"])
    web = f'\n        <p class="small"><strong>Versione web:</strong> {c["web"]}</p>' if c.get("web") else ""
    note = f'\n          <p class="small">{c["code_note"]}</p>' if c["code_note"] else ""
    return f"""      <nav class="crumbs" aria-label="Percorso"><a href="/">seomcp</a> › <a href="/installa/">Installa</a> › {html.escape(c['name'])}</nav>
      <p class="eyebrow">{html.escape(c['vendor'])} · {html.escape(c['kind'])}</p>
      <h1>seomcp in {html.escape(c['name'])}</h1>
      <p class="lead">{c['intro']} Ci vogliono due minuti, credenziali a parte.</p>

{PREREQ}

      <section class="doc-block">
        <h2>Configurazione</h2>
        <ol class="steps">
          <li>
            <h3>Apri la configurazione</h3>
            <p>{c['open']}</p>
          </li>
          <li>
            <h3>Aggiungi seomcp</h3>
<pre class="code"><code>{html.escape(c['code'], quote=False)}</code></pre>
            <p class="small">Sostituisci percorso, chiave e sito con i tuoi. Se usi una sola fonte, togli la variabile dell'altra.</p>{note}
          </li>
          <li>
            <h3>Verifica</h3>
            <p>{c['verify']}</p>
          </li>
        </ol>{web}
      </section>

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
        <ul class="tips">{tips}
          <li>Le variabili d'ambiente vanno impostate nella configurazione del client, non nel terminale: il client avvia seomcp con le sue.</li>
          <li>Ancora bloccato? <a href="{REPO}/issues/new/choose">Apri una segnalazione</a>, allegando l'output di <code>doctor</code> senza chiavi.</li>
        </ul>
      </section>

      <section class="doc-block">
        <h2>Altri assistenti</h2>
        {INCLUDE.format(name='clients')}
      </section>"""


def clients_partial():
    items = "\n".join(
        f'  <a class="client-card" href="/installa/{c["slug"]}/"><strong>{html.escape(c["name"])}</strong><span>{html.escape(c["vendor"])} · {html.escape(c["kind"])}</span></a>'
        for c in CLIENTS
    )
    return f'<div class="client-grid">\n{items}\n</div>\n'


WEB_NOTE = ("<strong>Versioni web non supportate.</strong> claude.ai, chatgpt.com, l'app Gemini, Microsoft 365 Copilot e Mistral Vibe sul web "
            "accettano solo server MCP remoti. seomcp gira in locale per non far uscire le tue credenziali dal computer, quindi servono le app desktop o la riga di comando.")


def main():
    out = SITE / "installa"
    out.mkdir(exist_ok=True)
    (SITE / "_partials" / "clients.html").write_text(clients_partial())

    hub = f"""      <nav class="crumbs" aria-label="Percorso"><a href="/">seomcp</a> › Installa</nav>
      <h1>Installa seomcp</h1>
      <p class="lead">Scegli il tuo assistente: ogni pagina spiega dove incollare la configurazione e come verificare che funzioni.</p>
      {INCLUDE.format(name="clients")}
      <p class="small">{WEB_NOTE}</p>
{PREREQ}"""
    (out / "index.html").write_text(
        page("Installa seomcp: Claude, ChatGPT, Copilot, Gemini CLI, Mistral Vibe",
             "Guide di installazione di seomcp, il server MCP per Search Console e Bing Webmaster, per ogni assistente AI.",
             "installa", hub))

    for c in CLIENTS:
        d = out / c["slug"]
        d.mkdir(exist_ok=True)
        title = f"seomcp in {c['name']}: Search Console e Bing Webmaster"
        desc = f"Come collegare Google Search Console e Bing Webmaster Tools a {c['name']} con seomcp, il server MCP open source. Configurazione pronta da copiare."
        (d / "index.html").write_text(page(title, desc, f"installa/{c['slug']}", client_body(c)))

    today = date.today().isoformat()
    urls = ["/", "/installa/"] + [f"/installa/{c['slug']}/" for c in CLIENTS]
    (SITE / "sitemap.xml").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "".join(f"  <url><loc>{BASE}{u}</loc><lastmod>{today}</lastmod></url>\n" for u in urls)
        + "</urlset>\n")
    print(f"Generate {len(CLIENTS) + 1} pagine, partial clients.html e sitemap ({len(urls)} URL)")


if __name__ == "__main__":
    main()
