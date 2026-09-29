import { createServer, type Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { redirectChain, techPageAudit, techSiteCheck } from '../src/core/technical.js';

let server: Server;
let base = '';
const opts = { allowPrivate: true };

const PAGE = (b: string) => `<!doctype html><html lang="it"><head><meta charset="utf-8">
<title>Pagina di prova per i controlli tecnici</title>
<meta name="description" content="Descrizione della pagina di prova">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="canonical" href="${b}/pagina">
<link rel="alternate" hreflang="it" href="${b}/pagina">
<link rel="alternate" hreflang="en" href="${b}/en/pagina">
<link rel="alternate" hreflang="italiano" href="/relativo">
<meta property="og:title" content="Titolo"><meta property="og:image" content="${b}/og.jpg">
<meta name="twitter:card" content="summary">
</head><body><main>
<h1>Titolo</h1><h2>Sezione</h2><h4>Salto</h4>
<img src="/a.webp" alt="foto" width="10" height="10" loading="lazy"><img src="/b.jpg"><img src="/c.png" alt="">
<a href="/ok">ok</a> <a href="/rotto">rotto</a> <a href="/vecchio">vecchio</a> <a href="/cdn-cgi/l/email-protection">email</a>
<a href="https://esterno.example/">esterno</a>
</main></body></html>`;

beforeAll(async () => {
  server = createServer((req, res) => {
    const b = base;
    const url = req.url ?? '/';
    if (url === '/inizio') return res.writeHead(302, { Location: '/intermedio' }).end();
    if (url === '/intermedio') return res.writeHead(301, { Location: '/pagina' }).end();
    if (url === '/pagina') return res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'X-Content-Type-Options': 'nosniff' }).end(PAGE(b));
    if (url === '/en/pagina') return res.writeHead(200, { 'Content-Type': 'text/html' }).end('<html><head><link rel="alternate" hreflang="en" href="/en/pagina"></head></html>');
    if (url === '/robots.txt') return res.writeHead(200).end(`User-agent: *\nAllow: /\nSitemap: ${b}/sitemap_index.xml\n`);
    if (url === '/sitemap_index.xml') return res.writeHead(200).end(`<?xml version="1.0"?><sitemapindex><sitemap><loc>${b}/s1.xml</loc></sitemap><sitemap><loc>${b}/s2.xml</loc></sitemap></sitemapindex>`);
    if (url === '/s1.xml') return res.writeHead(200).end(`<urlset><url><loc>${b}/ok</loc><lastmod>2026-09-01</lastmod></url><url><loc>${b}/vecchio</loc></url><url><loc>https://altro.example/x</loc></url></urlset>`);
    if (url === '/s2.xml') return res.writeHead(200).end(`<urlset><url><loc>${b}/ok</loc><lastmod>2025-01-01</lastmod></url></urlset>`);
    if (url === '/ok') return res.writeHead(200).end('ok');
    if (url === '/vecchio') return res.writeHead(301, { Location: '/ok' }).end();
    return res.writeHead(404).end('non trovato');
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
});
afterAll(() => new Promise<void>((r) => server.close(() => r())));

describe('redirectChain', () => {
  it('registra ogni passaggio', async () => {
    const { hops, final } = await redirectChain(`${base}/inizio`, opts);
    expect(hops.map((h) => h.status)).toEqual([302, 301, 200]);
    expect(final.finalUrl).toBe(`${base}/pagina`);
  });
});

describe('techPageAudit', () => {
  it('misura redirect, meta, canonical, hreflang, immagini, titoli, link e header', async () => {
    const r = await techPageAudit(`${base}/inizio`, opts);
    expect(r.redirects).toMatchObject({ count: 2, permanent: false });
    expect(r.performance.ttfbMs).toBeGreaterThanOrEqual(0);
    expect(r.meta).toMatchObject({ lang: 'it', mobileViewport: true, charset: true });
    expect(r.canonical).toMatchObject({ isSelf: true, count: 1 });
    expect(r.hreflang).toMatchObject({ count: 3, hasXDefault: false, selfReference: true, invalid: ['italiano'], relativeUrls: 1 });
    expect(r.hreflang.returnLinks).toEqual([
      { href: `${base}/en/pagina`, status: 200, linksBack: false },
      { href: `${base}/relativo`, status: 404, linksBack: null },
    ]);
    expect(r.social.openGraph).toMatchObject({ 'og:title': true, 'og:image': true, 'og:description': false });
    expect(r.images).toMatchObject({ total: 3, missingAlt: 1, decorative: 1, withoutDimensions: 2, lazy: 1, formats: { webp: 1, jpg: 1, png: 1 } });
    expect(r.headings).toMatchObject({ h1: 1, total: 3 });
    expect(r.headings.skippedLevels[0]).toContain('H2 → H4');
    expect(r.links.external).toBe(1);
    expect(r.securityHeaders).toMatchObject({ 'x-content-type-options': true, 'strict-transport-security': false });
  });
});

describe('techSiteCheck', () => {
  it('sitemap, campione di URL, pagina 404 e link interni', async () => {
    const r = await techSiteCheck(`${base}/pagina`, opts, 10, 10);
    expect(r.robotsTxt.sitemapsDeclared).toEqual([`${base}/sitemap_index.xml`]);
    expect(r.sitemap).toMatchObject({ isIndex: true, childSitemaps: 2, urls: 4, withLastmod: 2, duplicates: 1, otherHostUrls: 1, newestLastmod: '2026-09-01', oldestLastmod: '2025-01-01' });
    expect(r.sitemapSample.redirects.map((x) => x.url)).toEqual([`${base}/vecchio`]);
    expect(r.notFoundPage).toMatchObject({ status: 404, soft404: false });
    expect(r.internalLinks.broken.map((x) => x.url)).toContain(`${base}/rotto`);
    expect(r.internalLinks.redirects.map((x) => x.url)).toContain(`${base}/vecchio`);
    // I servizi Cloudflare (/cdn-cgi/) non vengono controllati: funzionano solo con JavaScript.
    expect([...r.internalLinks.broken, ...r.internalLinks.redirects].some((x) => x.url.includes('/cdn-cgi/'))).toBe(false);
  }, 30_000);
});
