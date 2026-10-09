import { mkdtempSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadConfig, writeConfigFile } from '../src/config.js';
import {
  appendToml,
  claudeAddArgs,
  clientTargets,
  launchCommand,
  maskSecret,
  mergeJsonConfig,
  normalizeInputPath,
  tomlHasSeomcp,
  type Env,
} from '../src/setup/clients.js';

const linux: Env = { platform: 'linux', home: '/home/mario', vars: {} };
const mac: Env = { platform: 'darwin', home: '/Users/mario', vars: {} };
const win: Env = { platform: 'win32', home: 'C:\\Users\\mario', vars: { APPDATA: 'C:\\Users\\mario\\AppData\\Roaming' } };
const target = (id: string, env = linux) => clientTargets(env).find((t) => t.id === id)!;
const npx = { command: 'npx', args: ['-y', '@contentisking/seomcp'] };

describe('clientTargets', () => {
  it('percorsi dei file di configurazione per sistema operativo', () => {
    expect(target('claude-desktop', mac).file).toBe('/Users/mario/Library/Application Support/Claude/claude_desktop_config.json');
    expect(target('claude-desktop', linux).file).toBe('/home/mario/.config/Claude/claude_desktop_config.json');
    expect(target('vscode-copilot', win).file).toContain(join('Roaming', 'Code', 'User', 'mcp.json'));
    expect(target('gemini-cli').file).toBe('/home/mario/.gemini/settings.json');
    expect(target('chatgpt', { ...linux, vars: { CODEX_HOME: '/opt/codex' } }).file).toBe('/opt/codex/config.toml');
  });
});

describe('launchCommand', () => {
  it('npx ovunque, cmd /c su Windows', () => {
    expect(launchCommand({ gui: false }, linux)).toEqual(npx);
    expect(launchCommand({ gui: true }, win)).toEqual({ command: 'cmd', args: ['/c', 'npx', '-y', '@contentisking/seomcp'] });
  });

  it('macOS con nvm: percorso completo e PATH per le app grafiche', () => {
    const l = launchCommand({ gui: true }, mac, '/Users/mario/.nvm/versions/node/v22.1.0/bin/node');
    expect(l.command).toBe('/Users/mario/.nvm/versions/node/v22.1.0/bin/npx');
    expect(l.env?.PATH?.startsWith('/Users/mario/.nvm/versions/node/v22.1.0/bin:')).toBe(true);
    expect(launchCommand({ gui: true }, mac, '/opt/homebrew/bin/node')).toEqual(npx);
    expect(launchCommand({ gui: false }, mac, '/Users/mario/.nvm/versions/node/v22.1.0/bin/node')).toEqual(npx);
  });
});

describe('mergeJsonConfig', () => {
  it('aggiunge seomcp senza toccare il resto', () => {
    const existing = JSON.stringify({ theme: 'dark', mcpServers: { altro: { command: 'x' } } });
    const r = mergeJsonConfig(existing, target('claude-desktop'), npx);
    expect(r.status).toBe('added');
    const json = JSON.parse((r as { text: string }).text);
    expect(json.theme).toBe('dark');
    expect(json.mcpServers.altro).toEqual({ command: 'x' });
    expect(json.mcpServers.seomcp).toEqual(npx);
  });

  it('crea il file se non esiste, con la chiave giusta per VS Code e i campi per Copilot CLI', () => {
    const vs = JSON.parse((mergeJsonConfig(undefined, target('vscode-copilot'), npx) as { text: string }).text);
    expect(vs.servers.seomcp).toEqual({ type: 'stdio', ...npx });
    const cli = JSON.parse((mergeJsonConfig('', target('copilot-cli'), npx) as { text: string }).text);
    expect(cli.mcpServers.seomcp).toEqual({ type: 'local', tools: ['*'], ...npx });
  });

  it('una voce esistente si sostituisce solo se richiesto, eliminando le vecchie variabili', () => {
    const existing = JSON.stringify({ mcpServers: { seomcp: { command: 'npx', args: [], env: { BING_WEBMASTER_API_KEY: 'k' } } } });
    expect(mergeJsonConfig(existing, target('gemini-cli'), npx).status).toBe('exists');
    const r = mergeJsonConfig(existing, target('gemini-cli'), npx, true);
    expect(r.status).toBe('replaced');
    expect(JSON.parse((r as { text: string }).text).mcpServers.seomcp).toEqual(npx);
  });

  it('non tocca file con commenti o struttura inattesa', () => {
    expect(mergeJsonConfig('{ // commento\n}', target('vscode-copilot'), npx).status).toBe('invalid');
    expect(mergeJsonConfig('[]', target('gemini-cli'), npx).status).toBe('invalid');
    expect(mergeJsonConfig('{"mcpServers": []}', target('gemini-cli'), npx).status).toBe('invalid');
  });
});

describe('TOML', () => {
  it('Codex: accoda il blocco e riconosce quello già presente', () => {
    const r = appendToml('model = "o3"\n', 'codex-toml', npx);
    expect(r.status).toBe('added');
    const text = (r as { text: string }).text;
    expect(text).toBe('model = "o3"\n\n[mcp_servers.seomcp]\ncommand = "npx"\nargs = ["-y", "@contentisking/seomcp"]\n');
    expect(tomlHasSeomcp('codex-toml', text)).toBe(true);
    expect(appendToml(text, 'codex-toml', npx).status).toBe('exists');
  });

  it('Vibe: blocco [[mcp_servers]] con name seomcp', () => {
    const text = (appendToml(undefined, 'vibe-toml', npx) as { text: string }).text;
    expect(text).toContain('[[mcp_servers]]\nname = "seomcp"\ntransport = "stdio"');
    expect(tomlHasSeomcp('vibe-toml', text)).toBe(true);
    expect(tomlHasSeomcp('vibe-toml', '[[mcp_servers]]\nname = "altro"\n')).toBe(false);
  });
});

describe('utilità', () => {
  it('claude mcp add senza chiavi', () => {
    expect(claudeAddArgs(npx)).toEqual(['mcp', 'add', 'seomcp', '-s', 'user', '--', 'npx', '-y', '@contentisking/seomcp']);
  });

  it('percorsi incollati o trascinati nel terminale', () => {
    expect(normalizeInputPath("'/Users/mario/Download/chiave seomcp.json' ", '/Users/mario')).toBe('/Users/mario/Download/chiave seomcp.json');
    expect(normalizeInputPath('/Users/mario/Download/chiave\\ seomcp.json')).toBe('/Users/mario/Download/chiave seomcp.json');
    expect(normalizeInputPath('~/sa.json', '/home/mario')).toBe('/home/mario/sa.json');
  });

  it('le chiavi non si mostrano mai per intero', () => {
    expect(maskSecret('AIzaSyD-1234567890abcd')).toBe('••••abcd');
    expect(maskSecret('corta')).toBe('••••');
  });

  it('config.json scritto leggibile solo dal proprio utente e riletto dal server', () => {
    const dir = mkdtempSync(join(tmpdir(), 'seomcp-'));
    const file = join(dir, 'config.json');
    writeConfigFile(file, { bing: { apiKey: 'k' }, defaults: { gscSite: 'sc-domain:a.it' } });
    if (process.platform !== 'win32') expect(statSync(file).mode & 0o777).toBe(0o600);
    expect(JSON.parse(readFileSync(file, 'utf8')).bing.apiKey).toBe('k');
    const c = loadConfig({ SEOMCP_CONFIG_DIR: dir });
    expect(c.bingApiKey).toBe('k');
    expect(c.defaults.gscSite).toBe('sc-domain:a.it');
  });
});
