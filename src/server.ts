import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createGoogleAuth } from './auth/google.js';
import type { SeoMcpConfig } from './config.js';
import { BingClient } from './core/bing.js';
import { SeoMcpError } from './core/errors.js';
import { GscClient } from './core/gsc.js';
import { formatDiagnostics, runDiagnostics } from './doctor.js';
import { registerBingTools } from './tools/bing.js';
import { registerGscTools } from './tools/gsc.js';
import { run, type ToolContext } from './tools/shared.js';
import { VERSION } from './version.js';
import { DOCS } from './links.js';

export type { ToolContext } from './tools/shared.js';

const INSTRUCTIONS = `seomcp fornisce dati grezzi da Google Search Console e Bing Webmaster Tools, in sola lettura.
Se un tool restituisce un errore di configurazione, chiama seomcp_status e riporta all'utente i passaggi indicati.
Le analisi (cannibalizzazione, content gap, report) si fanno ragionando sui dati restituiti.`;

/** Crea il server MCP a partire dalla configurazione locale. */
export function createServer(config: SeoMcpConfig): McpServer {
  let gsc: GscClient | undefined;
  let bing: BingClient | undefined;

  const ctx: ToolContext = {
    // Creazione pigra: il server parte anche se una fonte non è configurata.
    gsc: () => (gsc ??= new GscClient(createGoogleAuth(config.google))),
    bing: () => {
      if (!config.bingApiKey) {
        throw new SeoMcpError(
          'NOT_CONFIGURED',
          'Bing Webmaster Tools non è configurato.',
          `Imposta BING_WEBMASTER_API_KEY (Bing Webmaster Tools → Impostazioni → Accesso API). Guida: ${DOCS.bing}`,
        );
      }
      return (bing ??= new BingClient({ apiKey: config.bingApiKey }));
    },
    defaults: config.defaults,
    diagnose: () => runDiagnostics(config),
  };

  return createServerWithContext(ctx);
}

/** Variante con contesto iniettato: per test o per usare client propri. */
export function createServerWithContext(ctx: ToolContext): McpServer {
  const server = new McpServer({ name: 'seomcp', version: VERSION }, { instructions: INSTRUCTIONS });

  server.registerTool(
    'seomcp_status',
    {
      title: 'Stato della configurazione',
      description:
        'Verifica quali fonti (Search Console, Bing) sono configurate e funzionanti, e spiega cosa fare per quelle che non lo sono.',
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    () => run(async () => ({ report: formatDiagnostics(await ctx.diagnose()), defaults: ctx.defaults })),
  );

  registerGscTools(server, ctx);
  registerBingTools(server, ctx);
  return server;
}
