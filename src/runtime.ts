import { normalizeToolArguments } from "./arguments.js";
import { operationByName, toolForOperation, visibleOperations } from "./catalog.js";
import { RuddurApiError, RuddurClient } from "./client.js";
import type { CreatorScope, ToolArguments } from "./types.js";
import type { RuddurServerOptions } from "./server.js";

export const createRuddurRuntime = (options: RuddurServerOptions) => {
  const operations = visibleOperations(options.scopes, options.allowMutations);
  const visibleNames = new Set(operations.map((operation) => operation.name));
  const client = new RuddurClient(options.apiBase, options.token, options.timeoutMs);

  return {
    listTools: () => operations.map(toolForOperation),
    callTool: async (name: string, rawArguments: unknown) => {
      const operation = operationByName.get(name);
      if (!operation || !visibleNames.has(operation.name)) {
        return { isError: true, content: [{ type: "text" as const, text: `Unknown or unauthorized Ruddur tool: ${name}` }] };
      }
      let args: ToolArguments;
      try {
        const input = rawArguments && typeof rawArguments === "object" && !Array.isArray(rawArguments)
          ? rawArguments as Record<string, unknown>
          : {};
        args = normalizeToolArguments(operation, input);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { isError: true, content: [{ type: "text" as const, text: message }] };
      }
      if (operation.confirmationRequired && args.confirm !== true) {
        return {
          isError: true,
          content: [{ type: "text" as const, text: `${operation.name} requires confirm=true after explicit user confirmation.` }],
        };
      }
      if (operation.idempotencyKeyRequired && !args.idempotencyKey?.trim()) {
        return {
          isError: true,
          content: [{ type: "text" as const, text: `${operation.name} requires a non-empty idempotencyKey.` }],
        };
      }
      try {
        const result = await client.call(operation, args);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        if (error instanceof RuddurApiError) {
          return {
            isError: true,
            content: [{ type: "text" as const, text: JSON.stringify({ status: error.status, error: error.message, body: error.responseBody }, null, 2) }],
          };
        }
        const message = error instanceof Error ? error.message : String(error);
        return { isError: true, content: [{ type: "text" as const, text: message }] };
      }
    },
  };
};
