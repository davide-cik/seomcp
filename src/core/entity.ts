import { SeoMcpError } from './errors.js';
import { fetchPage, type FetchOptions } from './fetch-page.js';
import { jsonLdNodes } from './geo.js';
import { extractPage } from './html.js';

/**
 * Il brand è un'entità riconosciuta? Wikidata (pubblica, senza credenziali) e Google Knowledge Graph
 * (con la stessa API key di PageSpeed), più i collegamenti sameAs dichiarati nei dati strutturati del sito.
 * Per farsi citare dalle AI conta che il sito sia associato a un'entità chiara e coerente.
 */

export const WIKIDATA_API = 'https://www.wikidata.org/w/api.php';
export const KG_API = 'https://kgsearch.googleapis.com/v1/entities:search';

const ORG_TYPES = ['Organization', 'Corporation', 'LocalBusiness', 'OnlineStore', 'NewsMediaOrganization', 'EducationalOrganization', 'Person', 'Brand', 'Store', 'Restaurant', 'ProfessionalService'];

export interface EntityOptions {
  /** API key Google con la Knowledge Graph Search API abilitata (facoltativa). */
  googleApiKey?: string;
  /** Lingua di etichette e descrizioni, es. "it". */
  language?: string;
  /** Opzioni per scaricare la pagina del sito (user agent, protezione SSRF). */
  fetchOptions?: FetchOptions;
  /** Per i test. */
  fetch?: typeof fetch;
  timeoutMs?: number;
}

export interface WikidataEntity {
  id: string;
  url: string;
  label: string;
  description: string;
  instanceOf: string[];
  officialWebsites: string[];
  /** Il sito ufficiale dichiarato su Wikidata è il sito analizzato. */
  matchesSite: boolean;
  wikipedia: Record<string, string>;
  sitelinks: number;
  /** Profili collegati (proprietà Wikidata più comuni per i brand). */
  profiles: Record<string, string>;
  foundBy: Array<'nome' | 'sito ufficiale'>;
}

export interface KnowledgeGraphEntity {
  id: string;
  name: string;
  types: string[];
  description: string;
  detailedDescription?: { text: string; url: string };
  url?: string;
  matchesSite: boolean;
  resultScore: number;
}

export interface SiteEntityMarkup {
  url: string;
  entities: Array<{ type: string; name: string; sameAs: string[]; linksWikidata: boolean; linksWikipedia: boolean }>;
}

export interface EntityReport {
  query: string;
  site?: string;
  wikidata: { entities: WikidataEntity[]; error?: string };
  knowledgeGraph: { entities: KnowledgeGraphEntity[]; error?: string; skipped?: string };
  siteMarkup?: SiteEntityMarkup & { error?: string };
  summary: {
    wikidataEntityForSite: string | null;
    knowledgeGraphEntityForSite: string | null;
    sameAsToWikidata: boolean;
    sameAsMatchesWikidataEntity: boolean;
  };
}

/** Proprietà Wikidata che collegano un'entità ai suoi profili. */
const PROFILE_PROPS: Record<string, string> = {
  P2002: 'X/Twitter',
  P2013: 'Facebook',
  P2003: 'Instagram',
  P4264: 'LinkedIn (azienda)',
  P6634: 'LinkedIn (persona)',
  P2397: 'YouTube',
  P7085: 'TikTok',
};

/** Host senza "www." e senza porta, per confrontare i siti. */
export function siteHost(url: string): string {
  try {
    return new URL(url.includes('://') ? url : `https://${url}`).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

/** Varianti dell'URL della home come può essere scritto in Wikidata (P856). */
export function websiteVariants(url: string): string[] {
  const host = siteHost(url);
  if (!host) return [];
  const out: string[] = [];
  for (const scheme of ['https', 'http']) {
    for (const h of [`www.${host}`, host]) {
      out.push(`${scheme}://${h}/`, `${scheme}://${h}`);
    }
  }
  return out;
}

export async function entityCheck(name: string | undefined, siteUrl: string | undefined, opts: EntityOptions = {}): Promise<EntityReport> {
  if (!name && !siteUrl) throw new SeoMcpError('INVALID_INPUT', 'Indica il nome del brand, l\'URL del sito, o entrambi.');
  const language = (opts.language ?? 'it').slice(0, 2).toLowerCase();
  const host = siteUrl ? siteHost(siteUrl) : '';

  // 1. I dati strutturati del sito: nome dell'organizzazione e sameAs.
  let siteMarkup: EntityReport['siteMarkup'];
  if (siteUrl) {
    try {
      const page = await fetchPage(siteUrl, opts.fetchOptions);
      const extracted = extractPage(page.body, page.finalUrl);
      const entities = jsonLdNodes(extracted.jsonLd)
        .filter((n) => types(n).some((t) => ORG_TYPES.includes(t)))
        .map((n) => {
          const sameAs = strings(n.sameAs);
          return {
            type: types(n).join(', '),
            name: typeof n.name === 'string' ? n.name : '',
            sameAs,
            linksWikidata: sameAs.some((s) => /wikidata\.org\/(wiki|entity)\/Q\d+/i.test(s)),
            linksWikipedia: sameAs.some((s) => /wikipedia\.org\/wiki\//i.test(s)),
          };
        });
      siteMarkup = { url: page.finalUrl, entities };
    } catch (err) {
      siteMarkup = { url: siteUrl, entities: [], error: (err as Error).message };
    }
  }
  const query = name ?? siteMarkup?.entities.find((e) => e.name)?.name ?? host.split('.')[0] ?? '';

  // 2. Wikidata e Knowledge Graph in parallelo.
  const [wikidata, knowledgeGraph] = await Promise.all([
    wikidataLookup(query, siteUrl, language, opts).then(
      (entities) => ({ entities }),
      (err: Error) => ({ entities: [] as WikidataEntity[], error: err.message }),
    ),
    opts.googleApiKey
      ? knowledgeGraphLookup(query, host, language, opts).then(
          (entities) => ({ entities }),
          (err: Error) => ({ entities: [] as KnowledgeGraphEntity[], error: err.message }),
        )
      : Promise.resolve({
          entities: [] as KnowledgeGraphEntity[],
          skipped: 'Google Knowledge Graph non interrogato: serve una API key Google (SEOMCP_GOOGLE_API_KEY, la stessa di PageSpeed) con la Knowledge Graph Search API abilitata.',
        }),
  ]);

  const wdForSite = wikidata.entities.find((e) => e.matchesSite);
  const kgForSite = knowledgeGraph.entities.find((e) => e.matchesSite);
  const sameAs = siteMarkup?.entities.flatMap((e) => e.sameAs) ?? [];
  return {
    query,
    ...(siteUrl ? { site: siteUrl } : {}),
    wikidata,
    knowledgeGraph,
    ...(siteMarkup ? { siteMarkup } : {}),
    summary: {
      wikidataEntityForSite: wdForSite ? wdForSite.id : null,
      knowledgeGraphEntityForSite: kgForSite ? kgForSite.id : null,
      sameAsToWikidata: sameAs.some((s) => /wikidata\.org\/(wiki|entity)\/Q\d+/i.test(s)),
      sameAsMatchesWikidataEntity: !!wdForSite && sameAs.some((s) => new RegExp(`wikidata\\.org/(wiki|entity)/${wdForSite.id}$`, 'i').test(s.replace(/\/$/, ''))),
    },
  };
}

async function wikidataLookup(query: string, siteUrl: string | undefined, language: string, opts: EntityOptions): Promise<WikidataEntity[]> {
  const foundBy = new Map<string, Set<'nome' | 'sito ufficiale'>>();
  const mark = (id: string, how: 'nome' | 'sito ufficiale') => foundBy.set(id, (foundBy.get(id) ?? new Set()).add(how));

  // Poche richieste e in sequenza: Wikidata limita i client che ne fanno molte in parallelo.
  const variants = siteUrl ? websiteVariants(siteUrl) : [];
  const siteIds = variants.length
    ? await wikidataGet<{ query?: { search?: Array<{ title: string }> } }>(
        { action: 'query', list: 'search', srsearch: `haswbstatement:${variants.map((v) => `P856=${v}`).join('|')}`, srlimit: '3' },
        opts,
      ).then((r) => r.query?.search?.map((s) => s.title) ?? [])
    : [];
  const nameIds = query
    ? await wikidataGet<{ search?: Array<{ id: string }> }>({ action: 'wbsearchentities', search: query, language, uselang: language, type: 'item', limit: '5' }, opts).then((r) => r.search?.map((s) => s.id) ?? [])
    : [];
  for (const id of siteIds) mark(id, 'sito ufficiale');
  for (const id of nameIds) mark(id, 'nome');
  const ids = [...foundBy.keys()].slice(0, 8);
  if (!ids.length) return [];

  const langs = [...new Set([language, 'en'])].join('|');
  const data = await wikidataGet<{ entities?: Record<string, RawWdEntity> }>({ action: 'wbgetentities', ids: ids.join('|'), props: 'labels|descriptions|claims|sitelinks', languages: langs }, opts);
  const entities = ids.map((id) => data.entities?.[id]).filter((e): e is RawWdEntity => !!e && !e.missing);

  // Etichette dei tipi (P31: "istanza di").
  const typeIds = [...new Set(entities.flatMap((e) => claimIds(e, 'P31')))].slice(0, 50);
  const typeLabels = new Map<string, string>();
  if (typeIds.length) {
    const t = await wikidataGet<{ entities?: Record<string, RawWdEntity> }>({ action: 'wbgetentities', ids: typeIds.join('|'), props: 'labels', languages: langs }, opts).catch(() => ({ entities: {} as Record<string, RawWdEntity> }));
    for (const id of typeIds) typeLabels.set(id, label(t.entities?.[id], language) || id);
  }

  const host = siteUrl ? siteHost(siteUrl) : '';
  return entities.map((e) => {
    const websites = claimStrings(e, 'P856');
    const wikipedia: Record<string, string> = {};
    for (const lang of [...new Set([language, 'en'])]) {
      const title = e.sitelinks?.[`${lang}wiki`]?.title;
      if (title) wikipedia[lang] = `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;
    }
    const profiles: Record<string, string> = {};
    for (const [prop, platform] of Object.entries(PROFILE_PROPS)) {
      const v = claimStrings(e, prop)[0];
      if (v) profiles[platform] = v;
    }
    return {
      id: e.id,
      url: `https://www.wikidata.org/wiki/${e.id}`,
      label: label(e, language),
      description: e.descriptions?.[language]?.value ?? e.descriptions?.en?.value ?? '',
      instanceOf: claimIds(e, 'P31').map((id) => typeLabels.get(id) ?? id),
      officialWebsites: websites,
      matchesSite: !!host && websites.some((w) => siteHost(w) === host),
      wikipedia,
      sitelinks: Object.keys(e.sitelinks ?? {}).length,
      profiles,
      foundBy: [...(foundBy.get(e.id) ?? [])],
    };
  });
}

async function knowledgeGraphLookup(query: string, host: string, language: string, opts: EntityOptions): Promise<KnowledgeGraphEntity[]> {
  const url = new URL(KG_API);
  url.searchParams.set('query', query);
  url.searchParams.set('languages', language);
  url.searchParams.set('limit', '5');
  url.searchParams.set('key', opts.googleApiKey ?? '');
  let res: Response;
  try {
    res = await (opts.fetch ?? fetch)(url, { signal: AbortSignal.timeout(opts.timeoutMs ?? 20_000) });
  } catch (err) {
    throw new Error(`Knowledge Graph Search API non raggiungibile (${(err as Error).name}).`);
  }
  const body = (await res.json().catch(() => null)) as { itemListElement?: RawKgItem[]; error?: { message?: string } } | null;
  if (!res.ok) {
    // Mai riportare l'URL: contiene la API key.
    const msg = body?.error?.message ?? `HTTP ${res.status}`;
    if (/has not been used|is disabled|not enabled/i.test(msg)) {
      throw new Error('La Knowledge Graph Search API non è abilitata nel progetto della API key: abilitala in Google Cloud Console → API e servizi → Libreria → "Knowledge Graph Search API".');
    }
    if (/api key not valid|API_KEY_INVALID/i.test(msg)) throw new Error('API key Google non valida per la Knowledge Graph Search API.');
    throw new Error(`Errore dalla Knowledge Graph Search API: ${msg}`);
  }
  return (body?.itemListElement ?? []).map((item) => {
    const r = item.result ?? {};
    return {
      id: String(r['@id'] ?? '').replace(/^kg:/, ''),
      name: r.name ?? '',
      types: Array.isArray(r['@type']) ? r['@type'] : [],
      description: r.description ?? '',
      ...(r.detailedDescription ? { detailedDescription: { text: r.detailedDescription.articleBody ?? '', url: r.detailedDescription.url ?? '' } } : {}),
      ...(r.url ? { url: r.url } : {}),
      matchesSite: !!host && !!r.url && siteHost(r.url) === host,
      resultScore: Math.round((item.resultScore ?? 0) * 100) / 100,
    };
  });
}

async function wikidataGet<T>(params: Record<string, string>, opts: EntityOptions): Promise<T> {
  const url = new URL(WIKIDATA_API);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set('format', 'json');
  let res: Response | undefined;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      // Wikidata chiede uno user agent che identifichi il client.
      res = await (opts.fetch ?? fetch)(url, {
        headers: { 'User-Agent': opts.fetchOptions?.userAgent ?? 'seomcp (+https://seomcp.contentisking.guru)', Accept: 'application/json' },
        signal: AbortSignal.timeout(opts.timeoutMs ?? 20_000),
      });
    } catch (err) {
      throw new Error(`Wikidata non raggiungibile (${(err as Error).name}).`);
    }
    if (res.status !== 429 || attempt === 1) break;
    // Troppe richieste: si aspetta quanto chiede (al massimo 5 secondi) e si riprova una volta.
    const wait = Math.min(Number(res.headers.get('retry-after')) || 2, 5);
    await new Promise((r) => setTimeout(r, wait * 1000));
  }
  if (!res?.ok) throw new Error(res?.status === 429 ? 'Wikidata sta limitando le richieste: riprova tra qualche minuto.' : `Wikidata ha risposto HTTP ${res?.status}.`);
  const body = (await res.json()) as T & { error?: { info?: string } };
  if (body.error) throw new Error(`Errore da Wikidata: ${body.error.info ?? 'sconosciuto'}`);
  return body;
}

interface RawWdEntity {
  id: string;
  missing?: string;
  labels?: Record<string, { value: string }>;
  descriptions?: Record<string, { value: string }>;
  claims?: Record<string, Array<{ mainsnak?: { datavalue?: { value?: unknown } } }>>;
  sitelinks?: Record<string, { title: string }>;
}

interface RawKgItem {
  resultScore?: number;
  result?: {
    '@id'?: string;
    name?: string;
    '@type'?: string[];
    description?: string;
    detailedDescription?: { articleBody?: string; url?: string };
    url?: string;
  };
}

const label = (e: RawWdEntity | undefined, language: string) => e?.labels?.[language]?.value ?? e?.labels?.en?.value ?? '';

function claimStrings(e: RawWdEntity, prop: string): string[] {
  return (e.claims?.[prop] ?? []).map((c) => c.mainsnak?.datavalue?.value).filter((v): v is string => typeof v === 'string');
}

function claimIds(e: RawWdEntity, prop: string): string[] {
  return (e.claims?.[prop] ?? [])
    .map((c) => (c.mainsnak?.datavalue?.value as { id?: string } | undefined)?.id)
    .filter((v): v is string => typeof v === 'string');
}

function types(n: Record<string, unknown>): string[] {
  return Array.isArray(n['@type']) ? (n['@type'] as unknown[]).map(String) : n['@type'] ? [String(n['@type'])] : [];
}

function strings(v: unknown): string[] {
  return (Array.isArray(v) ? v : v === undefined || v === null ? [] : [v]).filter((s): s is string => typeof s === 'string');
}
