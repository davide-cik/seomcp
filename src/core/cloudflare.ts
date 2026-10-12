import { SeoMcpError } from './errors.js';
import { AI_BOTS } from './geo.js';

export const CLOUDFLARE_API = 'https://api.cloudflare.com/client/v4';

export interface CloudflareClientOptions {
  apiToken: string;
  fetch?: typeof fetch;
  baseUrl?: string;
  timeoutMs?: number;
}

export interface CloudflareZone {
  id: string;
  name: string;
  plan?: string;
}

/** Bot AI riconoscibili dallo user-agent nei log di Cloudflare. Google-Extended e Applebot-Extended
 *  sono solo regole di robots.txt: passano come Googlebot e Applebot, quindi non si distinguono. */
export const CF_AI_BOTS = AI_BOTS.filter((b) => !/-Extended$/.test(b.token));

const PERMISSION_HINT =
  'Crea un token su dash.cloudflare.com/profile/api-tokens con i permessi "Zone → Zone → Read" e "Zone → Analytics → Read", limitato alle zone che ti servono, e impostalo in SEOMCP_CLOUDFLARE_TOKEN.';

/**
 * Client in sola lettura per le statistiche di Cloudflare (API REST per le zone, GraphQL Analytics per i dati).
 * Il dataset httpRequestsAdaptiveGroups è disponibile su tutti i piani, con almeno 31 giorni di storico;
 * sui piani bassi ogni query copre al massimo un giorno, quindi i periodi si leggono giorno per giorno.
 * I dati sono campionati: i numeri sono stime.
 */
export class CloudflareClient {
  private readonly token: string;
  private readonly fetchFn: typeof fetch;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(options: CloudflareClientOptions) {
    if (!options.apiToken) throw new SeoMcpError('NOT_CONFIGURED', 'Token di Cloudflare mancante.', PERMISSION_HINT);
    this.token = options.apiToken;
    this.fetchFn = options.fetch ?? fetch;
    this.baseUrl = options.baseUrl ?? CLOUDFLARE_API;
    this.timeoutMs = options.timeoutMs ?? 30_000;
  }

  async listZones(): Promise<CloudflareZone[]> {
    const data = await this.rest<Array<{ id: string; name: string; plan?: { name?: string } }>>('/zones?per_page=50');
    return data.map((z) => ({ id: z.id, name: z.name, plan: z.plan?.name }));
  }

  /** Trova la zona di un dominio: prova il nome esatto, poi i domini padre (www.esempio.it → esempio.it). */
  async findZone(domain: string): Promise<CloudflareZone> {
    const host = hostOf(domain);
    const parts = host.split('.');
    for (let i = 0; i < parts.length - 1; i++) {
      const name = parts.slice(i).join('.');
      const data = await this.rest<Array<{ id: string; name: string; plan?: { name?: string } }>>(`/zones?name=${encodeURIComponent(name)}`);
      if (data[0]) return { id: data[0].id, name: data[0].name, plan: data[0].plan?.name };
    }
    const zones = await this.listZones().catch(() => []);
    throw new SeoMcpError(
      'INVALID_INPUT',
      `Nessuna zona Cloudflare per ${host}.`,
      zones.length ? `Zone accessibili con questo token: ${zones.map((z) => z.name).join(', ')}.` : PERMISSION_HINT,
    );
  }

  /** Richieste, visite e pagine viste (risposte HTML con stato 200) giorno per giorno. */
  async traffic(zoneId: string, days: number): Promise<TrafficDay[]> {
    return mapDays(days, async ({ start, end, date }) => {
      const r = await this.graphql<{ totals: Array<{ count: number; sum: { visits: number }; avg: { sampleInterval: number } }>; pages: Array<{ count: number }> }>(
        `query($zoneTag: string, $start: Time, $end: Time) { viewer { zones(filter: { zoneTag: $zoneTag }) {
          totals: httpRequestsAdaptiveGroups(limit: 1, filter: { datetime_geq: $start, datetime_lt: $end, requestSource: "eyeball" }) { count sum { visits } avg { sampleInterval } }
          pages: httpRequestsAdaptiveGroups(limit: 1, filter: { datetime_geq: $start, datetime_lt: $end, requestSource: "eyeball", edgeResponseContentTypeName: "html", edgeResponseStatus: 200 }) { count }
        } } }`,
        { zoneTag: zoneId, start, end },
      );
      return {
        date,
        requests: r.totals[0]?.count ?? 0,
        visits: r.totals[0]?.sum.visits ?? 0,
        pageViews: r.pages[0]?.count ?? 0,
        sampleInterval: r.totals[0]?.avg.sampleInterval ?? 1,
      };
    });
  }

  /** Richieste dei crawler AI (riconosciuti dallo user-agent), con le pagine e gli stati di risposta. */
  async aiCrawlerRequests(zoneId: string, days: number): Promise<Array<{ date: string; userAgent: string; path: string; status: number; count: number }>> {
    const or = CF_AI_BOTS.map((b) => `{ userAgent_like: ${JSON.stringify(`%${b.token}%`)} }`).join(', ');
    const rows = await mapDays(days, async ({ start, end, date }) => {
      const r = await this.graphql<{ hits: Array<{ count: number; dimensions: { userAgent: string; clientRequestPath: string; edgeResponseStatus: number } }> }>(
        `query($zoneTag: string, $start: Time, $end: Time) { viewer { zones(filter: { zoneTag: $zoneTag }) {
          hits: httpRequestsAdaptiveGroups(limit: 1000, orderBy: [count_DESC], filter: { datetime_geq: $start, datetime_lt: $end, requestSource: "eyeball", OR: [${or}] }) {
            count dimensions { userAgent clientRequestPath edgeResponseStatus }
          }
        } } }`,
        { zoneTag: zoneId, start, end },
      );
      return r.hits.map((h) => ({ date, userAgent: h.dimensions.userAgent, path: h.dimensions.clientRequestPath, status: h.dimensions.edgeResponseStatus, count: h.count }));
    });
    return rows.flat();
  }

  /** Percorsi con risposte 404 e 5xx, giorno per giorno. */
  async errorRequests(zoneId: string, days: number): Promise<Array<{ date: string; path: string; status: number; count: number; total: number }>> {
    const rows = await mapDays(days, async ({ start, end, date }) => {
      const r = await this.graphql<{
        errors: Array<{ count: number; dimensions: { clientRequestPath: string; edgeResponseStatus: number } }>;
        totals: Array<{ count: number }>;
      }>(
        `query($zoneTag: string, $start: Time, $end: Time) { viewer { zones(filter: { zoneTag: $zoneTag }) {
          errors: httpRequestsAdaptiveGroups(limit: 500, orderBy: [count_DESC], filter: { datetime_geq: $start, datetime_lt: $end, requestSource: "eyeball",
            OR: [{ edgeResponseStatus: 404 }, { edgeResponseStatus_geq: 500, edgeResponseStatus_lt: 600 }] }) {
            count dimensions { clientRequestPath edgeResponseStatus }
          }
          totals: httpRequestsAdaptiveGroups(limit: 1, filter: { datetime_geq: $start, datetime_lt: $end, requestSource: "eyeball" }) { count }
        } } }`,
        { zoneTag: zoneId, start, end },
      );
      const total = r.totals[0]?.count ?? 0;
      return r.errors.map((e) => ({ date, path: e.dimensions.clientRequestPath, status: e.dimensions.edgeResponseStatus, count: e.count, total }));
    });
    return rows.flat();
  }

  private async graphql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
    const body = await this.call<{ data?: { viewer?: { zones?: T[] } }; errors?: Array<{ message: string }> | null }>('/graphql', {
      method: 'POST',
      body: JSON.stringify({ query, variables }),
    });
    if (body.errors?.length) {
      const msg = body.errors.map((e) => e.message).join('; ');
      if (/not authorized|authz|permission|access/i.test(msg)) {
        throw new SeoMcpError('PERMISSION_DENIED', `Cloudflare non concede le statistiche di questa zona: ${msg}`, PERMISSION_HINT);
      }
      throw new SeoMcpError('UPSTREAM_ERROR', `Errore dall'API GraphQL di Cloudflare: ${msg}`);
    }
    const zone = body.data?.viewer?.zones?.[0];
    if (!zone) throw new SeoMcpError('PERMISSION_DENIED', 'Cloudflare non ha restituito dati per questa zona.', PERMISSION_HINT);
    return zone;
  }

  private async rest<T>(path: string): Promise<T> {
    const body = await this.call<{ success?: boolean; result?: T; errors?: Array<{ message: string }> }>(path, { method: 'GET' });
    if (body.success === false) {
      throw new SeoMcpError('UPSTREAM_ERROR', `Errore dall'API di Cloudflare: ${(body.errors ?? []).map((e) => e.message).join('; ')}`);
    }
    return body.result as T;
  }

  private async call<T>(path: string, init: RequestInit): Promise<T> {
    let res: Response;
    try {
      res = await this.fetchFn(`${this.baseUrl}${path}`, {
        ...init,
        headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (err) {
      throw new SeoMcpError('UPSTREAM_ERROR', `API di Cloudflare non raggiungibile (${(err as Error).name}).`);
    }
    const body = (await res.json().catch(() => null)) as T | null;
    if (res.status === 401 || res.status === 403) {
      throw new SeoMcpError(res.status === 401 ? 'AUTH_FAILED' : 'PERMISSION_DENIED', 'Token di Cloudflare non valido o senza i permessi necessari.', PERMISSION_HINT);
    }
    if (res.status === 429) throw new SeoMcpError('QUOTA_EXCEEDED', 'Troppe richieste all\'API di Cloudflare (limite: 300 query ogni 5 minuti). Riprova tra qualche minuto.');
    if (!res.ok || !body) throw new SeoMcpError('UPSTREAM_ERROR', `Errore dall'API di Cloudflare (HTTP ${res.status}).`);
    return body;
  }
}

export interface TrafficDay {
  date: string;
  requests: number;
  visits: number;
  pageViews: number;
  sampleInterval: number;
}

export function hostOf(value: string): string {
  try {
    return new URL(/^https?:\/\//.test(value) ? value : `https://${value}`).hostname.toLowerCase();
  } catch {
    return value.toLowerCase();
  }
}

/** Il bot AI corrispondente a uno user-agent, o undefined. */
export function aiBotOf(userAgent: string): (typeof CF_AI_BOTS)[number] | undefined {
  const ua = userAgent.toLowerCase();
  // I token più lunghi prima: "ChatGPT-User" non deve essere confuso, "Applebot" dopo i suoi derivati.
  return [...CF_AI_BOTS].sort((a, b) => b.token.length - a.token.length).find((b) => ua.includes(b.token.toLowerCase()));
}

/** Esegue una funzione per ognuno degli ultimi `days` giorni (finestre di 24 ore che finiscono adesso), 4 alla volta. */
async function mapDays<T>(days: number, fn: (w: { start: string; end: string; date: string }) => Promise<T>): Promise<T[]> {
  const now = Date.now();
  const windows = Array.from({ length: days }, (_, i) => {
    const end = new Date(now - i * 86_400_000);
    const start = new Date(end.getTime() - 86_400_000);
    return { start: start.toISOString(), end: end.toISOString(), date: start.toISOString().slice(0, 10) };
  }).reverse();
  const out: T[] = [];
  for (let i = 0; i < windows.length; i += 4) out.push(...(await Promise.all(windows.slice(i, i + 4).map(fn))));
  return out;
}
