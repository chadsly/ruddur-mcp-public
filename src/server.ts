import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { RUDDUR_MCP_INSTRUCTIONS } from "./instructions.js";
import { createRuddurRuntime } from "./runtime.js";
import type { CreatorScope } from "./types.js";

export type RuddurServerOptions = {
  apiBase: string;
  token: string;
  scopes: Set<CreatorScope> | null;
  allowMutations: boolean;
  timeoutMs: number;
};

export const createRuddurServer = (options: RuddurServerOptions) => {
  const runtime = createRuddurRuntime(options);
  const server = new Server(
    { name: "ruddur-mcp", version: "0.3.0" },
    { capabilities: { tools: {} }, instructions: RUDDUR_MCP_INSTRUCTIONS },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: runtime.listTools(),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    return runtime.callTool(request.params.name, request.params.arguments);
  });

  return server;
};
