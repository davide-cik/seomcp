import { describe, expect, it } from 'vitest';
import { aggregateQuestions, isQuestionQuery, keyTerms, questionRegex, questionType } from '../src/core/aeo.js';
import { gulpease } from '../src/core/html.js';

describe('domande da Search Console', () => {
  it('riconosce le query a domanda, anche con accenti e in inglese', () => {
    for (const q of ['come scegliere le scarpe', 'scarpe da trekking come sceglierle', 'perché il pane non lievita', 'quanto costa un sito', "cos'è la seo", 'si può congelare il pane', 'differenza tra seo e sem', 'how to tie a knot', 'zaino 30 litri?', 'can dogs eat grapes'])
      expect(isQuestionQuery(q), q).toBe(true);
    for (const q of ['scarpe trekking', 'chiave inglese', 'comete e asteroidi', 'quantum computing'])
      expect(isQuestionQuery(q), q).toBe(false);
  });

  it("l'espressione per Search Console è valida per RE2 (niente \\b, flag (?i))", () => {
    const re = questionRegex();
    expect(re.startsWith('(?i)')).toBe(true);
    expect(re).not.toContain('\\b');
    expect(() => new RegExp(re.replace('(?i)', ''), 'iu')).not.toThrow();
  });

  it('classifica il tipo di domanda', () => {
    expect(questionType('come fare il pane')).toBe('come');
    expect(questionType('quanto costa un sito')).toBe('quanto');
    expect(questionType('differenza tra seo e sem')).toBe('differenza');
    expect(questionType('qual è il miglior zaino')).toBe('quale');
    expect(questionType('si può congelare il pane')).toBe('sì/no');
    expect(questionType('what is seo')).toBe('cosa');
  });

  it('raggruppa per domanda, tipo e pagina, con le pagine in concorrenza', () => {
    const row = (query: string, page: string, impressions: number, clicks: number, position: number) => ({ keys: { query, page }, impressions, clicks, ctr: clicks / impressions, position });
    const out = aggregateQuestions([
      row('come scegliere scarpe', '/guida/', 900, 30, 5),
      row('come scegliere scarpe', '/blog/scarpe/', 100, 2, 15),
      row('quanto costa un sito', '/prezzi/', 400, 40, 3),
      row('scarpe trekking', '/scarpe/', 5000, 300, 2),
      row('dove comprare', '/negozi/', 5, 0, 30),
    ], 10);
    expect(out.questions.map((q) => q.query)).toEqual(['come scegliere scarpe', 'quanto costa un sito']);
    expect(out.questions[0]).toMatchObject({ type: 'come', page: '/guida/', impressions: 1000, clicks: 32, otherPages: 1, position: 6 });
    expect(out.byType[0]).toMatchObject({ type: 'come', queries: 1, impressions: 1000 });
    expect(out.byType[0]?.bestFormat).toContain('passaggi');
    expect(out.pages[0]).toMatchObject({ page: '/guida/', questions: 1 });
  });
});

describe('risposte', () => {
  it('riduce la domanda alle parole chiave, con radici comuni', () => {
    expect(keyTerms("Come si crea un token Cloudflare?")).toEqual(keyTerms('creare il token di cloudflare'));
    expect(keyTerms("cos'è la SEO")).toEqual(['seo']);
  });

  it('calcola il Gulpease e rifiuta i testi troppo brevi', () => {
    expect(gulpease('Testo breve.')).toBeNull();
    const facile = 'Il gatto dorme. Il cane gioca. La casa è bella. Il sole è caldo. Noi siamo qui. Tu sei là. Io vado via. Lei ride.';
    const difficile = 'La straordinaria complessità dell\'interoperabilità infrastrutturale determina conseguentemente un\'imprescindibile riorganizzazione metodologica delle procedure amministrative, organizzative e documentali dell\'ente.';
    expect(gulpease(facile)!).toBeGreaterThan(80);
    expect(gulpease(`${difficile} ${difficile}`)!).toBeLessThan(40);
  });
});
