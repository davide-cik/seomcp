import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { describe, expect, it } from 'vitest';
import { SeoMcpError } from '../src/core/errors.js';
import { TEMI, TUTTE, temaMarkdown } from '../src/library/domande.js';
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
    expect(resources.map((r) => r.uri).sort()).toEqual(['seomcp://domande', ...TEMI.map((t) => `seomcp://domande/${t.slug}`)].sort());
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
});
