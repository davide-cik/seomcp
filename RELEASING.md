# Pubblicare una versione (maintainer)

1. Aggiorna `CHANGELOG.md` e la versione: `npm version patch|minor|major`
2. `npm publish --access public` (lo script `prepublishOnly` esegue typecheck, test e build)
3. `git push --follow-tags`
4. Aggiorna la voce nel [registry MCP](https://github.com/modelcontextprotocol/registry) con `mcp-publisher publish`.
   Il namespace `guru.contentisking/seomcp` (campo `mcpName` in `package.json`) si verifica tramite DNS sul dominio contentisking.guru.
