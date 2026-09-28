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
