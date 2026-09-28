import { connect } from 'node:net';
import { fetchPage, type FetchedPage, type FetchOptions } from './fetch-page.js';

/**
 * Segnali di affidabilità del sito: HTTPS e anzianità del dominio.
 * Il dominio si interroga con RDAP (lo standard che sostituisce WHOIS);
 * per i registri senza RDAP, come .it, si usa il WHOIS ufficiale.
 */

export interface HttpsInfo {
  https: boolean;
  /** La versione http:// reindirizza a https:// (301 o 308 = permanente). */
  httpRedirectsToHttps?: boolean;
  httpRedirectStatus?: number;
  hsts?: string;
  /** Risorse (immagini, script, CSS, iframe) caricate in http:// da una pagina https. */
  mixedContent: number;
}

export interface DomainInfo {
  domain: string;
  source: 'RDAP' | 'WHOIS' | 'non disponibile';
  registered?: string;
  expires?: string;
  lastChanged?: string;
  ageYears?: number;
  registrar?: string;
}

// Suffissi di secondo livello comuni: www.esempio.co.uk → esempio.co.uk.
const SECOND_LEVEL = new Set(['co.uk', 'org.uk', 'ac.uk', 'gov.uk', 'com.au', 'net.au', 'org.au', 'co.nz', 'co.jp', 'com.br', 'com.mx', 'co.za', 'com.ar', 'com.tr', 'com.cn', 'gov.it', 'edu.it']);

/** Dominio registrato a partire dall'hostname. */
export function registeredDomain(hostname: string): string {
  const labels = hostname.toLowerCase().replace(/\.$/, '').split('.');
  const last2 = labels.slice(-2).join('.');
  return SECOND_LEVEL.has(last2) && labels.length >= 3 ? labels.slice(-3).join('.') : last2;
}

export function httpsInfo(page: FetchedPage, httpProbe?: FetchedPage): HttpsInfo {
  const https = page.finalUrl.startsWith('https://');
  const loc = httpProbe?.headers['location'];
  return {
    https,
    httpRedirectsToHttps: httpProbe ? /^https:\/\//i.test(loc ?? '') || (httpProbe.status === 200 && httpProbe.finalUrl.startsWith('https://')) : undefined,
    httpRedirectStatus: httpProbe && httpProbe.status >= 300 && httpProbe.status < 400 ? httpProbe.status : undefined,
    hsts: page.headers['strict-transport-security'],
    mixedContent: https
      ? (page.body.match(/<(?:img|script|iframe|source|video|audio|embed)\b[^>]*\ssrc\s*=\s*["']http:\/\/|<link\b[^>]*\shref\s*=\s*["']http:\/\/[^"']*["'][^>]*rel\s*=\s*["']?stylesheet|<link\b[^>]*rel\s*=\s*["']?stylesheet[^>]*\shref\s*=\s*["']http:\/\//gi) ?? []).length
      : 0,
  };
}

function years(from: string | undefined, now: Date): number | undefined {
  const t = from ? Date.parse(from) : NaN;
  return Number.isNaN(t) ? undefined : Math.round(((now.getTime() - t) / (365.25 * 86_400_000)) * 10) / 10;
}

const day = (s?: string) => (s ? s.slice(0, 10) : undefined);

/** Registri senza RDAP, interrogati via WHOIS (porta 43). */
const WHOIS_SERVERS: Record<string, string> = { it: 'whois.nic.it' };

export async function domainInfo(hostname: string, opts: FetchOptions = {}, now = new Date()): Promise<DomainInfo> {
  const domain = registeredDomain(hostname);
  const tld = domain.split('.').pop() ?? '';

  if (WHOIS_SERVERS[tld]) {
    const text = await whois(WHOIS_SERVERS[tld]!, domain).catch(() => '');
    const field = (name: string) => new RegExp(`^\\s*${name}:\\s*(.+)$`, 'im').exec(text)?.[1]?.trim();
    const registered = field('Created');
    if (registered) {
      const registrarBlock = /Registrar\s*\n([\s\S]*?)\n\s*\n/i.exec(text)?.[1];
      return {
        domain,
        source: 'WHOIS',
        registered: day(registered),
        expires: day(field('Expire Date')),
        lastChanged: day(field('Last Update')),
        ageYears: years(registered, now),
        registrar: registrarBlock ? /Name:\s*(.+)/i.exec(registrarBlock)?.[1]?.trim() : undefined,
      };
    }
    return { domain, source: 'non disponibile' };
  }

  try {
    const res = await fetchPage(`https://rdap.org/domain/${encodeURIComponent(domain)}`, { ...opts, accept: 'application/rdap+json', maxBytes: 256 * 1024, timeoutMs: 10_000 });
    if (res.status !== 200) return { domain, source: 'non disponibile' };
    const data = JSON.parse(res.body) as {
      events?: { eventAction?: string; eventDate?: string }[];
      entities?: { roles?: string[]; vcardArray?: [string, [string, unknown, string, string][]] }[];
    };
    const ev = (action: string) => data.events?.find((e) => e.eventAction === action)?.eventDate;
    const registrar = data.entities?.find((e) => e.roles?.includes('registrar'));
    const fn = registrar?.vcardArray?.[1]?.find((v) => v[0] === 'fn')?.[3];
    return {
      domain,
      source: 'RDAP',
      registered: day(ev('registration')),
      expires: day(ev('expiration')),
      lastChanged: day(ev('last changed')),
      ageYears: years(ev('registration'), now),
      registrar: typeof fn === 'string' ? fn : undefined,
    };
  } catch {
    return { domain, source: 'non disponibile' };
  }
}

/** Client WHOIS minimale: una query testuale su TCP 43, con timeout e limite di dimensione. */
function whois(server: string, query: string, timeoutMs = 8000): Promise<string> {
  return new Promise((resolve, reject) => {
    const socket = connect({ host: server, port: 43 });
    const chunks: Buffer[] = [];
    let size = 0;
    socket.setTimeout(timeoutMs, () => socket.destroy(new Error('timeout')));
    socket.on('connect', () => socket.write(`${query}\r\n`));
    socket.on('data', (c: Buffer) => {
      size += c.length;
      if (size > 64 * 1024) socket.destroy();
      else chunks.push(c);
    });
    socket.on('close', () => resolve(Buffer.concat(chunks).toString('utf8')));
    socket.on('error', reject);
  });
}

export async function siteTrust(page: FetchedPage, opts: FetchOptions = {}): Promise<{ https: HttpsInfo; domain: DomainInfo }> {
  const u = new URL(page.finalUrl);
  const httpUrl = `http://${u.host}${u.pathname}${u.search}`;
  const [probe, domain] = await Promise.all([
    fetchPage(httpUrl, { ...opts, followRedirects: false, maxBytes: 64 * 1024, timeoutMs: 8000 }).catch(() => undefined),
    domainInfo(u.hostname, opts),
  ]);
  return { https: httpsInfo(page, probe), domain };
}
