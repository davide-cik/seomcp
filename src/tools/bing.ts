import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { aggregateBingStats } from '../core/analysis.js';
import type { BingStatsRow } from '../core/types.js';
import { isoDate, resolveSite, run, type ToolContext } from './shared.js';

const siteUrl = z
  .string()
  .optional()
  .describe('Sito come registrato in Bing Webmaster Tools, es. "https://www.esempio.it/". Se omesso usa quello predefinito.');

const statsShape = {
  siteUrl,
  startDate: isoDate.optional().describe('Filtra dalla data indicata (YYYY-MM-DD).'),
  endDate: isoDate.optional().describe('Filtra fino alla data indicata (YYYY-MM-DD).'),
  contains: z.string().optional().describe('Solo le righe che contengono questo testo (case-insensitive).'),
  aggregate: z
    .boolean()
    .default(true)
    .describe('true: una riga per query/pagina con i totali del periodo. false: le righe per data così come le restituisce Bing.'),
  limit: z.number().int().min(1).max(5000).default(100),
};

type StatsArgs = { siteUrl?: string; startDate?: string; endDate?: string; contains?: string; aggregate: boolean; limit: number };

function shapeStats(site: string, rows: BingStatsRow[], args: StatsArgs) {
  const needle = args.contains?.toLowerCase();
  const filtered = needle ? rows.filter((r) => r.key.toLowerCase().includes(needle)) : rows;
  const dates = filtered.map((r) => r.date).sort();
  const coverage = { firstDate: dates[0] ?? null, lastDate: dates.at(-1) ?? null };

  if (args.aggregate) {
    const agg = aggregateBingStats(filtered, args.startDate, args.endDate);
    return { siteUrl: site, dataAvailable: coverage, total: agg.length, rows: agg.slice(0, args.limit) };
  }
  const inRange = filtered.filter(
    (r) => (!args.startDate || r.date >= args.startDate) && (!args.endDate || r.date <= args.endDate),
  );
  return { siteUrl: site, dataAvailable: coverage, total: inRange.length, rows: inRange.slice(0, args.limit) };
}

export function registerBingTools(server: McpServer, ctx: ToolContext): void {
  server.registerTool(
    'bing_list_sites',
    {
      title: 'Bing Webmaster: siti',
      description: 'Elenca i siti presenti nel tuo account Bing Webmaster Tools e se sono verificati.',
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    () => run(() => ctx.bing().listSites()),
  );

  server.registerTool(
    'bing_query_stats',
    {
      title: 'Bing Webmaster: performance per query',
      description:
        'Impressioni, clic e posizione media per query di ricerca su Bing, sullo storico che Bing mette a disposizione (vedi dataAvailable nella risposta).',
      inputSchema: statsShape,
      annotations: { readOnlyHint: true },
    },
    (args) =>
      run(async () => {
        const site = resolveSite(args.siteUrl, ctx.defaults.bingSite, 'bing');
        return shapeStats(site, await ctx.bing().getQueryStats(site), args);
      }),
  );

  server.registerTool(
    'bing_page_stats',
    {
      title: 'Bing Webmaster: performance per pagina',
      description: 'Impressioni, clic e posizione media per pagina su Bing. Il campo `key` è l\'URL.',
      inputSchema: statsShape,
      annotations: { readOnlyHint: true },
    },
    (args) =>
      run(async () => {
        const site = resolveSite(args.siteUrl, ctx.defaults.bingSite, 'bing');
        return shapeStats(site, await ctx.bing().getPageStats(site), args);
      }),
  );

  server.registerTool(
    'bing_keyword_stats',
    {
      title: 'Bing: volumi di ricerca keyword',
      description:
        'Volumi di ricerca storici di una keyword su Bing (dato che Search Console non fornisce). Default Italia / italiano: specifica country e language per altri mercati.',
      inputSchema: {
        keyword: z.string().min(1).max(200),
        country: z.string().optional().describe('Codice paese, default "it".'),
        language: z.string().optional().describe('Codice lingua, default "it-IT".'),
      },
      annotations: { readOnlyHint: true },
    },
    (args) =>
      run(async () => {
        const country = args.country ?? ctx.defaults.country;
        const language = args.language ?? ctx.defaults.language;
        const rows = await ctx.bing().getKeywordStats(args.keyword, country, language);
        return { keyword: args.keyword, country, language, rows };
      }),
  );
}
