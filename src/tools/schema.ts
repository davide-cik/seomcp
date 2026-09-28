import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { SeoMcpError } from '../core/errors.js';
import { fetchPage } from '../core/fetch-page.js';
import { extractPage } from '../core/html.js';
import { parseJsonLdInput, validateJsonLd } from '../core/schema-validate.js';
import { run, type ToolContext } from './shared.js';

export function registerSchemaTools(server: McpServer, ctx: ToolContext): void {
  server.registerTool(
    'schema_validate',
    {
      title: 'Validatore schema.org',
      description:
        "Valida i dati strutturati JSON-LD di una pagina (url) o incollati (jsonld), su quattro livelli: sintassi JSON-LD; vocabolario schema.org ufficiale (tipi e proprietà esistenti, proprietà ammesse per il tipo, formato dei valori, termini superati, refusi con correzione suggerita); requisiti di Google per i risultati avanzati (proprietà obbligatorie e consigliate); coerenza con la pagina (date, FAQ visibili, headline e H1). Tutto in locale.",
      inputSchema: {
        url: z.string().url().optional().describe('Pagina da validare.'),
        jsonld: z.string().max(500_000).optional().describe('In alternativa all\'URL: JSON-LD da validare prima di pubblicarlo (oggetto, array o uno o più <script>).'),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    (args) =>
      run(async () => {
        if (!!args.url === !!args.jsonld) {
          throw new SeoMcpError('INVALID_INPUT', 'Indica url oppure jsonld (uno dei due).');
        }
        if (args.jsonld) {
          const { blocks, parseErrors } = parseJsonLdInput(args.jsonld);
          return { source: 'JSON-LD incollato', ...validateJsonLd(blocks, parseErrors) };
        }
        const page = await fetchPage(args.url!, ctx.fetchOptions);
        const ex = extractPage(page.body, page.finalUrl);
        return {
          source: page.finalUrl,
          ...validateJsonLd(ex.jsonLd, ex.jsonLdErrors, {
            url: page.finalUrl,
            visibleText: ex.fullText,
            title: ex.title,
            h1: ex.headings.find((h) => h.level === 1)?.text,
            microdataItems: ex.microdataItems,
          }),
        };
      }),
  );
}
