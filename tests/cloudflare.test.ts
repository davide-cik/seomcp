import { describe, expect, it, vi } from 'vitest';
import { CloudflareClient, aiBotOf, hostOf } from '../src/core/cloudflare.js';
import { SeoMcpError } from '../src/core/errors.js';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('CloudflareClient', () => {
  it('trova la zona risalendo dal sottodominio al dominio', async () => {
    const asked: string[] = [];
    const fetchMock = vi.fn(async (u: string) => {
      const name = new URL(u).searchParams.get('name');
      asked.push(name!);
      return json({ success: true, result: name === 'esempio.it' ? [{ id: 'z1', name: 'esempio.it', plan: { name: 'Free Website' } }] : [] });
    });
    const cf = new CloudflareClient({ apiToken: 't', fetch: fetchMock as unknown as typeof fetch });
    expect(await cf.findZone('https://www.esempio.it/pagina')).toEqual({ id: 'z1', name: 'esempio.it', plan: 'Free Website' });
    expect(asked).toEqual(['www.esempio.it', 'esempio.it']);
    const headers = (fetchMock.mock.calls[0] as unknown[])[1] as { headers: Record<string, string> };
    expect(headers.headers.Authorization).toBe('Bearer t');
  });

  it('legge i crawler AI un giorno alla volta, con user-agent, pagina e stato', async () => {
    const bodies: Array<{ query: string; variables: { start: string; end: string } }> = [];
    const fetchMock = vi.fn(async (_u: string, init: { body: string }) => {
      bodies.push(JSON.parse(init.body));
      return json({ data: { viewer: { zones: [{ hits: [{ count: 3, dimensions: { userAgent: 'Mozilla/5.0 (compatible; GPTBot/1.2)', clientRequestPath: '/guida/', edgeResponseStatus: 200 } }] }] } }, errors: null });
    });
    const cf = new CloudflareClient({ apiToken: 't', fetch: fetchMock as unknown as typeof fetch });
    const rows = await cf.aiCrawlerRequests('z1', 3);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({ path: '/guida/', status: 200, count: 3 });
    expect(bodies[0]!.query).toContain('userAgent_like: "%GPTBot%"');
    expect(bodies[0]!.query).not.toContain('Google-Extended');
    const span = Date.parse(bodies[0]!.variables.end) - Date.parse(bodies[0]!.variables.start);
    expect(span).toBe(86_400_000);
  });

  it('errori di permesso con istruzioni sul token', async () => {
    const cf = new CloudflareClient({ apiToken: 't', fetch: (async () => json({ success: false }, 403)) as unknown as typeof fetch });
    await expect(cf.listZones()).rejects.toThrow(SeoMcpError);
    await expect(cf.listZones()).rejects.toThrow(/permessi/);
  });

  it('riconosce i bot AI dallo user-agent e normalizza i domini', () => {
    expect(aiBotOf('Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +claudebot@anthropic.com)')?.token).toBe('ClaudeBot');
    expect(aiBotOf('Mozilla/5.0 (compatible; ChatGPT-User/1.0; +https://openai.com/bot)')?.token).toBe('ChatGPT-User');
    expect(aiBotOf('Mozilla/5.0 (Windows NT 10.0) Chrome/120')).toBeUndefined();
    expect(hostOf('Esempio.it')).toBe('esempio.it');
  });
});
