import type { Operation, ToolArguments } from "./types.js";

const CONTROL_ARGUMENTS = new Set(["pathParams", "query", "body", "confirm", "idempotencyKey"]);
const BODY_METHODS = new Set<Operation["method"]>(["POST", "PUT", "PATCH"]);

const parseJsonBodyString = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) throw new Error("body must not be an empty string.");
  try {
    return JSON.parse(trimmed);
  } catch {
    throw new Error("body was provided as a string but is not valid JSON.");
  }
};

export const normalizeToolArguments = (operation: Operation, rawArguments: Record<string, unknown>): ToolArguments => {
  const args = { ...rawArguments } as ToolArguments;
  const canSendBody = BODY_METHODS.has(operation.method);

  if (typeof args.body === "string") {
    args.body = parseJsonBodyString(args.body);
  }

  if (canSendBody && args.body === undefined) {
    const body = Object.fromEntries(
      Object.entries(rawArguments).filter(([key]) => !CONTROL_ARGUMENTS.has(key)),
    );
    if (Object.keys(body).length > 0) args.body = body;
  }

  return args;
};
