#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig, loadDotEnv } from "./config.js";
import { createRuddurServer } from "./server.js";

loadDotEnv();
const config = loadConfig();
const server = createRuddurServer({
  apiBase: config.apiBase,
  token: config.token,
  scopes: config.configuredScopes,
  allowMutations: config.allowMutations,
  timeoutMs: config.timeoutMs,
});

const transport = new StdioServerTransport();
await server.connect(transport);
