#!/usr/bin/env node

import express, { Request, Response } from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { CREATOR_SCOPES, SUPPORTED_CREATOR_SCOPES, CreatorScope } from "./types.js";
import { createRuddurServer } from "./server.js";
import { handleModernRequest, isModernRequest } from "./modern.js";
import { resolveBodyLimit } from "./body-limit.js";

const port = Number(process.env.PORT || 8080);
const apiBase = (process.env.RUDDUR_API_BASE || "https://ruddur.com").replace(/\/$/, "");
const publicUrl = process.env.RUDDUR_MCP_PUBLIC_URL || "https://mcp.ruddur.com/mcp";
const issuer = (process.env.RUDDUR_OAUTH_ISSUER || "https://ruddur.com").replace(/\/$/, "");
const introspectionUrl = process.env.RUDDUR_OAUTH_INTROSPECTION_URL || `${issuer}/api/oauth/introspect`;
const introspectionSecret = process.env.MCP_INTROSPECTION_SECRET || "";
const timeoutMs = Number(process.env.RUDDUR_MCP_TIMEOUT_MS || 30000);
const resourceMetadataUrl = new URL("/.well-known/oauth-protected-resource", publicUrl).toString();
const allowedOrigins = new Set(
  (process.env.RUDDUR_MCP_ALLOWED_ORIGINS || `${new URL(publicUrl).origin},${new URL(issuer).origin}`)
    .split(",").map((value) => value.trim()).filter(Boolean),
);

type Introspection = { active: boolean; scope?: string; sub?: string };

const introspect = async (token: string): Promise<Introspection> => {
  const response = await fetch(introspectionUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "User-Agent": "ruddur-mcp-remote/0.3.0",
      ...(introspectionSecret ? { "X-Ruddur-MCP-Secret": introspectionSecret } : {}),
    },
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) return { active: false };
  return response.json() as Promise<Introspection>;
};

const challenge = `Bearer resource_metadata="${resourceMetadataUrl}", error="invalid_token", error_description="Sign in to Ruddur to continue"`;
const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: resolveBodyLimit() }));
app.use((req, res, next) => {
  const origin = req.header("origin");
  if (origin && !allowedOrigins.has(origin)) return res.status(403).json({ error: "origin_not_allowed" });
  return next();
});

app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.get("/.well-known/oauth-protected-resource", (_req, res) => {
  res.json({
    resource: publicUrl,
    authorization_servers: [issuer],
    scopes_supported: [...CREATOR_SCOPES],
    resource_documentation: "https://ruddur.com",
  });
});

const handleMcp = async (req: Request, res: Response) => {
  const authorization = req.header("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (!token) {
    res.setHeader("WWW-Authenticate", challenge);
    return res.status(401).json({ error: "authentication_required" });
  }
  const auth: Introspection = await introspect(token).catch(() => ({ active: false }));
  if (!auth.active) {
    res.setHeader("WWW-Authenticate", challenge);
    return res.status(401).json({ error: "invalid_token" });
  }
  const validScopes = new Set<string>(SUPPORTED_CREATOR_SCOPES);
  const scopes = new Set<CreatorScope>(
    (auth.scope || "").split(/\s+/).filter((scope: string): scope is CreatorScope => validScopes.has(scope)),
  );
  const options = { apiBase, token, scopes, allowMutations: true, timeoutMs };
  if (isModernRequest(req)) return handleModernRequest(req, res, options);
  const server = createRuddurServer({
    ...options,
  });
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  res.on("close", () => { void transport.close(); void server.close(); });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
};

app.all("/mcp", (req, res) => { void handleMcp(req, res).catch((error) => {
  console.error("MCP request failed", error);
  if (!res.headersSent) res.status(500).json({ error: "mcp_request_failed" });
}); });

app.listen(port, "0.0.0.0", () => console.info(`Ruddur remote MCP listening on ${port}`));
