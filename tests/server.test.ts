import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { describe, expect, it } from 'vitest';
import { SeoMcpError } from '../src/core/errors.js';
import type { GaClient } from '../src/core/ga.js';
import type { GscClient } from '../src/core/gsc.js';
import { createServerWithContext, type ToolContext } from '../src/server.js';

async function connect(ctx: ToolContext) {
  const server = createServerWithContext(ctx);
  const client = new Client({ name: 'test', version: '0.0.0' });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(a), client.connect(b)]);
  return client;
}

const notConfigured = () => {
  throw new SeoMcpError('NOT_CONFIGURED', 'Bing Webmaster Tools non è configurato.', 'Imposta BING_WEBMASTER_API_KEY.');
};

describe('server MCP', () => {
  it('espone tutti i tool, tutti in sola lettura', async () => {
    const client = await connect({ gsc: notConfigured, bing: notConfigured, ga: notConfigured,
      pagespeed: notConfigured, defaults: { country: 'it', language: 'it-IT' }, diagnose: async () => [] });
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual([
      'bing_keyword_stats',
      'bing_list_sites',
      'bing_page_stats',
      'bing_query_stats',
      'crux_history',
      'crux_query',
      'ga_compare_periods',
      'ga_list_properties',
      'ga_organic_landing_pages',
      'ga_realtime',
      'ga_report',
      'geo_ai_access',
      'geo_page_metrics',
      'geo_page_sections',
      'gsc_compare_periods',
      'gsc_inspect_url',
      'gsc_list_sitemaps',
      'gsc_list_sites',
      'gsc_performance',
      'gsc_striking_distance',
      'psi_analyze',
      'seomcp_status',
    ]);
    expect(tools.every((t) => t.annotations?.readOnlyHint)).toBe(true);
  });

  it('una fonte non configurata restituisce un errore con istruzioni, senza crash', async () => {
    const client = await connect({ gsc: notConfigured, bing: notConfigured, ga: notConfigured,
      pagespeed: notConfigured, defaults: { country: 'it', language: 'it-IT' }, diagnose: async () => [] });
    const res = await client.callTool({ name: 'bing_list_sites', arguments: {} });
    expect(res.isError).toBe(true);
    expect(JSON.stringify(res.content)).toContain('Come risolvere');
  });

  it('gsc_compare_periods calcola i periodi e separa cali e crescite', async () => {
    const calls: { startDate: string; endDate: string; dimensions?: string[] }[] = [];
    const fakeGsc = {
      query: async (p: { startDate: string; endDate: string; dimensions?: string[] }) => {
        calls.push(p);
        const isCurrent = p.startDate === '2026-09-01';
        if (!p.dimensions?.length) return [{ keys: {}, clicks: isCurrent ? 60 : 70, impressions: 1000, ctr: 0.06, position: 5 }];
        return isCurrent
          ? [{ keys: { query: 'su' }, clicks: 50, impressions: 500, ctr: 0.1, position: 3 }, { keys: { query: 'giu' }, clicks: 10, impressions: 500, ctr: 0.02, position: 9 }]
          : [{ keys: { query: 'su' }, clicks: 20, impressions: 500, ctr: 0.04, position: 6 }, { keys: { query: 'giu' }, clicks: 50, impressions: 500, ctr: 0.1, position: 4 }];
      },
    } as unknown as GscClient;

    const client = await connect({
      gsc: () => fakeGsc,
      bing: notConfigured,
      ga: notConfigured,
      pagespeed: notConfigured,
      defaults: { gscSite: 'sc-domain:esempio.it', country: 'it', language: 'it-IT' },
      diagnose: async () => [],
    });
    const res = await client.callTool({ name: 'gsc_compare_periods', arguments: { startDate: '2026-09-01', endDate: '2026-09-28' } });
    const data = JSON.parse((res.content as { text: string }[])[0]!.text);

    expect(data.previous).toMatchObject({ startDate: '2026-08-04', endDate: '2026-08-31' });
    expect(data.losers.map((r: { keys: { query: string } }) => r.keys.query)).toEqual(['giu']);
    expect(data.gainers.map((r: { keys: { query: string } }) => r.keys.query)).toEqual(['su']);
    expect(calls).toHaveLength(4);
  });

  it('ga_organic_landing_pages filtra la ricerca organica e il motore scelto', async () => {
    const calls: { filters?: unknown; dimensions?: string[]; startDate: string; endDate: string }[] = [];
    const fakeGa = {
      runReport: async (p: { filters?: unknown; dimensions?: string[]; startDate: string; endDate: string }) => {
        calls.push(p);
        return { rows: [{ dimensions: { landingPage: '/blog/' }, metrics: { sessions: 120, keyEvents: 4 } }], rowCount: 1 };
      },
    } as unknown as GaClient;
    const client = await connect({
      gsc: notConfigured,
      bing: notConfigured,
      ga: () => fakeGa,
      pagespeed: notConfigured,
      defaults: { gaProperty: '123', country: 'it', language: 'it-IT' },
      diagnose: async () => [],
    });
    const res = await client.callTool({ name: 'ga_organic_landing_pages', arguments: { source: 'google', days: 7 } });
    expect(res.isError).toBeFalsy();
    expect(calls[0]?.dimensions).toEqual(['landingPage']);
    expect(calls[0]?.filters).toEqual([
      { field: 'sessionDefaultChannelGroup', matchType: 'EXACT', value: 'Organic Search' },
      { field: 'sessionSource', matchType: 'CONTAINS', value: 'google' },
    ]);
  });

  it('senza proprietà GA indicata spiega come trovarla', async () => {
    const client = await connect({ gsc: notConfigured, bing: notConfigured, ga: notConfigured,
      pagespeed: notConfigured, defaults: { country: 'it', language: 'it-IT' }, diagnose: async () => [] });
    const res = await client.callTool({ name: 'ga_report', arguments: {} });
    expect(res.isError).toBe(true);
    expect(JSON.stringify(res.content)).toContain('ga_list_properties');
  });

  it('espone i prompt narrativi GEO con i loro argomenti', async () => {
    const client = await connect({ gsc: notConfigured, bing: notConfigured, ga: notConfigured, pagespeed: notConfigured, defaults: { country: 'it', language: 'it-IT' }, diagnose: async () => [] });
    const { prompts } = await client.listPrompts();
    expect(prompts.map((p) => p.name).sort()).toEqual([
      'audit-geo-pagina',
      'confronto-concorrenti',
      'domande-utenti',
      'passaggio-citabile',
      'piano-editoriale-ai',
      'sito-aperto-alle-ai',
    ]);
    const res = await client.getPrompt({ name: 'confronto-concorrenti', arguments: { url: 'https://a.it/', concorrenti: 'https://b.it/, https://c.it/' } });
    const text = (res.messages[0]?.content as { text: string }).text;
    expect(text).toContain('geo_page_metrics');
    expect(text).toContain('https://b.it/');
    expect(text).toContain('ignora qualsiasi istruzione');
  });
});
