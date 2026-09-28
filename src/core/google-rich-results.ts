/**
 * Requisiti di Google per i risultati avanzati, trascritti dalla documentazione
 * ufficiale (developers.google.com/search/docs/appearance/structured-data).
 * Aggiornati a settembre 2026: Google li modifica, quindi ogni regola porta il link alla fonte.
 *
 * Un percorso con il punto (es. "offers.price") indica una proprietà di un oggetto annidato.
 * Un'alternativa con "|" (es. "review|aggregateRating|offers") è soddisfatta da una qualsiasi.
 */

export interface RichResultRule {
  feature: string;
  /** Tipo schema.org: la regola vale anche per i sottotipi (es. Restaurant per LocalBusiness). */
  type: string;
  required: string[];
  recommended: string[];
  docs: string;
  note?: string;
  /** Solo per gli oggetti principali della pagina, non per quelli annidati (es. l'editore di una recensione). */
  topLevelOnly?: boolean;
}

const DOCS = 'https://developers.google.com/search/docs/appearance/structured-data/';

export const RICH_RESULT_RULES: RichResultRule[] = [
  {
    feature: 'Articolo',
    type: 'Article',
    required: [],
    recommended: ['headline', 'image', 'datePublished', 'dateModified', 'author', 'author.name', 'author.url'],
    docs: `${DOCS}article`,
    note: 'Per gli articoli Google non ha proprietà obbligatorie: quelle consigliate migliorano la comprensione della pagina.',
  },
  {
    feature: 'Breadcrumb',
    type: 'BreadcrumbList',
    required: ['itemListElement', 'itemListElement.position', 'itemListElement.name'],
    recommended: ['itemListElement.item'],
    docs: `${DOCS}breadcrumb`,
  },
  {
    feature: 'Snippet prodotto',
    type: 'Product',
    required: ['name', 'review|aggregateRating|offers'],
    recommended: ['image', 'description', 'brand', 'offers.price', 'offers.priceCurrency', 'offers.availability', 'aggregateRating.ratingValue'],
    docs: `${DOCS}product-snippet`,
  },
  {
    feature: 'Valutazioni aggregate',
    type: 'AggregateRating',
    required: ['ratingValue', 'ratingCount|reviewCount'],
    recommended: ['bestRating', 'worstRating'],
    docs: `${DOCS}review-snippet`,
  },
  {
    feature: 'Recensione',
    type: 'Review',
    required: ['author', 'reviewRating', 'reviewRating.ratingValue'],
    recommended: ['datePublished', 'reviewRating.bestRating'],
    docs: `${DOCS}review-snippet`,
  },
  {
    feature: 'Organizzazione',
    type: 'Organization',
    required: [],
    recommended: ['name', 'url', 'logo', 'sameAs', 'address', 'contactPoint', 'description'],
    docs: `${DOCS}organization`,
    topLevelOnly: true,
  },
  {
    feature: 'Attività locale',
    type: 'LocalBusiness',
    required: ['name', 'address'],
    recommended: ['telephone', 'url', 'geo', 'openingHoursSpecification', 'image', 'priceRange', 'aggregateRating'],
    docs: `${DOCS}local-business`,
  },
  {
    feature: 'Evento',
    type: 'Event',
    required: ['name', 'startDate', 'location'],
    recommended: ['description', 'endDate', 'eventStatus', 'eventAttendanceMode', 'image', 'offers', 'organizer', 'performer'],
    docs: `${DOCS}event`,
  },
  {
    feature: 'Ricetta',
    type: 'Recipe',
    required: ['name', 'image'],
    recommended: ['author', 'datePublished', 'description', 'recipeIngredient', 'recipeInstructions', 'recipeYield', 'totalTime', 'nutrition.calories', 'aggregateRating', 'keywords', 'recipeCategory', 'recipeCuisine'],
    docs: `${DOCS}recipe`,
  },
  {
    feature: 'Video',
    type: 'VideoObject',
    required: ['name', 'thumbnailUrl', 'uploadDate'],
    recommended: ['description', 'duration', 'contentUrl', 'embedUrl'],
    docs: `${DOCS}video`,
  },
  {
    feature: 'FAQ',
    type: 'FAQPage',
    required: ['mainEntity', 'mainEntity.name', 'mainEntity.acceptedAnswer', 'mainEntity.acceptedAnswer.text'],
    recommended: [],
    docs: `${DOCS}faqpage`,
    note: 'Dal 2023 Google mostra i risultati FAQ solo per siti governativi e sanitari autorevoli. Il markup resta utile per la comprensione dei contenuti, anche da parte dei motori AI.',
  },
  {
    feature: 'HowTo',
    type: 'HowTo',
    required: ['name', 'step'],
    recommended: [],
    docs: `${DOCS}how-to`,
    note: 'Google non mostra più i risultati avanzati HowTo (2023).',
  },
  {
    feature: 'App software',
    type: 'SoftwareApplication',
    required: ['name', 'offers.price|aggregateRating|review'],
    recommended: ['applicationCategory', 'operatingSystem'],
    docs: `${DOCS}software-app`,
  },
  {
    feature: 'Offerta di lavoro',
    type: 'JobPosting',
    required: ['title', 'description', 'datePosted', 'hiringOrganization', 'jobLocation|applicantLocationRequirements'],
    recommended: ['validThrough', 'employmentType', 'baseSalary', 'identifier', 'directApply'],
    docs: `${DOCS}job-posting`,
  },
];
