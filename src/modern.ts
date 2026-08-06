import type { Request, Response } from "express";
import { RUDDUR_MCP_INSTRUCTIONS } from "./instructions.js";
import { createRuddurRuntime } from "./runtime.js";
import type { RuddurServerOptions } from "./server.js";

export const MODERN_PROTOCOL_VERSION = "2026-07-28";
const SERVER_INFO = { name: "ruddur-mcp", version: "0.3.0" };
const PROTOCOL_META = "io.modelcontextprotocol/protocolVersion";
const CAPABILITIES_META = "io.modelcontextprotocol/clientCapabilities";
const SERVER_INFO_META = "io.modelcontextprotocol/serverInfo";

type JsonRpcRequest = {
  jsonrpc?: unknown;
  id?: string | number | null;
  method?: unknown;
  params?: Record<string, unknown>;
};

const rpcError = (res: Response, status: number, id: JsonRpcRequest["id"], code: number, message: string, data?: unknown) =>
  res.status(status).json({ jsonrpc: "2.0", id: id ?? null, error: { code, message, ...(data === undefined ? {} : { data }) } });

const resultMeta = () => ({ [SERVER_INFO_META]: SERVER_INFO });

export const isModernRequest = (req: Request) => {
  const body = req.body as JsonRpcRequest | undefined;
  const meta = body?.params?._meta as Record<string, unknown> | undefined;
  return Boolean(
    req.header("mcp-protocol-version") === MODERN_PROTOCOL_VERSION
      || meta?.[PROTOCOL_META]
      || body?.method === "server/discover",
  );
};

export const handleModernRequest = async (req: Request, res: Response, options: RuddurServerOptions) => {
  const body = req.body as JsonRpcRequest;
  if (!body || body.jsonrpc !== "2.0" || typeof body.method !== "string" || body.id === undefined || body.id === null) {
    return rpcError(res, 400, body?.id, -32600, "Invalid Request");
  }

  const params = body.params && typeof body.params === "object" ? body.params : {};
  const meta = params._meta && typeof params._meta === "object" ? params._meta as Record<string, unknown> : null;
  const headerVersion = req.header("mcp-protocol-version") || "";
  const metadataVersion = typeof meta?.[PROTOCOL_META] === "string" ? String(meta[PROTOCOL_META]) : "";
  if (!headerVersion || !metadataVersion || headerVersion !== metadataVersion) {
    return rpcError(res, 400, body.id, -32020, "Header mismatch", {
      header: headerVersion || null,
      metadata: metadataVersion || null,
    });
  }
  if (headerVersion !== MODERN_PROTOCOL_VERSION) {
    return rpcError(res, 400, body.id, -32022, "Unsupported protocol version", {
      supported: [MODERN_PROTOCOL_VERSION, "2025-11-25", "2025-06-18", "2025-03-26"],
      requested: headerVersion,
    });
  }
  if (!meta || typeof meta[CAPABILITIES_META] !== "object") {
    return rpcError(res, 400, body.id, -32602, "Missing required client capabilities");
  }
  if (req.header("mcp-method") !== body.method) {
    return rpcError(res, 400, body.id, -32020, "Header mismatch", { header: "Mcp-Method" });
  }
  const accept = req.header("accept") || "";
  if (!accept.includes("application/json") || !accept.includes("text/event-stream")) {
    return rpcError(res, 406, body.id, -32600, "Accept must include application/json and text/event-stream");
  }

  if (["tools/call", "resources/read", "prompts/get"].includes(body.method)) {
    const expectedName = typeof params.name === "string" ? params.name : typeof params.uri === "string" ? params.uri : "";
    if (!expectedName || req.header("mcp-name") !== expectedName) {
      return rpcError(res, 400, body.id, -32020, "Header mismatch", { header: "Mcp-Name" });
    }
  }

  const runtime = createRuddurRuntime(options);
  if (body.method === "server/discover") {
    return res.json({
      jsonrpc: "2.0",
      id: body.id,
      result: {
        resultType: "complete",
        supportedVersions: [MODERN_PROTOCOL_VERSION, "2025-11-25", "2025-06-18", "2025-03-26"],
        capabilities: { tools: {} },
        instructions: RUDDUR_MCP_INSTRUCTIONS,
        ttlMs: 300_000,
        cacheScope: "private",
        _meta: resultMeta(),
      },
    });
  }
  if (body.method === "tools/list") {
    return res.json({
      jsonrpc: "2.0",
      id: body.id,
      result: {
        resultType: "complete",
        tools: runtime.listTools(),
        ttlMs: 300_000,
        cacheScope: "private",
        _meta: resultMeta(),
      },
    });
  }
  if (body.method === "tools/call") {
    if (typeof params.name !== "string") return rpcError(res, 400, body.id, -32602, "Tool name is required");
    const callResult = await runtime.callTool(params.name, params.arguments);
    return res.json({
      jsonrpc: "2.0",
      id: body.id,
      result: { resultType: "complete", ...callResult, _meta: resultMeta() },
    });
  }
  return rpcError(res, 404, body.id, -32601, "Method not found");
};
