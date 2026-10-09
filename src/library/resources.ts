import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TEMI, indiceMarkdown, temaMarkdown } from './domande.js';

const BASE = 'seomcp://domande';

/**
 * L'archivio di domande pronte come risorse MCP: un indice e una risorsa per tema,
 * in Markdown. Nei client che le supportano si allegano alla chat (in Claude Code con @).
 */
export function registerDomandeResources(server: McpServer): void {
  server.registerResource(
    'domande',
    BASE,
    {
      title: 'Domande pronte: indice',
      description: 'Indice dell\'archivio di domande da fare a seomcp, divise per tema, con le credenziali che servono.',
      mimeType: 'text/markdown',
    },
    (uri) => ({ contents: [{ uri: uri.href, mimeType: 'text/markdown', text: indiceMarkdown((t) => `${BASE}/${t.slug}`) }] }),
  );

  for (const tema of TEMI) {
    server.registerResource(
      `domande-${tema.slug}`,
      `${BASE}/${tema.slug}`,
      {
        title: `Domande pronte: ${tema.titolo}`,
        description: `${tema.domande.length} domande. ${tema.intro}`,
        mimeType: 'text/markdown',
      },
      (uri) => ({ contents: [{ uri: uri.href, mimeType: 'text/markdown', text: temaMarkdown(tema) }] }),
    );
  }
}
