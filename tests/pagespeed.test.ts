import { describe, expect, it } from 'vitest';
import { SeoMcpError } from '../src/core/errors.js';
import { PageSpeedClient, rate } from '../src/core/pagespeed.js';

const cruxResponse = {
  record: {
    key: { origin: 'https://www.esempio.it', formFactor: 'PHONE' },
    collectionPeriod: { firstDate: { year: 2026, month: 8, day: 30 }, lastDate: { year: 2026, month: 9, day: 26 } },
    metrics: {
      largest_contentful_paint: { percentiles: { p75: 2100 }, histogram: [{ start: 0, end: 2500, density: 0.81 }, { start: 2500, end: 4000, density: 0.12 }, { start: 4000, density: 0.07 }] },
      interaction_to_next_paint: { percentiles: { p75: 180 }, histogram: [{ density: 0.8 }, { density: 0.15 }, { density: 0.05 }] },
      cumulative_layout_shift: { percentiles: { p75: '0.15' }, histogram: [{ density: 0.7 }, { density: 0.2 }, { density: 0.1 }] },
    },
  },
};

describe('rate', () => {
  it('applica le soglie ufficiali', () => {
    expect(rate('largest_contentful_paint', 2500)).toBe('buono');
    expect(rate('largest_contentful_paint', 3000)).toBe('da migliorare');
    expect(rate('cumulative_layout_shift', 0.3)).toBe('scarso');
    expect(rate('sconosciuta', 1)).toBeUndefined();
  });
});

describe('PageSpeedClient.query (CrUX)', () => {
  it('calcola giudizi, distribuzione ed esito dei Core Web Vitals', async () => {
    let body: Record<string, unknown> | undefined;
    const crux = { records: { queryRecord: async (p: { requestBody: Record<string, unknown> }) => ((body = p.requestBody), { data: cruxResponse }) } };
    const c = new PageSpeedClient('chiave', { psi: {} as never, crux: crux as never });
    const r = await c.query({ origin: 'https://www.esempio.it/qualsiasi/pagina' });

    expect(body).toMatchObject({ origin: 'https://www.esempio.it', formFactor: 'PHONE' });
    expect(r.period).toEqual({ firstDate: '2026-08-30', lastDate: '2026-09-26' });
    expect(r.metrics.largest_contentful_paint).toEqual({ p75: 2100, rating: 'buono', distribution: { buono: 0.81, 'da migliorare': 0.12, scarso: 0.07 } });
    expect(r.metrics.cumulative_layout_shift?.rating).toBe('da migliorare');
    expect(r.coreWebVitalsPassed).toBe(false);
  });

  it('senza API key spiega come ottenerla', async () => {
    const c = new PageSpeedClient(undefined, { psi: {} as never, crux: {} as never });
    const err = await c.query({ origin: 'https://www.esempio.it' }).catch((e: unknown) => e);
    expect((err as SeoMcpError).code).toBe('NOT_CONFIGURED');
    expect((err as SeoMcpError).hint).toContain('SEOMCP_GOOGLE_API_KEY');
  });

  it('404: nessun dato, suggerisce di provare con l\'origine', async () => {
    const crux = { records: { queryRecord: async () => Promise.reject({ response: { status: 404 } }) } };
    const c = new PageSpeedClient('chiave', { psi: {} as never, crux: crux as never });
    const err = await c.query({ url: 'https://www.esempio.it/pagina-poco-visitata' }).catch((e: unknown) => e);
    expect((err as SeoMcpError).message).toContain('Nessun dato reale');
    expect((err as SeoMcpError).hint).toContain('origine');
  });
});

describe('PageSpeedClient.history (CrUX)', () => {
  it('una riga per settimana con i p75 di ciascuna metrica', async () => {
    const crux = {
      records: {
        queryHistoryRecord: async () => ({
          data: {
            record: {
              collectionPeriods: [{ lastDate: { year: 2026, month: 9, day: 19 } }, { lastDate: { year: 2026, month: 9, day: 26 } }],
              metrics: {
                largest_contentful_paint: { percentilesTimeseries: { p75s: [2600, 2300] } },
                cumulative_layout_shift: { percentilesTimeseries: { p75s: ['0.12', null] } },
              },
            },
          },
        }),
      },
    };
    const c = new PageSpeedClient('chiave', { psi: {} as never, crux: crux as never });
    const h = await c.history({ origin: 'https://www.esempio.it' }, 'PHONE', 2);
    expect(h.weeks).toEqual([
      { lastDate: '2026-09-19', p75: { largest_contentful_paint: 2600, cumulative_layout_shift: 0.12 } },
      { lastDate: '2026-09-26', p75: { largest_contentful_paint: 2300, cumulative_layout_shift: null } },
    ]);
  });
});

describe('PageSpeedClient.analyze (PSI)', () => {
  it('estrae punteggi, metriche, opportunità e controlli SEO non superati', async () => {
    let params: Record<string, unknown> | undefined;
    const psi = {
      pagespeedapi: {
        runpagespeed: async (p: Record<string, unknown>) => {
          params = p;
          return {
            data: {
              lighthouseResult: {
                categories: { performance: { score: 0.62 }, seo: { score: 0.9, auditRefs: [{ id: 'meta-description' }, { id: 'document-title' }] } },
                audits: {
                  'largest-contentful-paint': { displayValue: '3,4 s', numericValue: 3400, score: 0.4 },
                  'render-blocking-resources': { title: 'Elimina le risorse che bloccano il rendering', score: 0.3, details: { overallSavingsMs: 900 } },
                  'unused-javascript': { title: 'Riduci il JavaScript inutilizzato', score: 0.5, details: { overallSavingsMs: 1500 } },
                  'meta-description': { title: 'Il documento non ha una meta descrizione', score: 0 },
                  'document-title': { title: 'Il documento ha un elemento <title>', score: 1 },
                },
              },
              loadingExperience: { overall_category: 'AVERAGE', metrics: { LARGEST_CONTENTFUL_PAINT_MS: { percentile: 2900, category: 'AVERAGE' } } },
            },
          };
        },
      },
    };
    const c = new PageSpeedClient('chiave', { psi: psi as never, crux: {} as never });
    const r = await c.analyze('https://www.esempio.it/', 'mobile', ['performance', 'seo']);

    expect(params).toMatchObject({ url: 'https://www.esempio.it/', strategy: 'MOBILE', category: ['PERFORMANCE', 'SEO'], locale: 'it' });
    expect(r.scores).toEqual({ performance: 62, seo: 90 });
    expect(r.lab['largest-contentful-paint']).toEqual({ value: '3,4 s', numeric: 3400 });
    expect(r.opportunities.map((o) => o.id)).toEqual(['unused-javascript', 'render-blocking-resources']);
    expect(r.seoIssues).toEqual([{ id: 'meta-description', title: 'Il documento non ha una meta descrizione' }]);
    expect(r.fieldData).toEqual({ scope: 'url', overall: 'AVERAGE', metrics: { LARGEST_CONTENTFUL_PAINT_MS: { p75: 2900, category: 'AVERAGE' } } });
  });

  it('rifiuta URL non http(s)', async () => {
    const c = new PageSpeedClient('chiave', { psi: {} as never, crux: {} as never });
    await expect(c.analyze('file:///etc/passwd')).rejects.toThrow(/http/);
  });
});
