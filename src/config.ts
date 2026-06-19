import { resolve } from "node:path";
import dotenv from "dotenv";
import { CREATOR_SCOPES, type CreatorScope } from "./types.js";

export type RuddurMcpConfig = {
  apiBase: string;
  token: string;
  configuredScopes: Set<CreatorScope> | null;
  allowMutations: boolean;
  timeoutMs: number;
};

const parseBoolean = (value: string | undefined, fallback: boolean) => {
  if (value == null || value.trim() === "") return fallback;
  return !["0", "false", "no", "off"].includes(value.trim().toLowerCase());
};

export const loadDotEnv = () => {
  const explicitPath = process.env.RUDDUR_MCP_ENV_FILE?.trim();
  const result = dotenv.config(explicitPath ? { path: resolve(explicitPath) } : undefined);
  if (result.error && (result.error as NodeJS.ErrnoException).code !== "ENOENT") {
    throw result.error;
  }
};

const parseScopes = (value: string | undefined): Set<CreatorScope> | null => {
  if (!value?.trim()) return null;
  const valid = new Set<string>(CREATOR_SCOPES);
  const scopes = value
    .split(/[\s,]+/)
    .map((scope) => scope.trim())
    .filter(Boolean);
  const unknown = scopes.filter((scope) => !valid.has(scope));
  if (unknown.length) throw new Error(`Unknown RUDDUR_CREATOR_SCOPES: ${unknown.join(", ")}`);
  return new Set(scopes as CreatorScope[]);
};

export const loadConfig = (): RuddurMcpConfig => {
  const token = process.env.RUDDUR_CREATOR_API_TOKEN?.trim();
  if (!token) throw new Error("RUDDUR_CREATOR_API_TOKEN is required. Set it in .env or the process environment.");

  const timeout = Number(process.env.RUDDUR_MCP_TIMEOUT_MS || 30000);
  if (!Number.isFinite(timeout) || timeout <= 0) throw new Error("RUDDUR_MCP_TIMEOUT_MS must be a positive number.");

  return {
    apiBase: (process.env.RUDDUR_API_BASE || "https://ruddur.com").replace(/\/$/, ""),
    token,
    configuredScopes: parseScopes(process.env.RUDDUR_CREATOR_SCOPES),
    allowMutations: parseBoolean(process.env.RUDDUR_MCP_ALLOW_MUTATIONS, true),
    timeoutMs: Math.floor(timeout),
  };
};
