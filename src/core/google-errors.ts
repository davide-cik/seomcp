import { SeoMcpError } from './errors.js';

/** Contesto del prodotto Google, per messaggi d'errore specifici. */
export interface GoogleErrorContext {
  /** Nome dell'API come appare nella libreria di Google Cloud, es. "Google Search Console API". */
  apiName: string;
  /** Messaggio e suggerimento quando manca l'accesso alla risorsa (sito, proprietà). */
  permissionMessage: string;
  permissionHint: string;
}

interface GaxiosLikeError {
  status?: number;
  code?: number | string;
  message?: string;
  response?: { status?: number; data?: { error?: { status?: string; message?: string; details?: { reason?: string }[] } } };
}

/** Traduce un errore delle API Google in un SeoMcpError con un suggerimento pratico. */
export function googleError(err: unknown, ctx: GoogleErrorContext): SeoMcpError {
  const e = err as GaxiosLikeError;
  const status = e.response?.status ?? e.status ?? (typeof e.code === 'number' ? e.code : undefined);
  const apiError = e.response?.data?.error;
  const message = apiError?.message ?? e.message ?? 'errore sconosciuto';
  const reasons = (apiError?.details ?? []).map((d) => d.reason ?? '');

  if (reasons.includes('API_KEY_INVALID') || /API key not valid/i.test(message)) {
    return new SeoMcpError(
      'AUTH_FAILED',
      'API key Google non valida.',
      'Controlla il valore di SEOMCP_GOOGLE_API_KEY: copiala di nuovo da Google Cloud Console → API e servizi → Credenziali.',
    );
  }

  if (status === 401) {
    return new SeoMcpError(
      'AUTH_FAILED',
      'Autenticazione Google non valida o scaduta.',
      'Esegui `npx @contentisking/seomcp doctor`. Con OAuth, ripeti `npx @contentisking/seomcp auth google`.',
    );
  }

  if (status === 403) {
    if (reasons.includes('SERVICE_DISABLED') || /has not been used|is disabled|SERVICE_DISABLED/i.test(message)) {
      return new SeoMcpError(
        'NOT_CONFIGURED',
        `La ${ctx.apiName} non è abilitata nel tuo progetto Google Cloud.`,
        `In Google Cloud Console apri API e servizi → Libreria, cerca "${ctx.apiName}" e clicca Abilita. L'attivazione può richiedere qualche minuto.`,
      );
    }
    if (reasons.includes('ACCESS_TOKEN_SCOPE_INSUFFICIENT') || /insufficient authentication scopes/i.test(message)) {
      return new SeoMcpError(
        'AUTH_FAILED',
        "L'autorizzazione Google non include questo servizio.",
        'Ripeti una volta `npx @contentisking/seomcp auth google` per autorizzare anche i nuovi servizi.',
      );
    }
    return new SeoMcpError('PERMISSION_DENIED', ctx.permissionMessage, ctx.permissionHint);
  }

  if (status === 429) {
    return new SeoMcpError('QUOTA_EXCEEDED', `Quota della ${ctx.apiName} superata.`, 'Riprova tra qualche minuto.');
  }
  if (status === 400) {
    // Il messaggio di Google è utile al modello per correggere la richiesta (es. nome di metrica errato).
    return new SeoMcpError('INVALID_INPUT', `Richiesta non valida: ${message}`);
  }
  return new SeoMcpError('UPSTREAM_ERROR', `Errore dalla ${ctx.apiName}: ${message}`);
}
