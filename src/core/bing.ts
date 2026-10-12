import { SeoMcpError } from './errors.js';
import type { BingKeywordStatsRow, BingSite, BingStatsRow } from './types.js';

export interface BingLinkCount {
  /** Pagina del tuo sito che riceve link. */
  url: string;
  count: number;
}

export interface BingLinkDetail {
  /** Pagina esterna che contiene il link. */
  source: string;
  anchor: string;
}

export const BING_API_BASE = 'https://ssl.bing.com/webmaster/api.svc/json';

export interface BingClientOptions {
  apiKey: string;
  /** Per i test o per ambienti con un fetch personalizzato. */
  fetch?: typeof fetch;
  baseUrl?: string;
  timeoutMs?: number;
}

/**
 * Client per la Bing Webmaster API (REST/JSON).
 * Non esiste un SDK ufficiale: bastano fetch e la API key in query string.
 */
export class BingClient {
  private readonly apiKey: string;
  private readonly fetchFn: typeof fetch;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(options: BingClientOptions) {
    if (!options.apiKey) {
      throw new SeoMcpError('NOT_CONFIGURED', 'API key di Bing Webmaster mancante.');
    }
    this.apiKey = options.apiKey;
    this.fetchFn = options.fetch ?? fetch;
    this.baseUrl = options.baseUrl ?? BING_API_BASE;
    this.timeoutMs = options.timeoutMs ?? 30_000;
  }

  async listSites(): Promise<BingSite[]> {
    const data = await this.get<RawSite[]>('GetUserSites', {});
    return (data ?? []).map((s) => ({ url: s.Url, isVerified: Boolean(s.IsVerified) }));
  }

  /** Statistiche per query, sull'intero storico messo a disposizione da Bing. */
  async getQueryStats(siteUrl: string): Promise<BingStatsRow[]> {
    const data = await this.get<RawStats[]>('GetQueryStats', { siteUrl });
    return (data ?? []).map(mapStats);
  }

  /** Statistiche per pagina: `key` contiene l'URL. */
  async getPageStats(siteUrl: string): Promise<BingStatsRow[]> {
    const data = await this.get<RawStats[]>('GetPageStats', { siteUrl });
    return (data ?? []).map(mapStats);
  }

  /**
   * Volumi di ricerca di una keyword su Bing.
   * Di default Italia / italiano: l'API altrimenti usa dati USA.
   */
  async getKeywordStats(query: string, country = 'it', language = 'it-IT'): Promise<BingKeywordStatsRow[]> {
    const data = await this.get<RawKeywordStats[]>('GetKeywordStats', { q: query, country, language });
    return (data ?? []).map((r) => ({
      query: r.Query,
      date: parseBingDate(r.Date),
      impressions: r.Impressions ?? 0,
      broadImpressions: r.BroadImpressions ?? 0,
    }));
  }

  /**
   * Pagine del sito che ricevono link da altri siti, con il numero di link (GetLinkCounts).
   * È una fotografia attuale: l'API non ha lo storico. Si ferma dopo `maxPages` pagine di risultati.
   */
  async getLinkCounts(siteUrl: string, maxPages = 10): Promise<{ links: BingLinkCount[]; truncated: boolean }> {
    const links: BingLinkCount[] = [];
    let page = 0;
    let total = 1;
    while (page < total && page < maxPages) {
      const data = await this.get<{ Links?: Array<{ Url: string; Count?: number }>; TotalPages?: number } | null>('GetLinkCounts', { siteUrl, page: String(page) });
      for (const l of data?.Links ?? []) links.push({ url: l.Url, count: l.Count ?? 0 });
      total = data?.TotalPages ?? 0;
      page++;
    }
    return { links, truncated: page < total };
  }

  /**
   * Pagine esterne che linkano a una pagina del sito, con il testo del link (GetUrlLinks).
   * Il parametro `link` si passa come lo restituisce GetLinkCounts; se Bing lo rifiuta si riprova
   * nella forma JSON tra virgolette dell'esempio ufficiale.
   */
  async getUrlLinks(siteUrl: string, link: string, maxPages = 3): Promise<BingLinkDetail[]> {
    const details: BingLinkDetail[] = [];
    let form: 'plain' | 'json' = 'plain';
    let page = 0;
    let total = 1;
    while (page < total && page < maxPages) {
      let data: { Details?: Array<{ Url: string; AnchorText?: string }>; TotalPages?: number } | null;
      try {
        data = await this.get('GetUrlLinks', { siteUrl, link: form === 'plain' ? link : JSON.stringify(link), page: String(page) });
      } catch (err) {
        if (form === 'plain' && page === 0 && /InvalidUrl|ErrorCode 7/i.test((err as Error).message)) {
          form = 'json';
          continue;
        }
        throw err;
      }
      for (const d of data?.Details ?? []) details.push({ source: d.Url, anchor: d.AnchorText ?? '' });
      total = data?.TotalPages ?? 0;
      page++;
    }
    return details;
  }

  private async get<T>(method: string, params: Record<string, string>): Promise<T> {
    const url = new URL(`${this.baseUrl}/${method}`);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    url.searchParams.set('apikey', this.apiKey);

    let res: Response;
    try {
      res = await this.fetchFn(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (err) {
      throw new SeoMcpError('UPSTREAM_ERROR', `Bing Webmaster API non raggiungibile (${(err as Error).name}).`);
    }

    const body = (await res.json().catch(() => null)) as { d?: T; Message?: string; ErrorCode?: number } | null;

    if (!res.ok) {
      // Mai includere l'URL nel messaggio: contiene la API key.
      const detail = body?.Message ?? `HTTP ${res.status}`;
      if (res.status === 401 || /api ?key/i.test(detail)) {
        throw new SeoMcpError(
          'AUTH_FAILED',
          'API key di Bing non valida.',
          'Genera una nuova chiave in Bing Webmaster Tools → Impostazioni → Accesso API e aggiorna BING_WEBMASTER_API_KEY.',
        );
      }
      if (/not authorized|not verified|access denied/i.test(detail)) {
        throw new SeoMcpError(
          'PERMISSION_DENIED',
          `Nessun accesso al sito in Bing Webmaster Tools: ${detail}`,
          'Verifica che il sito sia aggiunto e verificato nel tuo account e che l\'URL coincida (es. "https://www.esempio.it/").',
        );
      }
      throw new SeoMcpError('UPSTREAM_ERROR', `Errore dalla Bing Webmaster API: ${detail}${body?.ErrorCode ? ` (ErrorCode ${body.ErrorCode})` : ''}`);
    }
    return body?.d as T;
  }
}

interface RawSite {
  Url: string;
  IsVerified?: boolean;
}

interface RawStats {
  Query: string;
  Date: string;
  Impressions?: number;
  Clicks?: number;
  AvgImpressionPosition?: number;
  AvgClickPosition?: number;
}

interface RawKeywordStats {
  Query: string;
  Date: string;
  Impressions?: number;
  BroadImpressions?: number;
}

function mapStats(r: RawStats): BingStatsRow {
  return {
    key: r.Query,
    date: parseBingDate(r.Date),
    impressions: r.Impressions ?? 0,
    clicks: r.Clicks ?? 0,
    avgImpressionPosition: r.AvgImpressionPosition ?? 0,
    avgClickPosition: r.AvgClickPosition ?? 0,
  };
}

/** Bing restituisce le date nel formato WCF: "/Date(1727654400000-0700)/". */
export function parseBingDate(value: string): string {
  const match = /\/Date\((-?\d+)([+-]\d{4})?\)\//.exec(value ?? '');
  if (!match?.[1]) return value;
  return new Date(Number(match[1])).toISOString().slice(0, 10);
}
