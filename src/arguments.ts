import type { Operation, ToolArguments } from "./types.js";

const CONTROL_ARGUMENTS = new Set(["pathParams", "query", "body", "confirm", "idempotencyKey"]);
const BODY_METHODS = new Set<Operation["method"]>(["POST", "PUT", "PATCH"]);
const HEADING_BODY_OPERATIONS = new Set(["ruddur_create_heading", "ruddur_import_headings"]);
const WAYPOINT_BODY_OPERATIONS = new Set(["ruddur_create_waypoint", "ruddur_update_waypoint"]);
const MARKETPLACE_LISTING_OPERATIONS = new Set(["ruddur_create_marketplace_listing", "ruddur_update_marketplace_listing"]);
const COLLABORATOR_OPERATIONS = new Set(["ruddur_add_heading_collaborator", "ruddur_update_heading_collaborator"]);
const MEDIA_LINK_OPERATIONS = new Set(["ruddur_attach_media_asset", "ruddur_detach_media_asset"]);

export const DEFAULT_CREATOR_ASSESSMENT_CONFIG = {
  kind: "creator-assessment",
  schemaVersion: 1,
  version: "1.0.0",
  status: "draft",
  title: "Waypoint reflection",
  summary: "A lightweight reflection check for this waypoint.",
  scoring: {
    mode: "sum",
    scaleMin: 0,
    scaleMax: 1,
  },
  result: {
    shape: "score",
    title: "Reflection complete",
    description: "Use this assessment to capture completion evidence for the waypoint.",
  },
  publish: {
    requiresValidation: false,
    allowDraftPreview: true,
    reviewRequired: false,
  },
  analytics: {
    eventPrefix: "creator_assessment",
    tags: ["creator", "assessment", "waypoint"],
  },
  persistence: {
    target: "metadata",
    field: "creatorAssessmentScore",
  },
};

const parseJsonBodyString = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) throw new Error("body must not be an empty string.");
  try {
    return JSON.parse(trimmed);
  } catch {
    throw new Error("body was provided as a string but is not valid JSON.");
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const firstPresent = (source: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = source[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
};

const copyAlias = (target: Record<string, unknown>, canonical: string, aliases: string[]) => {
  if (target[canonical] === undefined) {
    const value = firstPresent(target, aliases);
    if (value !== undefined) target[canonical] = value;
  }
};

const upperString = (value: unknown) => typeof value === "string" ? value.trim().toUpperCase() : value;

const normalizeTags = (value: unknown) => {
  if (typeof value === "string") return value.split(",").map((tag) => tag.trim()).filter(Boolean);
  return value;
};

const slugify = (value: unknown, fallback: string) => {
  const source = typeof value === "string" && value.trim().length > 0 ? value : fallback;
  const slug = source
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || fallback;
};

const withDefaultCanvas = (heading: Record<string, unknown>) => {
  if (!Array.isArray(heading.waypoints)) return heading;
  const result: Record<string, unknown> = { ...heading };
  const usedNodeIds = new Set<string>();

  const waypoints = heading.waypoints.map((rawWaypoint, index) => {
    const waypoint = withCreatorAssessmentConfig(rawWaypoint);
    if (!isRecord(waypoint)) return waypoint;
    const placement = isRecord(waypoint.placement) ? { ...waypoint.placement } : {};
    const rawNodeId = firstPresent(waypoint, ["nodeId", "id", "waypointId"]) ?? placement.nodeId;
    const baseNodeId = slugify(rawNodeId ?? waypoint.title, `waypoint-${index + 1}`);
    let nodeId = baseNodeId;
    let suffix = 2;
    while (usedNodeIds.has(nodeId)) {
      nodeId = `${baseNodeId}-${suffix}`;
      suffix += 1;
    }
    usedNodeIds.add(nodeId);
    placement.nodeId = typeof placement.nodeId === "string" && placement.nodeId.trim() ? placement.nodeId : nodeId;
    if (placement.order === undefined) placement.order = index;
    if (placement.status === undefined) placement.status = "not_started";
    if (!isRecord(placement.position)) placement.position = { x: 200 + index * 220, y: 160 + index * 80 };
    if (placement.type === undefined) placement.type = "default";
    return {
      ...waypoint,
      id: typeof waypoint.id === "string" && waypoint.id.trim() ? waypoint.id : nodeId,
      placement,
    };
  });

  result.waypoints = waypoints;
  if (!Array.isArray(result.nodes) || result.nodes.length === 0) {
    result.nodes = waypoints
      .filter(isRecord)
      .map((waypoint, index) => {
        const placement = isRecord(waypoint.placement) ? waypoint.placement : {};
        const nodeId = typeof placement.nodeId === "string" && placement.nodeId.trim() ? placement.nodeId : `waypoint-${index + 1}`;
        const title = typeof waypoint.title === "string" && waypoint.title.trim() ? waypoint.title.trim() : `Waypoint ${index + 1}`;
        return {
          id: nodeId,
          type: typeof placement.type === "string" ? placement.type : "default",
          data: {
            label: title,
            labelText: title,
            status: typeof placement.status === "string" ? placement.status : "not_started",
          },
          position: isRecord(placement.position) ? placement.position : { x: 200 + index * 220, y: 160 + index * 80 },
          status: typeof placement.status === "string" ? placement.status : "not_started",
        };
      });
  }
  if (!Array.isArray(result.edges)) {
    const nodes = Array.isArray(result.nodes) ? result.nodes.filter(isRecord) : [];
    result.edges = nodes.slice(0, -1).map((node, index) => ({
      id: `${String(node.id)}->${String(nodes[index + 1].id)}`,
      source: String(node.id),
      target: String(nodes[index + 1].id),
      animated: true,
      markerEnd: { type: "arrowclosed" },
    }));
  }
  return result;
};

const withCreatorAssessmentConfig = (waypoint: unknown) => {
  if (!isRecord(waypoint)) return waypoint;
  if (isRecord(waypoint.assessmentConfig) && Object.keys(waypoint.assessmentConfig).length > 0) {
    return waypoint;
  }
  if (isRecord(waypoint.creatorAssessmentConfig) && Object.keys(waypoint.creatorAssessmentConfig).length > 0) {
    return {
      ...waypoint,
      assessmentConfig: waypoint.creatorAssessmentConfig,
    };
  }
  return {
    ...waypoint,
    assessmentConfig: DEFAULT_CREATOR_ASSESSMENT_CONFIG,
  };
};

const normalizeWaypointConfigs = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(normalizeWaypointConfigs);
  if (!isRecord(value)) return value;

  const normalized: Record<string, unknown> = { ...value };
  if (Array.isArray(normalized.waypoints)) {
    normalized.waypoints = normalized.waypoints.map(withCreatorAssessmentConfig);
  }
  if (Array.isArray(normalized.headings)) {
    normalized.headings = normalized.headings.map((heading) => {
      const normalizedHeading = normalizeWaypointConfigs(heading);
      return isRecord(normalizedHeading) ? withDefaultCanvas(normalizedHeading) : normalizedHeading;
    });
  }
  return normalized;
};

const shouldNormalizeAssessmentConfig = (operation: Operation) =>
  HEADING_BODY_OPERATIONS.has(operation.name) || WAYPOINT_BODY_OPERATIONS.has(operation.name);

const normalizeHeadingLikeBody = (body: unknown): unknown => {
  const normalized = normalizeWaypointConfigs(body);
  if (!isRecord(normalized)) return normalized;
  const result: Record<string, unknown> = { ...normalized };
  copyAlias(result, "name", ["title"]);
  return withDefaultCanvas(result);
};

const normalizeWaypointPlacementBody = (body: unknown): unknown => {
  if (!isRecord(body)) return body;
  const result: Record<string, unknown> = { ...body };
  copyAlias(result, "headingId", ["headingID", "heading_id", "heading"]);

  const placement = isRecord(result.placement) ? { ...result.placement } : {};
  if (placement.order === undefined) {
    const order = firstPresent(result, ["positionIndex", "index", "sortOrder"]);
    if (order !== undefined) placement.order = order;
  }
  if (placement.status === undefined) {
    const status = firstPresent(result, ["state"]);
    if (status !== undefined) placement.status = status;
  }
  if (Object.keys(placement).length > 0) result.placement = placement;
  return result;
};

const normalizeMediaBody = (operation: Operation, body: unknown): unknown => {
  if (!isRecord(body)) return body;
  const result: Record<string, unknown> = { ...body };

  if (operation.name === "ruddur_update_media_asset") copyAlias(result, "name", ["title", "displayName", "fileName"]);
  if (operation.name === "ruddur_create_media_upload") {
    copyAlias(result, "fileName", ["filename", "name", "title"]);
    copyAlias(result, "contentType", ["mimeType", "mime", "type"]);
    copyAlias(result, "fileSize", ["size", "bytes"]);
  }
  if (MEDIA_LINK_OPERATIONS.has(operation.name)) {
    copyAlias(result, "headingId", ["headingID", "heading_id", "heading"]);
    copyAlias(result, "waypointId", ["waypointID", "waypoint_id", "waypoint"]);
    copyAlias(result, "listingId", ["marketplaceListingId", "marketplaceId", "listing"]);
  }
  if (operation.name === "ruddur_create_media_transform") copyAlias(result, "type", ["transformType", "operation", "name"]);
  return result;
};

const normalizeCouponBody = (operation: Operation, body: unknown): unknown => {
  if (!isRecord(body)) return body;
  const result: Record<string, unknown> = { ...body };
  copyAlias(result, "listingId", ["marketplaceListingId", "marketplaceId", "listing"]);
  copyAlias(result, "expiresAt", ["expires", "expiration", "expirationDate", "endDate"]);
  copyAlias(result, "startsAt", ["starts", "startDate"]);
  copyAlias(result, "maxRedemptions", ["redemptionLimit", "usageLimit", "maxUses"]);

  if (operation.name === "ruddur_create_coupon") {
    copyAlias(result, "code", ["couponCode", "promoCode"]);
    if (result.discountType === undefined || result.discountValue === undefined) {
      const percent = firstPresent(result, ["percentOff", "percentageOff", "discountPercent"]);
      const amount = firstPresent(result, ["amountOff", "discountAmount"]);
      const generic = firstPresent(result, ["discount", "discountValue"]);
      if (percent !== undefined) {
        result.discountType = "PERCENT";
        result.discountValue = percent;
      } else if (amount !== undefined) {
        result.discountType = "AMOUNT";
        result.discountValue = amount;
      } else if (generic !== undefined) {
        result.discountValue = generic;
      }
    }
    result.discountType = upperString(result.discountType ?? "AMOUNT");
  }
  return result;
};

const normalizeMarketplaceListingBody = (operation: Operation, body: unknown): unknown => {
  if (!isRecord(body)) return body;
  const marketplace = isRecord(body.marketplace) ? body.marketplace : {};
  const result: Record<string, unknown> = { ...body, ...marketplace };
  delete result.marketplace;

  copyAlias(result, "name", ["title"]);
  copyAlias(result, "description", ["summary"]);
  copyAlias(result, "headingId", ["headingID", "heading_id"]);
  copyAlias(result, "imageAssetId", ["coverAssetId", "graphicAssetId", "mediaAssetId"]);
  if (result.tags !== undefined) result.tags = normalizeTags(result.tags);
  if (result.status !== undefined) result.status = upperString(result.status);
  if (result.currency !== undefined) result.currency = upperString(result.currency);
  if (result.price === undefined) result.price = 0;
  delete result.title;
  if (operation.name === "ruddur_create_marketplace_listing" && result.heading === undefined) {
    const topLevelWaypoints = Array.isArray(body.waypoints) ? body.waypoints : undefined;
    if (topLevelWaypoints || body.nodes || body.edges) {
      result.heading = normalizeHeadingLikeBody({
        name: firstPresent(body, ["headingName", "name", "title"]),
        nodes: body.nodes,
        edges: body.edges,
        waypoints: topLevelWaypoints,
      });
      delete result.waypoints;
      delete result.nodes;
      delete result.edges;
    }
  }
  if (isRecord(result.heading)) result.heading = normalizeHeadingLikeBody(result.heading);
  return result;
};

const normalizeCollaboratorBody = (operation: Operation, body: unknown): unknown => {
  if (!isRecord(body)) return body;
  const result: Record<string, unknown> = { ...body };
  if (operation.name === "ruddur_add_heading_collaborator") {
    copyAlias(result, "collaboratorUserId", ["userId", "collaboratorId", "memberId"]);
  }
  copyAlias(result, "role", ["permission", "access", "accessLevel"]);
  return result;
};

const normalizeCreatorProfileBody = (body: unknown): unknown => {
  if (!isRecord(body)) return body;
  const result: Record<string, unknown> = { ...body };
  copyAlias(result, "displayName", ["name", "creatorName", "title"]);
  return result;
};

const normalizeCreatorEventBody = (body: unknown): unknown => {
  if (!isRecord(body)) return body;
  const result: Record<string, unknown> = { ...body };
  copyAlias(result, "eventType", ["event", "type", "name"]);
  copyAlias(result, "occurredAt", ["timestamp", "time", "createdAt"]);
  return result;
};

const normalizeEntitlementBody = (body: unknown): unknown => {
  if (!isRecord(body)) return body;
  const result: Record<string, unknown> = { ...body };
  copyAlias(result, "listingId", ["marketplaceListingId", "marketplaceId", "listing"]);
  copyAlias(result, "userId", ["customerUserId", "purchaserUserId"]);
  return result;
};

const normalizeOperationBody = (operation: Operation, body: unknown): unknown => {
  if (shouldNormalizeAssessmentConfig(operation)) {
    return WAYPOINT_BODY_OPERATIONS.has(operation.name)
      ? withCreatorAssessmentConfig(body)
      : normalizeHeadingLikeBody(body);
  }
  if (operation.name === "ruddur_attach_waypoint" || operation.name === "ruddur_update_waypoint_placement") return normalizeWaypointPlacementBody(body);
  if (operation.name.startsWith("ruddur_create_media") || operation.name.startsWith("ruddur_update_media") || MEDIA_LINK_OPERATIONS.has(operation.name)) return normalizeMediaBody(operation, body);
  if (operation.name === "ruddur_create_coupon" || operation.name === "ruddur_update_coupon") return normalizeCouponBody(operation, body);
  if (MARKETPLACE_LISTING_OPERATIONS.has(operation.name)) return normalizeMarketplaceListingBody(operation, body);
  if (COLLABORATOR_OPERATIONS.has(operation.name)) return normalizeCollaboratorBody(operation, body);
  if (operation.name === "ruddur_update_creator_profile") return normalizeCreatorProfileBody(body);
  if (operation.name === "ruddur_record_creator_event") return normalizeCreatorEventBody(body);
  if (operation.name === "ruddur_verify_entitlement") return normalizeEntitlementBody(body);
  return body;
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

  if (canSendBody) args.body = normalizeOperationBody(operation, args.body);

  return args;
};
