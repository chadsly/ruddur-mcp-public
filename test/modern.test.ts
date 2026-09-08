import assert from "node:assert/strict";
import test from "node:test";
import type { Request, Response } from "express";
import { handleModernRequest, isModernRequest, MODERN_PROTOCOL_VERSION } from "../src/modern.js";

const protocolMeta = {
  "io.modelcontextprotocol/protocolVersion": MODERN_PROTOCOL_VERSION,
  "io.modelcontextprotocol/clientCapabilities": {},
  "io.modelcontextprotocol/clientInfo": { name: "test", version: "1" },
};

const request = (method: string, params: Record<string, unknown> = {}, headers: Record<string, string> = {}) => {
  const normalized = Object.fromEntries(Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]));
  return {
    body: { jsonrpc: "2.0", id: "test-1", method, params: { ...params, _meta: protocolMeta } },
    header(name: string) { return normalized[name.toLowerCase()]; },
  } as unknown as Request;
};

const response = () => {
  const state: { status: number; body?: unknown } = { status: 200 };
  const res = {
    status(value: number) { state.status = value; return res; },
    json(value: unknown) { state.body = value; return res; },
  } as unknown as Response;
  return { res, state };
};

const headers = (method: string, name?: string) => ({
  "MCP-Protocol-Version": MODERN_PROTOCOL_VERSION,
  "Mcp-Method": method,
  "Accept": "application/json, text/event-stream",
  ...(name ? { "Mcp-Name": name } : {}),
});

const options = {
  apiBase: "https://ruddur.test",
  token: "test-token",
  scopes: new Set(["content.read"] as const),
  allowMutations: true,
  timeoutMs: 1_000,
};

test("detects modern metadata and leaves legacy initialize requests alone", () => {
  assert.equal(isModernRequest(request("tools/list", {}, headers("tools/list"))), true);
  const legacy = { body: { jsonrpc: "2.0", id: 1, method: "initialize", params: {} }, header: () => undefined } as unknown as Request;
  assert.equal(isModernRequest(legacy), false);
  const legacyWithHeader = {
    body: { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} },
    header: (name: string) => name.toLowerCase() === "mcp-protocol-version" ? "2025-11-25" : undefined,
  } as unknown as Request;
  assert.equal(isModernRequest(legacyWithHeader), false);
});

test("implements 2026-07-28 server discovery", async () => {
  const req = request("server/discover", {}, headers("server/discover"));
  const { res, state } = response();
  await handleModernRequest(req, res, options);
  const body = state.body as any;
  assert.equal(state.status, 200);
  assert.equal(body.result.resultType, "complete");
  assert.ok(body.result.supportedVersions.includes(MODERN_PROTOCOL_VERSION));
  assert.deepEqual(body.result.capabilities, { tools: {} });
  assert.equal(body.result.cacheScope, "private");
});

test("returns scoped tools with modern cache and result metadata", async () => {
  const req = request("tools/list", {}, headers("tools/list"));
  const { res, state } = response();
  await handleModernRequest(req, res, options);
  const body = state.body as any;
  assert.equal(body.result.resultType, "complete");
  assert.equal(body.result.cacheScope, "private");
  assert.ok(body.result.tools.length > 0);
  assert.ok(body.result.tools.every((tool: any) => tool.name.includes("heading") || tool.name.includes("waypoint") || tool.name.includes("assessment")));
  assert.equal(body.result._meta["io.modelcontextprotocol/serverInfo"].name, "ruddur-mcp");
});

test("rejects mismatched modern protocol metadata", async () => {
  const req = request("tools/list", {}, { ...headers("tools/list"), "MCP-Protocol-Version": "2099-01-01" });
  const { res, state } = response();
  await handleModernRequest(req, res, options);
  const body = state.body as any;
  assert.equal(state.status, 400);
  assert.equal(body.error.code, -32020);
});

test("requires Mcp-Name for modern tool calls", async () => {
  const req = request("tools/call", { name: "ruddur_list_headings", arguments: {} }, headers("tools/call"));
  const { res, state } = response();
  await handleModernRequest(req, res, options);
  assert.equal(state.status, 400);
  assert.equal((state.body as any).error.code, -32020);
});
