#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { runGoogleOAuthFlow } from './auth/google.js';
import { loadConfig } from './config.js';
import { formatDiagnostics, runDiagnostics } from './doctor.js';
import { createServer } from './server.js';
import { VERSION } from './version.js';
import { DOCS } from './links.js';

// Con il trasporto stdio, stdout è riservato al protocollo MCP: tutti i messaggi vanno su stderr.
const log = (msg: string) => process.stderr.write(`${msg}\n`);

const HELP = `seomcp ${VERSION} — MCP per Google Search Console e Bing Webmaster Tools

Uso:
  seomcp                 avvia il server MCP (stdio), è ciò che lancia Claude
  seomcp doctor          verifica la configurazione e le credenziali
  seomcp auth google     autorizza l'accesso OAuth a Search Console (una tantum)
  seomcp --version

Documentazione: ${DOCS.home}`;

async function main(argv: string[]): Promise<number> {
  const [cmd, sub] = argv;

  if (cmd === '--help' || cmd === '-h' || cmd === 'help') {
    log(HELP);
    return 0;
  }
  if (cmd === '--version' || cmd === '-v') {
    log(VERSION);
    return 0;
  }

  const config = loadConfig();

  if (cmd === 'doctor') {
    log(`seomcp ${VERSION}\nConfigurazione: ${config.configFileFound ? config.configFile : '(nessun file, solo variabili d\'ambiente)'}\n`);
    const items = await runDiagnostics(config);
    log(formatDiagnostics(items));
    return items.some((i) => i.status === 'error') ? 1 : 0;
  }

  if (cmd === 'auth') {
    if (sub !== 'google') {
      log('Uso: seomcp auth google');
      return 2;
    }
    if (config.google.mode !== 'oauth') {
      log(
        config.google.mode === 'service-account'
          ? 'Stai usando un service account (GOOGLE_APPLICATION_CREDENTIALS): non serve autorizzare nulla.'
          : `Imposta prima SEOMCP_GOOGLE_CLIENT_ID e SEOMCP_GOOGLE_CLIENT_SECRET. Guida: ${DOCS.google}`,
      );
      return config.google.mode === 'service-account' ? 0 : 2;
    }
    await runGoogleOAuthFlow(config.google, log);
    log('\nFatto. Verifica con: npx @contentisking/seomcp doctor');
    return 0;
  }

  if (cmd) {
    log(`Comando sconosciuto: ${cmd}\n\n${HELP}`);
    return 2;
  }

  const server = createServer(config);
  await server.connect(new StdioServerTransport());
  log(`[seomcp] ${VERSION} avviato (google: ${config.google.mode}, bing: ${config.bingApiKey ? 'on' : 'off'})`);
  return -1; // resta in esecuzione
}

main(process.argv.slice(2)).then(
  (code) => {
    if (code >= 0) process.exit(code);
  },
  (err: Error) => {
    log(`Errore: ${err.message}`);
    process.exit(1);
  },
);
