/**
 * API come libreria: client e analisi, senza dipendenze da file system
 * o variabili d'ambiente. Pensata per essere importata da altre app
 * (es. un SaaS multi-utente che passa le credenziali di ogni utente).
 *
 *   import { GscClient, BingClient } from '@contentisking/seomcp';
 */
export { GscClient, GSC_SCOPES, GSC_MAX_ROWS, type GscAuth } from './core/gsc.js';
export { GaClient, GA_SCOPES, GA_MAX_ROWS, normalizeProperty } from './core/ga.js';
export { PageSpeedClient, THRESHOLDS, rate, type PsiResult, type CruxRecord, type CruxHistory, type CruxMetric, type FormFactor, type Strategy, type PsiCategory } from './core/pagespeed.js';
export { validateJsonLd, parseJsonLdInput, ancestors, isSubtypeOf, VOCABULARY_VERSION, type ValidationReport, type GroupedIssue, type RichResultGroup, type PageContext } from './core/schema-validate.js';
export { RICH_RESULT_RULES, type RichResultRule } from './core/google-rich-results.js';
export {
  pageMetrics,
  pageSections,
  aiAccess,
  parseRobots,
  botAccess,
  analyzeLlmsTxt,
  jsonLdNodes,
  AI_BOTS,
  type PageMetrics,
  type AiAccessReport,
  type ParsedRobots,
  type BotAccess,
  type BotPurpose,
  type LlmsTxtInfo,
} from './core/geo.js';
export { techPageAudit, techSiteCheck, redirectChain, type TechPageAudit, type TechSiteCheck, type SitemapReport, type RedirectHop } from './core/technical.js';
export { fetchPage, isPrivateIp, type FetchedPage, type FetchOptions } from './core/fetch-page.js';
export { domainInfo, httpsInfo, registeredDomain, siteTrust, type DomainInfo, type HttpsInfo } from './core/site-trust.js';
export { extractPage, type ExtractedPage } from './core/html.js';
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
