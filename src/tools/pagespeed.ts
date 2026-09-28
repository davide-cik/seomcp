import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { run, type ToolContext } from './shared.js';

const target = {
  url: z.string().url().optional().describe('Una singola pagina, es. "https://www.esempio.it/prodotti/".'),
  origin: z.string().url().optional().describe('Tutto il sito, es. "https://www.esempio.it". Ha dati più spesso della singola pagina.'),
};

const formFactor = z
  .enum(['PHONE', 'DESKTOP', 'TABLET', 'ALL'])
  .default('PHONE')
  .describe('Dispositivo. Google usa i dati da mobile per il ranking: default PHONE.');

export function registerPageSpeedTools(server: McpServer, ctx: ToolContext): void {
  server.registerTool(
    'psi_analyze',
    {
      title: 'PageSpeed Insights: test della pagina',
      description:
        'Test Lighthouse di una pagina tramite PageSpeed Insights: punteggi (0-100), metriche di laboratorio, opportunità di miglioramento ordinate per risparmio e controlli SEO non superati. Include i dati reali CrUX se disponibili. Richiede 10-30 secondi.',
      inputSchema: {
        url: z.string().url().describe('URL completo della pagina da testare.'),
        strategy: z.enum(['mobile', 'desktop']).default('mobile'),
        categories: z
          .array(z.enum(['performance', 'seo', 'accessibility', 'best-practices']))
          .min(1)
          .default(['performance', 'seo']),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    (args) => run(() => ctx.pagespeed().analyze(args.url, args.strategy, args.categories)),
  );

  server.registerTool(
    'crux_query',
    {
      title: 'Chrome UX Report: Core Web Vitals reali',
      description:
        'Core Web Vitals reali degli utenti Chrome negli ultimi 28 giorni (LCP, INP, CLS, più FCP e TTFB): 75° percentile, giudizio (buono / da migliorare / scarso) e distribuzione. Indica se i Core Web Vitals sono superati. Sono i dati che Google usa per il ranking.',
      inputSchema: { ...target, formFactor },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    (args) => run(() => ctx.pagespeed().query({ url: args.url, origin: args.origin }, args.formFactor)),
  );

  server.registerTool(
    'crux_history',
    {
      title: 'Chrome UX Report: andamento',
      description:
        "Andamento dei Core Web Vitals reali (75° percentile di LCP, INP e CLS), una riga per settimana, fino a 40 settimane. Utile per vedere se un intervento ha migliorato le prestazioni o se c'è stato un peggioramento.",
      inputSchema: {
        ...target,
        formFactor,
        weeks: z.number().int().min(1).max(40).default(25),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    (args) => run(() => ctx.pagespeed().history({ url: args.url, origin: args.origin }, args.formFactor, args.weeks)),
  );
}
