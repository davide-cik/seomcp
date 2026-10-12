import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { describe, expect, it } from 'vitest';
import { SeoMcpError } from '../src/core/errors.js';
import { TEMI, TUTTE, temaMarkdown } from '../src/library/domande.js';
import { PROMPT_GUIDE } from '../src/library/prompt-guide.js';
import { createServerWithContext } from '../src/server.js';

const off = () => {
  throw new SeoMcpError('NOT_CONFIGURED', 'non configurato');
};

async function connect() {
  const server = createServerWithContext({ gsc: off, ga: off, bing: off, pagespeed: off,
    defaults: { country: 'it', language: 'it-IT' }, diagnose: async () => [] });
  const client = new Client({ name: 'test', version: '0.0.0' });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(a), client.connect(b)]);
  return client;
}

describe('archivio di domande', () => {
  it('ogni domanda usa solo tool che esistono', async () => {
    const { tools } = await (await connect()).listTools();
    const names = new Set(tools.map((t) => t.name));
    const missing = TUTTE.flatMap((d) => d.tool.filter((t) => !names.has(t)).map((t) => `${t} in "${d.testo.slice(0, 40)}"`));
    expect(missing).toEqual([]);
  });

  it('temi con slug unici, almeno 5 domande ciascuno, nessuna domanda ripetuta', () => {
    expect(new Set(TEMI.map((t) => t.slug)).size).toBe(TEMI.length);
    expect(TEMI.every((t) => t.domande.length >= 5)).toBe(true);
    expect(new Set(TUTTE.map((d) => d.testo)).size).toBe(TUTTE.length);
    expect(TUTTE.every((d) => d.fonti.length > 0 && d.tool.length > 0 && d.risposta)).toBe(true);
  });

  it('esposto come risorse MCP: un indice e una risorsa per tema, in Markdown', async () => {
    const client = await connect();
    const { resources } = await client.listResources();
    expect(resources.map((r) => r.uri).sort()).toEqual(['seomcp://domande', 'seomcp://prompt', ...TEMI.map((t) => `seomcp://domande/${t.slug}`)].sort());
    const indice = await client.readResource({ uri: 'seomcp://domande' });
    const text = (indice.contents[0] as { text: string }).text;
    expect(text).toContain(`${TUTTE.length} spunti`);
    expect(text).toContain('seomcp://domande/geo-aeo');
    const tema = await client.readResource({ uri: 'seomcp://domande/bing' });
    expect((tema.contents[0] as { text: string; mimeType: string }).mimeType).toBe('text/markdown');
  });

  it('i file in domande/ sono allineati ai dati (rigenera con npm run domande)', () => {
    for (const t of TEMI) {
      const file = readFileSync(join(import.meta.dirname, '..', 'domande', `${t.slug}.md`), 'utf8');
      expect(file.startsWith(temaMarkdown(t))).toBe(true);
    }
  });

  it('la guida ai prompt copre tutti i prompt registrati, una volta sola e con lo stesso titolo', async () => {
    const { prompts } = await (await connect()).listPrompts();
    const guida = PROMPT_GUIDE.flatMap((c) => c.prompt);
    expect(guida.map((p) => p.nome).sort()).toEqual(prompts.map((p) => p.name).sort());
    for (const p of guida) expect(p.titolo, p.nome).toBe(prompts.find((x) => x.name === p.nome)?.title);
  });

  it('seomcp_guida restituisce i prompt per categoria, anche filtrati', async () => {
    const client = await connect();
    const all = JSON.parse(((await client.callTool({ name: 'seomcp_guida', arguments: {} })).content as Array<{ text: string }>)[0]!.text);
    expect(all.categorie.map((c: { slug: string }) => c.slug)).toEqual(PROMPT_GUIDE.map((c) => c.slug));
    expect(all.categorie.flatMap((c: { prompt: unknown[] }) => c.prompt).length).toBe(18);
    const one = JSON.parse(((await client.callTool({ name: 'seomcp_guida', arguments: { categoria: 'capire-i-dati' } })).content as Array<{ text: string }>)[0]!.text);
    expect(one.categorie).toHaveLength(1);
    expect(one.categorie[0].prompt[0].chiedi_cosi).toMatch(/\?/);
  });
});
