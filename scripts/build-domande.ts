/**
 * Genera domande/ sul repository dall'archivio in src/library/domande.ts,
 * la stessa fonte delle risorse MCP. Uso: npm run domande
 */
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { TEMI, indiceMarkdown, temaMarkdown } from '../src/library/domande.js';

const dir = join(import.meta.dirname, '..', 'domande');
mkdirSync(dir, { recursive: true });
const attesi = new Set(['README.md', ...TEMI.map((t) => `${t.slug}.md`)]);
for (const f of readdirSync(dir)) if (!attesi.has(f)) rmSync(join(dir, f));

const nota = (s: string) =>
  `${s}\n---\n\nQuesto file è generato da \`src/library/domande.ts\` con \`npm run domande\`: modifica lì le domande. In seomcp le stesse domande sono disponibili come risorse MCP (\`seomcp://domande\`).\n`;
writeFileSync(join(dir, 'README.md'), nota(indiceMarkdown((t) => `${t.slug}.md`)));
for (const t of TEMI) writeFileSync(join(dir, `${t.slug}.md`), nota(temaMarkdown(t)));
console.log(`domande/: indice + ${TEMI.length} temi`);
