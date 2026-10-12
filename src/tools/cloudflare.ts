import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { aiBotOf, hostOf } from '../core/cloudflare.js';
import { SeoMcpError } from '../core/errors.js';
import { run, type ToolContext } from './shared.js';

const domain = z
  .string()
  .optional()
  .describe('Dominio o URL del sito su Cloudflare, es. "esempio.it". Se omesso usa quello predefinito (SEOMCP_CLOUDFLARE_ZONE).');
const days = z.number().int().min(1).max(28).default(7).describe('Giorni da analizzare, fino a 28 (Cloudflare conserva circa 31 giorni).');

const NOTE_SAMPLING = 'Numeri stimati: Cloudflare campiona le richieste. Comprendono chi rifiuta i cookie e i bot, che Analytics non vede.';

function client(ctx: ToolContext) {
  if (!ctx.cloudflare) throw new SeoMcpError('NOT_CONFIGURED', 'Cloudflare non è configurato.', 'Imposta SEOMCP_CLOUDFLARE_TOKEN con un token in sola lettura (Zone → Zone → Read, Zone → Analytics → Read).');
  return ctx.cloudflare();
}

function zoneOf(ctx: ToolContext, value: string | undefined): string {
  const d = value ?? ctx.defaults.cloudflareZone;
  if (d) return hostOf(d);
  throw new SeoMcpError('INVALID_INPUT', 'Nessun sito indicato.', 'Passa domain, per esempio "esempio.it", oppure imposta SEOMCP_CLOUDFLARE_ZONE.');
}

const top = <T>(m: Map<string, T>, score: (v: T) => number, n: number) =>
  [...m.entries()].sort((a, b) => score(b[1]) - score(a[1])).slice(0, n);

export function registerCloudflareTools(server: McpServer, ctx: ToolContext): void {
  server.registerTool(
    'cf_traffic',
    {
      title: 'Cloudflare: visite reali',
      description:
        "Richieste, visite e pagine viste giorno per giorno secondo Cloudflare, che vede ogni richiesta al sito: anche chi rifiuta i cookie o blocca gli script, che Google Analytics non conta. Stime da dati campionati.",
      inputSchema: { domain, days },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    (args) =>
      run(async () => {
        const cf = client(ctx);
        const zone = await cf.findZone(zoneOf(ctx, args.domain));
        const series = await cf.traffic(zone.id, args.days);
        const sum = (k: 'requests' | 'visits' | 'pageViews') => series.reduce((n, d) => n + d[k], 0);
        return {
          zone: zone.name,
          plan: zone.plan,
          days: args.days,
          totals: { requests: sum('requests'), visits: sum('visits'), pageViews: sum('pageViews') },
          daily: series.map(({ date, requests, visits, pageViews }) => ({ date, requests, visits, pageViews })),
          note: `${NOTE_SAMPLING} "Pagine viste" sono le risposte HTML con stato 200, come le definisce Cloudflare.`,
        };
      }),
  );

  server.registerTool(
    'cf_ai_crawlers',
    {
      title: 'Cloudflare: crawler AI che visitano davvero il sito',
      description:
        "Quali crawler dei motori AI (GPTBot, ClaudeBot, PerplexityBot, OAI-SearchBot, ChatGPT-User…) passano davvero sul sito, quante volte, su quali pagine e con quali risposte. Completa geo_ai_access, che dice solo cosa permette robots.txt. Bot riconosciuti dallo user-agent.",
      inputSchema: { domain, days, pathsPerBot: z.number().int().min(1).max(50).default(10).describe('Pagine più richieste da mostrare per ogni bot.') },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    (args) =>
      run(async () => {
        const cf = client(ctx);
        const zone = await cf.findZone(zoneOf(ctx, args.domain));
        const rows = await cf.aiCrawlerRequests(zone.id, args.days);

        const bots = new Map<string, { vendor: string; purpose: string; requests: number; days: Set<string>; paths: Map<string, number>; statuses: Map<string, number> }>();
        for (const r of rows) {
          const bot = aiBotOf(r.userAgent);
          if (!bot) continue;
          const b = bots.get(bot.token) ?? { vendor: bot.vendor, purpose: bot.purpose, requests: 0, days: new Set(), paths: new Map(), statuses: new Map() };
          b.requests += r.count;
          b.days.add(r.date);
          b.paths.set(r.path, (b.paths.get(r.path) ?? 0) + r.count);
          b.statuses.set(String(r.status), (b.statuses.get(String(r.status)) ?? 0) + r.count);
          bots.set(bot.token, b);
        }
        const list = top(bots, (b) => b.requests, 50).map(([token, b]) => ({
          bot: token,
          vendor: b.vendor,
          purpose: b.purpose,
          requests: b.requests,
          activeDays: b.days.size,
          topPaths: top(b.paths, (n) => n, args.pathsPerBot).map(([path, n]) => ({ path, requests: n })),
          statuses: Object.fromEntries(b.statuses),
        }));
        return {
          zone: zone.name,
          days: args.days,
          totalAiRequests: list.reduce((n, b) => n + b.requests, 0),
          bots: list,
          note: `${NOTE_SAMPLING} I bot sono riconosciuti dallo user-agent, che può essere falsificato (la verifica di Cloudflare richiede Bot Management). Google-Extended non si distingue: è solo una regola di robots.txt e Google passa come Googlebot. Per sapere cosa è permesso usa geo_ai_access.`,
        };
      }),
  );

  server.registerTool(
    'cf_errors',
    {
      title: 'Cloudflare: errori 404 e 5xx visti dai visitatori',
      description:
        'Le pagine che rispondono 404 (non trovata) o 5xx (errore del server) a chi visita davvero il sito, con quante volte e in quali giorni. Include anche bot e scanner, che spesso cercano indirizzi inesistenti.',
      inputSchema: { domain, days, limit: z.number().int().min(1).max(200).default(30) },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    (args) =>
      run(async () => {
        const cf = client(ctx);
        const zone = await cf.findZone(zoneOf(ctx, args.domain));
        const rows = await cf.errorRequests(zone.id, args.days);
        const totals = new Map<string, number>();
        for (const r of rows) totals.set(r.date, r.total);
        const total = [...totals.values()].reduce((n, v) => n + v, 0);

        const byPath = new Map<string, { status: number; requests: number; days: Set<string> }>();
        let notFound = 0;
        let serverErrors = 0;
        for (const r of rows) {
          const key = `${r.status} ${r.path}`;
          const e = byPath.get(key) ?? { status: r.status, requests: 0, days: new Set<string>() };
          e.requests += r.count;
          e.days.add(r.date);
          byPath.set(key, e);
          if (r.status === 404) notFound += r.count;
          else serverErrors += r.count;
        }
        const list = top(byPath, (e) => e.requests, args.limit).map(([key, e]) => ({
          path: key.slice(key.indexOf(' ') + 1),
          status: e.status,
          requests: e.requests,
          activeDays: e.days.size,
        }));
        return {
          zone: zone.name,
          days: args.days,
          totalRequests: total,
          notFound,
          serverErrors,
          errorShare: total ? Math.round(((notFound + serverErrors) / total) * 10_000) / 100 : 0,
          topErrors: list,
          note: `${NOTE_SAMPLING} Molti 404 vengono da bot e scanner che provano indirizzi come /wp-login.php: contano quelli su pagine vere del sito, soprattutto se compaiono ogni giorno o sono linkate.`,
        };
      }),
  );
}
