import { chromeuxreport, type chromeuxreport_v1 } from '@googleapis/chromeuxreport';
import { pagespeedonline, type pagespeedonline_v5 } from '@googleapis/pagespeedonline';
import { SeoMcpError } from './errors.js';
import { googleError } from './google-errors.js';

/**
 * PageSpeed Insights (test di laboratorio Lighthouse) e Chrome UX Report
 * (dati reali degli utenti Chrome). Si autenticano con una API key di Google Cloud,
 * non con le credenziali di Search Console: i dati sono pubblici.
 */

export type Strategy = 'mobile' | 'desktop';
export type PsiCategory = 'performance' | 'seo' | 'accessibility' | 'best-practices';
export type FormFactor = 'PHONE' | 'DESKTOP' | 'TABLET' | 'ALL';

/** Soglie ufficiali dei Web Vitals (buono ≤ good, scarso > poor). */
export const THRESHOLDS: Record<string, { good: number; poor: number; unit: string }> = {
  largest_contentful_paint: { good: 2500, poor: 4000, unit: 'ms' },
  interaction_to_next_paint: { good: 200, poor: 500, unit: 'ms' },
  cumulative_layout_shift: { good: 0.1, poor: 0.25, unit: '' },
  first_contentful_paint: { good: 1800, poor: 3000, unit: 'ms' },
  experimental_time_to_first_byte: { good: 800, poor: 1800, unit: 'ms' },
};

const CRUX_METRICS = Object.keys(THRESHOLDS);
const CORE_WEB_VITALS = ['largest_contentful_paint', 'interaction_to_next_paint', 'cumulative_layout_shift'];

export type Rating = 'buono' | 'da migliorare' | 'scarso';

export function rate(metric: string, value: number): Rating | undefined {
  const t = THRESHOLDS[metric];
  if (!t) return undefined;
  return value <= t.good ? 'buono' : value <= t.poor ? 'da migliorare' : 'scarso';
}

export interface PsiResult {
  url: string;
  strategy: Strategy;
  scores: Partial<Record<PsiCategory, number>>;
  /** Metriche di laboratorio (Lighthouse). */
  lab: Record<string, { value: string; numeric?: number }>;
  /** Opportunità di miglioramento, ordinate per risparmio stimato. */
  opportunities: { id: string; title: string; savingsMs: number; displayValue?: string }[];
  /** Controlli SEO di Lighthouse non superati. */
  seoIssues: { id: string; title: string }[];
  /** Dati reali CrUX inclusi da PageSpeed, se disponibili. */
  fieldData?: { scope: 'url' | 'origin'; overall?: string; metrics: Record<string, { p75: number; category?: string }> };
}

export interface CruxMetric {
  p75: number;
  rating?: Rating;
  /** Quota di esperienze buone, da migliorare e scarse (0-1). */
  distribution: { buono: number; 'da migliorare': number; scarso: number };
}

export interface CruxRecord {
  target: string;
  formFactor: FormFactor;
  period?: { firstDate: string; lastDate: string };
  metrics: Record<string, CruxMetric>;
  /** Core Web Vitals superati: LCP, INP e CLS "buoni" al 75° percentile. */
  coreWebVitalsPassed?: boolean;
}

export interface CruxHistory {
  target: string;
  formFactor: FormFactor;
  /** Una riga per periodo di raccolta (finestre di 28 giorni, a cadenza settimanale). */
  weeks: { lastDate: string; p75: Record<string, number | null> }[];
}

type PsiApi = pagespeedonline_v5.Pagespeedonline;
type CruxApi = chromeuxreport_v1.Chromeuxreport;

export class PageSpeedClient {
  private readonly psi: PsiApi;
  private readonly crux: CruxApi;
  private readonly hasKey: boolean;

  constructor(apiKey?: string, apis?: { psi?: PsiApi; crux?: CruxApi }) {
    this.hasKey = Boolean(apiKey);
    this.psi = apis?.psi ?? pagespeedonline({ version: 'v5', auth: apiKey });
    this.crux = apis?.crux ?? chromeuxreport({ version: 'v1', auth: apiKey });
  }

  /** Test Lighthouse tramite PageSpeed Insights. Richiede 10-30 secondi. */
  async analyze(url: string, strategy: Strategy = 'mobile', categories: PsiCategory[] = ['performance', 'seo']): Promise<PsiResult> {
    assertHttpUrl(url);
    const res = await this.call('PageSpeed Insights API', () =>
      this.psi.pagespeedapi.runpagespeed(
        { url, strategy: strategy.toUpperCase(), category: categories.map((c) => c.toUpperCase().replace('-', '_')), locale: 'it' },
        { timeout: 90_000 },
      ),
    );
    const lr = res.data.lighthouseResult ?? {};
    const audits = lr.audits ?? {};
    const cats = (lr.categories ?? {}) as Record<string, { score?: number | null; auditRefs?: { id?: string | null }[] | null }>;

    const scores: PsiResult['scores'] = {};
    for (const c of categories) {
      const s = cats[c]?.score;
      if (typeof s === 'number') scores[c] = Math.round(s * 100);
    }

    const lab: PsiResult['lab'] = {};
    for (const id of ['largest-contentful-paint', 'cumulative-layout-shift', 'total-blocking-time', 'first-contentful-paint', 'speed-index']) {
      const a = audits[id];
      if (a?.displayValue) lab[id] = { value: a.displayValue, numeric: a.numericValue ?? undefined };
    }

    const opportunities = Object.entries(audits)
      .map(([id, a]) => ({ id, a, savings: Number((a.details as { overallSavingsMs?: number } | undefined)?.overallSavingsMs ?? 0) }))
      .filter(({ a, savings }) => savings > 0 && (a.score ?? 1) < 1)
      .sort((x, y) => y.savings - x.savings)
      .slice(0, 8)
      .map(({ id, a, savings }) => ({ id, title: a.title ?? id, savingsMs: Math.round(savings), displayValue: a.displayValue ?? undefined }));

    const seoIssues = (cats.seo?.auditRefs ?? [])
      .map((r) => r.id ?? '')
      .filter((id) => audits[id] && audits[id].score === 0)
      .map((id) => ({ id, title: audits[id]?.title ?? id }));

    return { url, strategy, scores, lab, opportunities, seoIssues, fieldData: fieldData(res.data) };
  }

  /** Dati reali degli ultimi 28 giorni per un URL o un'origine. */
  async query(target: { url?: string; origin?: string }, formFactor: FormFactor = 'PHONE'): Promise<CruxRecord> {
    this.requireKey();
    const t = cruxTarget(target);
    const res = await this.call(
      'Chrome UX Report API',
      () => this.crux.records.queryRecord({ requestBody: { ...t.body, formFactor: formFactor === 'ALL' ? undefined : formFactor, metrics: CRUX_METRICS } }),
      t.label,
    );
    const rec = res.data.record ?? {};
    const metrics: Record<string, CruxMetric> = {};
    for (const [name, m] of Object.entries(rec.metrics ?? {})) {
      const p75 = Number(m.percentiles?.p75);
      if (!Number.isFinite(p75)) continue;
      const d = (m.histogram ?? []).map((b) => Number(b.density ?? 0));
      metrics[name] = {
        p75,
        rating: rate(name, p75),
        distribution: { buono: round(d[0] ?? 0), 'da migliorare': round(d[1] ?? 0), scarso: round(d[2] ?? 0) },
      };
    }
    const cwv = CORE_WEB_VITALS.filter((n) => metrics[n]);
    return {
      target: t.label,
      formFactor,
      period: period(rec.collectionPeriod),
      metrics,
      // Senza INP (siti con poche interazioni) la valutazione si basa su LCP e CLS.
      coreWebVitalsPassed: cwv.length >= 2 ? cwv.every((n) => metrics[n]?.rating === 'buono') : undefined,
    };
  }

  /** Andamento settimanale del 75° percentile, fino a 40 periodi. */
  async history(target: { url?: string; origin?: string }, formFactor: FormFactor = 'PHONE', weeks = 25): Promise<CruxHistory> {
    this.requireKey();
    const t = cruxTarget(target);
    const res = await this.call(
      'Chrome UX Report API',
      () =>
        this.crux.records.queryHistoryRecord({
          requestBody: {
            ...t.body,
            formFactor: formFactor === 'ALL' ? undefined : formFactor,
            metrics: CORE_WEB_VITALS,
            collectionPeriodCount: Math.min(Math.max(weeks, 1), 40),
          },
        }),
      t.label,
    );
    const rec = res.data.record ?? {};
    const periods = rec.collectionPeriods ?? [];
    const series = Object.fromEntries(
      Object.entries(rec.metrics ?? {}).map(([name, m]) => [name, (m.percentilesTimeseries?.p75s ?? []).map((v) => (v == null ? null : Number(v)))]),
    );
    return {
      target: t.label,
      formFactor,
      weeks: periods.map((p, i) => ({
        lastDate: formatDate(p.lastDate),
        p75: Object.fromEntries(Object.entries(series).map(([name, values]) => [name, values[i] ?? null])),
      })),
    };
  }

  private requireKey(): void {
    if (!this.hasKey) {
      throw new SeoMcpError(
        'NOT_CONFIGURED',
        'Il Chrome UX Report richiede una API key di Google Cloud.',
        'Crea una API key in Google Cloud Console (API e servizi → Credenziali), abilita "Chrome UX Report API" e impostala in SEOMCP_GOOGLE_API_KEY.',
      );
    }
  }

  private async call<T>(apiName: string, fn: () => Promise<T>, target?: string): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      const e = err as { response?: { status?: number } };
      if (apiName === 'Chrome UX Report API' && e.response?.status === 404) {
        throw new SeoMcpError(
          'INVALID_INPUT',
          `Nessun dato reale per ${target ?? 'questo indirizzo'} nel Chrome UX Report.`,
          "Google pubblica i dati solo per URL e siti con abbastanza visite da Chrome. Prova con l'origine (tutto il sito) invece della singola pagina, oppure usa psi_analyze per un test di laboratorio.",
        );
      }
      if (apiName === 'PageSpeed Insights API' && e.response?.status === 429 && !this.hasKey) {
        throw new SeoMcpError(
          'QUOTA_EXCEEDED',
          'Quota gratuita di PageSpeed Insights esaurita.',
          'Senza API key la quota è molto bassa. Crea una API key gratuita, abilita "PageSpeed Insights API" e impostala in SEOMCP_GOOGLE_API_KEY.',
        );
      }
      throw googleError(err, {
        apiName,
        permissionMessage: `La API key non può usare la ${apiName}.`,
        permissionHint: `Controlla che la ${apiName} sia abilitata nel progetto della chiave e che le restrizioni della chiave la includano.`,
      });
    }
  }
}

function assertHttpUrl(url: string): void {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    throw new SeoMcpError('INVALID_INPUT', `URL non valido: ${url}`);
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') throw new SeoMcpError('INVALID_INPUT', 'Sono ammessi solo URL http e https.');
}

function cruxTarget(target: { url?: string; origin?: string }): { body: { url?: string; origin?: string }; label: string } {
  if (target.url) {
    assertHttpUrl(target.url);
    return { body: { url: target.url }, label: target.url };
  }
  if (target.origin) {
    assertHttpUrl(target.origin);
    const origin = new URL(target.origin).origin;
    return { body: { origin }, label: origin };
  }
  throw new SeoMcpError('INVALID_INPUT', 'Indica url (una pagina) oppure origin (tutto il sito, es. https://www.esempio.it).');
}

function fieldData(data: pagespeedonline_v5.Schema$PagespeedApiPagespeedResponseV5): PsiResult['fieldData'] {
  const src = data.loadingExperience?.metrics ? { scope: 'url' as const, le: data.loadingExperience } : data.originLoadingExperience?.metrics ? { scope: 'origin' as const, le: data.originLoadingExperience } : undefined;
  if (!src) return undefined;
  const metrics: Record<string, { p75: number; category?: string }> = {};
  for (const [name, m] of Object.entries(src.le.metrics ?? {})) {
    if (typeof m.percentile === 'number') metrics[name] = { p75: m.percentile, category: m.category ?? undefined };
  }
  return { scope: src.scope, overall: src.le.overall_category ?? undefined, metrics };
}

function formatDate(d?: chromeuxreport_v1.Schema$Date): string {
  if (!d?.year) return '';
  return `${d.year}-${String(d.month ?? 1).padStart(2, '0')}-${String(d.day ?? 1).padStart(2, '0')}`;
}

function period(p?: chromeuxreport_v1.Schema$CollectionPeriod): CruxRecord['period'] {
  return p ? { firstDate: formatDate(p.firstDate), lastDate: formatDate(p.lastDate) } : undefined;
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}
