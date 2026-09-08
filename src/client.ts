import type { Operation, ToolArguments } from "./types.js";
import { buildPath } from "./catalog.js";

export class RuddurApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly responseBody: unknown,
  ) {
    super(message);
    this.name = "RuddurApiError";
  }
}

type Fetch = typeof globalThis.fetch;

// Upstream proxies and unhandled backend errors may return HTML or diagnostic
// objects. Never forward those internals to an agent as a tool result.
const safeErrorBody = (status: number, body: unknown) => {
  if (status >= 500) {
    return { code: "UPSTREAM_ERROR", error: "Ruddur could not complete the request. Please try again later." };
  }
  if (body && typeof body === "object" && !Array.isArray(body)) {
    const source = body as Record<string, unknown>;
    const code = typeof source.code === "string" && /^[A-Za-z0-9_:-]{1,100}$/.test(source.code)
      ? source.code : "API_ERROR";
    const message = typeof source.error === "string" ? source.error : source.message;
    if (typeof message === "string" && message.length <= 1000 && !/[<>]/.test(message)) {
      return { code, error: message };
    }
    return { code, error: "Ruddur rejected the request." };
  }
  return { code: "API_ERROR", error: "Ruddur rejected the request." };
};

const appendQuery = (url: URL, query: ToolArguments["query"]) => {
  for (const [key, rawValue] of Object.entries(query || {})) {
    if (rawValue == null) continue;
    const values = Array.isArray(rawValue) ? rawValue : [rawValue];
    for (const value of values) url.searchParams.append(key, String(value));
  }
};

const parseResponse = async (response: Response) => {
  const text = await response.text();
  if (!text) return null;
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
  return text;
};

export class RuddurClient {
  constructor(
    private readonly apiBase: string,
    private readonly token: string,
    private readonly timeoutMs: number,
    private readonly fetchImpl: Fetch = globalThis.fetch,
  ) {}

  async call(operation: Operation, args: ToolArguments) {
    const path = buildPath(operation, args);
    const url = new URL(`${this.apiBase}${path}`);
    appendQuery(url, args.query);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const hasBody = args.body !== undefined && !["GET", "DELETE"].includes(operation.method);
      const response = await this.fetchImpl(url, {
        method: operation.method,
        headers: {
          Authorization: `Bearer ${this.token}`,
          Accept: "application/json",
          ...(hasBody ? { "Content-Type": "application/json" } : {}),
          ...(args.idempotencyKey ? { "Idempotency-Key": args.idempotencyKey } : {}),
          "User-Agent": "ruddur-mcp/0.3.0",
        },
        body: hasBody ? JSON.stringify(args.body) : undefined,
        signal: controller.signal,
      });
      const body = await parseResponse(response);
      if (!response.ok) {
        throw new RuddurApiError(`Ruddur API returned ${response.status} for ${operation.name}.`, response.status, safeErrorBody(response.status, body));
      }
      return { status: response.status, body };
    } finally {
      clearTimeout(timeout);
    }
  }
}
