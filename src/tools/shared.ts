import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import type { BingClient } from '../core/bing.js';
import { lastNDays, isIsoDate } from '../core/dates.js';
import { SeoMcpError } from '../core/errors.js';
import type { GaClient } from '../core/ga.js';
import type { GscClient } from '../core/gsc.js';
import type { DiagnosticItem } from '../doctor.js';

/** Ciò di cui hanno bisogno i tool. I client vengono creati solo al primo uso. */
export interface ToolContext {
  gsc: () => GscClient;
  bing: () => BingClient;
  ga: () => GaClient;
  defaults: { gscSite?: string; bingSite?: string; gaProperty?: string; country: string; language: string };
  diagnose: () => Promise<DiagnosticItem[]>;
}

export const isoDate = z.string().refine(isIsoDate, 'Formato data atteso: YYYY-MM-DD');

export const dateRangeShape = {
  startDate: isoDate.optional().describe('Data di inizio (YYYY-MM-DD). Se omessa si usano gli ultimi `days` giorni.'),
  endDate: isoDate.optional().describe('Data di fine (YYYY-MM-DD).'),
  days: z.number().int().min(1).max(480).default(28).describe('Giorni da analizzare se startDate/endDate non sono indicati.'),
};

/** `lagDays`: giorni di ritardo dei dati (Search Console circa 3, Analytics circa 1). */
export function resolveRange(args: { startDate?: string; endDate?: string; days: number }, lagDays = 3): {
  startDate: string;
  endDate: string;
} {
  if (args.startDate && args.endDate) return { startDate: args.startDate, endDate: args.endDate };
  if (args.startDate || args.endDate) {
    throw new SeoMcpError('INVALID_INPUT', 'Indica sia startDate sia endDate, oppure nessuna delle due.');
  }
  return lastNDays(args.days, lagDays);
}

export function resolveProperty(value: string | undefined, fallback: string | undefined): string {
  const property = value ?? fallback;
  if (property) return property;
  throw new SeoMcpError(
    'INVALID_INPUT',
    'Nessuna proprietà Google Analytics indicata.',
    'Passa property (usa ga_list_properties per vedere gli ID) oppure imposta SEOMCP_GA_PROPERTY.',
  );
}

export function resolveSite(value: string | undefined, fallback: string | undefined, source: 'gsc' | 'bing'): string {
  const site = value ?? fallback;
  if (site) return site;
  throw new SeoMcpError(
    'INVALID_INPUT',
    'Nessun sito indicato.',
    source === 'gsc'
      ? 'Passa siteUrl (usa gsc_list_sites per vedere i valori validi) oppure imposta SEOMCP_GSC_SITE.'
      : 'Passa siteUrl (usa bing_list_sites per vedere i valori validi) oppure imposta SEOMCP_BING_SITE.',
  );
}

/** Esegue un handler e trasforma il risultato (o l'errore) in una risposta MCP. */
export async function run(fn: () => Promise<unknown>): Promise<CallToolResult> {
  try {
    const data = await fn();
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  } catch (err) {
    if (err instanceof SeoMcpError) {
      const text = err.hint ? `${err.message}\nCome risolvere: ${err.hint}` : err.message;
      return { isError: true, content: [{ type: 'text', text }] };
    }
    // Il dettaglio va solo su stderr (log del client MCP), non nella risposta.
    process.stderr.write(`[seomcp] errore imprevisto: ${(err as Error).stack ?? String(err)}\n`);
    return { isError: true, content: [{ type: 'text', text: `Errore imprevisto: ${(err as Error).message}` }] };
  }
}
