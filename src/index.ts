#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { loadConfig, loadDotEnv } from "./config.js";
import { operationByName, toolForOperation, visibleOperations } from "./catalog.js";
import { RuddurApiError, RuddurClient } from "./client.js";
import type { ToolArguments } from "./types.js";

loadDotEnv();
const config = loadConfig();
const operations = visibleOperations(config.configuredScopes, config.allowMutations);
const visibleNames = new Set(operations.map((operation) => operation.name));
const client = new RuddurClient(config.apiBase, config.token, config.timeoutMs);

const server = new Server(
  { name: "ruddur-mcp", version: "0.1.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: operations.map(toolForOperation),
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const operation = operationByName.get(request.params.name);
  if (!operation || !visibleNames.has(operation.name)) {
    return {
      isError: true,
      content: [{ type: "text", text: `Unknown or unauthorized Ruddur tool: ${request.params.name}` }],
    };
  }

  const args = (request.params.arguments || {}) as ToolArguments;
  if (operation.confirmationRequired && args.confirm !== true) {
    return {
      isError: true,
      content: [{ type: "text", text: `${operation.name} requires confirm=true after explicit user confirmation.` }],
    };
  }
  if (operation.idempotencyKeyRequired && !args.idempotencyKey?.trim()) {
    return {
      isError: true,
      content: [{ type: "text", text: `${operation.name} requires a non-empty idempotencyKey.` }],
    };
  }

  try {
    const result = await client.call(operation, args);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (error) {
    if (error instanceof RuddurApiError) {
      return {
        isError: true,
        content: [{
          type: "text",
          text: JSON.stringify({ status: error.status, error: error.message, body: error.responseBody }, null, 2),
        }],
      };
    }
    const message = error instanceof Error ? error.message : String(error);
    return { isError: true, content: [{ type: "text", text: message }] };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
