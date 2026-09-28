import { describe, expect, it } from 'vitest';
import { aggregateBingStats, comparePeriods, strikingDistance } from '../src/core/analysis.js';
import type { PerformanceRow } from '../src/core/types.js';

const row = (query: string, clicks: number, impressions: number, position: number): PerformanceRow => ({
  keys: { query },
  clicks,
  impressions,
  ctr: impressions ? clicks / impressions : 0,
  position,
});

describe('comparePeriods', () => {
  it('unisce per chiave e ordina per calo di clic', () => {
    const cur = [row('a', 10, 100, 3), row('b', 50, 500, 2), row('new', 5, 20, 8)];
    const prev = [row('a', 40, 200, 2), row('b', 30, 400, 3), row('gone', 7, 70, 5)];
    const out = comparePeriods(cur, prev);

    expect(out.map((r) => r.keys.query)).toEqual(['a', 'gone', 'new', 'b']);
    expect(out[0]).toMatchObject({ delta: { clicks: -30, position: 1 }, clicksChangePct: -75 });
    expect(out.find((r) => r.keys.query === 'new')?.clicksChangePct).toBeNull();
    // Se una delle due posizioni manca non si calcola il delta.
    expect(out.find((r) => r.keys.query === 'gone')?.delta.position).toBe(0);
  });
});

describe('strikingDistance', () => {
  it('filtra per posizione e impressioni e ordina per impressioni', () => {
    const rows = [row('top', 1, 900, 2), row('ok', 1, 50, 7), row('big', 1, 300, 15), row('few', 1, 3, 9), row('far', 1, 999, 35)];
    expect(strikingDistance(rows).map((r) => r.keys.query)).toEqual(['big', 'ok']);
    expect(strikingDistance(rows, { minImpressions: 0 }).map((r) => r.keys.query)).toEqual(['big', 'ok', 'few']);
  });
});

describe('aggregateBingStats', () => {
  it('somma per chiave, filtra le date e pesa la posizione sulle impressioni', () => {
    const rows = [
      { key: 'x', date: '2026-01-01', impressions: 100, clicks: 10, avgImpressionPosition: 2, avgClickPosition: 2 },
      { key: 'x', date: '2026-01-08', impressions: 300, clicks: 6, avgImpressionPosition: 6, avgClickPosition: 5 },
      { key: 'x', date: '2025-12-01', impressions: 999, clicks: 99, avgImpressionPosition: 1, avgClickPosition: 1 },
    ];
    expect(aggregateBingStats(rows, '2026-01-01')).toEqual([
      { key: 'x', impressions: 400, clicks: 16, ctr: 0.04, avgImpressionPosition: 5 },
    ]);
  });
});
