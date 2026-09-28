import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.js';

const dir = () => mkdtempSync(join(tmpdir(), 'seomcp-'));

describe('loadConfig', () => {
  it('senza nulla: fonti spente e default italiani', () => {
    const c = loadConfig({ SEOMCP_CONFIG_DIR: dir() });
    expect(c.google.mode).toBe('none');
    expect(c.bingApiKey).toBeUndefined();
    expect(c.defaults).toMatchObject({ country: 'it', language: 'it-IT' });
  });

  it('il service account ha la precedenza su OAuth', () => {
    const c = loadConfig({
      SEOMCP_CONFIG_DIR: dir(),
      GOOGLE_APPLICATION_CREDENTIALS: '/tmp/sa.json',
      SEOMCP_GOOGLE_CLIENT_ID: 'id',
      SEOMCP_GOOGLE_CLIENT_SECRET: 'secret',
    });
    expect(c.google).toEqual({ mode: 'service-account', keyFile: '/tmp/sa.json' });
  });

  it('le variabili d\'ambiente prevalgono sul file', () => {
    const d = dir();
    writeFileSync(join(d, 'config.json'), JSON.stringify({ bing: { apiKey: 'dal-file' }, defaults: { gscSite: 'sc-domain:a.it' } }));
    const c = loadConfig({ SEOMCP_CONFIG_DIR: d, BING_WEBMASTER_API_KEY: 'da-env' });
    expect(c.bingApiKey).toBe('da-env');
    expect(c.defaults.gscSite).toBe('sc-domain:a.it');
  });

  it('segnala chiavi sconosciute nel file', () => {
    const d = dir();
    writeFileSync(join(d, 'config.json'), JSON.stringify({ gsc: {} }));
    expect(() => loadConfig({ SEOMCP_CONFIG_DIR: d })).toThrow(/contiene errori/);
  });
});
