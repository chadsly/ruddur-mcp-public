export const RUDDUR_MCP_INSTRUCTIONS = [
  "Use Ruddur tools with natural creator payloads; the MCP server normalizes common aliases before calling the Ruddur API.",
  "For normal Headings and Waypoints, omit assessmentConfig. Only include assessmentConfig or creatorAssessmentConfig when the user explicitly wants an assessment-style waypoint.",
  "If a user provides creatorAssessmentConfig, send it as-is; the server maps that alias to assessmentConfig for the Ruddur API.",
  "After creating or updating an assessment-style waypoint, inspect the returned waypoint and then use ruddur_list_waypoints to verify the persisted question count, unique question ids, non-empty option labels and values, unique option values, and scoring references. Do not claim success until the persisted assessment passes those checks; repair it or report the API validation error.",
  "Submit an assessment's complete assessmentConfig and questions together in one create or update call; do not create an outcomes-only shell and add questions later. Option scores are optional. When scores are provided, their keys must match scoring.groups ids; scoring.dimensions is accepted as an alias.",
  "For marketplace publishing, prefer ruddur_create_marketplace_listing with either an existing headingId or a natural payload containing marketplace details and waypoints. Keep status as DRAFT unless the user explicitly asks to publish.",
  "Write marketplace descriptions as buyer-facing copy that leads with the problem solved, expected outcome, and practical value. Do not add implementation details about question format, free-text fields, PII or data-handling mechanics, or generic educational and non-diagnostic disclaimers unless the user explicitly requests them or a specific legal or product requirement requires them.",
  "Sensitive or destructive tools require confirm=true only after explicit user confirmation.",
].join(" ");

export const BODY_SCHEMA_DESCRIPTION = [
  "JSON request body for POST, PUT, or PATCH operations.",
  "You may pass natural Ruddur fields directly at the top level instead of wrapping them in body; the server will infer the body.",
  "For normal waypoint payloads, omit assessmentConfig. Use assessmentConfig only for assessment-style waypoints.",
].join(" ");

export const operationGuidance = (operationName: string) => {
  if (["ruddur_create_heading", "ruddur_import_headings", "ruddur_create_waypoint", "ruddur_update_waypoint"].includes(operationName)) {
    return " Omit assessmentConfig for ordinary waypoints; include it only for explicit assessment-style waypoints. The MCP server maps creatorAssessmentConfig to assessmentConfig when provided. Submit the complete config and questions atomically, never as an outcomes-only shell followed by a second update. Every question needs a unique non-empty id, type, and prompt; multiple-choice options need unique non-empty string label and value fields. Option scores are optional; when present, score keys must match assessmentConfig.scoring.groups ids (scoring.dimensions is accepted as an alias), and every group/dimension must list its questionIds. After the write, retrieve the persisted waypoint with ruddur_list_waypoints and verify the complete assessment before reporting success.";
  }
  if (["ruddur_create_marketplace_listing", "ruddur_update_marketplace_listing"].includes(operationName)) {
    return " The MCP server accepts natural marketplace payloads, including marketplace details, title/name aliases, comma-separated tags, lowercase status/currency, and top-level waypoints converted into a heading payload. Ordinary waypoints should not include assessmentConfig. Keep marketplace descriptions outcome-focused and buyer-facing. Do not add question-format, free-text, PII/data-handling, or generic educational/non-diagnostic boilerplate unless explicitly requested or specifically required; place necessary disclosures in a dedicated assessment introduction, help, or consent surface when available.";
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
  if (operationName === "ruddur_create_promotion") {
    return " Use ruddur_list_commerce_offerings to resolve creator-owned Offering IDs and SKUs. Promotions accept promoCode, percentOff or amountOff, offeringIds/SKUs, starts/expires, total usageLimit, perCustomerLimit, and minimumPurchaseAmount. Monetary amounts use integer USD cents after normalization.";
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
