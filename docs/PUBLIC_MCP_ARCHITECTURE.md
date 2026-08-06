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

## Compose deployment

1. Copy the `ruddur-mcp` service from `docker-compose.example.yml` into the application Compose file. It expects the existing backend service and `ruddur-network`.
2. Copy `deploy/mcp.production.env.example` into the deployment environment and replace the introspection secret through the secret manager.
3. Configure the same `RUDDUR_MCP_RESOURCE`, `OAUTH_ISSUER`, and `MCP_INTROSPECTION_SECRET` on the backend service.
4. Route `mcp.ruddur.com` to loopback port 8080 using the example nginx configuration or equivalent TLS ingress. Preserve streaming and disable proxy buffering.
5. Deploy backend and frontend images containing the OAuth routes before making the marketplace MCP URL public.

Verify after rollout:

```bash
curl -fsS http://127.0.0.1:8080/health
curl -fsS https://mcp.ruddur.com/.well-known/oauth-protected-resource
curl -fsS https://ruddur.com/.well-known/oauth-authorization-server
curl -i https://mcp.ruddur.com/mcp \
  -H 'Accept: application/json, text/event-stream' \
  -H 'Content-Type: application/json' \
  --data '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"smoke","version":"1"}}}'
```

The final request should return `401` with a `WWW-Authenticate` header pointing to the protected-resource metadata. That challenge is what starts OAuth in Codex and Claude.
