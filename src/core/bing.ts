import { SeoMcpError } from './errors.js';
import type { BingKeywordStatsRow, BingSite, BingStatsRow } from './types.js';

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
      throw new SeoMcpError('UPSTREAM_ERROR', `Errore dalla Bing Webmaster API: ${detail}`);
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
