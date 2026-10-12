# Pubblicare una versione (maintainer)

## Normale: automatica da GitHub (Trusted Publishing)

1. Aggiorna `CHANGELOG.md` e la versione: `npm version patch --no-git-tag-version`
2. Commit, poi `git tag vX.Y.Z` e `git push --follow-tags`.
3. Il workflow `.github/workflows/publish.yml` controlla che il tag coincida con `package.json`, esegue typecheck, test e build e pubblica su npm con provenienza, senza token. La versione compare sul registro dopo qualche minuto: verifica con `npm view @contentisking/seomcp version`.

Configurazione una tantum su npmjs.com → pacchetto → Settings → **Trusted Publisher**: GitHub Actions, organizzazione `davide-cik`, repository `seomcp`, workflow `publish.yml`, azione **npm publish** abilitata. npm concede 2 giorni per il primo rilascio dopo la configurazione.

Errori visti al primo rilascio: `OIDC token exchange error - package not found` = Trusted Publisher non salvato o con dati diversi; `403 OIDC permission denied for this action` = azione "npm publish" non abilitata nella voce. Dopo la correzione basta `gh run rerun <id>`.

## Di riserva: manuale con token


1. Aggiorna `CHANGELOG.md` e la versione: `npm version patch|minor|major`
2. `npm publish --access public` (lo script `prepublishOnly` esegue typecheck, test e build).
   - L'account usa una passkey come doppia autenticazione, che il terminale non può chiedere: per pubblicare serve un token granulare con "Bypass 2FA", limitato allo scope `@contentisking` e con scadenza breve. Salvalo senza mostrarlo: `read -rsp "Token npm: " T && npm config set //registry.npmjs.org/:_authToken="$T" && unset T`.
   - Dopo `+ @contentisking/seomcp@X.Y.Z` la versione impiega qualche minuto a comparire sul registro ("is being processed"): non serve approvarla. Verifica con `npm view @contentisking/seomcp version`. (Lo staged publishing di npm con approvazione si usa solo con `npm stage publish`, che non usiamo.)
   - Il token resta in `~/.npmrc` per i rilasci successivi: lo gestisce (e lo revoca quando serve) il maintainer.
3. `git push --follow-tags`
4. Aggiorna la voce nel [registry MCP](https://github.com/modelcontextprotocol/registry) con `mcp-publisher publish`.
   Il namespace `guru.contentisking/seomcp` (campo `mcpName` in `package.json`) si verifica tramite DNS sul dominio contentisking.guru.
