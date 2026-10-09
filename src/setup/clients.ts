import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { PACKAGE_SPEC } from '../links.js';

/**
 * Dove e come ogni assistente legge i server MCP.
 * Nella configurazione dell'assistente va solo il comando di avvio: le credenziali
 * restano in config.json di seomcp, quindi nessuna chiave finisce nei file dei client.
 */

export type ClientFormat = 'claude-cli' | 'json' | 'codex-toml' | 'vibe-toml';

export interface ClientTarget {
  id: string;
  name: string;
  format: ClientFormat;
  /** File di configurazione (assente per Claude Code, che si configura con il suo comando). */
  file?: string;
  /** Chiave che contiene i server nel JSON. */
  key?: 'mcpServers' | 'servers';
  /** Campi aggiunti alla voce di seomcp, per i client che li richiedono. */
  extra?: Record<string, unknown>;
  /** App con interfaccia grafica: su macOS non vedono il PATH del terminale. */
  gui?: boolean;
  /** Cosa fare dopo per rendere attiva la modifica. */
  restart: string;
}

export interface Env {
  platform: NodeJS.Platform;
  home: string;
  vars: NodeJS.ProcessEnv;
}

export function currentEnv(): Env {
  return { platform: process.platform, home: homedir(), vars: process.env };
}

/** Cartella delle impostazioni delle app: Application Support su macOS, APPDATA su Windows, ~/.config su Linux. */
function appDataDir(env: Env): string {
  if (env.platform === 'darwin') return join(env.home, 'Library', 'Application Support');
  if (env.platform === 'win32') return env.vars.APPDATA ?? join(env.home, 'AppData', 'Roaming');
  return env.vars.XDG_CONFIG_HOME ?? join(env.home, '.config');
}

export function clientTargets(env: Env = currentEnv()): ClientTarget[] {
  const app = appDataDir(env);
  return [
    { id: 'claude-code', name: 'Claude Code', format: 'claude-cli', restart: 'Avvia claude e digita /mcp: seomcp deve risultare connesso.' },
    {
      id: 'claude-desktop', name: 'Claude Desktop', format: 'json', key: 'mcpServers', gui: true,
      file: join(app, 'Claude', 'claude_desktop_config.json'),
      restart: 'Chiudi Claude Desktop del tutto (non basta chiudere la finestra) e riaprilo.',
    },
    {
      id: 'chatgpt', name: 'ChatGPT (app desktop) e Codex', format: 'codex-toml', gui: true,
      file: join(env.vars.CODEX_HOME ?? join(env.home, '.codex'), 'config.toml'),
      restart: "Riavvia l'app di ChatGPT o Codex.",
    },
    {
      id: 'vscode-copilot', name: 'GitHub Copilot in VS Code', format: 'json', key: 'servers', extra: { type: 'stdio' },
      file: join(app, 'Code', 'User', 'mcp.json'),
      restart: 'In VS Code esegui "MCP: List Servers" e avvia seomcp, poi usa la chat in modalità Agent.',
    },
    {
      id: 'copilot-cli', name: 'GitHub Copilot CLI', format: 'json', key: 'mcpServers', extra: { type: 'local', tools: ['*'] },
      file: join(env.home, '.copilot', 'mcp-config.json'),
      restart: 'Riavvia Copilot CLI.',
    },
    {
      id: 'gemini-cli', name: 'Gemini CLI', format: 'json', key: 'mcpServers',
      file: join(env.home, '.gemini', 'settings.json'),
      restart: 'Avvia gemini e digita /mcp: seomcp deve comparire nell\'elenco.',
    },
    {
      id: 'mistral-vibe', name: 'Mistral Vibe CLI', format: 'vibe-toml',
      file: join(env.home, '.vibe', 'config.toml'),
      restart: 'Riavvia vibe.',
    },
  ];
}

export interface LaunchCommand {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

/** Cartelle in cui le app grafiche di macOS trovano node anche senza il PATH del terminale. */
const MAC_STANDARD_BIN = ['/usr/local/bin', '/opt/homebrew/bin'];

/**
 * Il comando che l'assistente usa per avviare seomcp.
 * - Windows: npx è uno script .cmd, le app lo avviano tramite cmd.
 * - macOS con node installato da nvm, fnm o Volta: le app grafiche non vedono il PATH
 *   del terminale, quindi servono il percorso completo di npx e quello di node.
 */
export function launchCommand(target: Pick<ClientTarget, 'gui'>, env: Env = currentEnv(), nodePath: string = process.execPath): LaunchCommand {
  const args = ['-y', PACKAGE_SPEC];
  if (env.platform === 'win32') return { command: 'cmd', args: ['/c', 'npx', ...args] };
  const nodeDir = dirname(nodePath);
  if (target.gui && env.platform === 'darwin' && !MAC_STANDARD_BIN.includes(nodeDir)) {
    return { command: join(nodeDir, 'npx'), args, env: { PATH: [nodeDir, ...MAC_STANDARD_BIN, '/usr/bin', '/bin'].join(':') } };
  }
  return { command: 'npx', args };
}

export type MergeResult =
  | { status: 'added' | 'replaced'; text: string }
  | { status: 'exists' }
  | { status: 'invalid'; reason: string };

/**
 * Aggiunge (o sostituisce, se richiesto) la voce di seomcp in un file JSON di configurazione,
 * lasciando intatto tutto il resto. Un file che non è JSON valido (per esempio con commenti) non viene toccato.
 */
export function mergeJsonConfig(existing: string | undefined, target: ClientTarget, launch: LaunchCommand, overwrite = false): MergeResult {
  let root: Record<string, unknown> = {};
  if (existing !== undefined && existing.trim() !== '') {
    try {
      const parsed: unknown = JSON.parse(existing);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { status: 'invalid', reason: 'il file non contiene un oggetto JSON' };
      root = parsed as Record<string, unknown>;
    } catch {
      return { status: 'invalid', reason: 'il file non è JSON valido (contiene commenti o errori)' };
    }
  }
  const key = target.key ?? 'mcpServers';
  const current = root[key];
  if (current !== undefined && (typeof current !== 'object' || current === null || Array.isArray(current))) {
    return { status: 'invalid', reason: `la chiave "${key}" non è un oggetto` };
  }
  const servers = { ...((current as Record<string, unknown> | undefined) ?? {}) };
  const had = 'seomcp' in servers;
  if (had && !overwrite) return { status: 'exists' };
  servers.seomcp = { ...target.extra, ...launch };
  root[key] = servers;
  return { status: had ? 'replaced' : 'added', text: `${JSON.stringify(root, null, 2)}\n` };
}

const tomlString = (s: string) => JSON.stringify(s);
const tomlArray = (a: string[]) => `[${a.map(tomlString).join(', ')}]`;
const tomlInline = (o: Record<string, string>) => `{ ${Object.entries(o).map(([k, v]) => `${tomlString(k)} = ${tomlString(v)}`).join(', ')} }`;

/** Il blocco TOML di seomcp per Codex o per Vibe. */
export function tomlBlock(format: 'codex-toml' | 'vibe-toml', launch: LaunchCommand): string {
  if (format === 'codex-toml') {
    const lines = ['[mcp_servers.seomcp]', `command = ${tomlString(launch.command)}`, `args = ${tomlArray(launch.args)}`];
    if (launch.env) lines.push('', '[mcp_servers.seomcp.env]', ...Object.entries(launch.env).map(([k, v]) => `${k} = ${tomlString(v)}`));
    return lines.join('\n');
  }
  const lines = ['[[mcp_servers]]', 'name = "seomcp"', 'transport = "stdio"', `command = ${tomlString(launch.command)}`, `args = ${tomlArray(launch.args)}`];
  if (launch.env) lines.push(`env = ${tomlInline(launch.env)}`);
  return lines.join('\n');
}

/** true se il file TOML contiene già un server chiamato seomcp. */
export function tomlHasSeomcp(format: 'codex-toml' | 'vibe-toml', text: string): boolean {
  return format === 'codex-toml'
    ? /^\s*\[mcp_servers\.(?:seomcp|"seomcp")\]\s*$/m.test(text)
    : /^\s*\[\[mcp_servers\]\][^[]*?^\s*name\s*=\s*["']seomcp["']/m.test(text);
}

/**
 * Accoda il blocco di seomcp al file TOML. Un server seomcp già presente non viene modificato:
 * riscrivere un TOML senza un parser rischierebbe di rovinare il resto del file.
 */
export function appendToml(existing: string | undefined, format: 'codex-toml' | 'vibe-toml', launch: LaunchCommand): MergeResult {
  const text = existing ?? '';
  if (tomlHasSeomcp(format, text)) return { status: 'exists' };
  const sep = text === '' ? '' : text.endsWith('\n\n') ? '' : text.endsWith('\n') ? '\n' : '\n\n';
  return { status: 'added', text: `${text}${sep}${tomlBlock(format, launch)}\n` };
}

/** Argomenti di `claude mcp add` (le credenziali restano in config.json, quindi niente -e). */
export function claudeAddArgs(launch: LaunchCommand): string[] {
  const env = Object.entries(launch.env ?? {}).flatMap(([k, v]) => ['-e', `${k}=${v}`]);
  return ['mcp', 'add', 'seomcp', '-s', 'user', ...env, '--', launch.command, ...launch.args];
}

/** Pulisce un percorso incollato o trascinato nel terminale: virgolette, spazi con escape, ~ iniziale. */
export function normalizeInputPath(input: string, home: string = homedir()): string {
  let p = input.trim();
  if ((p.startsWith('"') && p.endsWith('"')) || (p.startsWith("'") && p.endsWith("'"))) p = p.slice(1, -1);
  else p = p.replace(/\\ /g, ' ');
  if (p === '~') return home;
  if (p.startsWith('~/')) return join(home, p.slice(2));
  return p;
}

/** Mostra una chiave senza rivelarla: solo gli ultimi 4 caratteri. */
export function maskSecret(s: string | undefined): string {
  if (!s) return '';
  return s.length <= 8 ? '••••' : `••••${s.slice(-4)}`;
}
