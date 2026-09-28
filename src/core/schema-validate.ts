import vocab from '../data/schema-vocab.json' with { type: 'json' };
import { RICH_RESULT_RULES, type RichResultRule } from './google-rich-results.js';

/**
 * Validatore di dati strutturati JSON-LD, in locale e senza servizi esterni.
 *
 * Quattro livelli: sintassi, vocabolario schema.org (versione inclusa nel pacchetto),
 * requisiti di Google per i risultati avanzati, coerenza con la pagina.
 */

interface Vocab {
  version: string;
  date: string;
  types: Record<string, { p: string[]; dt?: number; pn?: number; s?: string }>;
  props: Record<string, { d: string[]; r: string[]; pn?: number; s?: string }>;
  members: Record<string, string>;
}

const V = vocab as Vocab;

export type Severity = 'errore' | 'avviso' | 'info';

export interface Issue {
  severity: Severity;
  path: string;
  message: string;
  suggestion?: string;
}

export interface RichResultCheck {
  feature: string;
  type: string;
  path: string;
  /** true se tutte le proprietà obbligatorie sono presenti. */
  eligible: boolean;
  missingRequired: string[];
  missingRecommended: string[];
  docs: string;
  note?: string;
}

export interface GroupedIssue extends Issue {
  /** Quante volte compare la stessa segnalazione (es. in ogni recensione). */
  count: number;
}

export interface RichResultGroup extends RichResultCheck {
  count: number;
  eligibleCount: number;
}

export interface ValidationReport {
  vocabulary: string;
  blocks: number;
  /** Tipi trovati, con il numero di oggetti per tipo (anche annidati). */
  types: Record<string, number>;
  topLevelItems: { path: string; types: string[] }[];
  issues: GroupedIssue[];
  richResults: RichResultGroup[];
  summary: { errors: number; warnings: number; info: number };
}

export interface PageContext {
  url?: string;
  /** Testo visibile della pagina, per verificare che FAQ e simili siano mostrati davvero. */
  visibleText?: string;
  title?: string;
  h1?: string;
  microdataItems?: number;
  now?: Date;
}

// ─── Vocabolario ───────────────────────────────────────────────────────────

const DATE_TYPES = new Set(['Date', 'DateTime', 'Time']);
const TEXTLIKE = new Set(['Text', 'URL', 'CssSelectorType', 'XPathType', 'PronounceableText']);
const NUMERIC = new Set(['Number', 'Integer', 'Float']);

const ancestorsCache = new Map<string, Set<string>>();
/** Il tipo e tutti i suoi antenati (Restaurant → FoodEstablishment → LocalBusiness → …). */
export function ancestors(type: string): Set<string> {
  const cached = ancestorsCache.get(type);
  if (cached) return cached;
  const out = new Set<string>();
  const stack = [type];
  while (stack.length) {
    const t = stack.pop()!;
    if (out.has(t)) continue;
    out.add(t);
    for (const p of V.types[t]?.p ?? []) stack.push(p);
  }
  ancestorsCache.set(type, out);
  return out;
}

export const isSubtypeOf = (type: string, parent: string) => ancestors(type).has(parent);

/** Distanza di Levenshtein, per suggerire la correzione di un refuso. */
function distance(a: string, b: string): number {
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0]!;
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j]!;
      dp[j] = Math.min(dp[j]! + 1, dp[j - 1]! + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length]!;
}

function suggest(name: string, candidates: string[]): string | undefined {
  const lower = name.toLowerCase();
  const exactCase = candidates.find((c) => c.toLowerCase() === lower);
  if (exactCase) return exactCase;
  let best: string | undefined;
  let bestD = Infinity;
  for (const c of candidates) {
    if (Math.abs(c.length - name.length) > 3) continue;
    const d = distance(lower, c.toLowerCase());
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return bestD <= Math.max(2, Math.floor(name.length / 4)) ? best : undefined;
}

const TYPE_NAMES = Object.keys(V.types);
const PROP_NAMES = Object.keys(V.props);

// ─── Validazione ───────────────────────────────────────────────────────────

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v);
const asArray = (v: unknown): unknown[] => (Array.isArray(v) ? v : v === undefined || v === null ? [] : [v]);

function typeNames(node: Obj): string[] {
  return asArray(node['@type']).map((t) => String(t).replace(/^(https?:\/\/)?schema\.org\//, '').replace(/^schema:/, ''));
}

function isSchemaContext(ctx: unknown): boolean {
  if (typeof ctx === 'string') return /^https?:\/\/schema\.org\/?$/.test(ctx.trim());
  if (Array.isArray(ctx)) return ctx.some(isSchemaContext);
  if (isObj(ctx)) return isSchemaContext(ctx['@vocab']);
  return false;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/;
const ISO_TIME = /^\d{2}:\d{2}(:\d{2})?(Z|[+-]\d{2}:?\d{2})?$/;

class Validator {
  readonly issues: Issue[] = [];
  readonly items: { path: string; types: string[] }[] = [];
  readonly nodes: { node: Obj; types: string[]; path: string; topLevel: boolean }[] = [];
  private readonly ids = new Set<string>();
  private readonly refs: { id: string; path: string }[] = [];

  constructor(private readonly ctx: PageContext) {}

  add(severity: Severity, path: string, message: string, suggestion?: string) {
    this.issues.push({ severity, path, message, ...(suggestion ? { suggestion } : {}) });
  }

  topLevel(value: unknown, path: string) {
    for (const [i, item] of asArray(value).entries()) {
      const p = Array.isArray(value) ? `${path}[${i}]` : path;
      if (!isObj(item)) {
        this.add('errore', p, 'Il blocco JSON-LD deve contenere un oggetto.');
        continue;
      }
      if (!isSchemaContext(item['@context'])) {
        this.add(
          item['@context'] ? 'errore' : 'avviso',
          p,
          item['@context'] ? `@context non punta a schema.org: ${JSON.stringify(item['@context'])}.` : '@context mancante: senza, i motori potrebbero non riconoscere il vocabolario.',
          'Usa "@context": "https://schema.org".',
        );
      }
      if (Array.isArray(item['@graph'])) {
        (item['@graph'] as unknown[]).forEach((n, j) => {
          if (isObj(n)) this.node(n, `${p}.@graph[${j}]`, true);
          else this.add('errore', `${p}.@graph[${j}]`, 'Elemento di @graph non valido.');
        });
      } else this.node(item, p, true);
    }
  }

  node(node: Obj, path: string, topLevel: boolean) {
    const keys = Object.keys(node).filter((k) => !k.startsWith('@'));
    if (typeof node['@id'] === 'string') {
      if (keys.length === 0 && !node['@type']) {
        this.refs.push({ id: node['@id'], path });
        return;
      }
      this.ids.add(node['@id']);
    }
    const types = typeNames(node);
    if (!types.length) {
      if (topLevel) this.add('errore', path, 'Manca @type: il motore non sa che cosa descrive questo oggetto.');
      return;
    }
    this.items.push({ path, types });
    this.nodes.push({ node, types, path, topLevel });

    const known: string[] = [];
    for (const t of types) {
      const def = V.types[t];
      if (!def) {
        this.add('errore', `${path}.@type`, `Il tipo "${t}" non esiste in schema.org.`, suggest(t, TYPE_NAMES) && `Forse intendevi "${suggest(t, TYPE_NAMES)}"?`);
        continue;
      }
      known.push(t);
      if (def.s) this.add('avviso', `${path}.@type`, `Il tipo "${t}" è superato.`, `Usa "${def.s}".`);
      if (def.pn) this.add('info', `${path}.@type`, `Il tipo "${t}" è in fase di proposta (pending): i motori potrebbero ignorarlo.`);
    }
    const allAncestors = new Set(known.flatMap((t) => [...ancestors(t)]));

    for (const key of keys) {
      const p = `${path}.${key}`;
      // Annotazioni delle azioni (es. "query-input" in SearchAction): sintassi valida di schema.org.
      const action = /^(.+)-(input|output)$/.exec(key);
      if (action && V.props[action[1]!]) continue;
      const prop = V.props[key];
      if (!prop) {
        const s = suggest(key, PROP_NAMES);
        this.add('errore', p, `La proprietà "${key}" non esiste in schema.org.`, s && `Forse intendevi "${s}"?`);
        continue;
      }
      if (prop.s) this.add('avviso', p, `La proprietà "${key}" è superata.`, `Usa "${prop.s}".`);
      if (known.length && !prop.d.some((d) => allAncestors.has(d))) {
        this.add('avviso', p, `"${key}" non è prevista per ${known.join('/')}. È ammessa per: ${prop.d.slice(0, 6).join(', ')}${prop.d.length > 6 ? '…' : ''}.`);
      }
      for (const [i, v] of asArray(node[key]).entries()) this.value(v, prop.r, Array.isArray(node[key]) ? `${p}[${i}]` : p, key);
    }
  }

  value(v: unknown, ranges: string[], path: string, prop: string) {
    const rangeSet = new Set(ranges);
    const acceptsText = ranges.some((r) => TEXTLIKE.has(r) || isSubtypeOf(r, 'Text'));
    if (isObj(v)) {
      const types = typeNames(v);
      if (types.length && ranges.length) {
        const ok = types.some((t) => V.types[t] && ranges.some((r) => isSubtypeOf(t, r)));
        if (!ok && types.every((t) => V.types[t])) {
          this.add('avviso', path, `Valore di tipo ${types.join('/')}, ma "${prop}" si aspetta: ${ranges.join(', ')}.`);
        }
      }
      this.node(v, path, false);
      return;
    }
    if (typeof v === 'string') {
      const s = v.trim();
      if (!s) {
        this.add('avviso', path, `"${prop}" è vuota.`);
        return;
      }
      const onlyDates = ranges.length > 0 && ranges.every((r) => DATE_TYPES.has(r));
      if (onlyDates) {
        const okFormat = (rangeSet.has('Date') && (ISO_DATE.test(s) || ISO_DATETIME.test(s))) || (rangeSet.has('DateTime') && ISO_DATETIME.test(s)) || (rangeSet.has('Time') && ISO_TIME.test(s));
        if (!okFormat && ISO_DATETIME.test(s.replace(' ', 'T'))) {
          this.add('avviso', path, `"${prop}" usa uno spazio tra data e ora ("${s.slice(0, 40)}"): lo standard ISO 8601 prevede la "T".`, `Scrivi "${s.replace(' ', 'T')}".`);
          return;
        }
        if (!okFormat) this.add('errore', path, `"${prop}" deve essere una data in formato ISO 8601, trovato "${s.slice(0, 40)}".`, 'Esempio: "2026-09-28" oppure "2026-09-28T10:30:00+02:00".');
        return;
      }
      const onlyUrl = ranges.length > 0 && ranges.every((r) => r === 'URL');
      if ((onlyUrl || prop === 'url' || prop === 'sameAs' || prop === 'logo' || prop === 'image') && !/^https?:\/\//i.test(s)) {
        this.add(onlyUrl ? 'avviso' : 'info', path, `"${prop}" dovrebbe essere un URL assoluto, trovato "${s.slice(0, 60)}".`);
        return;
      }
      // Enumerazioni: "https://schema.org/InStock" oppure "InStock".
      const enumRanges = ranges.filter((r) => isSubtypeOf(r, 'Enumeration'));
      if (enumRanges.length && !acceptsText) {
        const member = s.replace(/^(https?:\/\/)?schema\.org\//, '');
        const cls = V.members[member];
        if (!cls || !enumRanges.some((r) => isSubtypeOf(cls, r))) {
          const options = Object.entries(V.members).filter(([, c]) => enumRanges.some((r) => isSubtypeOf(c, r))).map(([m]) => m);
          this.add('avviso', path, `"${s}" non è un valore previsto per "${prop}".`, options.length ? `Valori ammessi: ${options.slice(0, 8).join(', ')}${options.length > 8 ? '…' : ''} (es. "https://schema.org/${options[0]}").` : undefined);
        }
      }
      return;
    }
    if (typeof v === 'number') {
      const quantity = ranges.some((r) => r === 'QuantitativeValue' || r === 'MonetaryAmount' || isSubtypeOf(r, 'Quantity'));
      if (ranges.length && !quantity && !ranges.some((r) => NUMERIC.has(r) || TEXTLIKE.has(r) || isSubtypeOf(r, 'Number'))) {
        this.add('avviso', path, `"${prop}" è un numero, ma si aspetta: ${ranges.join(', ')}.`);
      }
      return;
    }
    if (typeof v === 'boolean') {
      if (ranges.length && !ranges.includes('Boolean') && !acceptsText) this.add('avviso', path, `"${prop}" è un booleano, ma si aspetta: ${ranges.join(', ')}.`);
    }
  }

  finish() {
    for (const r of this.refs) {
      if (!this.ids.has(r.id)) this.add('info', r.path, `Riferimento a "${r.id}", non definito in questa pagina.`);
    }
    this.consistency();
  }

  private consistency() {
    const now = this.ctx.now ?? new Date();
    for (const { node, types, path } of this.nodes) {
      const pub = typeof node['datePublished'] === 'string' ? Date.parse(node['datePublished']) : NaN;
      const mod = typeof node['dateModified'] === 'string' ? Date.parse(node['dateModified']) : NaN;
      if (!Number.isNaN(pub) && !Number.isNaN(mod) && mod < pub) this.add('errore', `${path}.dateModified`, 'dateModified è precedente a datePublished.');
      for (const [k, t] of [['datePublished', pub], ['dateModified', mod]] as const) {
        if (!Number.isNaN(t) && t > now.getTime() + 86_400_000) this.add('avviso', `${path}.${k}`, `${k} è nel futuro.`);
      }

      const text = this.ctx.visibleText ? normalize(this.ctx.visibleText) : undefined;
      if (text && types.includes('FAQPage')) {
        for (const [i, q] of asArray(node['mainEntity']).entries()) {
          const name = isObj(q) && typeof q['name'] === 'string' ? q['name'] : undefined;
          if (name && !text.includes(normalize(name).slice(0, 60))) {
            this.add('avviso', `${path}.mainEntity[${i}]`, `La domanda "${name.slice(0, 80)}" non compare nel testo visibile della pagina: Google richiede che il contenuto delle FAQ sia visibile.`);
          }
        }
      }
      const headline = typeof node['headline'] === 'string' ? node['headline'] : undefined;
      if (headline && this.ctx.h1 && types.some((t) => isSubtypeOf(t, 'Article'))) {
        const overlap = tokenOverlap(headline, this.ctx.h1);
        if (overlap < 0.5) this.add('info', `${path}.headline`, `headline e H1 hanno poche parole in comune (${Math.round(overlap * 100)}%): headline "${headline.slice(0, 70)}", H1 "${this.ctx.h1.slice(0, 70)}".`);
      }
    }
  }
}

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

function tokenOverlap(a: string, b: string): number {
  const ta = new Set(normalize(a).split(' ').filter((w) => w.length > 2));
  const tb = new Set(normalize(b).split(' ').filter((w) => w.length > 2));
  if (!ta.size || !tb.size) return 1;
  let common = 0;
  for (const w of ta) if (tb.has(w)) common++;
  return common / Math.min(ta.size, tb.size);
}

// ─── Requisiti Google ──────────────────────────────────────────────────────

function hasPath(node: Obj, path: string): boolean {
  const [head, ...rest] = path.split('.');
  const values = asArray(node[head!]).filter((v) => v !== '' && v !== null);
  if (!values.length) return false;
  if (!rest.length) return true;
  // Per gli elenchi (es. itemListElement) ogni elemento deve avere la proprietà.
  return values.every((v) => isObj(v) && hasPath(v, rest.join('.')));
}

const satisfied = (node: Obj, spec: string) => spec.split('|').some((alt) => hasPath(node, alt));

function checkRule(node: Obj, rule: RichResultRule, path: string): RichResultCheck {
  const missingRequired = rule.required.filter((r) => !satisfied(node, r));
  return {
    feature: rule.feature,
    type: rule.type,
    path,
    eligible: missingRequired.length === 0,
    missingRequired,
    missingRecommended: rule.recommended.filter((r) => !satisfied(node, r)),
    docs: rule.docs,
    ...(rule.note ? { note: rule.note } : {}),
  };
}

// ─── API ───────────────────────────────────────────────────────────────────

/** Valida blocchi JSON-LD già letti (e il numero di blocchi non interpretabili). */
export function validateJsonLd(blocks: unknown[], parseErrors: number, ctx: PageContext = {}): ValidationReport {
  const v = new Validator(ctx);
  for (let i = 0; i < parseErrors; i++) v.add('errore', `blocco non valido ${i + 1}`, 'Un blocco <script type="application/ld+json"> contiene JSON non valido ed è ignorato dai motori.', 'Controlla virgole finali, virgolette e parentesi.');
  blocks.forEach((b, i) => v.topLevel(b, `blocco[${i}]`));
  v.finish();
  if (!blocks.length && !parseErrors) {
    v.add(ctx.microdataItems ? 'info' : 'avviso', 'pagina', ctx.microdataItems ? `Nessun JSON-LD, ma ${ctx.microdataItems} elementi microdata: il validatore controlla solo JSON-LD, il formato consigliato da Google.` : 'Nessun dato strutturato JSON-LD trovato.');
  }

  // Per ogni oggetto vale solo la regola più specifica (Recipe, non anche HowTo; LocalBusiness, non anche Organization).
  const perNode: RichResultCheck[] = [];
  for (const { node, types, path, topLevel } of v.nodes) {
    const matching = RICH_RESULT_RULES.filter((rule) => (!rule.topLevelOnly || topLevel) && types.some((t) => V.types[t] && isSubtypeOf(t, rule.type)));
    const specific = matching.filter((r) => !matching.some((o) => o !== r && isSubtypeOf(o.type, r.type)));
    for (const rule of specific) perNode.push(checkRule(node, rule, path));
  }

  const count = (s: Severity) => v.issues.filter((i) => i.severity === s).length;
  const types: Record<string, number> = {};
  for (const it of v.items) for (const t of it.types) types[t] = (types[t] ?? 0) + 1;
  return {
    vocabulary: `schema.org ${V.version} (${V.date})`,
    blocks: blocks.length,
    types,
    topLevelItems: v.nodes.filter((n) => n.topLevel).map((n) => ({ path: n.path, types: n.types })),
    issues: groupIssues(v.issues),
    richResults: groupRichResults(perNode),
    summary: { errors: count('errore'), warnings: count('avviso'), info: count('info') },
  };
}

/** Raggruppa segnalazioni identiche che differiscono solo per l'indice (es. review[0], review[1]…). */
function groupIssues(issues: Issue[]): GroupedIssue[] {
  const map = new Map<string, GroupedIssue>();
  for (const i of issues) {
    const key = `${i.severity}|${i.path.replace(/\[\d+\]/g, '[*]')}|${i.message.replace(/\d+/g, '#')}`;
    const g = map.get(key);
    if (g) g.count++;
    else map.set(key, { ...i, count: 1 });
  }
  const order: Record<Severity, number> = { errore: 0, avviso: 1, info: 2 };
  return [...map.values()].sort((a, b) => order[a.severity] - order[b.severity]);
}

function groupRichResults(checks: RichResultCheck[]): RichResultGroup[] {
  const map = new Map<string, RichResultGroup>();
  for (const c of checks) {
    const key = `${c.feature}|${c.path.replace(/\[\d+\]/g, '[*]')}`;
    const g = map.get(key);
    if (!g) {
      map.set(key, { ...c, count: 1, eligibleCount: c.eligible ? 1 : 0 });
      continue;
    }
    g.count++;
    if (c.eligible) g.eligibleCount++;
    g.eligible = g.eligible && c.eligible;
    g.missingRequired = [...new Set([...g.missingRequired, ...c.missingRequired])];
    g.missingRecommended = [...new Set([...g.missingRecommended, ...c.missingRecommended])];
  }
  return [...map.values()];
}

/** Estrae i blocchi da JSON-LD incollato: un oggetto, un array o uno o più <script>. */
export function parseJsonLdInput(input: string): { blocks: unknown[]; parseErrors: number } {
  const scripts = [...input.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1] ?? '');
  const sources = scripts.length ? scripts : [input];
  const blocks: unknown[] = [];
  let parseErrors = 0;
  for (const src of sources) {
    try {
      blocks.push(JSON.parse(src));
    } catch {
      parseErrors++;
    }
  }
  return { blocks, parseErrors };
}

export const VOCABULARY_VERSION = V.version;
