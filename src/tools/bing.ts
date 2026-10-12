import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { aggregateBingStats } from '../core/analysis.js';
import type { BingCrawlStats } from '../core/bing.js';
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

  server.registerTool(
    'bing_inbound_links',
    {
      title: 'Bing: link in entrata',
      description:
        "Link in entrata secondo l'indice di Bing (dato che Search Console non fornisce via API): quali pagine del sito ricevono link e quanti, e per le più linkate i siti di provenienza e il testo dei link. È una fotografia attuale: l'API di Bing non dà l'andamento nel tempo.",
      inputSchema: {
        siteUrl,
        detailPages: z.number().int().min(0).max(20).default(5).describe('Per quante delle pagine più linkate leggere i siti di provenienza e i testi dei link.'),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    (args) =>
      run(async () => {
        const site = resolveSite(args.siteUrl, ctx.defaults.bingSite, 'bing');
        const bing = ctx.bing();
        const { links, truncated } = await bing.getLinkCounts(site);
        const pages = [...links].sort((a, b) => b.count - a.count);
        const totalLinks = pages.reduce((n, p) => n + p.count, 0);
        if (!pages.length) {
          return {
            siteUrl: site,
            totalLinks: 0,
            pages: [],
            note: "Bing non ha restituito link in entrata. Può significare che non ne ha trovati, ma nel 2026 l'API restituisce a volte elenchi vuoti anche per siti con link: non va letto come 'zero link'. Confronta con il report Backlink nell'interfaccia di Bing Webmaster Tools.",
          };
        }

        const domains = new Map<string, { links: number; pages: Set<string> }>();
        const anchors = new Map<string, number>();
        const detail: Array<{ page: string; inboundLinks: number; sources: Array<{ source: string; anchor: string }> }> = [];
        for (const p of pages.slice(0, args.detailPages)) {
          const sources = await bing.getUrlLinks(site, p.url).catch(() => []);
          detail.push({ page: p.url, inboundLinks: p.count, sources: sources.slice(0, 50) });
          for (const d of sources) {
            let host = d.source;
            try { host = new URL(d.source).hostname.replace(/^www\./, ''); } catch {}
            const e = domains.get(host) ?? { links: 0, pages: new Set<string>() };
            e.links++;
            e.pages.add(p.url);
            domains.set(host, e);
            const a = d.anchor.trim().toLowerCase();
            if (a) anchors.set(a, (anchors.get(a) ?? 0) + 1);
          }
        }

        return {
          siteUrl: site,
          totalLinks,
          linkedPages: pages.length,
          truncated,
          topPages: pages.slice(0, 50),
          referringDomains: [...domains.entries()]
            .map(([domain, v]) => ({ domain, links: v.links, linkedPages: v.pages.size }))
            .sort((a, b) => b.links - a.links)
            .slice(0, 50),
          topAnchors: [...anchors.entries()].map(([anchor, n]) => ({ anchor, links: n })).sort((a, b) => b.links - a.links).slice(0, 30),
          detail,
          note: `Domini e testi dei link sono calcolati sulle ${detail.length} pagine più linkate. L'API di Bing non fornisce l'andamento nel tempo: per seguirlo confronta questa fotografia con una successiva.`,
        };
      }),
  );

  server.registerTool(
    'bing_crawl',
    {
      title: 'Bing: scansione del sito',
      description:
        "Come Bing scansiona il sito: pagine scansionate, pagine nell'indice, risposte (2xx, 301, 302, 4xx, 5xx), bloccate da robots.txt ed errori, giorno per giorno negli ultimi mesi; più l'elenco degli URL con problemi di scansione (redirect, 4xx, 5xx, bloccati da robots.txt, malware, DNS, timeout) con i link interni che li raggiungono. Conta anche per le AI: Copilot e altri assistenti si appoggiano all'indice di Bing.",
      inputSchema: {
        siteUrl,
        days: z.number().int().min(1).max(200).default(30).describe('Giorni di statistiche da restituire (Bing ne conserva circa 6 mesi).'),
        issuesLimit: z.number().int().min(0).max(1000).default(100).describe('URL con problemi da restituire, ordinati per link interni.'),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    (args) =>
      run(async () => {
        const site = resolveSite(args.siteUrl, ctx.defaults.bingSite, 'bing');
        const bing = ctx.bing();
        const [stats, issues] = await Promise.all([bing.getCrawlStats(site), bing.getCrawlIssues(site)]);
        const daily = stats.slice(-args.days);
        const sum = (k: Exclude<keyof BingCrawlStats, 'date' | 'inIndex' | 'inLinks'>) => daily.reduce((n, d) => n + d[k], 0);
        const first = daily[0];
        const last = daily[daily.length - 1];

        const byType = new Map<string, number>();
        for (const i of issues) for (const t of i.issues) byType.set(t, (byType.get(t) ?? 0) + 1);
        return {
          siteUrl: site,
          period: first && last ? { from: first.date, to: last.date, days: daily.length } : null,
          index: first && last ? { inIndexStart: first.inIndex, inIndexEnd: last.inIndex, change: last.inIndex - first.inIndex } : null,
          totals: daily.length
            ? {
                crawledPages: sum('crawledPages'),
                crawlErrors: sum('crawlErrors'),
                code2xx: sum('code2xx'),
                code301: sum('code301'),
                code302: sum('code302'),
                code4xx: sum('code4xx'),
                code5xx: sum('code5xx'),
                allOtherCodes: sum('allOtherCodes'),
                blockedByRobotsTxt: sum('blockedByRobotsTxt'),
                containsMalware: sum('containsMalware'),
              }
            : null,
          daily,
          issues: {
            total: issues.length,
            byType: Object.fromEntries([...byType.entries()].sort((a, b) => b[1] - a[1])),
            urls: [...issues].sort((a, b) => b.inLinks - a.inLinks).slice(0, args.issuesLimit),
          },
          note: "Dati di Bing aggiornati una volta al giorno. Un URL corretto può restare nell'elenco dei problemi per qualche giorno. ImportantUrlBlockedByRobotsTxt indica pagine che Bing ritiene importanti ma che robots.txt blocca.",
        };
      }),
  );
}
