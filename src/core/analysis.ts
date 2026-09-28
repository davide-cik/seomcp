/**
 * Analisi leggere sui dati grezzi. Il resto (analisi incrociate, report)
 * lo fa il modello ragionando sui dati: qui teniamo solo ciò che serve a
 * ridurre il volume di righe restituite.
 */
import type { BingStatsRow, PerformanceRow } from './types.js';

export interface PeriodComparisonRow {
  keys: Record<string, string>;
  current: Metrics;
  previous: Metrics;
  delta: { clicks: number; impressions: number; ctr: number; position: number };
  /** Variazione percentuale dei clic; null se il periodo precedente aveva 0 clic. */
  clicksChangePct: number | null;
}

interface Metrics {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

const EMPTY: Metrics = { clicks: 0, impressions: 0, ctr: 0, position: 0 };

function rowKey(keys: Record<string, string>): string {
  return JSON.stringify(Object.entries(keys).sort(([a], [b]) => a.localeCompare(b)));
}

function round(n: number, digits = 2): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

/**
 * Unisce due serie di righe per chiave e calcola le variazioni.
 * Ordina per perdita di clic più forte in cima.
 */
export function comparePeriods(current: PerformanceRow[], previous: PerformanceRow[]): PeriodComparisonRow[] {
  const map = new Map<string, { keys: Record<string, string>; current: Metrics; previous: Metrics }>();
  for (const r of current) map.set(rowKey(r.keys), { keys: r.keys, current: pick(r), previous: EMPTY });
  for (const r of previous) {
    const k = rowKey(r.keys);
    const existing = map.get(k);
    if (existing) existing.previous = pick(r);
    else map.set(k, { keys: r.keys, current: EMPTY, previous: pick(r) });
  }

  return [...map.values()]
    .map(({ keys, current: c, previous: p }) => ({
      keys,
      current: c,
      previous: p,
      delta: {
        clicks: c.clicks - p.clicks,
        impressions: c.impressions - p.impressions,
        ctr: round(c.ctr - p.ctr, 4),
        // Position: valore negativo = miglioramento (numero più basso).
        position: c.position && p.position ? round(c.position - p.position) : 0,
      },
      clicksChangePct: p.clicks > 0 ? round(((c.clicks - p.clicks) / p.clicks) * 100, 1) : null,
    }))
    .sort((a, b) => a.delta.clicks - b.delta.clicks);
}

function pick(r: PerformanceRow): Metrics {
  return { clicks: r.clicks, impressions: r.impressions, ctr: round(r.ctr, 4), position: round(r.position) };
}

export interface StrikingDistanceOptions {
  minPosition?: number;
  maxPosition?: number;
  minImpressions?: number;
}

/**
 * Query "a distanza di tiro": già visibili ma non in cima (default posizione 4-20).
 * Ordinate per impressioni, cioè per potenziale di crescita.
 */
export function strikingDistance(rows: PerformanceRow[], opts: StrikingDistanceOptions = {}): PerformanceRow[] {
  const { minPosition = 4, maxPosition = 20, minImpressions = 10 } = opts;
  return rows
    .filter((r) => r.position >= minPosition && r.position <= maxPosition && r.impressions >= minImpressions)
    .sort((a, b) => b.impressions - a.impressions);
}

export interface BingAggregateRow {
  key: string;
  impressions: number;
  clicks: number;
  ctr: number;
  /** Media delle posizioni pesata sulle impressioni. */
  avgImpressionPosition: number;
}

/** Filtra per intervallo di date e aggrega le righe Bing per query o pagina. */
export function aggregateBingStats(rows: BingStatsRow[], startDate?: string, endDate?: string): BingAggregateRow[] {
  const acc = new Map<string, { impressions: number; clicks: number; posWeighted: number }>();
  for (const r of rows) {
    if (startDate && r.date < startDate) continue;
    if (endDate && r.date > endDate) continue;
    const a = acc.get(r.key) ?? { impressions: 0, clicks: 0, posWeighted: 0 };
    a.impressions += r.impressions;
    a.clicks += r.clicks;
    a.posWeighted += r.avgImpressionPosition * r.impressions;
    acc.set(r.key, a);
  }
  return [...acc.entries()]
    .map(([key, a]) => ({
      key,
      impressions: a.impressions,
      clicks: a.clicks,
      ctr: a.impressions ? round(a.clicks / a.impressions, 4) : 0,
      avgImpressionPosition: a.impressions ? round(a.posWeighted / a.impressions) : 0,
    }))
    .sort((a, b) => b.impressions - a.impressions);
}
