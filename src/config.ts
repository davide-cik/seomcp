import { readFileSync, existsSync } from 'node:fs';
import { homedir, platform } from 'node:os';
import { join } from 'node:path';
import { z } from 'zod';

/**
 * Configurazione del server MCP e della CLI.
 * Priorità: variabili d'ambiente > file di configurazione > default.
 */

const fileSchema = z
  .object({
    google: z
      .object({
        serviceAccountFile: z.string().optional(),
        oauthClientId: z.string().optional(),
        oauthClientSecret: z.string().optional(),
      })
      .optional(),
    bing: z.object({ apiKey: z.string().optional() }).optional(),
    defaults: z
      .object({
        gscSite: z.string().optional(),
        bingSite: z.string().optional(),
        gaProperty: z.string().optional(),
        country: z.string().optional(),
        language: z.string().optional(),
      })
      .optional(),
  })
  .strict();

export type GoogleConfig =
  | { mode: 'service-account'; keyFile: string }
  | { mode: 'oauth'; clientId: string; clientSecret: string; tokenFile: string }
  | { mode: 'none' };

export interface SeoMcpConfig {
  configDir: string;
  configFile: string;
  /** true se il file di configurazione esiste. */
  configFileFound: boolean;
  google: GoogleConfig;
  bingApiKey?: string;
  defaults: {
    gscSite?: string;
    bingSite?: string;
    gaProperty?: string;
    country: string;
    language: string;
  };
}

export function defaultConfigDir(env: NodeJS.ProcessEnv = process.env): string {
  if (env.SEOMCP_CONFIG_DIR) return env.SEOMCP_CONFIG_DIR;
  if (platform() === 'win32' && env.APPDATA) return join(env.APPDATA, 'seomcp');
  return join(env.XDG_CONFIG_HOME ?? join(homedir(), '.config'), 'seomcp');
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): SeoMcpConfig {
  const configDir = defaultConfigDir(env);
  const configFile = join(configDir, 'config.json');
  const configFileFound = existsSync(configFile);
  const file = configFileFound ? readConfigFile(configFile) : {};

  const keyFile = env.GOOGLE_APPLICATION_CREDENTIALS || file.google?.serviceAccountFile;
  const clientId = env.SEOMCP_GOOGLE_CLIENT_ID || file.google?.oauthClientId;
  const clientSecret = env.SEOMCP_GOOGLE_CLIENT_SECRET || file.google?.oauthClientSecret;

  let google: GoogleConfig = { mode: 'none' };
  if (keyFile) google = { mode: 'service-account', keyFile };
  else if (clientId && clientSecret) {
    google = { mode: 'oauth', clientId, clientSecret, tokenFile: join(configDir, 'google-token.json') };
  }

  return {
    configDir,
    configFile,
    configFileFound,
    google,
    bingApiKey: env.BING_WEBMASTER_API_KEY || file.bing?.apiKey || undefined,
    defaults: {
      gscSite: env.SEOMCP_GSC_SITE || file.defaults?.gscSite,
      bingSite: env.SEOMCP_BING_SITE || file.defaults?.bingSite,
      gaProperty: env.SEOMCP_GA_PROPERTY || file.defaults?.gaProperty,
      country: env.SEOMCP_COUNTRY || file.defaults?.country || 'it',
      language: env.SEOMCP_LANGUAGE || file.defaults?.language || 'it-IT',
    },
  };
}

function readConfigFile(path: string): z.infer<typeof fileSchema> {
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    throw new Error(`Il file di configurazione ${path} non è un JSON valido: ${(err as Error).message}`);
  }
  const parsed = fileSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.') || '(radice)'}: ${i.message}`).join('\n');
    throw new Error(`Il file di configurazione ${path} contiene errori:\n${issues}`);
  }
  return parsed.data;
}
