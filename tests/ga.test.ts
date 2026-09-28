import { describe, expect, it } from 'vitest';
import { compareGaPeriods } from '../src/core/analysis.js';
import { SeoMcpError } from '../src/core/errors.js';
import { buildFilter, GaClient, normalizeProperty, parseRows } from '../src/core/ga.js';
import { googleError } from '../src/core/google-errors.js';

describe('normalizeProperty', () => {
  it('accetta ID numerico o "properties/ID"', () => {
    expect(normalizeProperty('123456')).toBe('properties/123456');
    expect(normalizeProperty('properties/123456')).toBe('properties/123456');
  });
  it("rifiuta l'ID di misurazione G-XXXX con un suggerimento", () => {
    const err = (() => {
      try {
        normalizeProperty('G-ABC123');
      } catch (e) {
        return e as SeoMcpError;
      }
    })();
    expect(err?.code).toBe('INVALID_INPUT');
    expect(err?.hint).toContain('ga_list_properties');
  });
});

describe('buildFilter', () => {
  it('un filtro semplice, più filtri in AND, esclusioni con NOT', () => {
    expect(buildFilter([{ field: 'country', value: 'Italy' }])).toEqual({
      filter: { fieldName: 'country', stringFilter: { matchType: 'EXACT', value: 'Italy', caseSensitive: false } },
    });
    const f = buildFilter([
      { field: 'sessionSource', matchType: 'CONTAINS', value: 'google' },
      { field: 'landingPage', matchType: 'BEGINS_WITH', value: '/admin', exclude: true },
    ]);
    expect(f?.andGroup?.expressions).toHaveLength(2);
    expect(f?.andGroup?.expressions?.[1]?.notExpression?.filter?.fieldName).toBe('landingPage');
    expect(buildFilter([])).toBeUndefined();
  });
});

describe('parseRows', () => {
  it('abbina intestazioni e valori e converte le metriche in numeri', () => {
    const rows = parseRows({
      dimensionHeaders: [{ name: 'landingPage' }],
      metricHeaders: [{ name: 'sessions' }, { name: 'engagementRate' }],
      rows: [{ dimensionValues: [{ value: '/blog/' }], metricValues: [{ value: '120' }, { value: '0.6512345' }] }],
    });
    expect(rows).toEqual([{ dimensions: { landingPage: '/blog/' }, metrics: { sessions: 120, engagementRate: 0.6512 } }]);
  });
});

describe('GaClient', () => {
  it('costruisce la richiesta runReport corretta', async () => {
    let body: Record<string, unknown> | undefined;
    let prop: string | undefined;
    const data = {
      properties: {
        runReport: async (p: { property: string; requestBody: Record<string, unknown> }) => {
          prop = p.property;
          body = p.requestBody;
          return { data: { rowCount: 0, rows: [] } };
        },
      },
    };
    const ga = new GaClient(undefined, { data: data as never, admin: {} as never });
    await ga.runReport({ property: '42', startDate: '2026-09-01', endDate: '2026-09-27', dimensions: ['landingPage'], metrics: ['sessions'], limit: 10 });
    expect(prop).toBe('properties/42');
    expect(body).toMatchObject({
      dateRanges: [{ startDate: '2026-09-01', endDate: '2026-09-27' }],
      dimensions: [{ name: 'landingPage' }],
      metrics: [{ name: 'sessions' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: '10',
    });
  });

  it('elenca le proprietà seguendo la paginazione', async () => {
    const pages = [
      { accountSummaries: [{ account: 'accounts/1', displayName: 'Acme', propertySummaries: [{ property: 'properties/10', displayName: 'Sito' }] }], nextPageToken: 'p2' },
      { accountSummaries: [{ account: 'accounts/2', displayName: 'Beta', propertySummaries: [{ property: 'properties/20', displayName: 'Blog' }] }] },
    ];
    const admin = { accountSummaries: { list: async () => ({ data: pages.shift() }) } };
    const ga = new GaClient(undefined, { data: {} as never, admin: admin as never });
    expect(await ga.listProperties()).toEqual([
      { property: 'properties/10', displayName: 'Sito', account: 'accounts/1', accountName: 'Acme' },
      { property: 'properties/20', displayName: 'Blog', account: 'accounts/2', accountName: 'Beta' },
    ]);
  });

  it('traduce un 403 di permessi in un suggerimento su Analytics', async () => {
    const data = { properties: { runReport: async () => Promise.reject({ response: { status: 403, data: { error: { message: 'User does not have sufficient permissions' } } } }) } };
    const ga = new GaClient(undefined, { data: data as never, admin: {} as never });
    const err = await ga.runReport({ property: '1', startDate: '2026-09-01', endDate: '2026-09-02', metrics: ['sessions'] }).catch((e: unknown) => e);
    expect((err as SeoMcpError).code).toBe('PERMISSION_DENIED');
    expect((err as SeoMcpError).hint).toContain('Visualizzatore');
  });
});

describe('googleError', () => {
  const ctx = { apiName: 'Google Analytics Data API', permissionMessage: 'no', permissionHint: 'aggiungi utente' };

  it('API disabilitata: spiega come abilitarla, non parla di permessi', () => {
    const err = googleError({ response: { status: 403, data: { error: { message: 'Google Analytics Data API has not been used in project 1 before or it is disabled', details: [{ reason: 'SERVICE_DISABLED' }] } } } }, ctx);
    expect(err.code).toBe('NOT_CONFIGURED');
    expect(err.hint).toContain('Abilita');
  });

  it('scope insufficiente: chiede di ripetere l\'autorizzazione', () => {
    const err = googleError({ response: { status: 403, data: { error: { message: 'Request had insufficient authentication scopes.' } } } }, ctx);
    expect(err.code).toBe('AUTH_FAILED');
    expect(err.hint).toContain('auth google');
  });

  it('API key non valida: indica la variabile da controllare', () => {
    const err = googleError({ response: { status: 400, data: { error: { message: 'API key not valid. Please pass a valid API key.', details: [{ reason: 'API_KEY_INVALID' }] } } } }, ctx);
    expect(err.code).toBe('AUTH_FAILED');
    expect(err.hint).toContain('SEOMCP_GOOGLE_API_KEY');
  });

  it('401, 403 generico, 429 e 400', () => {
    expect(googleError({ response: { status: 401 } }, ctx).code).toBe('AUTH_FAILED');
    expect(googleError({ response: { status: 403 } }, ctx).hint).toBe('aggiungi utente');
    expect(googleError({ response: { status: 429 } }, ctx).code).toBe('QUOTA_EXCEEDED');
    const bad = googleError({ response: { status: 400, data: { error: { message: 'Field sesions is not a valid metric.' } } } }, ctx);
    expect(bad.code).toBe('INVALID_INPUT');
    expect(bad.message).toContain('sesions');
  });
});

describe('compareGaPeriods', () => {
  it('unisce per dimensioni e ordina per calo della prima metrica', () => {
    const cur = [
      { dimensions: { landingPage: '/a' }, metrics: { sessions: 50, keyEvents: 1 } },
      { dimensions: { landingPage: '/b' }, metrics: { sessions: 200, keyEvents: 8 } },
    ];
    const prev = [
      { dimensions: { landingPage: '/a' }, metrics: { sessions: 100, keyEvents: 4 } },
      { dimensions: { landingPage: '/b' }, metrics: { sessions: 150, keyEvents: 0 } },
    ];
    const out = compareGaPeriods(cur, prev, ['sessions', 'keyEvents']);
    expect(out.map((r) => r.dimensions.landingPage)).toEqual(['/a', '/b']);
    expect(out[0]).toMatchObject({ delta: { sessions: -50, keyEvents: -3 }, changePct: { sessions: -50, keyEvents: -75 } });
    expect(out[1]?.changePct.keyEvents).toBeNull();
  });
});
