import { describe, expect, it } from 'vitest';
import { isSubtypeOf, parseJsonLdInput, validateJsonLd, VOCABULARY_VERSION } from '../src/core/schema-validate.js';

const ctx = 'https://schema.org';
const validate = (obj: unknown, pc = {}) => validateJsonLd([obj], 0, pc);
const find = (r: ReturnType<typeof validate>, text: string) => r.issues.find((i) => i.message.includes(text));

describe('vocabolario schema.org', () => {
  it('versione inclusa e gerarchia dei tipi', () => {
    expect(VOCABULARY_VERSION).toMatch(/^\d+\.\d+$/);
    expect(isSubtypeOf('Restaurant', 'LocalBusiness')).toBe(true);
    expect(isSubtypeOf('Restaurant', 'Organization')).toBe(true);
    expect(isSubtypeOf('Recipe', 'HowTo')).toBe(true);
    expect(isSubtypeOf('Person', 'Organization')).toBe(false);
  });

  it('tipo e proprietà inesistenti, con correzione suggerita', () => {
    const r = validate({ '@context': ctx, '@type': 'Prodcut', name: 'X', descripton: 'y' });
    expect(find(r, '"Prodcut" non esiste')).toMatchObject({ severity: 'errore', suggestion: 'Forse intendevi "Product"?' });
    expect(find(r, '"descripton" non esiste')?.suggestion).toBe('Forse intendevi "description"?');
  });

  it('proprietà non prevista per il tipo (considerando l\'ereditarietà)', () => {
    const r = validate({ '@context': ctx, '@type': 'Person', name: 'Anna', recipeIngredient: 'farina', url: 'https://a.it' });
    expect(find(r, '"recipeIngredient" non è prevista per Person')?.severity).toBe('avviso');
    expect(find(r, '"url"')).toBeUndefined();
  });

  it('termini superati', () => {
    const r = validate({ '@context': ctx, '@type': 'Product', name: 'X', reviews: [] });
    expect(find(r, '"reviews" è superata')?.suggestion).toBe('Usa "review".');
  });

  it('annotazioni delle azioni (query-input) accettate', () => {
    const r = validate({ '@context': ctx, '@type': 'WebSite', url: 'https://a.it', potentialAction: { '@type': 'SearchAction', target: 'https://a.it/?s={q}', 'query-input': 'required name=q' } });
    expect(r.summary.errors).toBe(0);
  });
});

describe('formato dei valori', () => {
  it('date: errore se non ISO, avviso se c\'è lo spazio al posto della T', () => {
    const r = validate({ '@context': ctx, '@type': 'Article', headline: 'A', datePublished: '28/09/2026', dateModified: '2026-09-28 10:00:00' });
    expect(find(r, 'trovato "28/09/2026"')?.severity).toBe('errore');
    expect(find(r, 'usa uno spazio')).toMatchObject({ severity: 'avviso', suggestion: 'Scrivi "2026-09-28T10:00:00".' });
  });

  it('enumerazioni: nome o URL del valore', () => {
    const ok = validate({ '@context': ctx, '@type': 'Offer', price: 10, priceCurrency: 'EUR', availability: 'https://schema.org/InStock' });
    expect(find(ok, 'non è un valore previsto')).toBeUndefined();
    const bad = validate({ '@context': ctx, '@type': 'Offer', availability: 'Disponibile' });
    expect(find(bad, '"Disponibile" non è un valore previsto')?.suggestion).toContain('InStock');
  });

  it('numeri ammessi per le grandezze (width in pixel), non per un testo come nome di persona', () => {
    const r = validate({ '@context': ctx, '@type': 'ImageObject', url: 'https://a.it/x.jpg', width: 1200, height: 630 });
    expect(r.summary.warnings).toBe(0);
    const p = validate({ '@context': ctx, '@type': 'Product', name: 'X', brand: 42 });
    expect(find(p, '"brand" è un numero')?.severity).toBe('avviso');
  });

  it('tipo del valore annidato non compatibile', () => {
    const r = validate({ '@context': ctx, '@type': 'Article', headline: 'A', author: { '@type': 'Place', name: 'Roma' } });
    expect(find(r, 'Valore di tipo Place')?.severity).toBe('avviso');
  });

  it('URL relativi segnalati', () => {
    const r = validate({ '@context': ctx, '@type': 'Organization', name: 'X', logo: '/logo.png' });
    expect(find(r, 'URL assoluto')).toBeDefined();
  });
});

describe('sintassi e struttura', () => {
  it('@context mancante o sbagliato, @type mancante, JSON non valido', () => {
    expect(find(validate({ '@type': 'Thing', name: 'x' }), '@context mancante')?.severity).toBe('avviso');
    expect(find(validate({ '@context': 'https://esempio.it', '@type': 'Thing' }), 'non punta a schema.org')?.severity).toBe('errore');
    expect(find(validate({ '@context': ctx, name: 'x' }), 'Manca @type')?.severity).toBe('errore');
    expect(validateJsonLd([], 1).summary.errors).toBe(1);
  });

  it('@graph e riferimenti @id', () => {
    const r = validate({
      '@context': ctx,
      '@graph': [
        { '@type': 'Organization', '@id': 'https://a.it/#org', name: 'A' },
        { '@type': 'WebSite', url: 'https://a.it', publisher: { '@id': 'https://a.it/#org' }, about: { '@id': 'https://a.it/#manca' } },
      ],
    });
    expect(r.topLevelItems).toHaveLength(2);
    expect(r.issues.filter((i) => i.message.includes('non definito'))).toHaveLength(1);
  });

  it('JSON-LD incollato con più <script>', () => {
    const { blocks, parseErrors } = parseJsonLdInput('<script type="application/ld+json">{"@type":"Thing"}</script>\n<script type="application/ld+json">{ rotto }</script>');
    expect(blocks).toHaveLength(1);
    expect(parseErrors).toBe(1);
  });
});

describe('coerenza con la pagina', () => {
  it('dateModified precedente a datePublished', () => {
    const r = validate({ '@context': ctx, '@type': 'Article', headline: 'A', datePublished: '2026-05-01', dateModified: '2026-01-01' });
    expect(find(r, 'precedente a datePublished')?.severity).toBe('errore');
  });

  it('domande FAQ non visibili nella pagina', () => {
    const faq = { '@context': ctx, '@type': 'FAQPage', mainEntity: [
      { '@type': 'Question', name: 'Quanto costa la spedizione?', acceptedAnswer: { '@type': 'Answer', text: 'Gratis' } },
      { '@type': 'Question', name: 'Posso restituire un prodotto?', acceptedAnswer: { '@type': 'Answer', text: 'Sì' } },
    ] };
    const r = validate(faq, { visibleText: 'Domande frequenti. Quanto costa la spedizione? È gratuita.' });
    const issues = r.issues.filter((i) => i.message.includes('non compare nel testo visibile'));
    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toContain('restituire');
  });
});

describe('requisiti Google per i risultati avanzati', () => {
  it('prodotto: obbligatorie con alternative', () => {
    const noOffers = validate({ '@context': ctx, '@type': 'Product', name: 'Scarpa' });
    expect(noOffers.richResults[0]).toMatchObject({ feature: 'Snippet prodotto', eligible: false, missingRequired: ['review|aggregateRating|offers'] });
    const ok = validate({ '@context': ctx, '@type': 'Product', name: 'Scarpa', offers: { '@type': 'Offer', price: 49, priceCurrency: 'EUR' } });
    expect(ok.richResults.find((c) => c.feature === 'Snippet prodotto')?.eligible).toBe(true);
  });

  it('vale la regola più specifica: Recipe non anche HowTo, Restaurant non anche Organization', () => {
    const recipe = validate({ '@context': ctx, '@type': 'Recipe', name: 'Carbonara', image: 'https://a.it/c.jpg' });
    expect(recipe.richResults.map((c) => c.feature)).toEqual(['Ricetta']);
    const rest = validate({ '@context': ctx, '@type': 'Restaurant', name: 'Da Mario' });
    expect(rest.richResults.map((c) => c.feature)).toEqual(['Attività locale']);
    expect(rest.richResults[0]?.missingRequired).toEqual(['address']);
  });

  it('elenchi: ogni elemento del breadcrumb deve avere le proprietà', () => {
    const r = validate({ '@context': ctx, '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://a.it/' },
      { '@type': 'ListItem', position: 2 },
    ] });
    expect(r.richResults[0]?.missingRequired).toEqual(['itemListElement.name']);
  });

  it('segnalazioni e risultati ripetuti vengono raggruppati', () => {
    const reviews = Array.from({ length: 5 }, () => ({ '@type': 'Review', author: { '@type': 'Person', name: 'A' }, reviewRating: { '@type': 'Rating', ratingValue: 5 }, reviewBody: '' }));
    const r = validate({ '@context': ctx, '@type': 'Product', name: 'X', review: reviews });
    expect(find(r, '"reviewBody" è vuota')?.count).toBe(5);
    expect(r.richResults.find((c) => c.feature === 'Recensione')).toMatchObject({ count: 5, eligibleCount: 5 });
  });
});
