/** Tipi condivisi, indipendenti dalla fonte dati. */

export type GscDimension = 'query' | 'page' | 'country' | 'device' | 'date' | 'searchAppearance';

export type GscSearchType = 'web' | 'image' | 'video' | 'news' | 'discover' | 'googleNews';

export interface GscFilter {
  dimension: 'query' | 'page' | 'country' | 'device' | 'searchAppearance';
  operator: 'equals' | 'notEquals' | 'contains' | 'notContains' | 'includingRegex' | 'excludingRegex';
  expression: string;
}

export interface GscQueryParams {
  siteUrl: string;
  startDate: string;
  endDate: string;
  dimensions?: GscDimension[];
  filters?: GscFilter[];
  searchType?: GscSearchType;
  /** Max 25.000 per richiesta (limite dell'API). */
  rowLimit?: number;
  startRow?: number;
}

/** Una riga di performance: `keys` contiene i valori delle dimensioni richieste. */
export interface PerformanceRow {
  keys: Record<string, string>;
  clicks: number;
  impressions: number;
  /** 0-1 */
  ctr: number;
  position: number;
}

export interface GscSite {
  siteUrl: string;
  permissionLevel: string;
}

export interface GscSitemap {
  path: string;
  lastSubmitted?: string;
  lastDownloaded?: string;
  isPending: boolean;
  isSitemapsIndex: boolean;
  warnings: number;
  errors: number;
  contents: { type: string; submitted: number }[];
}

export interface UrlInspection {
  url: string;
  verdict?: string;
  coverageState?: string;
  indexingState?: string;
  robotsTxtState?: string;
  pageFetchState?: string;
  lastCrawlTime?: string;
  crawledAs?: string;
  googleCanonical?: string;
  userCanonical?: string;
  sitemaps: string[];
  referringUrls: string[];
  mobileUsabilityVerdict?: string;
  richResults: { type: string; verdict?: string; issues: string[] }[];
  inspectionResultLink?: string;
}

export interface BingSite {
  url: string;
  isVerified: boolean;
}

/** Statistiche Bing per query o per pagina, per data. */
export interface BingStatsRow {
  /** Query oppure URL della pagina, in base al metodo. */
  key: string;
  date: string;
  impressions: number;
  clicks: number;
  avgImpressionPosition: number;
  avgClickPosition: number;
}

export interface BingKeywordStatsRow {
  query: string;
  date: string;
  impressions: number;
  broadImpressions: number;
}

export interface GaProperty {
  /** Formato "properties/123456789". */
  property: string;
  displayName: string;
  account: string;
  accountName: string;
}

export type GaMatchType = 'EXACT' | 'CONTAINS' | 'BEGINS_WITH' | 'ENDS_WITH' | 'FULL_REGEXP' | 'PARTIAL_REGEXP';

export interface GaFilter {
  /** Nome della dimensione, es. "sessionDefaultChannelGroup" o "landingPage". */
  field: string;
  matchType?: GaMatchType;
  value: string;
  /** true per escludere le righe che corrispondono. */
  exclude?: boolean;
}

export interface GaReportParams {
  property: string;
  startDate: string;
  endDate: string;
  dimensions?: string[];
  metrics: string[];
  filters?: GaFilter[];
  /** Metrica (o dimensione) per l'ordinamento, decrescente. Default: la prima metrica. */
  orderBy?: string;
  limit?: number;
  offset?: number;
}

/** Una riga di report GA4: dimensioni come testo, metriche come numeri. */
export interface GaRow {
  dimensions: Record<string, string>;
  metrics: Record<string, number>;
}

export interface GaReport {
  rows: GaRow[];
  /** Righe totali disponibili (oltre il limite richiesto). */
  rowCount: number;
}
