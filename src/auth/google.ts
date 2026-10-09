import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname } from 'node:path';
import { CodeChallengeMethod, GoogleAuth, OAuth2Client, type Credentials } from 'google-auth-library';
import { GA_SCOPES } from '../core/ga.js';
import { GSC_SCOPES, type GscAuth } from '../core/gsc.js';
import { SeoMcpError } from '../core/errors.js';
import type { GoogleConfig } from '../config.js';
import { DOCS } from '../links.js';

/** Tutti gli scope richiesti a Google: solo lettura, Search Console e Analytics. */
export const GOOGLE_SCOPES = [...GSC_SCOPES, ...GA_SCOPES];

/** Crea l'autenticazione Google in base alla configurazione. */
export function createGoogleAuth(config: GoogleConfig): GscAuth {
  if (config.mode === 'service-account') {
    if (!existsSync(config.keyFile)) {
      throw new SeoMcpError(
        'NOT_CONFIGURED',
        `File del service account non trovato: ${config.keyFile}`,
        `Controlla il percorso in GOOGLE_APPLICATION_CREDENTIALS. Guida: ${DOCS.google}`,
      );
    }
    return new GoogleAuth({ keyFile: config.keyFile, scopes: GOOGLE_SCOPES });
  }

  if (config.mode === 'oauth') {
    const token = readToken(config.tokenFile);
    if (!token?.refresh_token) {
      throw new SeoMcpError(
        'NOT_CONFIGURED',
        'Accesso Google non ancora autorizzato.',
        'Esegui una volta `npx @contentisking/seomcp auth google` da terminale.',
      );
    }
    const client = new OAuth2Client({ clientId: config.clientId, clientSecret: config.clientSecret });
    client.setCredentials(token);
    // Google può emettere un nuovo refresh token: lo salviamo per non perderlo.
    client.on('tokens', (t) => writeToken(config.tokenFile, { ...readToken(config.tokenFile), ...t }));
    return client;
  }

  throw new SeoMcpError(
    'NOT_CONFIGURED',
    'Le credenziali Google (Search Console e Analytics) non sono configurate.',
    `Imposta GOOGLE_APPLICATION_CREDENTIALS (service account) oppure SEOMCP_GOOGLE_CLIENT_ID e SEOMCP_GOOGLE_CLIENT_SECRET (OAuth). Guida: ${DOCS.google}`,
  );
}

/** Legge l'email del service account, utile per dire all'utente chi aggiungere in Search Console. */
export function serviceAccountEmail(keyFile: string): string | undefined {
  try {
    const json = JSON.parse(readFileSync(keyFile, 'utf8')) as { client_email?: string };
    return json.client_email;
  } catch {
    return undefined;
  }
}

function readToken(path: string): Credentials | undefined {
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as Credentials;
  } catch {
    return undefined;
  }
}

function writeToken(path: string, token: Credentials): void {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  writeFileSync(path, JSON.stringify(token, null, 2), { mode: 0o600 });
}

/**
 * Flusso OAuth una tantum, da terminale.
 * Usa un client OAuth di tipo "App desktop" creato dall'utente nel proprio
 * progetto Google Cloud, con redirect su loopback (127.0.0.1) e PKCE.
 */
export async function runGoogleOAuthFlow(
  config: Extract<GoogleConfig, { mode: 'oauth' }>,
  log: (msg: string) => void = (m) => process.stderr.write(`${m}\n`),
): Promise<void> {
  const state = randomBytes(16).toString('hex');
  const server = createServer();
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as { port: number };
  const redirectUri = `http://127.0.0.1:${port}/callback`;

  const client = new OAuth2Client({ clientId: config.clientId, clientSecret: config.clientSecret, redirectUri });
  const { codeVerifier, codeChallenge } = await client.generateCodeVerifierAsync();
  const authUrl = client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: GOOGLE_SCOPES,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: CodeChallengeMethod.S256,
  });

  log('\nApri questo indirizzo nel browser per autorizzare l\'accesso in sola lettura a Search Console:\n');
  log(`  ${authUrl}\n`);
  openBrowser(authUrl);

  const code = await new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Tempo scaduto (5 minuti). Riprova.')), 5 * 60_000);
    server.on('request', (req, res) => {
      const url = new URL(req.url ?? '/', redirectUri);
      if (url.pathname !== '/callback') {
        res.writeHead(404).end();
        return;
      }
      const error = url.searchParams.get('error');
      const returnedCode = url.searchParams.get('code');
      const ok = !error && returnedCode && url.searchParams.get('state') === state;
      res.writeHead(ok ? 200 : 400, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(ok ? '<p>Autorizzazione completata. Puoi chiudere questa scheda.</p>' : '<p>Autorizzazione non riuscita. Torna al terminale.</p>');
      clearTimeout(timer);
      if (ok) resolve(returnedCode);
      else reject(new Error(error ? `Google ha risposto: ${error}` : 'Parametro state non valido.'));
    });
  }).finally(() => server.close());

  const { tokens } = await client.getToken({ code, codeVerifier, redirect_uri: redirectUri });
  if (!tokens.refresh_token) {
    throw new Error('Google non ha restituito un refresh token. Revoca l\'accesso da myaccount.google.com/linkedapps e riprova.');
  }
  writeToken(config.tokenFile, tokens);
  log(`Token salvato in ${config.tokenFile} (leggibile solo dal tuo utente).`);
}

/** Apre un indirizzo nel browser predefinito, se c'è. */
export function openBrowser(url: string): void {
  const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'explorer' : 'xdg-open';
  try {
    spawn(cmd, [url], { stdio: 'ignore', detached: true }).on('error', () => {}).unref();
  } catch {
    // Nessun browser disponibile (es. server remoto): l'utente usa il link stampato.
  }
}
