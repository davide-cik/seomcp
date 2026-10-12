import { describe, expect, it, vi } from 'vitest';
import { aggregateAiReferrals, aiAssistantOf, aiSourceRegex } from '../src/core/ai-referrals.js';
import { BingClient, decodeCrawlIssues } from '../src/core/bing.js';
import { cdxDate, crawlPresence, parseCdx, summarize } from '../src/core/common-crawl.js';
import { entityCheck, siteHost, websiteVariants } from '../src/core/entity.js';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('assistenti AI in Analytics', () => {
  it('riconosce le sorgenti degli assistenti, con sottodomini e www', () => {
    expect(aiAssistantOf('chatgpt.com')?.assistant).toBe('ChatGPT');
    expect(aiAssistantOf('chat.openai.com')?.assistant).toBe('ChatGPT');
    expect(aiAssistantOf('www.perplexity.ai')?.assistant).toBe('Perplexity');
    expect(aiAssistantOf('gemini.google.com')?.assistant).toBe('Gemini');
    expect(aiAssistantOf('google')).toBeUndefined();
    expect(aiAssistantOf('notchatgpt.com')).toBeUndefined();
  });

  it("l'espressione per il filtro GA4 seleziona le stesse sorgenti", () => {
    const re = new RegExp(aiSourceRegex(), 'i');
    expect(re.test('chatgpt.com')).toBe(true);
    expect(re.test('copilot.microsoft.com')).toBe(true);
    expect(re.test('google')).toBe(false);
    expect(re.test('notchatgpt.com')).toBe(false);
  });

  it('raggruppa per assistente, calcola coinvolgimento e variazione', () => {
    const row = (source: string, page: string, sessions: number, engaged: number, keyEvents = 0) => ({
      dimensions: { sessionSource: source, landingPage: page },
      metrics: { sessions, engagedSessions: engaged, keyEvents, totalRevenue: 0 },
    });
    const out = aggregateAiReferrals(
      [row('chatgpt.com', '/a', 30, 20, 2), row('chat.openai.com', '/b', 10, 5), row('perplexity.ai', '/a', 5, 5), row('google', '/x', 999, 1)],
      [
        { dimensions: { sessionSource: 'chatgpt.com' }, metrics: { sessions: 20 } },
        { dimensions: { sessionSource: 'claude.ai' }, metrics: { sessions: 4 } },
      ],
    );
    const gpt = out.find((a) => a.assistant === 'ChatGPT')!;
    expect(gpt.sessions).toBe(40);
    expect(gpt.engagementRate).toBe(0.625);
    expect(gpt.change).toBe(100);
    expect(gpt.sources).toEqual(['chat.openai.com', 'chatgpt.com']);
    expect(gpt.topLandingPages[0]).toEqual({ page: '/a', sessions: 30, keyEvents: 2 });
    expect(out.find((a) => a.assistant === 'Perplexity')?.change).toBeNull();
    // Claude portava visite prima e ora no: resta visibile.
    expect(out.find((a) => a.assistant === 'Claude')).toMatchObject({ sessions: 0, previousSessions: 4, change: -100 });
    expect(out.map((a) => a.assistant)).not.toContain(undefined);
  });
});

describe('scansione di Bing', () => {
  it("decodifica l'enum a bit dei problemi", () => {
    expect(decodeCrawlIssues(0)).toEqual([]);
    expect(decodeCrawlIssues(32)).toEqual(['ContainsMalware']);
    expect(decodeCrawlIssues(4 | 64)).toEqual(['Code4xx', 'ImportantUrlBlockedByRobotsTxt']);
    expect(decodeCrawlIssues('Code301 Code4xx')).toEqual(['Code301', 'Code4xx']);
  });

  it('mappa statistiche e problemi della API', async () => {
    const fetchMock = vi.fn(async (u: URL) =>
      u.pathname.endsWith('/GetCrawlStats')
        ? json({ d: [
            { Date: '/Date(1316156400000-0700)/', CrawledPages: 5, InIndex: 900, Code2xx: 4, Code4xx: 1 },
            { Date: '/Date(1316070000000-0700)/', CrawledPages: 3, InIndex: 880 },
          ] })
        : json({ d: [{ Url: 'https://www.esempio.it/x', HttpCode: 404, Issues: 4, InLinks: 7 }] }),
    );
    const bing = new BingClient({ apiKey: 'k', fetch: fetchMock as unknown as typeof fetch });
    const stats = await bing.getCrawlStats('https://www.esempio.it/');
    expect(stats.map((s) => s.date)).toEqual(['2011-09-15', '2011-09-16']);
    expect(stats[1]).toMatchObject({ crawledPages: 5, inIndex: 900, code4xx: 1, code5xx: 0 });
    expect(await bing.getCrawlIssues('https://www.esempio.it/')).toEqual([{ url: 'https://www.esempio.it/x', httpCode: 404, issues: ['Code4xx'], inLinks: 7 }]);
  });
});

describe('entità', () => {
  it('normalizza host e varianti del sito ufficiale', () => {
    expect(siteHost('https://www.Esempio.it/chi-siamo')).toBe('esempio.it');
    expect(siteHost('esempio.it')).toBe('esempio.it');
    expect(websiteVariants('https://esempio.it')).toContain('https://www.esempio.it');
    expect(websiteVariants('https://esempio.it')).toContain('http://esempio.it/');
  });

  it('interroga Wikidata e il Knowledge Graph e riconosce il sito ufficiale', async () => {
    const fetchMock = vi.fn(async (u: URL) => {
      if (u.hostname === 'kgsearch.googleapis.com') {
        return json({ itemListElement: [{ resultScore: 812.4, result: { '@id': 'kg:/m/0abc', name: 'Esempio', '@type': ['Organization', 'Thing'], description: 'Azienda', url: 'https://www.esempio.it/' } }] });
      }
      const action = u.searchParams.get('action');
      if (action === 'wbsearchentities') return json({ search: [{ id: 'Q1' }, { id: 'Q2' }] });
      if (action === 'wbgetentities' && u.searchParams.get('props') === 'labels') return json({ entities: { Q4830453: { id: 'Q4830453', labels: { it: { value: 'impresa' } } } } });
      return json({ entities: {
        Q1: { id: 'Q1', labels: { it: { value: 'Esempio' } }, descriptions: { it: { value: 'azienda italiana' } }, sitelinks: { itwiki: { title: 'Esempio (azienda)' } },
          claims: { P856: [{ mainsnak: { datavalue: { value: 'https://esempio.it' } } }], P31: [{ mainsnak: { datavalue: { value: { id: 'Q4830453' } } } }], P2002: [{ mainsnak: { datavalue: { value: 'esempio' } } }] } },
        Q2: { id: 'Q2', labels: { it: { value: 'Esempio' } }, descriptions: { it: { value: 'film' } }, claims: {} },
      } });
    });
    const r = await entityCheck('Esempio', undefined, { googleApiKey: 'k', language: 'it-IT', fetch: fetchMock as unknown as typeof fetch });
    expect(r.wikidata.entities[0]).toMatchObject({ id: 'Q1', instanceOf: ['impresa'], officialWebsites: ['https://esempio.it'], profiles: { 'X/Twitter': 'esempio' }, foundBy: ['nome'] });
    expect(r.wikidata.entities[0]?.wikipedia.it).toBe('https://it.wikipedia.org/wiki/Esempio_(azienda)');
    expect(r.knowledgeGraph.entities[0]).toMatchObject({ id: '/m/0abc', name: 'Esempio', resultScore: 812.4 });
    // Senza URL del sito non si può dire quale entità è quella giusta.
    expect(r.summary.wikidataEntityForSite).toBeNull();
    const kgCall = fetchMock.mock.calls.map((c) => c[0] as URL).find((u) => u.hostname === 'kgsearch.googleapis.com')!;
    expect(kgCall.searchParams.get('languages')).toBe('it');
  });

  it('spiega come abilitare il Knowledge Graph, senza esporre la chiave', async () => {
    const fetchMock = vi.fn(async (u: URL) =>
      u.hostname === 'kgsearch.googleapis.com'
        ? json({ error: { message: 'Knowledge Graph Search API has not been used in project 123 before or it is disabled.' } }, 403)
        : json({ search: [] }),
    );
    const r = await entityCheck('Esempio', undefined, { googleApiKey: 'chiave-segreta', fetch: fetchMock as unknown as typeof fetch });
    expect(r.knowledgeGraph.error).toContain('Knowledge Graph Search API');
    expect(r.knowledgeGraph.error).not.toContain('chiave-segreta');
    expect(r.wikidata.entities).toEqual([]);
  });

  it('senza API key salta il Knowledge Graph e lo dice', async () => {
    const fetchMock = vi.fn(async () => json({ search: [] }));
    const r = await entityCheck('Esempio', undefined, { fetch: fetchMock as unknown as typeof fetch });
    expect(r.knowledgeGraph.skipped).toContain('API key');
  });
});

describe('Common Crawl', () => {
  it('legge le righe CDX e riassume la presenza', () => {
    const rows = parseCdx('{"url":"https://www.esempio.it/","status":"200","timestamp":"20260905101010","mime":"text/html"}\n{"url":"https://www.esempio.it/a","status":"301","timestamp":"20260910000000","mime":"unk"}\nnon json\n');
    expect(rows).toHaveLength(2);
    const s = summarize(rows, 'esempio.it', 1000);
    expect(s).toMatchObject({ pages: 2, truncated: false, homepage: true, statuses: { '200': 1, '301': 1 }, firstCapture: '2026-09-05', lastCapture: '2026-09-10' });
    expect(s.samplePages).toEqual(['https://www.esempio.it/']);
    expect(cdxDate('20260904131603')).toBe('2026-09-04');
  });

  it('distingue "non presente" (404) da indice sovraccarico (504)', async () => {
    const crawl = { id: 'CC-MAIN-2026-39', name: 'September 2026 Index', cdxApi: 'https://index.commoncrawl.org/CC-MAIN-2026-39-index' };
    const absent = await crawlPresence(crawl, 'esempio.it', 10, { fetch: (async () => new Response('No Captures found', { status: 404 })) as unknown as typeof fetch });
    expect(absent).toMatchObject({ pages: 0 });
    expect(absent.error).toBeUndefined();
    const busy = vi.fn(async () => new Response('', { status: 504 }));
    const overloaded = await crawlPresence(crawl, 'esempio.it', 10, { fetch: busy as unknown as typeof fetch });
    expect(overloaded.error).toContain('504');
    expect(busy).toHaveBeenCalledTimes(2);
  });
});
