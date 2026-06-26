export const RUDDUR_MCP_INSTRUCTIONS = [
  "Use Ruddur tools with natural creator payloads; the MCP server normalizes common aliases before calling the Ruddur API.",
  "For Headings and Waypoints, you do not need to ask the user for assessmentConfig. If a waypoint is missing assessmentConfig, the server supplies a publishable default creator assessment config.",
  "If a user provides creatorAssessmentConfig, send it as-is; the server maps that alias to assessmentConfig for the Ruddur API.",
  "For marketplace publishing, prefer ruddur_create_marketplace_listing with either an existing headingId or a natural payload containing marketplace details and waypoints. Keep status as DRAFT unless the user explicitly asks to publish.",
  "Sensitive or destructive tools require confirm=true only after explicit user confirmation.",
].join(" ");

export const BODY_SCHEMA_DESCRIPTION = [
  "JSON request body for POST, PUT, or PATCH operations.",
  "You may pass natural Ruddur fields directly at the top level instead of wrapping them in body; the server will infer the body.",
  "For waypoint payloads, assessmentConfig is optional because the server supplies a publishable default when missing.",
].join(" ");

export const operationGuidance = (operationName: string) => {
  if (["ruddur_create_heading", "ruddur_import_headings", "ruddur_create_waypoint", "ruddur_update_waypoint"].includes(operationName)) {
    return " Waypoint assessmentConfig is optional; the MCP server supplies a valid publishable default when missing and maps creatorAssessmentConfig to assessmentConfig.";
  }
  if (["ruddur_create_marketplace_listing", "ruddur_update_marketplace_listing"].includes(operationName)) {
    return " The MCP server accepts natural marketplace payloads, including marketplace details, title/name aliases, comma-separated tags, lowercase status/currency, and top-level waypoints converted into a heading payload with publishable assessmentConfig defaults.";
  }
  if (["ruddur_attach_waypoint", "ruddur_update_waypoint_placement"].includes(operationName)) {
    return " The MCP server accepts placement aliases such as heading, index, state, and sortOrder.";
  }
  if (["ruddur_create_media_upload", "ruddur_update_media_asset", "ruddur_attach_media_asset", "ruddur_detach_media_asset", "ruddur_create_media_transform"].includes(operationName)) {
    return " The MCP server accepts media aliases such as title/name, mimeType/contentType, size/fileSize, and heading/waypoint/listing identifiers.";
  }
  if (["ruddur_create_coupon", "ruddur_update_coupon"].includes(operationName)) {
    return " The MCP server accepts coupon aliases such as promoCode, percentOff, amountOff, expires, usageLimit, and marketplaceListingId.";
  }
  if (["ruddur_add_heading_collaborator", "ruddur_update_heading_collaborator"].includes(operationName)) {
    return " The MCP server accepts collaborator aliases such as userId, collaboratorId, permission, access, and accessLevel.";
  }
  if (operationName === "ruddur_update_creator_profile") {
    return " The MCP server accepts name, creatorName, or title as aliases for displayName.";
  }
  if (operationName === "ruddur_record_creator_event") {
    return " The MCP server accepts event/type/name as aliases for eventType and timestamp/time/createdAt as aliases for occurredAt.";
  }
  if (operationName === "ruddur_verify_entitlement") {
    return " The MCP server accepts marketplaceListingId and customerUserId aliases.";
  }
  return "";
};
