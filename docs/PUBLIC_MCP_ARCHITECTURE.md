# Public MCP architecture

The public plugin connects Codex, ChatGPT, and Claude to `https://mcp.ruddur.com/mcp` using Streamable HTTP. Ruddur's frontend supplies OAuth discovery and consent, the backend acts as the OAuth authorization server, and this repository supplies the stateless MCP/API adapter and its container image.

OAuth Authorization Code with PKCE produces a scoped creator API token. The MCP service introspects that token, exposes only permitted tools, and forwards the same bearer token to the existing Ruddur creator APIs. Users do not configure environment files or paste credentials into the plugin.

The endpoint automatically detects two wire-protocol eras:

- Initialization-based MCP through `2025-11-25` is handled by the stable SDK transport.
- MCP `2026-07-28` is handled by the stateless adapter using per-request metadata, required HTTP headers, `server/discover`, `resultType`, and cache metadata.

Production environment:

```dotenv
PORT=8080
RUDDUR_API_BASE=http://backend:4000
RUDDUR_MCP_PUBLIC_URL=https://mcp.ruddur.com/mcp
RUDDUR_OAUTH_ISSUER=https://ruddur.com
RUDDUR_OAUTH_INTROSPECTION_URL=http://backend:4000/api/oauth/introspect
MCP_INTROSPECTION_SECRET=<shared secret from the deployment secret manager>
RUDDUR_MCP_ALLOWED_ORIGINS=https://mcp.ruddur.com,https://ruddur.com,https://chatgpt.com,https://claude.ai
```

Deploy at least two replicas behind a TLS ingress. Keep the introspection endpoint on the private service network, configure production rate limits and audit alerts, and use the immutable commit-SHA image published by GitLab CI. The default branch also publishes `latest`, but deployment configuration should pin the immutable SHA or digest.
