import { randomBytes } from 'node:crypto';
import { fetchPage, type FetchedPage, type FetchOptions } from './fetch-page.js';
import { extractPage } from './html.js';
import { parseRobots } from './geo.js';

/**
 * Controlli tecnici SEO, senza browser: misure oggettive su pagina e sito.
 * Come il resto di seomcp, restituiscono dati; l'interpretazione la fa l'assistente.
 */

const HREFLANG = /^(x-default|[a-z]{2,3}(-[a-z]{4})?(-([a-z]{2}|\d{3}))?)$/i;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface RedirectHop {
  url: string;
  status: number;
}

/** Segue i redirect uno per uno, registrando ogni passaggio (max 10). */
export async function redirectChain(url: string, opts: FetchOptions = {}): Promise<{ hops: RedirectHop[]; final: FetchedPage }> {
  const hops: RedirectHop[] = [];
  let current = url;
  for (let i = 0; i < 10; i++) {
    const res = await fetchPage(current, { ...opts, followRedirects: false });
    hops.push({ url: current, status: res.status });
    const location = res.headers['location'];
    if (res.status >= 300 && res.status < 400 && location) {
      current = new URL(location, current).toString();
      continue;
    }
    return { hops, final: res };
  }
  throw new Error(`Più di 10 redirect a partire da ${url}.`);
}

async function statusOf(url: string, opts: FetchOptions): Promise<{ url: string; status: number; redirectTo?: string; error?: string }> {
  try {
    const res = await fetchPage(url, { ...opts, followRedirects: false, maxBytes: 16 * 1024, timeoutMs: 10_000 });
    const location = res.headers['location'];
    return { url, status: res.status, ...(location ? { redirectTo: new URL(location, url).toString() } : {}) };
  } catch (err) {
    return { url, status: 0, error: (err as Error).message.slice(0, 120) };
  }
}

// ─── Pagina ────────────────────────────────────────────────────────────────

export interface TechPageAudit {
  url: string;
  finalUrl: string;
  status: number;
  redirects: { hops: RedirectHop[]; count: number; permanent: boolean; toHttps: boolean };
  performance: { ttfbMs?: number; totalMs: number; htmlBytes: number; compression?: string; cacheControl?: string };
  indexing: { metaRobots?: string; xRobotsTag?: string; noindex: boolean; nofollow: boolean };
  canonical: { url?: string; isSelf?: boolean; count: number; status?: number; redirectTo?: string };
  meta: { title?: string; titleLength: number; description?: string; descriptionLength: number; lang?: string; viewport?: string; mobileViewport: boolean; charset: boolean };
  hreflang: { count: number; languages: string[]; hasXDefault: boolean; selfReference: boolean; invalid: string[]; relativeUrls: number; returnLinks?: { href: string; status: number; linksBack: boolean | null }[] };
  social: { openGraph: Record<string, boolean>; twitter: Record<string, boolean> };
  images: { total: number; missingAlt: number; decorative: number; withoutDimensions: number; lazy: number; formats: Record<string, number> };
  headings: { h1: number; h1Texts: string[]; skippedLevels: string[]; total: number };
  links: { internal: number; external: number; nofollowInternal: number };
  securityHeaders: Record<string, boolean>;
}

function extensionOf(src: string): string {
  const m = /\.([a-z0-9]{2,5})(?:[?#]|$)/i.exec(src.split('?')[0] ?? '');
  return m ? m[1]!.toLowerCase().replace('jpeg', 'jpg') : src.startsWith('data:') ? 'data' : 'altro';
}

export async function techPageAudit(url: string, opts: FetchOptions = {}, checkReturnLinks = true): Promise<TechPageAudit> {
  const started = Date.now();
  const { hops, final } = await redirectChain(url, opts);
  const totalMs = Date.now() - started;
  const ex = extractPage(final.body, final.finalUrl);
  const host = new URL(final.finalUrl).hostname.replace(/^www\./, '');

  const redirectHops = hops.slice(0, -1);
  const robotsDirectives = `${ex.meta['robots'] ?? ''} ${final.headers['x-robots-tag'] ?? ''}`.toLowerCase();

  // Canonical: assoluto, uno solo, raggiungibile senza redirect.
  const canonicalTags = (final.body.match(/<link\b[^>]*rel\s*=\s*["']?canonical/gi) ?? []).length;
  const canonicalAbs = ex.canonical ? new URL(ex.canonical, final.finalUrl).toString() : undefined;
  const canonicalIsSelf = canonicalAbs ? canonicalAbs.replace(/\/$/, '') === final.finalUrl.replace(/\/$/, '') : undefined;
  const canonicalStatus = canonicalAbs && !canonicalIsSelf ? await statusOf(canonicalAbs, opts) : undefined;

  // hreflang: codici validi, x-default, autoreferenza e (a campione) link di ritorno.
  const alternates = ex.alternates.map((a) => ({ ...a, abs: (() => { try { return new URL(a.href, final.finalUrl).toString(); } catch { return a.href; } })() }));
  let returnLinks: { href: string; status: number; linksBack: boolean | null }[] | undefined;
  if (checkReturnLinks && alternates.length) {
    returnLinks = [];
    for (const a of alternates.filter((x) => x.abs !== final.finalUrl && x.hreflang.toLowerCase() !== 'x-default').slice(0, 5)) {
      await sleep(300);
      try {
        const page = await fetchPage(a.abs, { ...opts, maxBytes: 1024 * 1024 });
        const back = extractPage(page.body, page.finalUrl).alternates.some((b) => {
          try { return new URL(b.href, page.finalUrl).toString().replace(/\/$/, '') === final.finalUrl.replace(/\/$/, ''); } catch { return false; }
        });
        // Se la versione alternativa non risponde 200 il link di ritorno non è verificabile: conta lo stato.
        returnLinks.push({ href: a.abs, status: page.status, linksBack: page.status === 200 ? back : null });
      } catch {
        returnLinks.push({ href: a.abs, status: 0, linksBack: null });
      }
    }
  }

  const imgs = ex.images.filter((i) => i.src);
  const formats: Record<string, number> = {};
  for (const i of imgs) formats[extensionOf(i.src)] = (formats[extensionOf(i.src)] ?? 0) + 1;

  // Salti nella gerarchia dei titoli (es. da H2 a H4).
  const skipped: string[] = [];
  for (let i = 1; i < ex.allHeadings.length; i++) {
    const prev = ex.allHeadings[i - 1]!.level;
    const cur = ex.allHeadings[i]!.level;
    if (cur > prev + 1) skipped.push(`H${prev} → H${cur} ("${ex.allHeadings[i]!.text.slice(0, 40)}")`);
  }

  const links = ex.links.filter((l) => !l.inContent || true);
  const uniq = new Map(links.map((l) => [l.href, l]));
  const internal = [...uniq.values()].filter((l) => { try { return new URL(l.href).hostname.replace(/^www\./, '') === host; } catch { return false; } });

  const og = ['og:title', 'og:description', 'og:image', 'og:url', 'og:type'];
  const tw = ['twitter:card', 'twitter:title', 'twitter:description', 'twitter:image'];
  const h = final.headers;

  return {
    url,
    finalUrl: final.finalUrl,
    status: final.status,
    redirects: {
      hops,
      count: redirectHops.length,
      permanent: redirectHops.every((x) => x.status === 301 || x.status === 308),
      toHttps: final.finalUrl.startsWith('https://'),
    },
    performance: { ttfbMs: final.ttfbMs, totalMs, htmlBytes: final.bytes, compression: h['content-encoding'], cacheControl: h['cache-control'] },
    indexing: { metaRobots: ex.meta['robots'], xRobotsTag: h['x-robots-tag'], noindex: /\bnoindex\b|\bnone\b/.test(robotsDirectives), nofollow: /\bnofollow\b|\bnone\b/.test(robotsDirectives) },
    canonical: { url: canonicalAbs, isSelf: canonicalIsSelf, count: canonicalTags, status: canonicalStatus?.status, redirectTo: canonicalStatus?.redirectTo },
    meta: {
      title: ex.title,
      titleLength: ex.title?.length ?? 0,
      description: ex.meta['description'],
      descriptionLength: ex.meta['description']?.length ?? 0,
      lang: ex.lang,
      viewport: ex.meta['viewport'],
      mobileViewport: /width\s*=\s*device-width/i.test(ex.meta['viewport'] ?? ''),
      charset: /<meta[^>]+charset/i.test(final.body.slice(0, 4096)) || /charset=/i.test(h['content-type'] ?? ''),
    },
    hreflang: {
      count: alternates.length,
      languages: [...new Set(alternates.map((a) => a.hreflang))],
      hasXDefault: alternates.some((a) => a.hreflang.toLowerCase() === 'x-default'),
      selfReference: alternates.some((a) => a.abs.replace(/\/$/, '') === final.finalUrl.replace(/\/$/, '')),
      invalid: alternates.filter((a) => !HREFLANG.test(a.hreflang)).map((a) => a.hreflang),
      relativeUrls: alternates.filter((a) => !/^https?:\/\//i.test(a.href)).length,
      ...(returnLinks ? { returnLinks } : {}),
    },
    social: {
      openGraph: Object.fromEntries(og.map((k) => [k, !!ex.meta[k]])),
      twitter: Object.fromEntries(tw.map((k) => [k, !!ex.meta[k]])),
    },
    images: {
      total: imgs.length,
      missingAlt: imgs.filter((i) => i.alt === null).length,
      decorative: imgs.filter((i) => i.alt !== null && i.alt.trim() === '').length,
      withoutDimensions: imgs.filter((i) => !i.width || !i.height).length,
      lazy: imgs.filter((i) => i.lazy).length,
      formats,
    },
    headings: {
      h1: ex.allHeadings.filter((x) => x.level === 1).length,
      h1Texts: ex.allHeadings.filter((x) => x.level === 1).map((x) => x.text).slice(0, 5),
      skippedLevels: skipped.slice(0, 10),
      total: ex.allHeadings.length,
    },
    links: {
      internal: internal.length,
      external: uniq.size - internal.length,
      nofollowInternal: internal.filter((l) => /\bnofollow\b/.test(l.rel)).length,
    },
    securityHeaders: {
      'strict-transport-security': !!h['strict-transport-security'],
      'content-security-policy': !!h['content-security-policy'],
      'x-content-type-options': !!h['x-content-type-options'],
      'x-frame-options': !!h['x-frame-options'] || /frame-ancestors/i.test(h['content-security-policy'] ?? ''),
      'referrer-policy': !!h['referrer-policy'],
    },
  };
}

// ─── Sito ──────────────────────────────────────────────────────────────────

export interface SitemapReport {
  url: string;
  status: number;
  isIndex: boolean;
  childSitemaps: number;
  urls: number;
  withLastmod: number;
  newestLastmod?: string;
  oldestLastmod?: string;
  otherHostUrls: number;
  duplicates: number;
  problems: string[];
}

export interface TechSiteCheck {
  origin: string;
  robotsTxt: { status: number; sitemapsDeclared: string[] };
  sitemap: SitemapReport | null;
  sitemapSample: { checked: number; ok: number; redirects: { url: string; status: number; redirectTo?: string }[]; errors: { url: string; status: number; error?: string }[] };
  notFoundPage: { testedUrl: string; status: number; soft404: boolean };
  internalLinks: { checked: number; ok: number; redirects: { url: string; status: number; redirectTo?: string }[]; broken: { url: string; status: number; error?: string }[] };
}

const locs = (xml: string) => [...xml.matchAll(/<loc>\s*(?:<!\[CDATA\[)?\s*([^<\]\s]+)\s*(?:\]\]>)?\s*<\/loc>/gi)].map((m) => m[1]!.replace(/&amp;/g, '&'));
const lastmods = (xml: string) => [...xml.matchAll(/<lastmod>\s*([^<\s]+)\s*<\/lastmod>/gi)].map((m) => m[1]!);

async function readSitemap(url: string, host: string, opts: FetchOptions): Promise<{ report: SitemapReport; urlList: string[] }> {
  const problems: string[] = [];
  const res = await fetchPage(url, { ...opts, maxBytes: 5 * 1024 * 1024, accept: 'application/xml,text/xml,*/*' });
  const empty = (status: number, problem: string): { report: SitemapReport; urlList: string[] } => ({
    report: { url, status, isIndex: false, childSitemaps: 0, urls: 0, withLastmod: 0, otherHostUrls: 0, duplicates: 0, problems: [problem] },
    urlList: [],
  });
  if (res.status !== 200) return empty(res.status, `La sitemap risponde con stato ${res.status}.`);
  if (/^\s*<(!doctype html|html)/i.test(res.body)) return empty(res.status, 'All\'indirizzo della sitemap c\'è una pagina HTML, non un file XML.');
  if (/\.gz$/i.test(url)) return empty(res.status, 'Sitemap compressa (.gz): non analizzata.');

  const isIndex = /<sitemapindex\b/i.test(res.body);
  let all: string[] = [];
  let mods: string[] = [];
  let children = 0;
  if (isIndex) {
    const childUrls = locs(res.body);
    children = childUrls.length;
    for (const child of childUrls.slice(0, 10)) {
      await sleep(250);
      try {
        const c = await fetchPage(child, { ...opts, maxBytes: 5 * 1024 * 1024 });
        if (c.status !== 200) problems.push(`Sitemap figlia ${child} risponde con stato ${c.status}.`);
        else {
          all.push(...locs(c.body));
          mods.push(...lastmods(c.body));
        }
      } catch (err) {
        problems.push(`Sitemap figlia ${child} non raggiungibile (${(err as Error).message.slice(0, 60)}).`);
      }
    }
    if (childUrls.length > 10) problems.push(`Analizzate le prime 10 sitemap figlie su ${childUrls.length}.`);
  } else {
    all = locs(res.body);
    mods = lastmods(res.body);
  }
  if (res.truncated) problems.push('Sitemap oltre 5 MB: analizzata solo la prima parte (il limite di Google è 50 MB e 50.000 URL).');
  all = all.slice(0, 100_000);
  const sortedMods = mods.filter((m) => !Number.isNaN(Date.parse(m))).sort();
  const other = all.filter((u) => { try { return new URL(u).hostname.replace(/^www\./, '') !== host; } catch { return true; } }).length;
  if (all.length > 50_000 && !isIndex) problems.push('Più di 50.000 URL in una sola sitemap: il limite di Google è 50.000.');
  if (!all.length) problems.push('Nessun URL trovato nella sitemap.');

  return {
    report: {
      url, status: res.status, isIndex, childSitemaps: children, urls: all.length, withLastmod: mods.length,
      newestLastmod: sortedMods.at(-1), oldestLastmod: sortedMods[0], otherHostUrls: other,
      duplicates: all.length - new Set(all).size, problems,
    },
    urlList: all,
  };
}

/** Campione distribuito uniformemente (non solo i primi URL). */
function spread<T>(items: T[], n: number): T[] {
  if (items.length <= n) return items;
  const step = items.length / n;
  return Array.from({ length: n }, (_, i) => items[Math.floor(i * step)]!);
}

export async function techSiteCheck(url: string, opts: FetchOptions = {}, sampleSize = 20, linkSample = 30): Promise<TechSiteCheck> {
  const origin = new URL(url).origin;
  const host = new URL(url).hostname.replace(/^www\./, '');

  // robots.txt → sitemap dichiarate; altrimenti i percorsi più comuni.
  const robots = await fetchPage(`${origin}/robots.txt`, { ...opts, maxBytes: 512 * 1024 }).catch(() => undefined);
  const declared = robots?.status === 200 ? parseRobots(robots.body).sitemaps : [];
  let sitemap: SitemapReport | null = null;
  let urlList: string[] = [];
  for (const candidate of declared.length ? declared.slice(0, 1) : [`${origin}/sitemap.xml`, `${origin}/sitemap_index.xml`]) {
    try {
      const r = await readSitemap(candidate, host, opts);
      if (r.report.status === 200 || declared.length) {
        sitemap = r.report;
        urlList = r.urlList;
        break;
      }
    } catch {
      /* prova il prossimo percorso */
    }
  }

  // Campione di URL della sitemap: devono rispondere 200, senza redirect.
  const sample = { checked: 0, ok: 0, redirects: [] as TechSiteCheck['sitemapSample']['redirects'], errors: [] as TechSiteCheck['sitemapSample']['errors'] };
  for (const u of spread([...new Set(urlList)], sampleSize)) {
    await sleep(250);
    const r = await statusOf(u, opts);
    sample.checked++;
    if (r.status === 200) sample.ok++;
    else if (r.status >= 300 && r.status < 400) sample.redirects.push({ url: u, status: r.status, redirectTo: r.redirectTo });
    else sample.errors.push({ url: u, status: r.status, error: r.error });
  }

  // Pagina inesistente: deve rispondere 404 (o 410), non 200 (soft 404).
  const testedUrl = `${origin}/seomcp-verifica-404-${randomBytes(4).toString('hex')}`;
  const nf = await statusOf(testedUrl, opts);

  // Link interni della pagina indicata: quali sono rotti o reindirizzati.
  const links = { checked: 0, ok: 0, redirects: [] as TechSiteCheck['internalLinks']['redirects'], broken: [] as TechSiteCheck['internalLinks']['broken'] };
  try {
    const page = await fetchPage(url, opts);
    const internal = [...new Set(extractPage(page.body, page.finalUrl).links.map((l) => l.href.split('#')[0]!))].filter((h) => {
      try {
        const u = new URL(h);
        // /cdn-cgi/ sono servizi di Cloudflare (es. protezione delle email) che funzionano solo con JavaScript.
        return u.hostname.replace(/^www\./, '') === host && !u.pathname.startsWith('/cdn-cgi/');
      } catch {
        return false;
      }
    });
    for (const link of internal.slice(0, linkSample)) {
      await sleep(250);
      const r = await statusOf(link, opts);
      links.checked++;
      if (r.status === 200) links.ok++;
      else if (r.status >= 300 && r.status < 400) links.redirects.push({ url: link, status: r.status, redirectTo: r.redirectTo });
      else links.broken.push({ url: link, status: r.status, error: r.error });
    }
  } catch {
    /* pagina non raggiungibile: il resto del report resta valido */
  }

  return {
    origin,
    robotsTxt: { status: robots?.status ?? 0, sitemapsDeclared: declared },
    sitemap,
    sitemapSample: sample,
    notFoundPage: { testedUrl, status: nf.status, soft404: nf.status === 200 },
    internalLinks: links,
  };
}
