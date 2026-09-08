export const CREATOR_SCOPES = [
  "headings.read",
  "headings.manage",
  "waypoints.read",
  "waypoints.manage",
  "collaborators.read",
  "collaborators.manage",
  "media.read",
  "media.manage",
  "profile.read",
  "profile.manage",
  "listings.read",
  "listings.manage",
  "offerings.read",
  "offerings.manage",
  "promotions.read",
  "promotions.manage",
  "entitlements.read",
  "licenses.read",
  "analytics.read",
  "events.write",
  "billing.read",
  // Coaching is deliberately separate from the broad marketplace scopes. A
  // connection that can curate Headings or generic listings must not gain
  // access to a coach's practice, clients, or paid session catalog.
  "coaching.provider.read",
  "coaching.provider.manage",
  "coaching.offerings.read",
  "coaching.offerings.manage",
  "coaching.client.read",
  "coaching.client.manage",
] as const;

export const LEGACY_CREATOR_SCOPES = [
  "content.read", "content.manage", "marketplace.read", "marketplace.manage", "marketplace.entitlements",
] as const;

export const SUPPORTED_CREATOR_SCOPES = [...CREATOR_SCOPES, ...LEGACY_CREATOR_SCOPES] as const;

export type CreatorScope = (typeof SUPPORTED_CREATOR_SCOPES)[number];
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
