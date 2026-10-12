import { SeoMcpError } from './errors.js';
import { siteHost } from './entity.js';

/**
 * Il sito è in Common Crawl? È l'archivio pubblico del web usato per addestrare molti modelli linguistici:
 * esserci (o no) dice se le pagine possono essere finite nei dati di addestramento.
 * Si interroga l'indice CDX pubblico (https://index.commoncrawl.org), senza credenziali.
 * L'indice è spesso lento o sovraccarico: ogni crawl ha il suo esito e un errore non blocca gli altri.
 */

export const CC_INDEX = 'https://index.commoncrawl.org';

export interface CommonCrawlOptions {
  userAgent?: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
}

export interface CrawlInfo {
  id: string;
  name: string;
  cdxApi: string;
  from?: string;
  to?: string;
}

export interface CrawlPresence {
  crawl: string;
  name: string;
  /** URL distinti trovati (fino al limite richiesto). */
  pages: number;
  /** true se il limite è stato raggiunto: le pagine sono almeno `pages`. */
  truncated: boolean;
  /** Letture di robots.txt nel campione: CCBot è passato dal dominio, ma non sono pagine. */
  robotsTxtCaptures: number;
  homepage: boolean;
  statuses: Record<string, number>;
  samplePages: string[];
  firstCapture?: string;
  lastCapture?: string;
  error?: string;
}

interface CdxRow {
  url?: string;
  status?: string;
  timestamp?: string;
  mime?: string;
}

/** Elenco dei crawl, dal più recente (collinfo.json). */
export async function listCrawls(opts: CommonCrawlOptions = {}): Promise<CrawlInfo[]> {
  const res = await ccFetch(`${CC_INDEX}/collinfo.json`, opts);
  if (!res.ok) throw new SeoMcpError('UPSTREAM_ERROR', `L'indice di Common Crawl ha risposto HTTP ${res.status}.`, 'Il servizio è spesso sovraccarico: riprova tra qualche minuto.');
  const data = (await res.json()) as Array<{ id: string; name: string; 'cdx-api': string; from?: string; to?: string }>;
  return data.map((c) => ({ id: c.id, name: c.name, cdxApi: c['cdx-api'], from: c.from, to: c.to }));
}

/** Presenza del dominio (sottodomini compresi) in un crawl. */
export async function crawlPresence(crawl: CrawlInfo, site: string, limit: number, opts: CommonCrawlOptions = {}): Promise<CrawlPresence> {
  const host = siteHost(site);
  const base: CrawlPresence = { crawl: crawl.id, name: crawl.name, pages: 0, truncated: false, robotsTxtCaptures: 0, homepage: false, statuses: {}, samplePages: [] };
  const url = new URL(crawl.cdxApi);
  url.searchParams.set('url', host);
  url.searchParams.set('matchType', 'domain');
  url.searchParams.set('output', 'json');
  url.searchParams.set('fl', 'url,status,timestamp,mime');
  url.searchParams.set('limit', String(limit));
  // Le letture di robots.txt sono nell'indice insieme alle pagine e per i domini grandi riempiono il campione:
  // al primo tentativo si chiede all'indice di escluderle, al secondo (se l'indice è lento) si fa senza filtro.
  const filtered = new URL(url);
  filtered.searchParams.set('filter', '!~url:robots.txt');

  let res: Response | undefined;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      res = await ccFetch((attempt === 0 ? filtered : url).toString(), opts);
    } catch (err) {
      if (attempt === 1) return { ...base, error: `indice non raggiungibile (${(err as Error).name})` };
      continue;
    }
    if (res.status !== 503 && res.status !== 504) break;
  }
  if (!res) return { ...base, error: 'indice non raggiungibile' };
  // "No Captures found": il dominio non è nel crawl.
  if (res.status === 404) return base;
  if (!res.ok) return { ...base, error: `l'indice ha risposto HTTP ${res.status} (spesso è sovraccarico: riprova più tardi)` };

  const rows = parseCdx(await res.text());
  return { ...base, ...summarize(rows, host, limit) };
}

/** Le righe CDX in formato JSON sono un oggetto per riga. */
export function parseCdx(text: string): CdxRow[] {
  const out: CdxRow[] = [];
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t.startsWith('{')) continue;
    try {
      out.push(JSON.parse(t) as CdxRow);
    } catch {
      // riga incompleta: si ignora
    }
  }
  return out;
}

export function summarize(rows: CdxRow[], host: string, limit: number): Omit<CrawlPresence, 'crawl' | 'name' | 'error'> {
  const truncated = rows.length >= limit;
  const robotsTxtCaptures = rows.filter((r) => /\/robots\.txt$/i.test(r.url ?? '')).length;
  rows = rows.filter((r) => !/\/robots\.txt$/i.test(r.url ?? ''));
  const urls = new Set<string>();
  const statuses: Record<string, number> = {};
  let homepage = false;
  let first: string | undefined;
  let last: string | undefined;
  for (const r of rows) {
    if (!r.url) continue;
    urls.add(r.url);
    const s = r.status ?? '?';
    statuses[s] = (statuses[s] ?? 0) + 1;
    try {
      const u = new URL(r.url);
      if (u.hostname.replace(/^www\./, '') === host && (u.pathname === '/' || u.pathname === '') && !u.search && s.startsWith('2')) homepage = true;
    } catch {
      // URL non valido nell'indice
    }
    if (r.timestamp) {
      if (!first || r.timestamp < first) first = r.timestamp;
      if (!last || r.timestamp > last) last = r.timestamp;
    }
  }
  const ok = rows.filter((r) => r.url && (r.status ?? '').startsWith('2') && (r.mime ?? '').includes('html')).map((r) => r.url!);
  return {
    pages: urls.size,
    truncated,
    robotsTxtCaptures,
    homepage,
    statuses,
    samplePages: [...new Set(ok)].slice(0, 20),
    ...(first ? { firstCapture: cdxDate(first) } : {}),
    ...(last ? { lastCapture: cdxDate(last) } : {}),
  };
}

/** "20260904131603" → "2026-09-04". */
export function cdxDate(ts: string): string {
  return ts.length >= 8 ? `${ts.slice(0, 4)}-${ts.slice(4, 6)}-${ts.slice(6, 8)}` : ts;
}

export async function commonCrawlPresence(site: string, crawls: number, limit: number, opts: CommonCrawlOptions = {}) {
  const host = siteHost(site);
  if (!host) throw new SeoMcpError('INVALID_INPUT', `URL o dominio non valido: "${site}".`);
  const all = await listCrawls(opts);
  const chosen = all.slice(0, crawls);
  // In sequenza: l'indice chiede di non sovraccaricarlo.
  const results: CrawlPresence[] = [];
  for (const c of chosen) results.push(await crawlPresence(c, host, limit, opts));
  return {
    site: host,
    crawls: results,
    presentInLatest: results[0] && !results[0].error ? results[0].pages > 0 : null,
    ...(results.some((r) => !r.pages && r.robotsTxtCaptures)
      ? { robotsOnlyNote: 'In alcuni crawl il campione contiene solo letture di robots.txt: CCBot è passato dal dominio, ma le pagine sono oltre il limite letto. Aumenta limit per vederle.' }
      : {}),
    note:
      'Common Crawl è l\'archivio pubblico del web usato per addestrare molti modelli linguistici. Ogni crawl è un campione: è normale che non contenga tutte le pagine. Il suo crawler è CCBot: per sapere se robots.txt lo blocca usa geo_ai_access. Bloccarlo oggi non toglie le pagine dai crawl passati.',
  };
}

async function ccFetch(url: string, opts: CommonCrawlOptions): Promise<Response> {
  return (opts.fetch ?? fetch)(url, {
    headers: { 'User-Agent': opts.userAgent ?? 'seomcp (+https://seomcp.contentisking.guru)' },
    signal: AbortSignal.timeout(opts.timeoutMs ?? 45_000),
  });
}
