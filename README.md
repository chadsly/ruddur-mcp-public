# Ruddur MCP Server

Local stdio MCP server for the Ruddur creator API. It reads a scoped creator API token from `.env`, advertises explicit allowlisted tools, and forwards calls to the existing Ruddur API.

## Setup

```bash
cd ruddur-mcp
npm install
cp .env.example .env
npm run build
```

Set at least:

```dotenv
RUDDUR_API_BASE=https://ruddur.com
RUDDUR_CREATOR_API_TOKEN=your-token
```

`RUDDUR_CREATOR_SCOPES` is optional. When present, the server only advertises tools matching those scopes. When absent, it advertises all allowlisted creator tools and lets the Ruddur API enforce the token's actual scopes.

Set `RUDDUR_MCP_ALLOW_MUTATIONS=false` to run read-only. Delete, restore, publish/status, and detach operations require `confirm=true` from the calling agent.

## Codex

Add this to `~/.codex/config.toml`:

```toml
[mcp_servers.ruddur]
command = "node"
args = ["/absolute/path/to/ruddur-mcp/dist/index.js"]
env = { RUDDUR_MCP_ENV_FILE = "/absolute/path/to/ruddur-mcp/.env" }
```

Restart Codex after changing MCP configuration.

## Claude Code

```bash
claude mcp add-json ruddur '{
  "type": "stdio",
  "command": "node",
  "args": ["/absolute/path/to/ruddur-mcp/dist/index.js"],
  "env": {
    "RUDDUR_MCP_ENV_FILE": "/absolute/path/to/ruddur-mcp/.env"
  }
}'
```

## Security

- Use the narrowest creator-token scopes needed.
- Keep `.env` out of source control.
- The server never exposes a generic URL/path request tool.
- Token management is excluded because Ruddur requires session authentication for issuing and revoking API tokens.
- This local stdio mode may read a local `.env`. A future remote HTTP deployment should use OAuth and must not expect access to a user's local environment.

## Development

```bash
npm run typecheck
npm test
npm run build
```
