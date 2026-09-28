import { describe, expect, it, vi } from 'vitest';
import { BingClient, parseBingDate } from '../src/core/bing.js';
import { SeoMcpError } from '../src/core/errors.js';

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('BingClient', () => {
  it('chiama il metodo giusto e mappa le righe', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        d: [{ Query: 'scarpe', Date: '/Date(1735689600000)/', Impressions: 120, Clicks: 4, AvgImpressionPosition: 6.5, AvgClickPosition: 5 }],
      }),
    );
    const client = new BingClient({ apiKey: 'segreta', fetch: fetchMock as unknown as typeof fetch });
    const rows = await client.getQueryStats('https://www.esempio.it/');

    const url = new URL(String((fetchMock.mock.calls[0] as unknown[])[0]));
    expect(url.pathname).toMatch(/\/GetQueryStats$/);
    expect(url.searchParams.get('siteUrl')).toBe('https://www.esempio.it/');
    expect(rows).toEqual([
      { key: 'scarpe', date: '2025-01-01', impressions: 120, clicks: 4, avgImpressionPosition: 6.5, avgClickPosition: 5 },
    ]);
  });

  it('usa Italia / italiano come default per le keyword', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ d: [] }));
    await new BingClient({ apiKey: 'k', fetch: fetchMock as unknown as typeof fetch }).getKeywordStats('seo');
    const url = new URL(String((fetchMock.mock.calls[0] as unknown[])[0]));
    expect(url.searchParams.get('country')).toBe('it');
    expect(url.searchParams.get('language')).toBe('it-IT');
  });

  it('traduce una chiave non valida in un errore con suggerimento, senza esporre la chiave', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ ErrorCode: 3, Message: 'InvalidApiKey' }, 400));
    const client = new BingClient({ apiKey: 'segreta', fetch: fetchMock as unknown as typeof fetch });
    const err = await client.listSites().catch((e: unknown) => e);

    expect(err).toBeInstanceOf(SeoMcpError);
    expect((err as SeoMcpError).code).toBe('AUTH_FAILED');
    expect((err as SeoMcpError).hint).toContain('BING_WEBMASTER_API_KEY');
    expect(JSON.stringify({ m: (err as Error).message, h: (err as SeoMcpError).hint })).not.toContain('segreta');
  });
});

describe('parseBingDate', () => {
  it('gestisce il formato WCF con e senza offset', () => {
    expect(parseBingDate('/Date(1735689600000)/')).toBe('2025-01-01');
    expect(parseBingDate('/Date(1735689600000-0800)/')).toBe('2025-01-01');
    expect(parseBingDate('2025-01-01')).toBe('2025-01-01');
  });
});
