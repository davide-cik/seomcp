import { parseDocument } from 'htmlparser2';
import type { AnyNode, Document, Element } from 'domhandler';

/**
 * Estrazione strutturata di una pagina HTML, così come la riceve un crawler
 * che non esegue JavaScript. Nessun codice della pagina viene eseguito.
 */

export interface ExtractedLink {
  href: string;
  text: string;
  rel: string;
  /** true se il link sta nel contenuto principale (non in menu o footer). */
  inContent: boolean;
}

export interface ExtractedSection {
  heading: string;
  level: number;
  text: string;
  words: number;
  /** Parole del primo paragrafo subito dopo il titolo; 0 se il titolo non è seguito da un paragrafo. */
  leadWords: number;
  lists: number;
  tables: number;
}

export interface ExtractedPage {
  lang?: string;
  title?: string;
  meta: Record<string, string>;
  canonical?: string;
  authorLinks: string[];
  /** Link rel=alternate con hreflang. */
  alternates: { hreflang: string; href: string }[];
  /** Immagini di tutta la pagina: alt null = attributo assente, "" = decorativa. */
  images: { src: string; alt: string | null; width: boolean; height: boolean; lazy: boolean }[];
  /** Titoli di tutta la pagina, nell'ordine del documento. */
  allHeadings: { level: number; text: string }[];
  headings: { level: number; text: string }[];
  paragraphs: number[];
  lists: { ordered: boolean; items: number }[];
  tables: { rows: number; cols: number; hasHeader: boolean }[];
  details: number;
  links: ExtractedLink[];
  times: string[];
  jsonLd: unknown[];
  jsonLdErrors: number;
  microdataItems: number;
  frameworkMarkers: string[];
  /** Testo del contenuto principale, normalizzato. */
  contentText: string;
  /** Testo di tutta la pagina, menu e footer compresi. */
  fullText: string;
  sections: ExtractedSection[];
  /** Testo di firme e indicazioni d'autore trovate nella pagina. */
  bylines: string[];
}

const SKIP_TAGS = new Set(['script', 'style', 'noscript', 'template', 'svg', 'iframe', 'canvas', 'object', 'button', 'select', 'textarea']);
const CHROME_TAGS = new Set(['nav', 'header', 'footer', 'aside', 'form', 'dialog']);
const CHROME_ROLES = new Set(['navigation', 'banner', 'contentinfo', 'complementary', 'search', 'dialog']);
const CHROME_HINT = /(^|[\s_-])(cookie|consent|gdpr|newsletter|modal|popup|breadcrumb|menu|navbar|sidebar|share|social|related|comments?)($|[\s_-])/i;
const BLOCK_TAGS = new Set(['p', 'div', 'section', 'article', 'li', 'ul', 'ol', 'table', 'tr', 'td', 'th', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'dd', 'dt', 'dl', 'pre', 'figure', 'figcaption', 'br', 'main', 'details', 'summary']);

export function countWords(text: string): number {
  const m = text.match(/[\p{L}\p{N}][\p{L}\p{N}'’.-]*/gu);
  return m ? m.length : 0;
}

function norm(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function isElement(n: AnyNode): n is Element {
  return n.type === 'tag' || n.type === 'script' || n.type === 'style';
}

function attr(el: Element, name: string): string {
  return el.attribs?.[name] ?? '';
}

/** Testo di un nodo, con spazi tra i blocchi e senza script o stili. */
function textOf(node: AnyNode): string {
  const out: string[] = [];
  const walk = (n: AnyNode) => {
    if (n.type === 'text') out.push((n as unknown as { data: string }).data);
    else if (isElement(n)) {
      if (SKIP_TAGS.has(n.name)) return;
      const block = BLOCK_TAGS.has(n.name);
      if (block) out.push(' ');
      for (const c of n.children) walk(c);
      if (block) out.push(' ');
    }
  };
  walk(node);
  return norm(out.join(''));
}

function isChrome(el: Element): boolean {
  if (CHROME_TAGS.has(el.name)) return true;
  if (CHROME_ROLES.has(attr(el, 'role').toLowerCase())) return true;
  // Elementi nascosti: non li vede nessuno, nemmeno i crawler li considerano contenuto.
  if ('hidden' in (el.attribs ?? {}) || attr(el, 'aria-hidden') === 'true' || /display\s*:\s*none/i.test(attr(el, 'style'))) return true;
  return CHROME_HINT.test(`${attr(el, 'class')} ${attr(el, 'id')}`);
}

function findAll(root: AnyNode, pred: (el: Element) => boolean): Element[] {
  const out: Element[] = [];
  const walk = (n: AnyNode) => {
    if (isElement(n)) {
      if (pred(n)) out.push(n);
      for (const c of n.children) walk(c);
    } else if ('children' in n) for (const c of (n as Document).children) walk(c);
  };
  walk(root);
  return out;
}

/** Il contenitore del contenuto principale: <main>, altrimenti l'<article> più ricco, altrimenti <body>. */
function mainRoot(doc: Document): AnyNode {
  const mains = findAll(doc, (e) => e.name === 'main' || attr(e, 'role') === 'main');
  if (mains[0]) return mains[0];
  const articles = findAll(doc, (e) => e.name === 'article');
  if (articles.length) return articles.reduce((a, b) => (textOf(b).length > textOf(a).length ? b : a));
  return findAll(doc, (e) => e.name === 'body')[0] ?? doc;
}

export function extractPage(html: string, baseUrl: string): ExtractedPage {
  const doc = parseDocument(html, { decodeEntities: true });
  const all = (name: string) => findAll(doc, (e) => e.name === name);

  const htmlEl = all('html')[0];
  const meta: Record<string, string> = {};
  for (const m of all('meta')) {
    const key = (attr(m, 'name') || attr(m, 'property') || attr(m, 'http-equiv')).toLowerCase();
    if (key && !(key in meta)) meta[key] = attr(m, 'content').trim();
  }
  const linkEls = all('link');
  const canonical = linkEls.find((l) => attr(l, 'rel').toLowerCase().split(/\s+/).includes('canonical'));

  // Dati strutturati: JSON-LD (anche @graph e array) e conteggio microdata.
  const jsonLd: unknown[] = [];
  let jsonLdErrors = 0;
  for (const s of all('script')) {
    if (attr(s, 'type').toLowerCase().trim() !== 'application/ld+json') continue;
    const raw = s.children.map((c) => (c as unknown as { data?: string }).data ?? '').join('');
    try {
      jsonLd.push(JSON.parse(raw));
    } catch {
      jsonLdErrors++;
    }
  }

  const frameworkMarkers: string[] = [];
  if (findAll(doc, (e) => attr(e, 'id') === '__NEXT_DATA__').length) frameworkMarkers.push('Next.js');
  if (findAll(doc, (e) => attr(e, 'id') === '__nuxt' || attr(e, 'id') === '__NUXT__').length || /window\.__NUXT__/.test(html)) frameworkMarkers.push('Nuxt');
  if (findAll(doc, (e) => 'ng-version' in (e.attribs ?? {})).length) frameworkMarkers.push('Angular');
  if (findAll(doc, (e) => 'data-reactroot' in (e.attribs ?? {})).length) frameworkMarkers.push('React');
  const emptyRoot = findAll(doc, (e) => ['root', 'app', '__next', 'svelte'].includes(attr(e, 'id')) && textOf(e).length < 20);
  if (emptyRoot.length) frameworkMarkers.push(`contenitore #${attr(emptyRoot[0]!, 'id')} vuoto`);

  // Percorso del contenuto principale, saltando menu, footer, banner e simili.
  const root = mainRoot(doc);
  const headings: ExtractedPage['headings'] = [];
  const paragraphs: number[] = [];
  const lists: ExtractedPage['lists'] = [];
  const tables: ExtractedPage['tables'] = [];
  const links: ExtractedLink[] = [];
  let details = 0;
  const contentParts: string[] = [];

  const sections: ExtractedSection[] = [];
  // La sezione iniziale (prima di qualsiasi titolo) conta come introduzione: il suo primo paragrafo è la risposta in apertura.
  let cur: ExtractedSection & { parts: string[]; awaitingLead: boolean } = { heading: '', level: 0, text: '', words: 0, leadWords: 0, lists: 0, tables: 0, parts: [], awaitingLead: true };
  const closeSection = () => {
    cur.text = norm(cur.parts.join(' '));
    cur.words = countWords(cur.text);
    if (cur.heading || cur.words > 0) sections.push({ heading: cur.heading, level: cur.level, text: cur.text, words: cur.words, leadWords: cur.leadWords, lists: cur.lists, tables: cur.tables });
  };

  const walk = (n: AnyNode) => {
    if (!isElement(n)) return;
    if (SKIP_TAGS.has(n.name) || (n !== root && isChrome(n))) return;
    const tag = n.name;
    if (/^h[1-6]$/.test(tag)) {
      const level = Number(tag[1]);
      const text = textOf(n);
      if (text) {
        headings.push({ level, text });
        if (level <= 3) {
          closeSection();
          cur = { heading: text, level, text: '', words: 0, leadWords: 0, lists: 0, tables: 0, parts: [], awaitingLead: true };
        }
      }
      return;
    }
    if (tag === 'p') {
      const text = textOf(n);
      const w = countWords(text);
      if (w >= 3) {
        paragraphs.push(w);
        if (cur.awaitingLead) cur.leadWords = w;
      }
      if (w > 0) cur.awaitingLead = false;
      cur.parts.push(text);
      contentParts.push(text);
      for (const a of findAll(n, (e) => e.name === 'a')) pushLink(a, true);
      return;
    }
    if (tag === 'ul' || tag === 'ol') {
      const items = n.children.filter((c) => isElement(c) && c.name === 'li').length;
      if (items) {
        lists.push({ ordered: tag === 'ol', items });
        cur.lists++;
      }
      cur.awaitingLead = false;
    }
    if (tag === 'table') {
      const rows = findAll(n, (e) => e.name === 'tr');
      const cols = Math.max(0, ...rows.map((r) => r.children.filter((c) => isElement(c) && (c.name === 'td' || c.name === 'th')).length));
      tables.push({ rows: rows.length, cols, hasHeader: findAll(n, (e) => e.name === 'th').length > 0 });
      cur.tables++;
      cur.awaitingLead = false;
      const text = textOf(n);
      cur.parts.push(text);
      contentParts.push(text);
      return;
    }
    if (tag === 'details') details++;
    if (tag === 'a') {
      pushLink(n, true);
    }
    // Testo diretto in elementi che non sono paragrafi (div con testo, li, blockquote...).
    if (tag === 'li' || tag === 'blockquote' || tag === 'dd' || tag === 'dt' || tag === 'figcaption' || tag === 'pre') {
      const text = textOf(n);
      if (text) {
        cur.parts.push(text);
        contentParts.push(text);
        if (countWords(text) > 0 && tag !== 'li') cur.awaitingLead = false;
      }
      for (const a of findAll(n, (e) => e.name === 'a')) pushLink(a, true);
      return;
    }
    for (const c of n.children) {
      if (c.type === 'text') {
        const t = norm((c as unknown as { data: string }).data);
        if (t) {
          cur.parts.push(t);
          contentParts.push(t);
        }
      } else walk(c);
    }
  };

  const seenLinks = new Set<Element>();
  function pushLink(a: Element, inContent: boolean) {
    if (seenLinks.has(a)) return;
    seenLinks.add(a);
    const raw = attr(a, 'href').trim();
    if (!raw || raw.startsWith('#') || /^(javascript|mailto|tel):/i.test(raw)) return;
    let href: string;
    try {
      href = new URL(raw, baseUrl).toString();
    } catch {
      return;
    }
    links.push({ href, text: textOf(a).slice(0, 120), rel: attr(a, 'rel').toLowerCase(), inContent });
  }

  walk(root as Element);
  closeSection();

  // Link fuori dal contenuto principale (menu, footer): servono per i conteggi interni/esterni totali.
  for (const a of all('a')) pushLink(a, false);

  // L'H1 può stare fuori da <main> (es. nell'header della pagina).
  if (!headings.some((h) => h.level === 1)) {
    for (const h of all('h1')) {
      const text = textOf(h);
      if (text) headings.unshift({ level: 1, text });
    }
  }

  const authorLinks = [
    ...linkEls.filter((l) => attr(l, 'rel').toLowerCase().split(/\s+/).includes('author')).map((l) => attr(l, 'href')),
    ...all('a').filter((a) => attr(a, 'rel').toLowerCase().split(/\s+/).includes('author')).map((a) => attr(a, 'href')),
  ].filter(Boolean);

  const bylines = findAll(doc, (e) => /(^|[\s_-])(author|byline|autore|firma)($|[\s_-])/i.test(`${attr(e, 'class')} ${attr(e, 'itemprop')} ${attr(e, 'rel')}`))
    .map((e) => textOf(e))
    .filter((t) => t && t.length < 120)
    .slice(0, 5);

  return {
    lang: htmlEl ? attr(htmlEl, 'lang') || undefined : undefined,
    title: all('title')[0] ? textOf(all('title')[0]!) : undefined,
    meta,
    canonical: canonical ? attr(canonical, 'href') : undefined,
    authorLinks,
    headings,
    paragraphs,
    lists,
    tables,
    details,
    links,
    times: all('time').map((t) => attr(t, 'datetime') || textOf(t)).filter(Boolean),
    jsonLd,
    jsonLdErrors,
    microdataItems: findAll(doc, (e) => 'itemtype' in (e.attribs ?? {})).length,
    frameworkMarkers,
    contentText: norm(contentParts.join(' ')),
    fullText: textOf(findAll(doc, (e) => e.name === 'body')[0] ?? doc),
    sections,
    bylines,
    alternates: linkEls
      .filter((l) => attr(l, 'rel').toLowerCase().split(/\s+/).includes('alternate') && attr(l, 'hreflang'))
      .map((l) => ({ hreflang: attr(l, 'hreflang').trim(), href: attr(l, 'href').trim() })),
    images: all('img').map((img) => ({
      src: (attr(img, 'src') || attr(img, 'data-src')).slice(0, 500),
      alt: 'alt' in (img.attribs ?? {}) ? attr(img, 'alt') : null,
      width: 'width' in (img.attribs ?? {}),
      height: 'height' in (img.attribs ?? {}),
      lazy: attr(img, 'loading').toLowerCase() === 'lazy',
    })),
    allHeadings: findAll(doc, (e) => /^h[1-6]$/.test(e.name)).map((h) => ({ level: Number(h.name[1]), text: textOf(h).slice(0, 200) })).filter((h) => h.text),
  };
}
