import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { openBrowser, runGoogleOAuthFlow, serviceAccountEmail, createGoogleAuth } from '../auth/google.js';
import { loadConfig, readConfigFile, writeConfigFile, type ConfigFile, type GoogleConfig, type SeoMcpConfig } from '../config.js';
import { BingClient } from '../core/bing.js';
import { SeoMcpError } from '../core/errors.js';
import { GaClient } from '../core/ga.js';
import { GscClient } from '../core/gsc.js';
import { PageSpeedClient } from '../core/pagespeed.js';
import { formatDiagnostics, runDiagnostics } from '../doctor.js';
import { CONSOLE, DOCS, PACKAGE_SPEC } from '../links.js';
import {
  appendToml,
  claudeAddArgs,
  clientTargets,
  currentEnv,
  launchCommand,
  maskSecret,
  mergeJsonConfig,
  normalizeInputPath,
  tomlBlock,
  type ClientTarget,
  type MergeResult,
} from './clients.js';
import { Prompter } from './prompt.js';

/** Variabili d'ambiente che, se impostate, prevalgono su config.json. */
const ENV_OVERRIDES = [
  'GOOGLE_APPLICATION_CREDENTIALS', 'SEOMCP_GOOGLE_CLIENT_ID', 'SEOMCP_GOOGLE_CLIENT_SECRET', 'SEOMCP_GOOGLE_API_KEY',
  'BING_WEBMASTER_API_KEY', 'SEOMCP_GSC_SITE', 'SEOMCP_GA_PROPERTY', 'SEOMCP_BING_SITE',
];

const errText = (err: unknown) =>
  err instanceof SeoMcpError ? `${err.message}${err.hint ? `\n   → ${err.hint}` : ''}` : (err as Error).message;

/**
 * Configurazione guidata: credenziali in config.json (leggibile solo dall'utente),
 * ogni fonte provata subito, poi seomcp aggiunto all'assistente senza chiavi nei suoi file.
 */
export async function runSetup(): Promise<number> {
  const config = loadConfig();
  const p = new Prompter();
  const draft: ConfigFile = config.configFileFound ? readConfigFile(config.configFile) : {};
  try {
    intro(p, config);
    await stepGoogle(p, config, draft);
    await stepApiKey(p, draft);
    await stepBing(p, draft);

    writeConfigFile(config.configFile, draft);
    p.say(`\n✅ Configurazione salvata in ${config.configFile} (leggibile solo dal tuo utente).`);

    await stepClients(p);
    await finalCheck(p);
    return 0;
  } finally {
    p.close();
  }
}

function intro(p: Prompter, config: SeoMcpConfig): void {
  p.say('\nseomcp setup · configurazione guidata\n');
  p.say('Ti guido nel collegare le fonti, una alla volta. Sono tutte facoltative: puoi saltare quelle che non usi.');
  p.say(`Le credenziali vanno in ${config.configFile}, leggibile solo dal tuo utente:`);
  p.say("nella configurazione dell'assistente non finisce nessuna chiave.");
  p.say('GEO, validatore schema.org e controlli tecnici funzionano già, senza credenziali.');
  p.say(`Gli stessi passaggi, spiegati uno per uno: ${DOCS.credentials}`);
  const overridden = ENV_OVERRIDES.filter((k) => process.env[k]);
  if (overridden.length) {
    p.say(`\n⚠️  Nel terminale sono impostate ${overridden.join(', ')}: dove sono impostate, prevalgono su config.json.`);
  }
}

/** Mostra un link e, se l'utente vuole, lo apre nel browser. */
async function link(p: Prompter, label: string, url: string): Promise<void> {
  p.say(`   ${label}: ${url}`);
  if (await p.confirm('   Lo apro nel browser?')) openBrowser(url);
}

/** Ripete un'operazione finché riesce o l'utente rinuncia. */
async function retry<T>(p: Prompter, what: string, fn: () => Promise<T>): Promise<T | undefined> {
  for (;;) {
    try {
      return await fn();
    } catch (err) {
      p.say(`❌ ${what}: ${errText(err)}`);
      if (!(await p.confirm('Riprovo? (rispondi n per saltare)'))) return undefined;
    }
  }
}

// ---------- Google: Search Console e Analytics ----------

async function stepGoogle(p: Prompter, config: SeoMcpConfig, draft: ConfigFile): Promise<void> {
  p.say('\n━━ 1/3 · Google Search Console e Analytics 4\n');
  const g = draft.google ?? {};
  const current = g.serviceAccountFile
    ? `service account (${serviceAccountEmail(g.serviceAccountFile) ?? g.serviceAccountFile})`
    : g.oauthClientId ? 'OAuth con client tuo' : 'non configurato';
  p.say(`Attuale: ${current}`);
  const choice = await p.choose('Come vuoi collegare Google?', [
    'Service account: ideale per team e server, vede solo le proprietà dove lo aggiungi',
    'OAuth con un client tuo: ideale se lavori da solo, vede tutte le tue proprietà',
  ], current === 'non configurato' ? 'salta' : 'lascia com\'è');

  let google: GoogleConfig | undefined;
  if (choice === -1) {
    google = config.google.mode === 'none' ? undefined : googleFromDraft(config, draft);
    if (!google) return;
  } else {
    p.say('\nServe un progetto Google Cloud con le API abilitate (un solo progetto basta per tutto).');
    p.say(`   Crea un progetto, se non ne hai uno: ${CONSOLE.createProject}`);
    await link(p, 'Abilita in un colpo le 5 API usate da seomcp', CONSOLE.enableApis);
    google = choice === 0 ? await setupServiceAccount(p, config, draft) : await setupOAuth(p, config, draft);
    if (!google) return;
  }

  const auth = createGoogleAuth(google);
  const who = google.mode === 'service-account' ? serviceAccountEmail(google.keyFile) : undefined;

  // Search Console
  const sites = await retry(p, 'Search Console', async () => {
    const list = await new GscClient(auth).listSites();
    if (list.length === 0) {
      throw new SeoMcpError('PERMISSION_DENIED', 'Accesso riuscito, ma nessuna proprietà visibile.', who
        ? `Aggiungi ${who} come utente "Con restrizioni" della proprietà: ${CONSOLE.searchConsoleUsers} (in alto scegli la proprietà giusta)`
        : "Accedi con un account Google che vede almeno una proprietà in Search Console.");
    }
    return list;
  });
  if (sites) {
    p.say(`✅ Search Console: ${sites.length} proprietà.`);
    const urls = sites.map((s) => s.siteUrl);
    const i = await p.choose('Proprietà predefinita (l\'assistente userà questa se non ne indichi un\'altra):', urls, 'nessuna');
    draft.defaults = { ...draft.defaults, gscSite: i >= 0 ? urls[i] : undefined };
  }

  // Analytics 4
  if (!(await p.confirm('\nColleghiamo anche Google Analytics 4?'))) return;
  if (who) {
    p.say(`In Analytics → Amministrazione → Gestione dell'accesso alla proprietà aggiungi ${who} con ruolo Visualizzatore.`);
    await link(p, 'Amministrazione di Google Analytics', CONSOLE.analyticsAdmin);
    await p.ask('Premi Invio quando hai fatto.');
  }
  const props = await retry(p, 'Google Analytics', async () => {
    const list = await new GaClient(auth).listProperties();
    if (list.length === 0) {
      throw new SeoMcpError('PERMISSION_DENIED', 'Nessuna proprietà GA4 visibile.', who
        ? `Controlla di aver aggiunto ${who} con ruolo Visualizzatore.`
        : "Controlla che l'account autorizzato veda almeno una proprietà GA4.");
    }
    return list;
  });
  if (props) {
    p.say(`✅ Google Analytics: ${props.length} proprietà.`);
    const labels = props.map((x) => `${x.displayName} (${x.property.replace('properties/', '')})`);
    const i = await p.choose('Proprietà GA4 predefinita:', labels, 'nessuna');
    draft.defaults = { ...draft.defaults, gaProperty: i >= 0 ? props[i]!.property.replace('properties/', '') : undefined };
  }
}

function googleFromDraft(config: SeoMcpConfig, draft: ConfigFile): GoogleConfig | undefined {
  const g = draft.google ?? {};
  if (g.serviceAccountFile) return { mode: 'service-account', keyFile: g.serviceAccountFile };
  if (g.oauthClientId && g.oauthClientSecret) {
    return { mode: 'oauth', clientId: g.oauthClientId, clientSecret: g.oauthClientSecret, tokenFile: join(config.configDir, 'google-token.json') };
  }
  return undefined;
}

async function setupServiceAccount(p: Prompter, config: SeoMcpConfig, draft: ConfigFile): Promise<GoogleConfig | undefined> {
  p.say('\nService account, in tre passaggi:');
  p.say('1. Crealo (nome, per esempio, seomcp; nessun ruolo sul progetto: premi Fine).');
  await link(p, 'Crea il service account', CONSOLE.createServiceAccount);
  p.say('2. Aprilo dall\'elenco → Chiavi → Aggiungi chiave → Crea nuova chiave → JSON. Il browser scarica il file.');
  p.say(`   Elenco dei service account: ${CONSOLE.serviceAccounts}`);

  let file: string | undefined;
  let email: string | undefined;
  for (;;) {
    const input = await p.ask('\nPercorso del file JSON (puoi trascinarlo qui; Invio per saltare):');
    if (!input) return undefined;
    const path = resolve(normalizeInputPath(input));
    if (!existsSync(path)) { p.say(`File non trovato: ${path}`); continue; }
    try {
      const json = JSON.parse(readFileSync(path, 'utf8')) as { type?: string; client_email?: string; private_key?: string };
      if (json.type !== 'service_account' || !json.client_email || !json.private_key) {
        p.say('Non è la chiave di un service account: serve il file JSON scaricato da "Chiavi → Aggiungi chiave → JSON".');
        continue;
      }
      file = path;
      email = json.client_email;
      break;
    } catch {
      p.say('Il file non è un JSON valido.');
    }
  }

  const dest = join(config.configDir, 'service-account.json');
  if (file !== dest && (await p.confirm(`Copio la chiave in ${dest}, leggibile solo da te? Poi puoi cancellare quella scaricata.`))) {
    mkdirSync(config.configDir, { recursive: true, mode: 0o700 });
    copyFileSync(file, dest);
    if (process.platform !== 'win32') chmodSync(dest, 0o600);
    file = dest;
  }

  p.say(`\n3. Aggiungi ${email} come utente in Search Console, con permesso "Con restrizioni" (basta per leggere; se la verifica dà errore 403 usa "Completo").`);
  p.say('   Ripeti per ogni proprietà che vuoi analizzare.');
  await link(p, 'Utenti e autorizzazioni di Search Console', CONSOLE.searchConsoleUsers);
  await p.ask('Premi Invio quando hai fatto.');

  draft.google = { serviceAccountFile: file, apiKey: draft.google?.apiKey };
  return { mode: 'service-account', keyFile: file };
}

async function setupOAuth(p: Prompter, config: SeoMcpConfig, draft: ConfigFile): Promise<GoogleConfig | undefined> {
  p.say('\nOAuth con un client tuo, in tre passaggi nella console di Google:');
  p.say(`1. Informazioni sull'app: nome (per esempio seomcp) e la tua email. ${CONSOLE.oauthBranding}`);
  p.say(`2. Pubblico: Esterno (o Interno con Google Workspace) e "Pubblica app". ${CONSOLE.oauthAudience}`);
  p.say('   In stato di test Google fa scadere l\'autorizzazione dopo 7 giorni. La verifica non serve: la usi solo tu.');
  p.say(`3. Client → Crea client, tipo "App desktop", e copia ID client e client secret. ${CONSOLE.oauthClients}`);
  if (await p.confirm('Apro le tre pagine nel browser?')) [CONSOLE.oauthBranding, CONSOLE.oauthAudience, CONSOLE.oauthClients].forEach(openBrowser);

  let clientId = '';
  for (;;) {
    clientId = await p.ask('\nID client (Invio per saltare):');
    if (!clientId) return undefined;
    if (/\.apps\.googleusercontent\.com$/.test(clientId)) break;
    p.say('L\'ID client finisce con .apps.googleusercontent.com: controlla di aver copiato quello giusto.');
  }
  const clientSecret = await p.askSecret('Client secret:');
  if (!clientSecret) return undefined;

  const google = { mode: 'oauth' as const, clientId, clientSecret, tokenFile: join(config.configDir, 'google-token.json') };
  p.say('\nOra autorizzi seomcp a leggere Search Console e Analytics, in sola lettura.');
  p.say('Al login Google mostra "app non verificata": è la tua app, clicca Avanzate → Vai a seomcp.');
  const ok = await retry(p, 'Autorizzazione Google', async () => {
    await runGoogleOAuthFlow(google, (m) => p.say(m));
    return true;
  });
  if (!ok) return undefined;
  draft.google = { oauthClientId: clientId, oauthClientSecret: clientSecret, apiKey: draft.google?.apiKey };
  return google;
}

// ---------- API key per i Core Web Vitals ----------

async function stepApiKey(p: Prompter, draft: ConfigFile): Promise<void> {
  p.say('\n━━ 2/3 · Core Web Vitals (PageSpeed Insights e Chrome UX Report)\n');
  const current = draft.google?.apiKey;
  p.say(`Attuale: ${current ? `API key ${maskSecret(current)}` : 'non configurata'}`);
  if (!(await p.confirm(current ? 'Vuoi cambiarla?' : 'La configuriamo? Serve una API key gratuita di Google Cloud', !current))) return;
  p.say('Crea credenziali → Chiave API, poi limitala alle sole Chrome UX Report API e PageSpeed Insights API.');
  await link(p, 'Credenziali del progetto', CONSOLE.credentials);
  const key = await retry(p, 'Chrome UX Report', async () => {
    const k = await p.askSecret('API key (Invio per saltare):');
    if (!k) return '';
    await new PageSpeedClient(k).query({ origin: 'https://www.google.com' });
    return k;
  });
  if (!key) return;
  draft.google = { ...draft.google, apiKey: key };
  p.say('✅ API key valida.');
}

// ---------- Bing ----------

async function stepBing(p: Prompter, draft: ConfigFile): Promise<void> {
  p.say('\n━━ 3/3 · Bing Webmaster Tools\n');
  const current = draft.bing?.apiKey;
  p.say(`Attuale: ${current ? `API key ${maskSecret(current)}` : 'non configurato'}`);
  if (!(await p.confirm(current ? 'Vuoi cambiarla?' : 'Colleghiamo Bing?', !current))) return;
  p.say('In Bing Webmaster Tools: icona a ingranaggio in alto a destra → Accesso API → Chiave API → Genera.');
  await link(p, 'Bing Webmaster Tools', CONSOLE.bingWebmaster);
  const result = await retry(p, 'Bing Webmaster', async () => {
    const k = await p.askSecret('API key di Bing (Invio per saltare):');
    if (!k) return undefined;
    const sites = await new BingClient({ apiKey: k }).listSites();
    return { key: k, sites: sites.map((s) => s.url) };
  });
  if (!result) return;
  draft.bing = { apiKey: result.key };
  p.say(`✅ Bing Webmaster: ${result.sites.length} siti.`);
  if (result.sites.length) {
    const i = await p.choose('Sito Bing predefinito:', result.sites, 'nessuno');
    draft.defaults = { ...draft.defaults, bingSite: i >= 0 ? result.sites[i] : undefined };
  }
}

// ---------- Assistenti ----------

async function stepClients(p: Prompter): Promise<void> {
  p.say('\n━━ Collega seomcp al tuo assistente\n');
  const env = currentEnv();
  const targets = clientTargets(env);
  const hasClaude = commandExists('claude');
  const labels = targets.map((t) => {
    const found = t.format === 'claude-cli' ? hasClaude : t.file ? existsSync(t.file) || existsSync(dirname(t.file)) : false;
    return `${t.name}${found ? '  (trovato su questo computer)' : ''}`;
  });
  const picked = await p.chooseMany('A quali assistenti lo aggiungo?', labels);
  if (!picked.length) {
    p.say(`Nessuno. Le istruzioni per ogni assistente sono su ${DOCS.home}/installa/`);
    return;
  }
  for (const i of picked) {
    const t = targets[i]!;
    p.say(`\n· ${t.name}`);
    try {
      const done = t.format === 'claude-cli' ? await addToClaudeCode(p, t, hasClaude) : await addToFile(p, t);
      if (done) p.say(`  ✅ Fatto. ${t.restart}`);
    } catch (err) {
      p.say(`  ❌ ${(err as Error).message}`);
    }
  }
}

function commandExists(cmd: string): boolean {
  const r = spawnSync(process.platform === 'win32' ? 'where' : 'which', [cmd], { stdio: 'ignore' });
  return r.status === 0;
}

async function addToClaudeCode(p: Prompter, t: ClientTarget, hasClaude: boolean): Promise<boolean> {
  const args = claudeAddArgs(launchCommand(t));
  if (!hasClaude) {
    p.say('  Il comando claude non è nel PATH. Quando lo installi, esegui:');
    p.say(`  claude ${args.join(' ')}`);
    return false;
  }
  const shell = process.platform === 'win32';
  const list = spawnSync('claude', ['mcp', 'get', 'seomcp'], { encoding: 'utf8', shell });
  if (list.status === 0) {
    if (!(await p.confirm('  seomcp è già configurato in Claude Code. Lo sostituisco?', false))) return false;
    spawnSync('claude', ['mcp', 'remove', 'seomcp', '-s', 'user'], { stdio: 'ignore', shell });
  }
  const r = spawnSync('claude', args, { stdio: 'inherit', shell });
  if (r.status !== 0) throw new Error(`claude mcp add non è riuscito. Prova a mano: claude ${args.join(' ')}`);
  return true;
}

async function addToFile(p: Prompter, t: ClientTarget): Promise<boolean> {
  const file = t.file!;
  const existing = existsSync(file) ? readFileSync(file, 'utf8') : undefined;
  const launch = launchCommand(t);
  let result: MergeResult = t.format === 'json' ? mergeJsonConfig(existing, t, launch) : appendToml(existing, t.format as 'codex-toml' | 'vibe-toml', launch);

  if (result.status === 'exists') {
    if (t.format !== 'json') {
      p.say(`  seomcp è già in ${file}: non lo modifico. Se vuoi le credenziali da config.json, togli le variabili env dal suo blocco.`);
      return false;
    }
    p.say(`  seomcp è già in ${file}. Se la voce attuale contiene chiavi nelle variabili env, quelle prevalgono su config.json.`);
    if (!(await p.confirm('  La sostituisco con la nuova, senza chiavi?', true))) return false;
    result = mergeJsonConfig(existing, t, launch, true);
  }
  if (result.status === 'invalid') {
    p.say(`  Non modifico ${file}: ${result.reason}. Aggiungi tu questo blocco:`);
    p.say(indent(t.format === 'json' ? JSON.stringify({ [t.key ?? 'mcpServers']: { seomcp: { ...t.extra, ...launch } } }, null, 2) : tomlBlock(t.format as 'codex-toml' | 'vibe-toml', launch)));
    return false;
  }
  if (result.status !== 'added' && result.status !== 'replaced') return false;

  mkdirSync(dirname(file), { recursive: true });
  if (existing !== undefined) {
    const backup = `${file}.bak-seomcp`;
    writeFileSync(backup, existing);
    p.say(`  Copia di sicurezza: ${backup}`);
  }
  writeFileSync(file, result.text);
  p.say(`  ${result.status === 'added' ? 'Aggiunto a' : 'Aggiornato'} ${file}`);
  return true;
}

const indent = (s: string) => s.split('\n').map((l) => `    ${l}`).join('\n');

// ---------- Verifica finale ----------

async function finalCheck(p: Prompter): Promise<void> {
  p.say('\n━━ Verifica finale\n');
  const items = await runDiagnostics(loadConfig());
  p.say(formatDiagnostics(items));
  p.say('\nRiavvia l\'assistente e prova a chiedere, per esempio:');
  p.say('  «Il mio sito è aperto ai crawler AI?»  oppure  «Quali query sono in posizione 4-20 negli ultimi 90 giorni?»');
  p.say(`Per ricontrollare in qualsiasi momento: npx -y ${PACKAGE_SPEC} doctor`);
}
