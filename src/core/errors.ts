/**
 * Errore con un suggerimento pratico per l'utente.
 * `hint` spiega cosa fare, in italiano, senza dettagli interni.
 */
export type SeoMcpErrorCode =
  | 'NOT_CONFIGURED'
  | 'AUTH_FAILED'
  | 'PERMISSION_DENIED'
  | 'INVALID_INPUT'
  | 'QUOTA_EXCEEDED'
  | 'UPSTREAM_ERROR';

export class SeoMcpError extends Error {
  readonly code: SeoMcpErrorCode;
  readonly hint?: string;

  constructor(code: SeoMcpErrorCode, message: string, hint?: string) {
    super(message);
    this.name = 'SeoMcpError';
    this.code = code;
    this.hint = hint;
  }
}
