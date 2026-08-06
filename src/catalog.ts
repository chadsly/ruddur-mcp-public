import type { CreatorScope, Operation, ToolArguments } from "./types.js";
import { BODY_SCHEMA_DESCRIPTION, operationGuidance } from "./instructions.js";

const one = (scope: CreatorScope) => ({ scopes: [scope] });
const any = (...scopes: CreatorScope[]) => ({ scopes, mode: "any" as const });
const op = (
  name: string,
  description: string,
  method: Operation["method"],
  path: string,
  scope: Operation["scope"],
  flags: Pick<Operation, "mutation" | "destructive" | "confirmationRequired" | "idempotencyKeyRequired"> = {},
): Operation => ({ name, description, method, path, scope, ...flags });

export const OPERATIONS: Operation[] = [
  op("ruddur_list_headings", "List creator-owned Headings.", "GET", "/api/creator/headings", one("content.read")),
  op("ruddur_create_heading", "Create or import a creator-owned Heading.", "POST", "/api/creator/headings", one("content.manage"), { mutation: true }),
  op("ruddur_get_heading", "Get a creator-owned Heading by id.", "GET", "/api/creator/headings/:id", one("content.read")),
  op("ruddur_update_heading", "Update a Heading, cover asset, or canvas style.", "PUT", "/api/creator/headings/:id", one("content.manage"), { mutation: true }),
  op("ruddur_delete_heading", "Delete a creator-owned Heading.", "DELETE", "/api/creator/headings/:id", one("content.manage"), { mutation: true, destructive: true, confirmationRequired: true }),
  op("ruddur_search_headings", "Search creator-owned Headings using query parameter q.", "GET", "/api/creator/headings/search/query", one("content.read")),
  op("ruddur_create_heading_snapshot", "Create a named Heading snapshot.", "POST", "/api/creator/headings/:id/snapshots", one("content.manage"), { mutation: true }),
  op("ruddur_list_heading_snapshots", "List snapshots for a Heading.", "GET", "/api/creator/headings/:id/snapshots", one("content.read")),
  op("ruddur_restore_heading_snapshot", "Restore a Heading snapshot.", "POST", "/api/creator/headings/:id/snapshots/:snapshotId/restore", one("content.manage"), { mutation: true, confirmationRequired: true }),
  op("ruddur_create_heading_template", "Create a reusable template from a Heading.", "POST", "/api/creator/headings/:id/templates", one("content.manage"), { mutation: true }),
  op("ruddur_list_heading_templates", "List creator Heading templates.", "GET", "/api/creator/headings/templates/list", one("content.read")),
  op("ruddur_apply_heading_template", "Create a Heading from a template.", "POST", "/api/creator/headings/templates/:templateId/apply", one("content.manage"), { mutation: true }),
  op("ruddur_export_heading", "Export a Heading as JSON.", "GET", "/api/creator/headings/:id/export", one("content.read")),
  op("ruddur_import_headings", "Import one or more Headings from JSON.", "POST", "/api/creator/headings/import", one("content.manage"), { mutation: true }),
  op("ruddur_update_heading_tags", "Replace the tags on a Heading.", "PUT", "/api/creator/headings/:id/tags", one("content.manage"), { mutation: true }),
  op("ruddur_create_waypoint_note", "Create a note on a Heading Waypoint.", "POST", "/api/creator/headings/:id/waypoints/:waypointId/notes", one("content.manage"), { mutation: true }),
  op("ruddur_list_waypoint_notes", "List notes on a Heading Waypoint.", "GET", "/api/creator/headings/:id/waypoints/:waypointId/notes", one("content.read")),
  op("ruddur_update_waypoint_note", "Update a Waypoint note.", "PUT", "/api/creator/headings/notes/:noteId", one("content.manage"), { mutation: true }),
  op("ruddur_delete_waypoint_note", "Delete a Waypoint note.", "DELETE", "/api/creator/headings/notes/:noteId", one("content.manage"), { mutation: true, destructive: true, confirmationRequired: true }),
  op("ruddur_list_heading_collaborators", "List collaborators on a Heading.", "GET", "/api/creator/headings/:id/collaborators", one("content.read")),
  op("ruddur_add_heading_collaborator", "Add a collaborator to a Heading.", "POST", "/api/creator/headings/:id/collaborators", one("content.manage"), { mutation: true }),
  op("ruddur_update_heading_collaborator", "Update a Heading collaborator role.", "PUT", "/api/creator/headings/:id/collaborators/:collaboratorId", one("content.manage"), { mutation: true }),
  op("ruddur_remove_heading_collaborator", "Remove a Heading collaborator.", "DELETE", "/api/creator/headings/:id/collaborators/:collaboratorId", one("content.manage"), { mutation: true, destructive: true, confirmationRequired: true }),
  op("ruddur_clone_heading", "Clone a creator-owned Heading.", "POST", "/api/creator/headings/:id/clone", one("content.manage"), { mutation: true }),
  op("ruddur_update_heading_status", "Update a Heading lifecycle status.", "PATCH", "/api/creator/headings/:id/status", one("content.manage"), { mutation: true, confirmationRequired: true }),

  op("ruddur_list_waypoints", "List creator-owned Waypoints.", "GET", "/api/creator/waypoints", one("content.read")),
  op("ruddur_create_waypoint", "Create a creator-owned Waypoint.", "POST", "/api/creator/waypoints", one("content.manage"), { mutation: true }),
  op("ruddur_update_waypoint", "Update a creator-owned Waypoint.", "PUT", "/api/creator/waypoints/:id", one("content.manage"), { mutation: true }),
  op("ruddur_delete_waypoint", "Delete a creator-owned Waypoint.", "DELETE", "/api/creator/waypoints/:id", one("content.manage"), { mutation: true, destructive: true, confirmationRequired: true }),
  op("ruddur_attach_waypoint", "Attach a Waypoint to a Heading.", "POST", "/api/creator/waypoints/:id/attach", one("content.manage"), { mutation: true }),
  op("ruddur_update_waypoint_placement", "Update a Waypoint placement.", "PATCH", "/api/creator/waypoints/placements/:placementId", one("content.manage"), { mutation: true }),
  op("ruddur_delete_waypoint_placement", "Delete a Waypoint placement.", "DELETE", "/api/creator/waypoints/placements/:placementId", one("content.manage"), { mutation: true, destructive: true, confirmationRequired: true }),

  op("ruddur_create_media_upload", "Create a presigned creator-media upload.", "POST", "/api/creator/media/uploads/presign", one("media.manage"), { mutation: true }),
  op("ruddur_list_media_assets", "List creator media assets.", "GET", "/api/creator/media/assets", one("media.read")),
  op("ruddur_update_media_asset", "Update creator media metadata.", "PATCH", "/api/creator/media/assets/:id", one("media.manage"), { mutation: true }),
  op("ruddur_delete_media_asset", "Delete a creator media asset.", "DELETE", "/api/creator/media/assets/:id", one("media.manage"), { mutation: true, destructive: true, confirmationRequired: true }),
  op("ruddur_attach_media_asset", "Attach a media asset to Ruddur content.", "POST", "/api/creator/media/assets/:id/attach", one("media.manage"), { mutation: true }),
  op("ruddur_detach_media_asset", "Detach a media asset from Ruddur content.", "POST", "/api/creator/media/assets/:id/detach", one("media.manage"), { mutation: true, confirmationRequired: true }),
  op("ruddur_create_media_transform", "Create or register a media transform.", "POST", "/api/creator/media/assets/:id/transforms", one("media.manage"), { mutation: true }),

  op("ruddur_record_creator_event", "Record a creator analytics event.", "POST", "/api/creator/analytics/events", one("events.write"), { mutation: true, idempotencyKeyRequired: true }),
  op("ruddur_get_creator_analytics", "Get creator analytics summary.", "GET", "/api/creator/analytics/summary", one("analytics.read")),
  op("ruddur_get_creator_billing", "Get creator billing summary.", "GET", "/api/creator/billing", one("billing.read")),

  op("ruddur_list_my_marketplace_listings", "List marketplace listings owned by the creator.", "GET", "/api/marketplace/listings/mine", any("marketplace.read", "marketplace.manage")),
  op("ruddur_create_marketplace_listing", "Create a marketplace listing.", "POST", "/api/marketplace/listings", one("marketplace.manage"), { mutation: true }),
  op("ruddur_update_marketplace_listing", "Update or publish a marketplace listing.", "PUT", "/api/marketplace/listings/:id", one("marketplace.manage"), { mutation: true, confirmationRequired: true }),
  op("ruddur_delete_marketplace_listing", "Delete a marketplace listing.", "DELETE", "/api/marketplace/listings/:id", one("marketplace.manage"), { mutation: true, destructive: true, confirmationRequired: true }),
  op("ruddur_get_creator_profile", "Get the authenticated creator profile.", "GET", "/api/marketplace/creator-profile", any("marketplace.read", "marketplace.manage")),
  op("ruddur_update_creator_profile", "Create or update the authenticated creator profile.", "POST", "/api/marketplace/creator-profile", one("marketplace.manage"), { mutation: true }),
  op("ruddur_list_coupons", "List creator marketplace coupons.", "GET", "/api/marketplace/coupons", any("marketplace.read", "marketplace.manage")),
  op("ruddur_create_coupon", "Create a marketplace coupon.", "POST", "/api/marketplace/coupons", one("marketplace.manage"), { mutation: true }),
  op("ruddur_update_coupon", "Update a marketplace coupon.", "PATCH", "/api/marketplace/coupons/:couponId", one("marketplace.manage"), { mutation: true }),
  op("ruddur_verify_entitlement", "Verify a user's entitlement to a creator listing.", "POST", "/api/marketplace/entitlements/verify", any("marketplace.entitlements", "marketplace.manage")),
  op("ruddur_get_marketplace_license", "Get creator license details for a purchase.", "GET", "/api/marketplace/licenses/:purchaseId", any("marketplace.entitlements", "marketplace.manage")),
];

export const operationByName = new Map(OPERATIONS.map((operation) => [operation.name, operation]));

export const hasRequiredScope = (operation: Operation, configuredScopes: Set<CreatorScope> | null) => {
  if (!configuredScopes) return true;
  const matches = operation.scope.scopes.map((scope) => configuredScopes.has(scope));
  return operation.scope.mode === "any" ? matches.some(Boolean) : matches.every(Boolean);
};

export const visibleOperations = (configuredScopes: Set<CreatorScope> | null, allowMutations: boolean) =>
  OPERATIONS.filter((operation) => hasRequiredScope(operation, configuredScopes))
    .filter((operation) => allowMutations || !operation.mutation);

export const pathParameterNames = (path: string) =>
  Array.from(path.matchAll(/:([A-Za-z][A-Za-z0-9_]*)/g), (match) => match[1]);

export const buildPath = (operation: Operation, args: ToolArguments) => {
  let path = operation.path;
  for (const name of pathParameterNames(operation.path)) {
    const value = args.pathParams?.[name];
    if (value == null || String(value).trim() === "") throw new Error(`pathParams.${name} is required.`);
    path = path.replace(`:${name}`, encodeURIComponent(String(value)));
  }
  return path;
};

export const toolForOperation = (operation: Operation) => {
  const pathNames = pathParameterNames(operation.path);
  const properties: Record<string, unknown> = {
    query: {
      type: "object",
      description: "Optional query parameters.",
      additionalProperties: { type: ["string", "number", "boolean", "array", "null"] },
    },
    body: {
      anyOf: [{ type: "object" }, { type: "array" }, { type: "string" }],
      description: BODY_SCHEMA_DESCRIPTION,
    },
  };
  if (pathNames.length) {
    properties.pathParams = {
      type: "object",
      description: `Path parameters: ${pathNames.join(", ")}.`,
      properties: Object.fromEntries(pathNames.map((name) => [name, { type: ["string", "number"] }])),
      required: pathNames,
      additionalProperties: false,
    };
  }
  if (operation.confirmationRequired) {
    properties.confirm = {
      type: "boolean",
      const: true,
      description: "Must be true after the user has explicitly confirmed this sensitive action.",
    };
  }
  if (operation.idempotencyKeyRequired) {
    properties.idempotencyKey = {
      type: "string",
      minLength: 1,
      description: "Unique idempotency key for safely retrying this operation.",
    };
  }

  return {
    name: operation.name,
    description: `${operation.description}${operationGuidance(operation.name)} Requires ${operation.scope.mode === "any" ? "one of" : ""} scope: ${operation.scope.scopes.join(", ")}.`,
    inputSchema: {
      type: "object",
      properties,
      required: [
        ...(pathNames.length ? ["pathParams"] : []),
        ...(operation.confirmationRequired ? ["confirm"] : []),
        ...(operation.idempotencyKeyRequired ? ["idempotencyKey"] : []),
      ],
      additionalProperties: false,
    },
    annotations: {
      readOnlyHint: !operation.mutation,
      destructiveHint: Boolean(operation.destructive),
      idempotentHint: operation.method === "GET" || operation.method === "PUT" || operation.method === "DELETE",
      openWorldHint: true,
    },
    securitySchemes: [{ type: "oauth2", scopes: operation.scope.scopes }],
  };
};
