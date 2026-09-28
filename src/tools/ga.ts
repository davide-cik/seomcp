import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { compareGaPeriods } from '../core/analysis.js';
import { addDays, previousPeriod } from '../core/dates.js';
import { SeoMcpError } from '../core/errors.js';
import { GA_MAX_ROWS } from '../core/ga.js';
import type { GaFilter } from '../core/types.js';
import { dateRangeShape, isoDate, resolveProperty, resolveRange, run, type ToolContext } from './shared.js';

/** I dati di Analytics arrivano con circa un giorno di ritardo. */
const GA_LAG_DAYS = 1;

const property = z
  .string()
  .optional()
  .describe('ID numerico della proprietà GA4, es. "123456789" (non l\'ID G-XXXX). Se omesso usa quella predefinita.');

const filters = z
  .array(
    z.object({
      field: z.string().min(1).describe('Dimensione, es. "sessionDefaultChannelGroup", "sessionSource", "landingPage", "country".'),
      matchType: z.enum(['EXACT', 'CONTAINS', 'BEGINS_WITH', 'ENDS_WITH', 'FULL_REGEXP', 'PARTIAL_REGEXP']).default('EXACT'),
      value: z.string().min(1),
      exclude: z.boolean().default(false).describe('true per escludere le righe che corrispondono.'),
    }),
  )
  .optional()
  .describe('Filtri sulle dimensioni, in AND.');

const ORGANIC: GaFilter = { field: 'sessionDefaultChannelGroup', matchType: 'EXACT', value: 'Organic Search' };

const COMMON_NAMES =
  'Dimensioni utili: landingPage, pagePath, sessionDefaultChannelGroup, sessionSource, sessionSourceMedium, date, deviceCategory, country. ' +
  'Metriche utili: sessions, totalUsers, newUsers, engagedSessions, engagementRate, averageSessionDuration, screenPageViews, keyEvents, sessionKeyEventRate, totalRevenue.';

export function registerGaTools(server: McpServer, ctx: ToolContext): void {
  server.registerTool(
    'ga_list_properties',
    {
      title: 'Analytics: proprietà',
      description: 'Elenca le proprietà Google Analytics 4 accessibili, con il loro ID numerico e l\'account.',
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    () => run(() => ctx.ga().listProperties()),
  );

  server.registerTool(
    'ga_report',
    {
      title: 'Analytics: report',
      description: `Report libero su Google Analytics 4 con dimensioni, metriche e filtri a scelta. I dati hanno circa un giorno di ritardo. ${COMMON_NAMES}`,
      inputSchema: {
        property,
        ...dateRangeShape,
        dimensions: z.array(z.string().min(1)).max(9).default(['sessionDefaultChannelGroup']),
        metrics: z.array(z.string().min(1)).min(1).max(10).default(['sessions', 'totalUsers', 'keyEvents']),
        filters,
        orderBy: z.string().optional().describe('Metrica (decrescente) o dimensione (crescente) per ordinare. Default: la prima metrica.'),
        limit: z.number().int().min(1).max(GA_MAX_ROWS).default(100),
      },
      annotations: { readOnlyHint: true },
    },
    (args) =>
      run(async () => {
        const prop = resolveProperty(args.property, ctx.defaults.gaProperty);
        const range = resolveRange(args, GA_LAG_DAYS);
        const report = await ctx.ga().runReport({
          property: prop,
          ...range,
          dimensions: args.dimensions,
          metrics: args.metrics,
          filters: args.filters as GaFilter[] | undefined,
          orderBy: args.orderBy,
          limit: args.limit,
        });
        return { property: prop, ...range, ...report };
      }),
  );

  server.registerTool(
    'ga_organic_landing_pages',
    {
      title: 'Analytics: pagine di destinazione organiche',
      description:
        'Pagine di destinazione del traffico da ricerca organica, con sessioni, coinvolgimento, eventi chiave (conversioni) e ricavi. Si abbina bene a Search Console: le query portano clic, qui si vede cosa succede dopo.',
      inputSchema: {
        property,
        ...dateRangeShape,
        source: z
          .string()
          .optional()
          .describe('Limita a un motore di ricerca, es. "google" o "bing". Se omesso include tutta la ricerca organica.'),
        limit: z.number().int().min(1).max(1000).default(50),
      },
      annotations: { readOnlyHint: true },
    },
    (args) =>
      run(async () => {
        const prop = resolveProperty(args.property, ctx.defaults.gaProperty);
        const range = resolveRange(args, GA_LAG_DAYS);
        const report = await ctx.ga().runReport({
          property: prop,
          ...range,
          dimensions: ['landingPage'],
          metrics: ['sessions', 'engagedSessions', 'engagementRate', 'keyEvents', 'sessionKeyEventRate', 'totalRevenue'],
          filters: [ORGANIC, ...(args.source ? [{ field: 'sessionSource', matchType: 'CONTAINS' as const, value: args.source }] : [])],
          limit: args.limit,
        });
        return { property: prop, ...range, source: args.source ?? 'tutta la ricerca organica', ...report };
      }),
  );

  server.registerTool(
    'ga_compare_periods',
    {
      title: 'Analytics: confronto tra periodi',
      description:
        'Confronta due periodi su Google Analytics 4 e restituisce i cali e le crescite più forti, calcolati sulla prima metrica. Di default confronta con il periodo precedente; con compareTo="yearAgo" con 52 settimane prima.',
      inputSchema: {
        property,
        ...dateRangeShape,
        compareTo: z.enum(['previous', 'yearAgo', 'custom']).default('previous'),
        compareStartDate: isoDate.optional().describe('Solo con compareTo="custom".'),
        compareEndDate: isoDate.optional().describe('Solo con compareTo="custom".'),
        dimensions: z.array(z.string().min(1)).max(9).default(['landingPage']),
        metrics: z.array(z.string().min(1)).min(1).max(10).default(['sessions', 'keyEvents']),
        organicOnly: z.boolean().default(false).describe('true per considerare solo la ricerca organica.'),
        filters,
        limit: z.number().int().min(1).max(500).default(25).describe('Righe restituite per i cali e per le crescite.'),
      },
      annotations: { readOnlyHint: true },
    },
    (args) =>
      run(async () => {
        const prop = resolveProperty(args.property, ctx.defaults.gaProperty);
        const current = resolveRange(args, GA_LAG_DAYS);
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

        const allFilters = [...(args.organicOnly ? [ORGANIC] : []), ...((args.filters as GaFilter[] | undefined) ?? [])];
        const base = { property: prop, dimensions: args.dimensions, metrics: args.metrics, filters: allFilters, limit: 10_000 };
        const ga = ctx.ga();
        const [cur, prev] = await Promise.all([ga.runReport({ ...base, ...current }), ga.runReport({ ...base, ...previous })]);
        const rows = compareGaPeriods(cur.rows, prev.rows, args.metrics);
        const first = args.metrics[0] ?? '';
        return {
          property: prop,
          current,
          previous,
          dimensions: args.dimensions,
          metrics: args.metrics,
          organicOnly: args.organicOnly,
          losers: rows.filter((r) => (r.delta[first] ?? 0) < 0).slice(0, args.limit),
          gainers: rows.filter((r) => (r.delta[first] ?? 0) > 0).reverse().slice(0, args.limit),
          comparedRows: rows.length,
        };
      }),
  );

  server.registerTool(
    'ga_realtime',
    {
      title: 'Analytics: tempo reale',
      description:
        'Utenti attivi negli ultimi 30 minuti. Utile per verificare subito l\'effetto di una pubblicazione o di una campagna. Dimensioni utili: unifiedScreenName, country, deviceCategory.',
      inputSchema: {
        property,
        dimensions: z.array(z.string().min(1)).max(4).default(['unifiedScreenName']),
        metrics: z.array(z.string().min(1)).min(1).max(4).default(['activeUsers']),
        limit: z.number().int().min(1).max(250).default(25),
      },
      annotations: { readOnlyHint: true },
    },
    (args) =>
      run(async () => {
        const prop = resolveProperty(args.property, ctx.defaults.gaProperty);
        return { property: prop, window: 'ultimi 30 minuti', ...(await ctx.ga().runRealtime(prop, args.dimensions, args.metrics, args.limit)) };
      }),
  );
}
