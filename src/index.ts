/**
 * API come libreria: client e analisi, senza dipendenze da file system
 * o variabili d'ambiente. Pensata per essere importata da altre app
 * (es. un SaaS multi-utente che passa le credenziali di ogni utente).
 *
 *   import { GscClient, BingClient } from '@contentisking/seomcp';
 */
export { GscClient, GSC_SCOPES, GSC_MAX_ROWS, type GscAuth } from './core/gsc.js';
export { GaClient, GA_SCOPES, GA_MAX_ROWS, normalizeProperty } from './core/ga.js';
export { BingClient, BING_API_BASE, parseBingDate, type BingClientOptions } from './core/bing.js';
export {
  comparePeriods,
  strikingDistance,
  aggregateBingStats,
  compareGaPeriods,
  type GaComparisonRow,
  type PeriodComparisonRow,
  type StrikingDistanceOptions,
  type BingAggregateRow,
} from './core/analysis.js';
export { lastNDays, previousPeriod, addDays, daysBetween, isIsoDate, toIsoDate } from './core/dates.js';
export { SeoMcpError, type SeoMcpErrorCode } from './core/errors.js';
export type * from './core/types.js';
