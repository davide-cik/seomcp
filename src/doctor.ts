import { statSync } from 'node:fs';
import { BingClient } from './core/bing.js';
import { SeoMcpError } from './core/errors.js';
import { GaClient } from './core/ga.js';
import { GscClient } from './core/gsc.js';
import { createGoogleAuth, serviceAccountEmail } from './auth/google.js';
import type { SeoMcpConfig } from './config.js';
import { DOCS } from './links.js';

export interface DiagnosticItem {
  source: 'google' | 'analytics' | 'bing' | 'config';
  status: 'ok' | 'warn' | 'error' | 'off';
  message: string;
  hint?: string;
}

/**
 * Controlla la configurazione e fa una chiamata di prova a ogni fonte.
 * Obiettivo: dire chiaramente cosa manca, prima che l'utente apra una issue.
 */
export async function runDiagnostics(config: SeoMcpConfig): Promise<DiagnosticItem[]> {
  const items: DiagnosticItem[] = [];

  if (config.configFileFound && process.platform !== 'win32') {
    const mode = statSync(config.configFile).mode & 0o077;
    if (mode !== 0) {
      items.push({
        source: 'config',
        status: 'warn',
        message: `${config.configFile} è leggibile da altri utenti del sistema.`,
        hint: `Se contiene chiavi, esegui: chmod 600 "${config.configFile}"`,
      });
    }
  }

  items.push(await checkGoogle(config));
  if (config.google.mode !== 'none') items.push(await checkAnalytics(config));
  items.push(await checkBing(config));
  return items;
}

async function checkGoogle(config: SeoMcpConfig): Promise<DiagnosticItem> {
  const g = config.google;
  if (g.mode === 'none') {
    return {
      source: 'google',
      status: 'off',
      message: 'Search Console non configurata (facoltativa).',
      hint: `Per attivarla segui ${DOCS.google}`,
    };
  }

  const who = g.mode === 'service-account' ? serviceAccountEmail(g.keyFile) : undefined;
  try {
    const sites = await new GscClient(createGoogleAuth(g)).listSites();
    if (sites.length === 0) {
      return {
        source: 'google',
        status: 'warn',
        message: `Autenticazione Google riuscita (${g.mode}), ma nessuna proprietà accessibile.`,
        hint: who
          ? `Aggiungi ${who} come utente della proprietà in Search Console → Impostazioni → Utenti e autorizzazioni.`
          : "Verifica che l'account con cui hai autorizzato abbia accesso ad almeno una proprietà.",
      };
    }
    const list = sites.map((s) => s.siteUrl);
    const def = config.defaults.gscSite;
    if (def && !list.includes(def)) {
      return {
        source: 'google',
        status: 'warn',
        message: `La proprietà predefinita "${def}" non è tra quelle accessibili: ${list.join(', ')}`,
        hint: 'Correggi SEOMCP_GSC_SITE usando esattamente uno dei valori elencati.',
      };
    }
    return { source: 'google', status: 'ok', message: `Search Console OK (${g.mode}): ${list.length} proprietà — ${list.join(', ')}` };
  } catch (err) {
    return toItem('google', err, who ? `Service account: ${who}` : undefined);
  }
}

/** Analytics è facoltativo: se l'API non è abilitata o non ci sono proprietà, lo segnala come spento. */
async function checkAnalytics(config: SeoMcpConfig): Promise<DiagnosticItem> {
  const g = config.google;
  if (g.mode === 'none') return { source: 'analytics', status: 'off', message: 'Google Analytics non configurato.' };
  const who = g.mode === 'service-account' ? serviceAccountEmail(g.keyFile) : undefined;
  try {
    const props = await new GaClient(createGoogleAuth(g)).listProperties();
    if (props.length === 0) {
      return {
        source: 'analytics',
        status: 'off',
        message: 'Google Analytics: nessuna proprietà GA4 accessibile (facoltativo).',
        hint: who
          ? `Per attivarlo aggiungi ${who} con ruolo Visualizzatore in Analytics → Amministrazione → Gestione dell'accesso alla proprietà.`
          : "Per attivarlo verifica che l'account autorizzato veda almeno una proprietà GA4.",
      };
    }
    const list = props.map((p) => `${p.displayName} (${p.property.replace('properties/', '')})`);
    const def = config.defaults.gaProperty?.replace(/^properties\//, '');
    if (def && !props.some((p) => p.property === `properties/${def}`)) {
      return {
        source: 'analytics',
        status: 'warn',
        message: `La proprietà GA4 predefinita "${def}" non è tra quelle accessibili: ${list.join(', ')}`,
        hint: 'Correggi SEOMCP_GA_PROPERTY usando uno degli ID numerici elencati.',
      };
    }
    return { source: 'analytics', status: 'ok', message: `Google Analytics OK: ${props.length} proprietà — ${list.join(', ')}` };
  } catch (err) {
    // API non abilitata: Analytics è facoltativo, quindi è "spento", non un errore.
    if (err instanceof SeoMcpError && err.code === 'NOT_CONFIGURED') {
      return { source: 'analytics', status: 'off', message: `Google Analytics non attivo (facoltativo): ${err.message}`, hint: err.hint };
    }
    return toItem('analytics', err, who ? `Service account: ${who}` : undefined);
  }
}

async function checkBing(config: SeoMcpConfig): Promise<DiagnosticItem> {
  if (!config.bingApiKey) {
    return {
      source: 'bing',
      status: 'off',
      message: 'Bing Webmaster Tools non configurato (facoltativo).',
      hint: `Per attivarlo imposta BING_WEBMASTER_API_KEY. Guida: ${DOCS.bing}`,
    };
  }
  try {
    const sites = await new BingClient({ apiKey: config.bingApiKey }).listSites();
    const list = sites.map((s) => s.url);
    const def = config.defaults.bingSite;
    if (def && !list.includes(def)) {
      return {
        source: 'bing',
        status: 'warn',
        message: `Il sito predefinito "${def}" non è tra quelli del tuo account Bing: ${list.join(', ') || 'nessuno'}`,
        hint: 'Correggi SEOMCP_BING_SITE usando esattamente uno dei valori elencati.',
      };
    }
    return { source: 'bing', status: 'ok', message: `Bing Webmaster OK: ${list.length} siti — ${list.join(', ')}` };
  } catch (err) {
    return toItem('bing', err);
  }
}

function toItem(source: DiagnosticItem['source'], err: unknown, extra?: string): DiagnosticItem {
  if (err instanceof SeoMcpError) {
    return { source, status: 'error', message: err.message, hint: [err.hint, extra].filter(Boolean).join(' ') || undefined };
  }
  return { source, status: 'error', message: `Errore imprevisto: ${(err as Error).message}`, hint: extra };
}

const ICON: Record<DiagnosticItem['status'], string> = { ok: '✅', warn: '⚠️ ', error: '❌', off: '⚪' };

export function formatDiagnostics(items: DiagnosticItem[]): string {
  return items
    .map((i) => `${ICON[i.status]} ${i.message}${i.hint ? `\n   → ${i.hint}` : ''}`)
    .join('\n');
}
