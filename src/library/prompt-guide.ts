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
  prompt: Array<{ nome: string; titolo: string; serve: string; chiedi: string }>;
}

export const PROMPT_GUIDE: PromptCategory[] = [
  {
    slug: 'capire-i-dati',
    titolo: 'Capire i dati',
    intro: 'Cosa sta succedendo al sito: andamento, cali, conversioni, confronto tra motori e domande degli utenti.',
    prompt: [
      { nome: 'calo-traffico', titolo: 'Perché sto perdendo traffico?', serve: 'Search Console', chiedi: 'Perché il sito ha perso clic nelle ultime 4 settimane? Dimmi quali pagine e la causa più probabile.' },
      { nome: 'report-mensile', titolo: 'Report mensile per il cliente', serve: 'Search Console, Analytics', chiedi: 'Preparami il report del mese scorso per il cliente, comprensibile per chi non fa SEO.' },
      { nome: 'traffico-che-non-converte', titolo: 'Traffico che non converte', serve: 'Search Console, Analytics', chiedi: 'Quali pagine ricevono molti clic da Google ma convertono poco, e perché?' },
      { nome: 'google-vs-bing', titolo: 'Google e Bing a confronto', serve: 'Search Console, Bing', chiedi: 'Dove vado bene su Google e male su Bing, e il contrario?' },
      { nome: 'domande-utenti', titolo: 'Rispondo alle domande dei miei utenti?', serve: 'Search Console', chiedi: 'Quali domande fanno le persone che arrivano su questa pagina, e a quali non rispondo?' },
    ],
  },
  {
    slug: 'migliorare',
    titolo: 'Migliorare i risultati',
    intro: 'Dove si guadagna di più con meno lavoro: posizioni, CTR, contenuti in concorrenza, velocità e nuovi contenuti.',
    prompt: [
      { nome: 'opportunita-distanza-di-tiro', titolo: 'Opportunità a distanza di tiro', serve: 'Search Console', chiedi: 'Quali pagine sono quasi in prima pagina e cosa aggiungo a ciascuna per salire?' },
      { nome: 'title-description-ctr', titolo: 'Title e description che non convincono', serve: 'Search Console', chiedi: 'Quali pagine hanno un CTR troppo basso per la loro posizione? Riscrivimi title e description.' },
      { nome: 'cannibalizzazione', titolo: 'Pagine in concorrenza tra loro', serve: 'Search Console', chiedi: 'Ci sono query per cui più pagine del sito si fanno concorrenza?' },
      { nome: 'piano-core-web-vitals', titolo: 'Piano per i Core Web Vitals', serve: 'API key Google', chiedi: 'Il sito supera i Core Web Vitals? Fammi un piano per migliorarli.' },
      { nome: 'piano-editoriale-ai', titolo: 'Piano editoriale per le risposte AI', serve: 'Search Console', chiedi: 'Fammi un piano editoriale con le domande degli utenti a cui il sito non risponde ancora.' },
    ],
  },
  {
    slug: 'farsi-citare',
    titolo: 'Farsi citare dalle AI',
    intro: 'GEO e AEO: farsi leggere, capire e citare da ChatGPT, Perplexity, Gemini e dalle AI Overviews di Google.',
    prompt: [
      { nome: 'audit-geo-pagina', titolo: 'Audit GEO della pagina', serve: 'nessuna credenziale', chiedi: 'Analizza questa pagina dal punto di vista GEO: cosa cambio per farmi citare dalle AI?' },
      { nome: 'sito-aperto-alle-ai', titolo: 'Il mio sito è aperto alle AI?', serve: 'nessuna credenziale', chiedi: 'Quali crawler AI possono leggere il mio sito? E quali sto bloccando senza volerlo?' },
      { nome: 'confronto-concorrenti', titolo: 'Perché citano loro e non me?', serve: 'nessuna credenziale', chiedi: 'Perché ChatGPT cita la pagina del mio concorrente e non la mia? Confronta le due pagine.' },
      { nome: 'passaggio-citabile', titolo: 'Rendi citabile questo passaggio', serve: 'nessuna credenziale', chiedi: 'Riscrivi questa sezione perché un assistente AI possa citarla da sola.' },
    ],
  },
  {
    slug: 'controlli',
    titolo: 'Controlli e correzioni',
    intro: 'Verifiche tecniche con la lista delle correzioni pronta: prima di pubblicare, dopo una migrazione, quando qualcosa non torna.',
    prompt: [
      { nome: 'audit-tecnico', titolo: 'Audit tecnico del sito', serve: 'nessuna credenziale', chiedi: 'Fai un audit tecnico del sito e dimmi le cinque correzioni più urgenti.' },
      { nome: 'correggi-dati-strutturati', titolo: 'Correggi i miei dati strutturati', serve: 'nessuna credenziale', chiedi: 'Valida i dati strutturati di questa pagina e dammi il JSON-LD corretto.' },
      { nome: 'controllo-migrazione', titolo: 'Controllo dopo una migrazione', serve: 'Search Console', chiedi: 'Ho appena migrato il sito: controlla redirect, canonical, sitemap e indicizzazione delle pagine principali.' },
    ],
  },
];

export function promptGuideMarkdown(): string {
  const total = PROMPT_GUIDE.reduce((n, c) => n + c.prompt.length, 0);
  const cats = PROMPT_GUIDE.map(
    (c) => `## ${c.titolo}\n\n${c.intro}\n\n${c.prompt.map((p) => `- **${p.titolo}** (\`${p.nome}\`) — serve: ${p.serve}\n  Oppure chiedi: «${p.chiedi}»`).join('\n')}`,
  ).join('\n\n');
  return `# Guida ai prompt di seomcp

${total} analisi già impostate, divise per obiettivo. Si richiamano dal menu dei prompt dell'assistente (in Claude Code: /mcp__seomcp__<nome>); se l'assistente non mostra i prompt, basta chiedere la stessa cosa a parole.
Per domande più brevi c'è l'archivio seomcp://domande.

${cats}
`;
}
