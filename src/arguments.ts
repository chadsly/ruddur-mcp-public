import type { Operation, ToolArguments } from "./types.js";

const CONTROL_ARGUMENTS = new Set(["pathParams", "query", "body", "confirm", "idempotencyKey"]);
const BODY_METHODS = new Set<Operation["method"]>(["POST", "PUT", "PATCH"]);
const HEADING_BODY_OPERATIONS = new Set(["ruddur_create_heading", "ruddur_import_headings"]);
const WAYPOINT_BODY_OPERATIONS = new Set(["ruddur_create_waypoint", "ruddur_update_waypoint"]);

export const DEFAULT_CREATOR_ASSESSMENT_CONFIG = {
  version: "schema-v1",
  mode: "reflection",
  required: false,
  prompt: "Reflect on what you completed for this waypoint and note the next action you will take.",
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

const withCreatorAssessmentConfig = (waypoint: unknown) => {
  if (!isRecord(waypoint)) return waypoint;
  if (isRecord(waypoint.creatorAssessmentConfig) && Object.keys(waypoint.creatorAssessmentConfig).length > 0) {
    return waypoint;
  }
  return {
    ...waypoint,
    creatorAssessmentConfig: DEFAULT_CREATOR_ASSESSMENT_CONFIG,
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
    normalized.headings = normalized.headings.map(normalizeWaypointConfigs);
  }
  return normalized;
};

const shouldNormalizeAssessmentConfig = (operation: Operation) =>
  HEADING_BODY_OPERATIONS.has(operation.name) || WAYPOINT_BODY_OPERATIONS.has(operation.name);

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

  if (shouldNormalizeAssessmentConfig(operation)) {
    args.body = WAYPOINT_BODY_OPERATIONS.has(operation.name)
      ? withCreatorAssessmentConfig(args.body)
      : normalizeWaypointConfigs(args.body);
  }

  return args;
};
