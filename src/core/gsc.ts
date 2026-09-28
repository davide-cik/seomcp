import { searchconsole, type searchconsole_v1 } from '@googleapis/searchconsole';
import { isIsoDate } from './dates.js';
import { SeoMcpError } from './errors.js';
import type { GscQueryParams, GscSite, GscSitemap, PerformanceRow, UrlInspection } from './types.js';

/** Scope minimo: sola lettura. Il server non può modificare nulla in Search Console. */
export const GSC_SCOPES = ['https://www.googleapis.com/auth/webmasters.readonly'];

export const GSC_MAX_ROWS = 25_000;

export type GscAuth = searchconsole_v1.Options['auth'];

/**
 * Client per la Google Search Console API.
 *
 * Accetta qualsiasi autenticazione supportata da googleapis: GoogleAuth con
 * service account, oppure un OAuth2Client con il refresh token dell'utente.
 * Non legge file né variabili d'ambiente, quindi si può usare anche da
 * un'applicazione multi-utente.
 */
export class GscClient {
  private readonly api: searchconsole_v1.Searchconsole;

  constructor(auth: GscAuth) {
    this.api = searchconsole({ version: 'v1', auth });
  }

  async listSites(): Promise<GscSite[]> {
    const res = await this.call(() => this.api.sites.list());
    return (res.data.siteEntry ?? []).map((s) => ({
      siteUrl: s.siteUrl ?? '',
      permissionLevel: s.permissionLevel ?? '',
    }));
  }

  async query(params: GscQueryParams): Promise<PerformanceRow[]> {
    if (!isIsoDate(params.startDate) || !isIsoDate(params.endDate)) {
      throw new SeoMcpError('INVALID_INPUT', 'Le date devono essere nel formato YYYY-MM-DD.');
    }
    const dimensions = params.dimensions ?? [];
    const res = await this.call(
      () =>
        this.api.searchanalytics.query({
          siteUrl: params.siteUrl,
          requestBody: {
            startDate: params.startDate,
            endDate: params.endDate,
            dimensions,
            type: params.searchType ?? 'web',
            rowLimit: Math.min(params.rowLimit ?? 1000, GSC_MAX_ROWS),
            startRow: params.startRow ?? 0,
            dimensionFilterGroups: params.filters?.length ? [{ groupType: 'and', filters: params.filters }] : undefined,
          },
        }),
      params.siteUrl,
    );
    return (res.data.rows ?? []).map((row) => ({
      keys: Object.fromEntries(dimensions.map((d, i) => [d, row.keys?.[i] ?? ''])),
      clicks: row.clicks ?? 0,
      impressions: row.impressions ?? 0,
      ctr: row.ctr ?? 0,
      position: row.position ?? 0,
    }));
  }

  async inspectUrl(siteUrl: string, inspectionUrl: string, languageCode = 'it-IT'): Promise<UrlInspection> {
    const res = await this.call(
      () => this.api.urlInspection.index.inspect({ requestBody: { siteUrl, inspectionUrl, languageCode } }),
      siteUrl,
    );
    const r = res.data.inspectionResult ?? {};
    const idx = r.indexStatusResult ?? {};
    return {
      url: inspectionUrl,
      verdict: idx.verdict ?? undefined,
      coverageState: idx.coverageState ?? undefined,
      indexingState: idx.indexingState ?? undefined,
      robotsTxtState: idx.robotsTxtState ?? undefined,
      pageFetchState: idx.pageFetchState ?? undefined,
      lastCrawlTime: idx.lastCrawlTime ?? undefined,
      crawledAs: idx.crawledAs ?? undefined,
      googleCanonical: idx.googleCanonical ?? undefined,
      userCanonical: idx.userCanonical ?? undefined,
      sitemaps: idx.sitemap ?? [],
      referringUrls: idx.referringUrls ?? [],
      mobileUsabilityVerdict: r.mobileUsabilityResult?.verdict ?? undefined,
      richResults: (r.richResultsResult?.detectedItems ?? []).map((item) => ({
        type: item.richResultType ?? '',
        verdict: r.richResultsResult?.verdict ?? undefined,
        issues: (item.items ?? []).flatMap((i) => (i.issues ?? []).map((iss) => iss.issueMessage ?? '')),
      })),
      inspectionResultLink: r.inspectionResultLink ?? undefined,
    };
  }

  async listSitemaps(siteUrl: string): Promise<GscSitemap[]> {
    const res = await this.call(() => this.api.sitemaps.list({ siteUrl }), siteUrl);
    return (res.data.sitemap ?? []).map((s) => ({
      path: s.path ?? '',
      lastSubmitted: s.lastSubmitted ?? undefined,
      lastDownloaded: s.lastDownloaded ?? undefined,
      isPending: s.isPending ?? false,
      isSitemapsIndex: s.isSitemapsIndex ?? false,
      warnings: Number(s.warnings ?? 0),
      errors: Number(s.errors ?? 0),
      contents: (s.contents ?? []).map((c) => ({ type: c.type ?? '', submitted: Number(c.submitted ?? 0) })),
    }));
  }

  /** Traduce gli errori di Google in messaggi con un suggerimento pratico. */
  private async call<T>(fn: () => Promise<T>, siteUrl?: string): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      throw toSeoMcpError(err, siteUrl);
    }
  }
}

function toSeoMcpError(err: unknown, siteUrl?: string): SeoMcpError {
  const e = err as { status?: number; code?: number | string; response?: { status?: number }; message?: string };
  const status = e.response?.status ?? e.status ?? (typeof e.code === 'number' ? e.code : undefined);
  const site = siteUrl ? ` "${siteUrl}"` : '';

  if (status === 401) {
    return new SeoMcpError(
      'AUTH_FAILED',
      'Autenticazione Google non valida o scaduta.',
      'Esegui `npx @contentisking/seomcp doctor`. Con OAuth, ripeti `npx @contentisking/seomcp auth google`.',
    );
  }
  if (status === 403) {
    return new SeoMcpError(
      'PERMISSION_DENIED',
      `Nessun accesso alla proprietà${site} in Search Console.`,
      "Aggiungi l'email del service account (o del tuo account) come utente della proprietà in Search Console → Impostazioni → Utenti e autorizzazioni. Controlla anche il formato: \"sc-domain:esempio.it\" per le proprietà di dominio, \"https://www.esempio.it/\" per quelle con prefisso URL.",
    );
  }
  if (status === 429) {
    return new SeoMcpError('QUOTA_EXCEEDED', 'Quota della Search Console API superata.', 'Riprova tra qualche minuto.');
  }
  if (status === 400) {
    return new SeoMcpError('INVALID_INPUT', `Richiesta non valida: ${e.message ?? 'parametri errati'}`);
  }
  return new SeoMcpError('UPSTREAM_ERROR', `Errore dalla Search Console API: ${e.message ?? 'sconosciuto'}`);
}
