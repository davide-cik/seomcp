import { analyticsadmin, type analyticsadmin_v1beta } from '@googleapis/analyticsadmin';
import { analyticsdata, type analyticsdata_v1beta } from '@googleapis/analyticsdata';
import { isIsoDate } from './dates.js';
import { SeoMcpError } from './errors.js';
import { googleError } from './google-errors.js';
import type { GscAuth } from './gsc.js';
import type { GaFilter, GaProperty, GaReport, GaReportParams, GaRow } from './types.js';

/** Scope minimo: sola lettura. Il server non può modificare nulla in Google Analytics. */
export const GA_SCOPES = ['https://www.googleapis.com/auth/analytics.readonly'];

export const GA_MAX_ROWS = 100_000;

type DataApi = analyticsdata_v1beta.Analyticsdata;
type AdminApi = analyticsadmin_v1beta.Analyticsadmin;
type Schema$Filter = analyticsdata_v1beta.Schema$FilterExpression;

/**
 * Client per Google Analytics 4 (Data API e Admin API).
 *
 * Come GscClient, accetta qualsiasi autenticazione supportata da googleapis
 * e non legge file né variabili d'ambiente.
 */
export class GaClient {
  private readonly data: DataApi;
  private readonly admin: AdminApi;

  constructor(auth: GscAuth, apis?: { data?: DataApi; admin?: AdminApi }) {
    this.data = apis?.data ?? analyticsdata({ version: 'v1beta', auth });
    this.admin = apis?.admin ?? analyticsadmin({ version: 'v1beta', auth });
  }

  /** Proprietà GA4 accessibili, con il nome dell'account di appartenenza. */
  async listProperties(): Promise<GaProperty[]> {
    const out: GaProperty[] = [];
    let pageToken: string | undefined;
    do {
      const res = await this.call(() => this.admin.accountSummaries.list({ pageSize: 200, pageToken }));
      for (const acc of res.data.accountSummaries ?? []) {
        for (const p of acc.propertySummaries ?? []) {
          out.push({
            property: p.property ?? '',
            displayName: p.displayName ?? '',
            account: acc.account ?? '',
            accountName: acc.displayName ?? '',
          });
        }
      }
      pageToken = res.data.nextPageToken ?? undefined;
    } while (pageToken);
    return out;
  }

  async runReport(params: GaReportParams): Promise<GaReport> {
    if (!isIsoDate(params.startDate) || !isIsoDate(params.endDate)) {
      throw new SeoMcpError('INVALID_INPUT', 'Le date devono essere nel formato YYYY-MM-DD.');
    }
    const property = normalizeProperty(params.property);
    const dimensions = params.dimensions ?? [];
    const orderBy = params.orderBy ?? params.metrics[0];
    const res = await this.call(
      () =>
        this.data.properties.runReport({
          property,
          requestBody: {
            dateRanges: [{ startDate: params.startDate, endDate: params.endDate }],
            dimensions: dimensions.map((name) => ({ name })),
            metrics: params.metrics.map((name) => ({ name })),
            dimensionFilter: buildFilter(params.filters),
            orderBys: orderBy
              ? [
                  params.metrics.includes(orderBy)
                    ? { metric: { metricName: orderBy }, desc: true }
                    : { dimension: { dimensionName: orderBy }, desc: false },
                ]
              : undefined,
            limit: String(Math.min(params.limit ?? 100, GA_MAX_ROWS)),
            offset: params.offset ? String(params.offset) : undefined,
          },
        }),
      property,
    );
    return { rows: parseRows(res.data), rowCount: res.data.rowCount ?? 0 };
  }

  /** Utenti attivi negli ultimi 30 minuti. */
  async runRealtime(property: string, dimensions: string[], metrics: string[], limit = 50): Promise<GaReport> {
    const prop = normalizeProperty(property);
    const res = await this.call(
      () =>
        this.data.properties.runRealtimeReport({
          property: prop,
          requestBody: {
            dimensions: dimensions.map((name) => ({ name })),
            metrics: metrics.map((name) => ({ name })),
            orderBys: metrics[0] ? [{ metric: { metricName: metrics[0] }, desc: true }] : undefined,
            limit: String(limit),
          },
        }),
      prop,
    );
    return { rows: parseRows(res.data), rowCount: res.data.rowCount ?? 0 };
  }

  private async call<T>(fn: () => Promise<T>, property?: string): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      const e = err as { response?: { data?: { error?: { message?: string } } }; message?: string };
      const msg = e.response?.data?.error?.message ?? e.message ?? '';
      // L'errore di API disabilitata cita l'API specifica: Admin o Data.
      const apiName = /analyticsadmin/i.test(msg) ? 'Google Analytics Admin API' : 'Google Analytics Data API';
      const prop = property ? ` "${property}"` : '';
      throw googleError(err, {
        apiName,
        permissionMessage: `Nessun accesso alla proprietà Google Analytics${prop}.`,
        permissionHint:
          "In Google Analytics apri Amministrazione → Gestione dell'accesso alla proprietà, aggiungi l'email del service account (o del tuo account) con ruolo Visualizzatore. Usa ga_list_properties per vedere gli ID validi.",
      });
    }
  }
}

/** Accetta "123456789" oppure "properties/123456789". */
export function normalizeProperty(value: string): string {
  const id = value.trim().replace(/^properties\//, '');
  if (!/^\d+$/.test(id)) {
    throw new SeoMcpError(
      'INVALID_INPUT',
      `ID di proprietà GA4 non valido: "${value}".`,
      "L'ID è numerico, per esempio 123456789 (non l'ID di misurazione G-XXXX). Usa ga_list_properties per vederli.",
    );
  }
  return `properties/${id}`;
}

export function buildFilter(filters?: GaFilter[]): Schema$Filter | undefined {
  if (!filters?.length) return undefined;
  const expressions: Schema$Filter[] = filters.map((f) => {
    const expr: Schema$Filter = {
      filter: { fieldName: f.field, stringFilter: { matchType: f.matchType ?? 'EXACT', value: f.value, caseSensitive: false } },
    };
    return f.exclude ? { notExpression: expr } : expr;
  });
  return expressions.length === 1 ? expressions[0] : { andGroup: { expressions } };
}

interface RawReport {
  dimensionHeaders?: { name?: string | null }[] | null;
  metricHeaders?: { name?: string | null }[] | null;
  rows?: { dimensionValues?: { value?: string | null }[] | null; metricValues?: { value?: string | null }[] | null }[] | null;
}

export function parseRows(data: RawReport): GaRow[] {
  const dims = (data.dimensionHeaders ?? []).map((h) => h.name ?? '');
  const mets = (data.metricHeaders ?? []).map((h) => h.name ?? '');
  return (data.rows ?? []).map((row) => ({
    dimensions: Object.fromEntries(dims.map((d, i) => [d, row.dimensionValues?.[i]?.value ?? ''])),
    metrics: Object.fromEntries(
      mets.map((m, i) => {
        const n = Number(row.metricValues?.[i]?.value ?? 0);
        return [m, Number.isFinite(n) ? Math.round(n * 10_000) / 10_000 : 0];
      }),
    ),
  }));
}
