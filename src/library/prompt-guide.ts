/**
 * Guida ai prompt divisa per obiettivo, come la Prompt Guide di Bing Webmaster Tools.
 * MCP non ha un campo "categoria" per i prompt: questa guida, esposta come risorsa
 * seomcp://prompt, dà all'utente e all'assistente l'elenco ordinato. Un test verifica che
 * copra tutti i prompt registrati, con gli stessi titoli.
 */

export interface PromptCategory {
  slug: string;
  titolo: string;
  intro: string;
  prompt: Array<{ nome: string; titolo: string; serve: string }>;
}

export const PROMPT_GUIDE: PromptCategory[] = [
  {
    slug: 'capire-i-dati',
    titolo: 'Capire i dati',
    intro: 'Cosa sta succedendo al sito: andamento, cali, conversioni, confronto tra motori e domande degli utenti.',
    prompt: [
      { nome: 'calo-traffico', titolo: 'Perché sto perdendo traffico?', serve: 'Search Console' },
      { nome: 'report-mensile', titolo: 'Report mensile per il cliente', serve: 'Search Console, Analytics' },
      { nome: 'traffico-che-non-converte', titolo: 'Traffico che non converte', serve: 'Search Console, Analytics' },
      { nome: 'google-vs-bing', titolo: 'Google e Bing a confronto', serve: 'Search Console, Bing' },
      { nome: 'domande-utenti', titolo: 'Rispondo alle domande dei miei utenti?', serve: 'Search Console' },
    ],
  },
  {
    slug: 'migliorare',
    titolo: 'Migliorare i risultati',
    intro: 'Dove si guadagna di più con meno lavoro: posizioni, CTR, contenuti in concorrenza, velocità e nuovi contenuti.',
    prompt: [
      { nome: 'opportunita-distanza-di-tiro', titolo: 'Opportunità a distanza di tiro', serve: 'Search Console' },
      { nome: 'title-description-ctr', titolo: 'Title e description che non convincono', serve: 'Search Console' },
      { nome: 'cannibalizzazione', titolo: 'Pagine in concorrenza tra loro', serve: 'Search Console' },
      { nome: 'piano-core-web-vitals', titolo: 'Piano per i Core Web Vitals', serve: 'API key Google' },
      { nome: 'piano-editoriale-ai', titolo: 'Piano editoriale per le risposte AI', serve: 'Search Console' },
    ],
  },
  {
    slug: 'farsi-citare',
    titolo: 'Farsi citare dalle AI',
    intro: 'GEO e AEO: farsi leggere, capire e citare da ChatGPT, Perplexity, Gemini e dalle AI Overviews di Google.',
    prompt: [
      { nome: 'audit-geo-pagina', titolo: 'Audit GEO della pagina', serve: 'nessuna credenziale' },
      { nome: 'sito-aperto-alle-ai', titolo: 'Il mio sito è aperto alle AI?', serve: 'nessuna credenziale' },
      { nome: 'confronto-concorrenti', titolo: 'Perché citano loro e non me?', serve: 'nessuna credenziale' },
      { nome: 'passaggio-citabile', titolo: 'Rendi citabile questo passaggio', serve: 'nessuna credenziale' },
    ],
  },
  {
    slug: 'controlli',
    titolo: 'Controlli e correzioni',
    intro: 'Verifiche tecniche con la lista delle correzioni pronta: prima di pubblicare, dopo una migrazione, quando qualcosa non torna.',
    prompt: [
      { nome: 'audit-tecnico', titolo: 'Audit tecnico del sito', serve: 'nessuna credenziale' },
      { nome: 'correggi-dati-strutturati', titolo: 'Correggi i miei dati strutturati', serve: 'nessuna credenziale' },
      { nome: 'controllo-migrazione', titolo: 'Controllo dopo una migrazione', serve: 'Search Console' },
    ],
  },
];

export function promptGuideMarkdown(): string {
  const total = PROMPT_GUIDE.reduce((n, c) => n + c.prompt.length, 0);
  const cats = PROMPT_GUIDE.map(
    (c) => `## ${c.titolo}\n\n${c.intro}\n\n${c.prompt.map((p) => `- **${p.titolo}** (\`${p.nome}\`) — serve: ${p.serve}`).join('\n')}`,
  ).join('\n\n');
  return `# Guida ai prompt di seomcp

${total} analisi già impostate, divise per obiettivo. Si richiamano dal menu dei prompt dell'assistente (in Claude Code: /mcp__seomcp__<nome>); se l'assistente non mostra i prompt, basta chiedere la stessa cosa a parole.
Per domande più brevi c'è l'archivio seomcp://domande.

${cats}
`;
}
