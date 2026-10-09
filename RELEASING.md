# Pubblicare una versione (maintainer)

1. Aggiorna `CHANGELOG.md` e la versione: `npm version patch|minor|major`
2. `npm publish --access public` (lo script `prepublishOnly` esegue typecheck, test e build).
   - L'account usa una passkey come doppia autenticazione, che il terminale non può chiedere: per pubblicare serve un token granulare con "Bypass 2FA", limitato allo scope `@contentisking` e con scadenza breve. Salvalo senza mostrarlo: `read -rsp "Token npm: " T && npm config set //registry.npmjs.org/:_authToken="$T" && unset T`.
   - Dopo `+ @contentisking/seomcp@X.Y.Z` la versione impiega qualche minuto a comparire sul registro ("is being processed"): non serve approvarla. Verifica con `npm view @contentisking/seomcp version`. (Lo staged publishing di npm con approvazione si usa solo con `npm stage publish`, che non usiamo.)
   - Alla fine togli il token (`npm config delete //registry.npmjs.org/:_authToken`) e revocalo su npmjs.com → Access Tokens.
3. `git push --follow-tags`
4. Aggiorna la voce nel [registry MCP](https://github.com/modelcontextprotocol/registry) con `mcp-publisher publish`.
   Il namespace `guru.contentisking/seomcp` (campo `mcpName` in `package.json`) si verifica tramite DNS sul dominio contentisking.guru.
