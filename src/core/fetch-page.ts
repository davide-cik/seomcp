import { lookup as dnsLookup, type LookupAddress } from 'node:dns';
import { request as httpRequest, type IncomingMessage } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { isIP, type LookupFunction } from 'node:net';
import { createBrotliDecompress, createGunzip, createInflate } from 'node:zlib';
import { SeoMcpError } from './errors.js';

/**
 * Scaricamento sicuro di pagine web per l'analisi GEO.
 *
 * Il contenuto scaricato è dato non affidabile: viene solo letto, mai eseguito.
 * Gli indirizzi interni (localhost, reti private, metadati cloud) sono bloccati
 * al momento della connessione, anche dopo i redirect: un sito non può usare
 * seomcp per sondare la rete locale di chi lo usa.
 */

export interface FetchOptions {
  userAgent?: string;
  maxBytes?: number;
  timeoutMs?: number;
  maxRedirects?: number;
  /** Solo per sviluppo: consente indirizzi privati (es. un sito di staging in locale). */
  allowPrivate?: boolean;
  /** false: restituisce la risposta di redirect invece di seguirla. */
  followRedirects?: boolean;
  /** Header Accept personalizzato (es. per RDAP). */
  accept?: string;
}

export interface FetchedPage {
  requestedUrl: string;
  finalUrl: string;
  status: number;
  headers: Record<string, string>;
  body: string;
  /** Byte scaricati, dopo la decompressione. */
  bytes: number;
  truncated: boolean;
  redirects: string[];
  responseMs: number;
}

export const DEFAULT_MAX_BYTES = 2 * 1024 * 1024;

export async function fetchPage(url: string, opts: FetchOptions = {}): Promise<FetchedPage> {
  const maxRedirects = opts.maxRedirects ?? 5;
  const redirects: string[] = [];
  const started = Date.now();
  let current = checkUrl(url);

  for (;;) {
    const res = await requestOnce(current, opts);
    const location = res.headers.location;
    if (res.status >= 300 && res.status < 400 && location && opts.followRedirects !== false) {
      if (redirects.length >= maxRedirects) {
        throw new SeoMcpError('UPSTREAM_ERROR', `Troppi redirect (più di ${maxRedirects}) a partire da ${url}.`);
      }
      const next = checkUrl(new URL(location, current).toString());
      redirects.push(next.toString());
      current = next;
      continue;
    }
    return { requestedUrl: url, finalUrl: current.toString(), redirects, responseMs: Date.now() - started, ...res };
  }
}

function checkUrl(value: string): URL {
  let u: URL;
  try {
    u = new URL(value);
  } catch {
    throw new SeoMcpError('INVALID_INPUT', `URL non valido: ${value}`);
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new SeoMcpError('INVALID_INPUT', 'Sono ammessi solo URL http e https.');
  }
  if (u.username || u.password) throw new SeoMcpError('INVALID_INPUT', 'Gli URL con credenziali non sono ammessi.');
  u.hash = '';
  return u;
}

interface RawResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
  bytes: number;
  truncated: boolean;
}

function requestOnce(u: URL, opts: FetchOptions): Promise<RawResponse> {
  const maxBytes = opts.maxBytes ?? DEFAULT_MAX_BYTES;
  const timeoutMs = opts.timeoutMs ?? 15_000;
  const request = u.protocol === 'https:' ? httpsRequest : httpRequest;

  // Gli host scritti come IP non passano dal lookup DNS: controllo diretto, prima di connettersi.
  const literal = u.hostname.replace(/^\[|\]$/g, '');
  if (!opts.allowPrivate && isIP(literal) && isPrivateIp(literal)) return Promise.reject(blockedError(u.hostname));

  return new Promise((resolve, reject) => {
    const req = request(
      u,
      {
        method: 'GET',
        lookup: opts.allowPrivate ? undefined : safeLookup,
        headers: {
          'User-Agent': opts.userAgent ?? 'seomcp (+https://seomcp.contentisking.guru)',
          Accept: opts.accept ?? 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'Accept-Language': 'it-IT,it;q=0.9,en;q=0.7',
        },
        timeout: timeoutMs,
      },
      (res) => readBody(res, maxBytes).then(resolve, reject),
    );
    req.on('timeout', () => req.destroy(new SeoMcpError('UPSTREAM_ERROR', `Nessuna risposta da ${u.host} entro ${timeoutMs / 1000} secondi.`)));
    req.on('error', (err) =>
      reject(err instanceof SeoMcpError ? err : new SeoMcpError('UPSTREAM_ERROR', `Impossibile scaricare ${u.host}: ${(err as NodeJS.ErrnoException).code ?? err.message}`)),
    );
    req.end();
  });
}

function readBody(res: IncomingMessage, maxBytes: number): Promise<RawResponse> {
  const headers: Record<string, string> = {};
  for (const [k, v] of Object.entries(res.headers)) if (v !== undefined) headers[k] = Array.isArray(v) ? v.join(', ') : v;

  const enc = (headers['content-encoding'] ?? '').toLowerCase();
  const stream = enc.includes('br') ? res.pipe(createBrotliDecompress()) : enc.includes('gzip') ? res.pipe(createGunzip()) : enc.includes('deflate') ? res.pipe(createInflate()) : res;

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let bytes = 0;
    let truncated = false;
    const finish = () =>
      resolve({ status: res.statusCode ?? 0, headers, body: Buffer.concat(chunks).toString('utf8'), bytes, truncated });
    stream.on('data', (chunk: Buffer) => {
      if (truncated) return;
      const room = maxBytes - bytes;
      if (chunk.length > room) {
        chunks.push(chunk.subarray(0, room));
        bytes += room;
        truncated = true;
        res.destroy();
        finish();
        return;
      }
      chunks.push(chunk);
      bytes += chunk.length;
    });
    stream.on('end', () => !truncated && finish());
    stream.on('error', (err) => !truncated && reject(new SeoMcpError('UPSTREAM_ERROR', `Risposta non leggibile: ${err.message}`)));
  });
}

const safeLookup: LookupFunction = (hostname, options, callback) => {
  dnsLookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err, '', 0);
    const list = addresses as LookupAddress[];
    const bad = list.find((a) => isPrivateIp(a.address));
    if (bad || list.length === 0) return callback(blockedError(hostname), '', 0);
    if ((options as { all?: boolean }).all) return (callback as unknown as (e: null, a: LookupAddress[]) => void)(null, list);
    const first = list[0]!;
    return callback(null, first.address, first.family);
  });
};

function blockedError(host: string): SeoMcpError {
  return new SeoMcpError(
    'INVALID_INPUT',
    `L'indirizzo ${host} punta a una rete interna o locale: per sicurezza non viene analizzato.`,
    'seomcp analizza solo siti pubblici su internet.',
  );
}

/** true per indirizzi non pubblici: loopback, reti private, link-local, CGNAT, multicast, riservati. */
export function isPrivateIp(ip: string): boolean {
  const v = ip.toLowerCase();
  if (isIP(v) === 4) {
    const [a = 0, b = 0] = v.split('.').map(Number);
    return (
      a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0) ||
      (a === 198 && (b === 18 || b === 19))
    );
  }
  if (isIP(v) === 6) {
    if (v === '::' || v === '::1') return true;
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(v);
    if (mapped?.[1]) return isPrivateIp(mapped[1]);
    return /^(fc|fd|fe8|fe9|fea|feb|ff)/.test(v) || v.startsWith('64:ff9b:') || v.startsWith('2001:db8:');
  }
  return true;
}
