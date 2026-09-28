import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { comparePeriods, strikingDistance } from '../core/analysis.js';
import { addDays, previousPeriod } from '../core/dates.js';
import { SeoMcpError } from '../core/errors.js';
import { GSC_MAX_ROWS } from '../core/gsc.js';
import type { GscFilter } from '../core/types.js';
import { dateRangeShape, isoDate, resolveRange, resolveSite, run, type ToolContext } from './shared.js';

const siteUrl = z
  .string()
  .optional()
  .describe('Proprietà Search Console, es. "sc-domain:esempio.it" o "https://www.esempio.it/". Se omessa usa quella predefinita.');

const dimension = z.enum(['query', 'page', 'country', 'device', 'date', 'searchAppearance']);

const filters = z
  .array(
    z.object({
      dimension: z.enum(['query', 'page', 'country', 'device', 'searchAppearance']),
      operator: z.enum(['equals', 'notEquals', 'contains', 'notContains', 'includingRegex', 'excludingRegex']),
      expression: z.string().min(1),
    }),
  )
  .optional()
  .describe('Filtri in AND. Paesi in ISO 3166-1 alpha-3 minuscolo (es. "ita"), device: DESKTOP/MOBILE/TABLET.');

const searchType = z.enum(['web', 'image', 'video', 'news', 'discover', 'googleNews']).default('web');

export function registerGscTools(server: McpServer, ctx: ToolContext): void {
  server.registerTool(
    'gsc_list_sites',
    {
      title: 'Search Console: proprietà',
      description: 'Elenca le proprietà Search Console accessibili con le credenziali configurate.',
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    () => run(() => ctx.gsc().listSites()),
  );

  server.registerTool(
    'gsc_performance',
    {
      title: 'Search Console: performance',
      description:
        'Clic, impressioni, CTR (0-1) e posizione media da Google Search Console, raggruppati per le dimensioni scelte. I dati hanno circa 2-3 giorni di ritardo.',
      inputSchema: {
        siteUrl,
        ...dateRangeShape,
        dimensions: z.array(dimension).default(['query']),
        filters,
        searchType,
        rowLimit: z.number().int().min(1).max(GSC_MAX_ROWS).default(100),
      },
      annotations: { readOnlyHint: true },
    },
    (args) =>
      run(async () => {
        const site = resolveSite(args.siteUrl, ctx.defaults.gscSite, 'gsc');
        const range = resolveRange(args);
        const rows = await ctx.gsc().query({
          siteUrl: site,
          ...range,
          dimensions: args.dimensions,
          filters: args.filters as GscFilter[] | undefined,
          searchType: args.searchType,
          rowLimit: args.rowLimit,
        });
        return { siteUrl: site, ...range, dimensions: args.dimensions, rowCount: rows.length, rows };
      }),
  );

  server.registerTool(
    'gsc_compare_periods',
    {
      title: 'Search Console: confronto tra periodi',
      description:
        'Confronta due periodi e restituisce le righe con i cali e le crescite di clic più forti, più i totali. Di default confronta con il periodo precedente di pari durata; con compareTo="yearAgo" confronta con 52 settimane prima (stessi giorni della settimana).',
      inputSchema: {
        siteUrl,
        ...dateRangeShape,
        compareTo: z.enum(['previous', 'yearAgo', 'custom']).default('previous'),
        compareStartDate: isoDate.optional().describe('Solo con compareTo="custom".'),
        compareEndDate: isoDate.optional().describe('Solo con compareTo="custom".'),
        dimensions: z.array(dimension).default(['query']),
        filters,
        searchType,
        limit: z.number().int().min(1).max(500).default(25).describe('Righe restituite per i cali e per le crescite.'),
      },
      annotations: { readOnlyHint: true },
    },
    (args) =>
      run(async () => {
        const site = resolveSite(args.siteUrl, ctx.defaults.gscSite, 'gsc');
        const current = resolveRange(args);
        let previous: { startDate: string; endDate: string };
        if (args.compareTo === 'custom') {
          if (!args.compareStartDate || !args.compareEndDate) {
            throw new SeoMcpError('INVALID_INPUT', 'Con compareTo="custom" servono compareStartDate e compareEndDate.');
          }
          previous = { startDate: args.compareStartDate, endDate: args.compareEndDate };
        } else if (args.compareTo === 'yearAgo') {
          previous = { startDate: addDays(current.startDate, -364), endDate: addDays(current.endDate, -364) };
        } else {
          previous = previousPeriod(current.startDate, current.endDate);
        }

        const base = { siteUrl: site, filters: args.filters as GscFilter[] | undefined, searchType: args.searchType };
        const gsc = ctx.gsc();
        const [curRows, prevRows, curTot, prevTot] = await Promise.all([
          gsc.query({ ...base, ...current, dimensions: args.dimensions, rowLimit: GSC_MAX_ROWS }),
          gsc.query({ ...base, ...previous, dimensions: args.dimensions, rowLimit: GSC_MAX_ROWS }),
          gsc.query({ ...base, ...current, rowLimit: 1 }),
          gsc.query({ ...base, ...previous, rowLimit: 1 }),
        ]);

        const rows = comparePeriods(curRows, prevRows);
        return {
          siteUrl: site,
          current: { ...current, totals: curTot[0] ?? null },
          previous: { ...previous, totals: prevTot[0] ?? null },
          dimensions: args.dimensions,
          losers: rows.filter((r) => r.delta.clicks < 0).slice(0, args.limit),
          gainers: rows.filter((r) => r.delta.clicks > 0).reverse().slice(0, args.limit),
          comparedRows: rows.length,
        };
      }),
  );

  server.registerTool(
    'gsc_striking_distance',
    {
      title: 'Search Console: query a distanza di tiro',
      description:
        'Query con pagina già visibile ma non in cima (default posizione 4-20), ordinate per impressioni: le opportunità più rapide da ottimizzare.',
      inputSchema: {
        siteUrl,
        ...dateRangeShape,
        minPosition: z.number().min(1).default(4),
        maxPosition: z.number().min(1).default(20),
        minImpressions: z.number().int().min(0).default(10),
        pageContains: z.string().optional().describe('Limita alle pagine il cui URL contiene questo testo, es. "/blog/".'),
        limit: z.number().int().min(1).max(1000).default(50),
      },
      annotations: { readOnlyHint: true },
    },
    (args) =>
      run(async () => {
        const site = resolveSite(args.siteUrl, ctx.defaults.gscSite, 'gsc');
        const range = resolveRange(args);
        const rows = await ctx.gsc().query({
          siteUrl: site,
          ...range,
          dimensions: ['query', 'page'],
          filters: args.pageContains ? [{ dimension: 'page', operator: 'contains', expression: args.pageContains }] : undefined,
          rowLimit: GSC_MAX_ROWS,
        });
        const hits = strikingDistance(rows, args);
        return { siteUrl: site, ...range, total: hits.length, rows: hits.slice(0, args.limit) };
      }),
  );

  server.registerTool(
    'gsc_inspect_url',
    {
      title: 'Search Console: ispezione URL',
      description:
        "Stato di indicizzazione di un URL secondo Google: copertura, ultima scansione, canonical scelto da Google, robots.txt, risultati avanzati. Quota Google: circa 2.000 ispezioni al giorno per proprietà.",
      inputSchema: {
        url: z.string().url().describe("URL completo da ispezionare, appartenente alla proprietà."),
        siteUrl,
        languageCode: z.string().default('it-IT').describe('Lingua dei messaggi restituiti da Google.'),
      },
      annotations: { readOnlyHint: true },
    },
    (args) =>
      run(() => ctx.gsc().inspectUrl(resolveSite(args.siteUrl, ctx.defaults.gscSite, 'gsc'), args.url, args.languageCode)),
  );

  server.registerTool(
    'gsc_list_sitemaps',
    {
      title: 'Search Console: sitemap',
      description: 'Sitemap inviate alla proprietà, con data di ultimo download, errori, avvisi e URL inviati.',
      inputSchema: { siteUrl },
      annotations: { readOnlyHint: true },
    },
    (args) => run(() => ctx.gsc().listSitemaps(resolveSite(args.siteUrl, ctx.defaults.gscSite, 'gsc'))),
  );
}
