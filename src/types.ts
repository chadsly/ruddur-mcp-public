export const CREATOR_SCOPES = [
  "content.read",
  "content.manage",
  "media.read",
  "media.manage",
  "marketplace.read",
  "marketplace.manage",
  "marketplace.entitlements",
  "analytics.read",
  "events.write",
  "billing.read",
] as const;

export type CreatorScope = (typeof CREATOR_SCOPES)[number];
export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type ScopeRequirement = {
  scopes: CreatorScope[];
  mode?: "all" | "any";
};

export type Operation = {
  name: string;
  description: string;
  method: HttpMethod;
  path: string;
  scope: ScopeRequirement;
  mutation?: boolean;
  destructive?: boolean;
  confirmationRequired?: boolean;
  idempotencyKeyRequired?: boolean;
};

export type ToolArguments = {
  pathParams?: Record<string, string | number>;
  query?: Record<string, string | number | boolean | Array<string | number | boolean> | null | undefined>;
  body?: unknown;
  confirm?: boolean;
  idempotencyKey?: string;
};
