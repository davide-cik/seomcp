import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { techPageAudit, techSiteCheck } from '../core/technical.js';
import { run, type ToolContext } from './shared.js';

export function registerTechnicalTools(server: McpServer, ctx: ToolContext): void {
  server.registerTool(
    'tech_page_audit',
    {
      title: 'Tecnico: controllo della pagina',
      description:
        "Controlli tecnici SEO di una pagina, senza browser: catena di redirect (e se sono permanenti), TTFB, peso dell'HTML, compressione, cache, indicizzabilità (meta robots, X-Robots-Tag), canonical (unico, autoreferenziale, raggiungibile), title e description, lingua, viewport mobile, hreflang (codici, x-default, autoreferenza, link di ritorno a campione), Open Graph e Twitter Card, immagini (alt mancanti, dimensioni, formati, lazy loading), gerarchia dei titoli, link interni ed esterni, header di sicurezza.",
      inputSchema: {
        url: z.string().url().describe('URL della pagina. Si può partire anche dalla versione http:// per vedere tutta la catena di redirect.'),
        checkHreflangReturnLinks: z.boolean().default(true).describe('Verifica a campione (max 5) che le versioni in altre lingue rimandino a questa pagina.'),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    (args) => run(() => techPageAudit(args.url, ctx.fetchOptions, args.checkHreflangReturnLinks)),
  );

  server.registerTool(
    'tech_site_check',
    {
      title: 'Tecnico: controllo del sito',
      description:
        "Controlli tecnici a livello di sito, senza credenziali: sitemap (trovata da robots.txt o nei percorsi comuni, indice e sitemap figlie, numero di URL, lastmod, duplicati, URL di altri domini), un campione di URL della sitemap (devono rispondere 200 senza redirect), la pagina 404 (un indirizzo inesistente deve rispondere 404, non 200) e un campione di link interni della pagina indicata (rotti o reindirizzati). Le richieste sono distanziate per non pesare sul sito: richiede circa 15-30 secondi.",
      inputSchema: {
        url: z.string().url().describe('Una pagina del sito, di solito la home: da qui si campionano i link interni.'),
        sitemapSample: z.number().int().min(0).max(50).default(20).describe('Quanti URL della sitemap verificare.'),
        linkSample: z.number().int().min(0).max(60).default(30).describe('Quanti link interni verificare.'),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    (args) => run(() => techSiteCheck(args.url, ctx.fetchOptions, args.sitemapSample, args.linkSample)),
  );
}
