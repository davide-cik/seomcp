import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { PROMPT_GUIDE } from '../library/prompt-guide.js';
import { TEMI } from '../library/domande.js';
import { run } from './shared.js';

const CATEGORIE = PROMPT_GUIDE.map((c) => c.slug) as [string, ...string[]];

/**
 * Guida a cosa chiedere: i prompt divisi per obiettivo, come la Prompt Guide di Bing Webmaster Tools.
 * È un tool (e non solo la risorsa seomcp://prompt) perché l'assistente possa restituire
 * l'elenco da solo quando l'utente chiede "cosa posso chiedere?", in qualsiasi client.
 */
export function registerGuideTools(server: McpServer): void {
  server.registerTool(
    'seomcp_guida',
    {
      title: 'Cosa posso chiedere a seomcp',
      description:
        "Restituisce i prompt di seomcp divisi per obiettivo (capire i dati, migliorare i risultati, farsi citare dalle AI, controlli e correzioni), con cosa serve e la domanda equivalente da fare a parole. Usalo quando l'utente chiede cosa può fare con seomcp o da dove partire, e mostra l'elenco per categorie.",
      inputSchema: {
        categoria: z.enum(CATEGORIE).optional().describe(`Una sola categoria: ${CATEGORIE.join(', ')}. Se omessa, tutte.`),
      },
      annotations: { readOnlyHint: true },
    },
    ({ categoria }) =>
      run(async () => {
        const categorie = PROMPT_GUIDE.filter((c) => !categoria || c.slug === categoria).map((c) => ({
          categoria: c.titolo,
          slug: c.slug,
          descrizione: c.intro,
          prompt: c.prompt.map((p) => ({ prompt: p.nome, titolo: p.titolo, serve: p.serve, chiedi_cosi: p.chiedi })),
        }));
        return {
          categorie,
          come_usarli:
            "Ogni prompt si richiama dal menu dei prompt dell'assistente (in Claude Code: /mcp__seomcp__<prompt>); in alternativa basta fare la domanda in 'chiedi_cosi'. Se una fonte indicata in 'serve' non è configurata, seomcp_status spiega come attivarla.",
          altre_domande: `Archivio di domande brevi per tema (${TEMI.map((t) => t.titolo).join(', ')}): risorse seomcp://domande.`,
          presentazione: "Mostra all'utente l'elenco per categoria: titolo del prompt, a cosa serve, cosa serve per usarlo.",
        };
      }),
  );
}
