# Ruddur MCP Server

MCP server for the Ruddur creator API. The public marketplace uses the hosted Streamable HTTP endpoint and browser OAuth; a local stdio mode remains available for development.

## Marketplace installation

The Codex and Claude plugin manifests connect to `https://mcp.ruddur.com/mcp`. Users do not create an environment file or paste an API token. On first use, the host discovers Ruddur's OAuth metadata, opens the Ruddur login/consent page, and stores the resulting scoped token.

The service operator must deploy the included Docker image and publish `/mcp` over HTTPS. See `docs/PUBLIC_MCP_ARCHITECTURE.md`.

Coaches can grant `relationships.assign` separately from `relationships.read`. With that write grant, `ruddur_assign_heading` takes the `relationshipId` from `ruddur_list_coaching_clients` and a creator-owned `headingId` from Heading search/list tools. The API derives the client from the active coaching relationship, copies the Heading and Waypoints through the same application workflow as the web UI, and returns the existing assignment on retry. Grant `relationships.read` as well to verify the assignment through the coaching roster and assigned-results tools. Existing read-only tokens cannot assign Headings; reconnect and approve the new grant to make the tool available.

## Protocol compatibility

The HTTPS endpoint automatically supports both MCP eras:

- MCP through `2025-11-25` uses the initialization-based SDK transport expected by current Codex and Claude clients.
- MCP `2026-07-28` uses stateless per-request metadata, `server/discover`, required request headers, `resultType`, and cache metadata.

The endpoint detects the era from `MCP-Protocol-Version` and `params._meta`. Both handlers use the same scoped tool runtime and forward the OAuth-issued creator API token to the existing Ruddur backend APIs.

## Container publishing

GitLab CI runs typechecking, tests, and compilation before Kaniko builds a `linux/amd64` image. Every branch or tag publishes:

```text
$CI_REGISTRY_IMAGE/app:$CI_COMMIT_SHORT_SHA
```

The default branch also publishes `:latest`; Git tags additionally publish an image with the same tag. GitLab's built-in `CI_JOB_TOKEN` authenticates the registry push, matching the other Ruddur service repositories.

## Setup

```bash
cd ruddur-mcp
npm install
cp .env.stdio.example .env
npm run build
```

Set at least:

```dotenv
RUDDUR_API_BASE=https://ruddur.com
RUDDUR_CREATOR_API_TOKEN=your-token
```

`RUDDUR_CREATOR_SCOPES` is optional. When present, the server only advertises tools matching those scopes. When absent, it advertises all allowlisted creator tools and lets the Ruddur API enforce the token's actual scopes.

This token-based file is only for local stdio development. Hosted deployments use `.env.example`, which intentionally contains no creator token: each marketplace user's OAuth token arrives as the bearer credential on their MCP request.

Set `RUDDUR_MCP_ALLOW_MUTATIONS=false` to run read-only. Delete, restore, publish/status, and detach operations require `confirm=true` from the calling agent.

## Local Codex development

For local stdio development, add this to `~/.codex/config.toml`:

```toml
[mcp_servers.ruddur]
command = "npx"
args = ["-y", "git+https://gitlab.com/ruddur1/ruddur-mcp.git"]
env = { RUDDUR_MCP_ENV_FILE = "/absolute/path/to/your/.env" }
```

The referenced `.env` must define `RUDDUR_CREATOR_API_TOKEN`. The server defaults `RUDDUR_API_BASE` to `https://ruddur.com`.

Alternatively, for a locally cloned checkout:

Add this to `~/.codex/config.toml`:

```toml
[mcp_servers.ruddur]
command = "node"
args = ["/absolute/path/to/ruddur-mcp/dist/index.js"]
env = { RUDDUR_MCP_ENV_FILE = "/absolute/path/to/ruddur-mcp/.env" }
```

Restart Codex after changing MCP configuration.

## Local Claude Code development

For local stdio development:

```bash
claude mcp add-json ruddur '{
  "type": "stdio",
  "command": "npx",
  "args": ["-y", "git+https://gitlab.com/ruddur1/ruddur-mcp.git"],
  "env": {
    "RUDDUR_MCP_ENV_FILE": "/absolute/path/to/your/.env"
  }
}'
```

Set `RUDDUR_MCP_ALLOW_MUTATIONS=false` for read-only use. Set `RUDDUR_MCP_ALLOW_MUTATIONS=true` when Claude should see create/update tools such as `ruddur_create_heading` and `ruddur_create_waypoint`.

## Security

- Use the narrowest creator-token scopes needed.
- Keep `.env` out of source control.
- The server never exposes a generic URL/path request tool.
- Token management is excluded because Ruddur requires session authentication for issuing and revoking API tokens.
- Only local stdio mode reads `.env`; the public remote server uses OAuth and never receives a user's local environment.

## Development

```bash
npm run typecheck
npm test
npm run build
```
