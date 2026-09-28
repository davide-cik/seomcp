import { createServer, type Server } from 'node:http';
import { gzipSync } from 'node:zlib';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { fetchPage, isPrivateIp } from '../src/core/fetch-page.js';
import { analyzeLlmsTxt, botAccess, computeMetrics, dataPoints, isQuestion, jsonLdNodes, parseRobots } from '../src/core/geo.js';
import { extractPage } from '../src/core/html.js';

describe('robots.txt (RFC 9309)', () => {
  const robots = parseRobots(`
User-agent: *
Disallow: /admin/
Allow: /admin/public/
Content-Signal: search=yes, ai-train=no

User-agent: GPTBot
User-agent: CCBot
Disallow: /

User-agent: PerplexityBot
Disallow: /*.pdf$
`);

  it('gruppo specifico del bot, altrimenti "*"', () => {
    expect(botAccess(robots, 'GPTBot', '/blog/')).toMatchObject({ allowed: false, group: 'GPTBot', rule: 'Disallow: /' });
    expect(botAccess(robots, 'CCBot', '/')).toMatchObject({ allowed: false });
    expect(botAccess(robots, 'ClaudeBot', '/blog/')).toMatchObject({ allowed: true, group: '*' });
  });

  it('regola più lunga vince, Allow vince a parità', () => {
    expect(botAccess(robots, 'ClaudeBot', '/admin/x')).toMatchObject({ allowed: false, rule: 'Disallow: /admin/' });
    expect(botAccess(robots, 'ClaudeBot', '/admin/public/x')).toMatchObject({ allowed: true, rule: 'Allow: /admin/public/' });
  });

  it('caratteri jolly e ancoraggio $', () => {
    expect(botAccess(robots, 'PerplexityBot', '/docs/guida.pdf').allowed).toBe(false);
    expect(botAccess(robots, 'PerplexityBot', '/docs/guida.pdf?x=1').allowed).toBe(true);
  });

  it('Content Signals di Cloudflare', () => {
    expect(botAccess(robots, 'ClaudeBot', '/').contentSignals).toEqual({ search: 'yes', 'ai-train': 'no' });
  });

  it('senza robots.txt tutto consentito', () => {
    expect(botAccess(parseRobots(''), 'GPTBot', '/')).toMatchObject({ allowed: true, group: 'nessuno' });
  });
});

describe('llms.txt', () => {
  const page = (body: string, status = 200) => ({ requestedUrl: '', finalUrl: '', status, headers: {}, body, bytes: body.length, truncated: false, redirects: [], responseMs: 1 });
  it('struttura: titolo, sommario, sezioni, link', () => {
    expect(analyzeLlmsTxt(page('# Sito\n\n> Descrizione\n\n## Guide\n- [A](https://a.it/a): x\n- [B](https://a.it/b)\n'))).toMatchObject({
      present: true, hasTitle: true, hasSummary: true, sections: 1, links: 2,
    });
  });
  it('una pagina HTML (es. 404 personalizzato) non conta come llms.txt', () => {
    expect(analyzeLlmsTxt(page('<!doctype html><title>404</title>'))).toMatchObject({ present: false, looksLikeHtml: true, bytes: 0 });
  });
});

describe('isPrivateIp', () => {
  it.each(['127.0.0.1', '10.1.2.3', '172.20.0.1', '192.168.1.1', '169.254.169.254', '100.64.0.1', '0.0.0.0', '::1', 'fd00::1', 'fe80::1', '::ffff:127.0.0.1'])('%s è privato', (ip) => {
    expect(isPrivateIp(ip)).toBe(true);
  });
  it.each(['8.8.8.8', '49.12.213.47', '2606:4700::1'])('%s è pubblico', (ip) => {
    expect(isPrivateIp(ip)).toBe(false);
  });
});

describe('segnali testuali', () => {
  it('titoli a domanda in italiano e inglese', () => {
    expect(isQuestion('Come funziona la SEO')).toBe(true);
    expect(isQuestion("Cos'è un canonical")).toBe(true);
    expect(isQuestion('What is GEO')).toBe(true);
    expect(isQuestion('Prezzi e piani')).toBe(false);
    expect(isQuestion('Prezzi?')).toBe(true);
  });
  it('dati numerici', () => {
    expect(dataPoints('Nel 2025 il 42% dei siti costava 1.200 € e 3 volte tanto')).toMatchObject({ percentages: 1, currencies: 1, years: 1, numbers: 4 });
  });
  it('JSON-LD con @graph e array', () => {
    expect(jsonLdNodes([{ '@graph': [{ '@type': 'Article' }, { '@type': 'Organization' }] }, [{ '@type': 'FAQPage' }]]).map((n) => n['@type'])).toEqual(['Article', 'Organization', 'FAQPage']);
  });
});

const FIXTURE = `<!doctype html><html lang="it"><head>
<title>Guida al compostaggio domestico</title>
<meta name="description" content="Come fare il compost a casa">
<link rel="canonical" href="https://www.esempio.it/compost/">
<script type="application/ld+json">{"@context":"https://schema.org","@graph":[
 {"@type":"Article","headline":"Guida al compost","datePublished":"2026-01-10","dateModified":"2026-09-01","author":{"@type":"Person","name":"Anna Verdi","url":"https://www.esempio.it/anna","sameAs":["https://www.linkedin.com/in/anna"]}},
 {"@type":"Organization","name":"Esempio","sameAs":["https://it.wikipedia.org/wiki/Esempio","https://www.linkedin.com/company/esempio"]},
 {"@type":"FAQPage","mainEntity":[{"@type":"Question","name":"A"},{"@type":"Question","name":"B"}]}
]}</script>
<script type="application/ld+json">{ rotto </script>
</head><body>
<header><nav><a href="/">Home</a><a href="/chi-siamo">Chi siamo</a></nav></header>
<div class="cookie-banner"><p>Usiamo i cookie per migliorare la tua esperienza di navigazione sul sito.</p></div>
<main>
<h1>Guida al compostaggio domestico</h1>
<p>Il compostaggio domestico trasforma gli scarti organici in terriccio fertile in circa 3-6 mesi, riducendo fino al 30% i rifiuti di casa.</p>
<h2>Cos'è il compost?</h2>
<p>Il compost è un ammendante naturale prodotto dalla decomposizione controllata di scarti vegetali e alimentari, ricco di sostanza organica.</p>
<ul><li>Scarti di frutta</li><li>Fondi di caffè</li><li>Foglie secche</li></ul>
<h2>Quanto costa una compostiera</h2>
<ul><li>Base: 40 €</li><li>Rotante: 120 €</li></ul>
<table><tr><th>Tipo</th><th>Prezzo</th></tr><tr><td>Base</td><td>40 €</td></tr><tr><td>Rotante</td><td>120 €</td></tr></table>
<h3>Fonti</h3>
<p>Dati da <a href="https://www.isprambiente.gov.it/rifiuti">ISPRA</a> e <a href="https://ec.europa.eu/environment" rel="nofollow">Commissione europea</a>, vedi anche <a href="/compost/faq">le FAQ</a>.</p>
<details><summary>Domanda</summary>Risposta</details>
</main>
<footer><a href="https://www.facebook.com/esempio">Facebook</a><p class="author">Di Anna Verdi</p></footer>
</body></html>`;

describe('estrazione e metriche', () => {
  const page = { requestedUrl: 'https://www.esempio.it/compost/', finalUrl: 'https://www.esempio.it/compost/', status: 200, headers: { 'content-type': 'text/html', 'last-modified': 'Mon, 01 Sep 2026 10:00:00 GMT' }, body: FIXTURE, bytes: FIXTURE.length, truncated: false, redirects: [], responseMs: 120 };
  const ex = extractPage(FIXTURE, page.finalUrl);
  const m = computeMetrics(page, ex, new Date('2026-09-28T00:00:00Z'));

  it('esclude menu, banner dei cookie e footer dal contenuto', () => {
    expect(ex.contentText).not.toContain('cookie');
    expect(ex.contentText).not.toContain('Chi siamo');
    expect(ex.contentText).toContain('ammendante naturale');
  });

  it('struttura e risposta in apertura', () => {
    expect(m.structure).toMatchObject({ h1: 1, h2: 2, h3: 1, questionHeadings: 2, lists: 2, listItems: 5, detailsElements: 1 });
    expect(m.structure.tables).toEqual([{ rows: 3, cols: 2, hasHeader: true }]);
    expect(m.answerFirst.introLeadWords).toBeGreaterThan(15);
    expect(m.answerFirst).toMatchObject({ sectionsH2H3: 3, sectionsStartingWithParagraph: 2 });
  });

  it('freschezza, autore, fonti', () => {
    expect(m.freshness).toMatchObject({ datePublished: '2026-01-10', dateModified: '2026-09-01', daysSinceModified: 27 });
    expect(m.author.schemaAuthors).toEqual([{ name: 'Anna Verdi', type: 'Person', hasUrl: true, sameAs: 1 }]);
    expect(m.author.bylines).toContain('Di Anna Verdi');
    expect(m.sources).toMatchObject({ externalInContent: 2, uniqueExternalDomains: 2, nofollowExternal: 1 });
    expect(m.sources.authoritativeDomains.sort()).toEqual(['ec.europa.eu', 'isprambiente.gov.it']);
  });

  it('dati strutturati ed entità', () => {
    expect(m.structuredData).toMatchObject({ jsonLdBlocks: 1, parseErrors: 1, faqQuestions: 2, types: { Article: 1, Organization: 1, FAQPage: 1 } });
    expect(m.structuredData.completeness.find((c) => c.type === 'Article')?.missing).toEqual(['image', 'publisher']);
    expect(m.entities).toEqual([{ type: 'Organization', name: 'Esempio', sameAs: 2, sameAsPlatforms: ['Wikipedia', 'LinkedIn'] }]);
  });

  it('meta e leggibilità senza JavaScript', () => {
    expect(m.meta).toMatchObject({ lang: 'it', canonicalIsSelf: true, titleLength: 31 });
    expect(m.aiReadability.likelyNeedsJavaScript).toBe(false);
    const spa = extractPage('<html><body><div id="root"></div><script src="/app.js"></script></body></html>', 'https://x.it/');
    const ms = computeMetrics({ ...page, body: '<html>…</html>' }, spa);
    expect(ms.aiReadability).toMatchObject({ likelyNeedsJavaScript: true, frameworkMarkers: ['contenitore #root vuoto'] });
  });
});

describe('fetchPage', () => {
  let server: Server;
  let base = '';
  beforeAll(async () => {
    server = createServer((req, res) => {
      if (req.url === '/redir') return res.writeHead(301, { Location: '/gz' }).end();
      if (req.url === '/gz') return res.writeHead(200, { 'Content-Type': 'text/html', 'Content-Encoding': 'gzip' }).end(gzipSync('<p>compresso</p>'));
      if (req.url === '/big') return res.writeHead(200).end('x'.repeat(5000));
      if (req.url === '/loop') return res.writeHead(302, { Location: '/loop' }).end();
      res.writeHead(404).end();
    });
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  });
  afterAll(() => new Promise<void>((r) => server.close(() => r())));

  it('blocca gli indirizzi locali per impostazione predefinita', async () => {
    await expect(fetchPage(`${base}/gz`)).rejects.toThrow(/rete interna o locale/);
  });
  it('segue i redirect e decomprime', async () => {
    const r = await fetchPage(`${base}/redir`, { allowPrivate: true });
    expect(r).toMatchObject({ status: 200, body: '<p>compresso</p>', finalUrl: `${base}/gz` });
    expect(r.redirects).toHaveLength(1);
  });
  it('tronca oltre il limite di dimensione', async () => {
    const r = await fetchPage(`${base}/big`, { allowPrivate: true, maxBytes: 1000 });
    expect(r).toMatchObject({ bytes: 1000, truncated: true });
  });
  it('si ferma sui redirect infiniti', async () => {
    await expect(fetchPage(`${base}/loop`, { allowPrivate: true })).rejects.toThrow(/Troppi redirect/);
  });
  it('rifiuta protocolli diversi da http(s)', async () => {
    await expect(fetchPage('file:///etc/passwd')).rejects.toThrow(/http/);
  });
});

describe('affidabilità del sito', async () => {
  const { registeredDomain, httpsInfo } = await import('../src/core/site-trust.js');
  const base = { requestedUrl: '', status: 200, bytes: 0, truncated: false, redirects: [], responseMs: 1 };

  it('dominio registrato, anche con suffissi di secondo livello', () => {
    expect(registeredDomain('www.contentisking.guru')).toBe('contentisking.guru');
    expect(registeredDomain('blog.esempio.it')).toBe('esempio.it');
    expect(registeredDomain('www.bbc.co.uk')).toBe('bbc.co.uk');
  });

  it('HTTPS, redirect permanente, HSTS e contenuti misti', () => {
    const page = {
      ...base,
      finalUrl: 'https://www.esempio.it/',
      headers: { 'strict-transport-security': 'max-age=31536000' },
      body: '<img src="http://cdn.esempio.it/a.jpg"><script src="https://ok.js"></script><link rel="stylesheet" href="http://x.it/s.css"><a href="http://link.it">ok</a>',
    };
    const probe = { ...base, finalUrl: 'http://www.esempio.it/', status: 301, headers: { location: 'https://www.esempio.it/' }, body: '' };
    expect(httpsInfo(page, probe)).toEqual({ https: true, httpRedirectsToHttps: true, httpRedirectStatus: 301, hsts: 'max-age=31536000', mixedContent: 2 });
  });

  it('sito solo http', () => {
    const page = { ...base, finalUrl: 'http://vecchio.it/', headers: {}, body: '<img src="http://vecchio.it/a.jpg">' };
    const probe = { ...base, finalUrl: 'http://vecchio.it/', status: 200, headers: {}, body: '' };
    expect(httpsInfo(page, probe)).toMatchObject({ https: false, httpRedirectsToHttps: false, mixedContent: 0 });
  });
});
