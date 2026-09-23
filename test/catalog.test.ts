import assert from "node:assert/strict";
import test from "node:test";
import { buildPath, operationByName, toolForOperation, visibleOperations } from "../src/catalog.js";

test("scope filtering advertises only permitted operations", () => {
  const operations = visibleOperations(new Set(["content.read"]), true);
  assert.ok(operations.some((operation) => operation.name === "ruddur_list_headings"));
  assert.ok(!operations.some((operation) => operation.name === "ruddur_create_heading"));
  assert.ok(!operations.some((operation) => operation.name === "ruddur_list_media_assets"));
});

test("mutation filtering removes write tools", () => {
  const operations = visibleOperations(null, false);
  assert.ok(operations.every((operation) => !operation.mutation));
  assert.ok(operations.some((operation) => operation.name === "ruddur_get_creator_billing"));
});

test("commerce promotion tools are scoped and require confirmation to disable", () => {
  const operations = visibleOperations(new Set(["marketplace.manage"]), true);
  assert.ok(operations.some(operation => operation.name === "ruddur_list_commerce_offerings"));
  assert.ok(operations.some(operation => operation.name === "ruddur_create_promotion"));
  assert.equal(operationByName.get("ruddur_disable_promotion")?.confirmationRequired, true);
});

test("granular marketplace scopes do not leak unrelated management tools", () => {
  const listingTools = visibleOperations(new Set(["listings.manage"]), true);
  assert.ok(listingTools.some(operation => operation.name === "ruddur_create_marketplace_listing"));
  assert.ok(listingTools.some(operation => operation.name === "ruddur_list_my_marketplace_listings"));
  assert.ok(!listingTools.some(operation => operation.name === "ruddur_create_promotion"));
  assert.ok(!listingTools.some(operation => operation.name === "ruddur_update_creator_profile"));

  const promotionTools = visibleOperations(new Set(["promotions.manage"]), true);
  assert.ok(promotionTools.some(operation => operation.name === "ruddur_create_promotion"));
  assert.ok(!promotionTools.some(operation => operation.name === "ruddur_create_marketplace_listing"));
});

test("coaching provider and paid offerings require independent granular grants", () => {
  const providerTools = visibleOperations(new Set(["coaching.provider.manage"]), true);
  assert.ok(providerTools.some(operation => operation.name === "ruddur_get_coaching_provider"));
  assert.ok(providerTools.some(operation => operation.name === "ruddur_update_coaching_provider"));
  assert.ok(!providerTools.some(operation => operation.name === "ruddur_list_coaching_offerings"));
  assert.ok(!providerTools.some(operation => operation.name === "ruddur_create_coaching_offering"));

  const offeringTools = visibleOperations(new Set(["coaching.offerings.manage"]), true);
  assert.ok(offeringTools.some(operation => operation.name === "ruddur_list_coaching_offerings"));
  assert.ok(offeringTools.some(operation => operation.name === "ruddur_create_coaching_offering"));
  assert.ok(offeringTools.some(operation => operation.name === "ruddur_update_coaching_offering"));
  assert.ok(!offeringTools.some(operation => operation.name === "ruddur_get_coaching_provider"));
  assert.equal(operationByName.get("ruddur_update_coaching_offering")?.confirmationRequired, true);
});

test("client coaching tools are isolated and mutations require confirmation", () => {
  const readTools = visibleOperations(new Set(["coaching.client.read"]), true);
  assert.ok(readTools.some(operation => operation.name === "ruddur_search_client_coaches"));
  assert.ok(readTools.some(operation => operation.name === "ruddur_get_client_coaching_meeting"));
  assert.ok(!readTools.some(operation => operation.name === "ruddur_book_client_coaching_session"));
  const manageTools = visibleOperations(new Set(["coaching.client.manage"]), true);
  assert.equal(operationByName.get("ruddur_book_client_coaching_session")?.confirmationRequired, true);
  assert.equal(operationByName.get("ruddur_share_client_coaching_result")?.confirmationRequired, true);
  assert.ok(manageTools.some(operation => operation.name === "ruddur_complete_client_coaching_requirement"));
});

test("relationship tools expose assignment pointers and results under an isolated read scope", () => {
  const tools = visibleOperations(new Set(["relationships.read"]), true);
  assert.deepEqual(
    tools.map(operation => operation.name),
    ["ruddur_list_relationships", "ruddur_list_coaching_clients", "ruddur_get_assigned_heading_results"],
  );
  assert.equal(
    buildPath(operationByName.get("ruddur_get_assigned_heading_results")!, { pathParams: { id: "assignment/one" } }),
    "/api/delegations/assignments/assignment%2Fone/inputs",
  );
  assert.match(operationByName.get("ruddur_list_relationships")!.description, /every type/);
  assert.match(operationByName.get("ruddur_get_assigned_heading_results")!.description, /unrelated Headings/);
});

test("coaching assignment is a separate write grant without changing read-only access", () => {
  const readOnly = visibleOperations(new Set(["relationships.read"]), true);
  assert.ok(!readOnly.some(operation => operation.name === "ruddur_assign_heading"));
  const writeOnly = visibleOperations(new Set(["relationships.assign"]), true);
  assert.deepEqual(writeOnly.map(operation => operation.name), ["ruddur_assign_heading"]);
  assert.ok(!visibleOperations(new Set(["relationships.assign"]), false).some(operation => operation.name === "ruddur_assign_heading"));
  const operation = operationByName.get("ruddur_assign_heading")!;
  assert.equal(buildPath(operation, { pathParams: { relationshipId: "relationship-id" } }), "/api/delegations/coaching-clients/relationship-id/assignments");
  assert.deepEqual(toolForOperation(operation).inputSchema.required, ["relationshipId", "headingId"]);
  assert.equal(toolForOperation(operation).annotations.readOnlyHint, false);
  assert.match(operation.description, /ruddur_list_coaching_clients/);
});

test("path parameters are encoded and required", () => {
  const operation = operationByName.get("ruddur_get_heading");
  assert.ok(operation);
  assert.equal(buildPath(operation, { pathParams: { id: "heading/one" } }), "/api/creator/headings/heading%2Fone");
  assert.throws(() => buildPath(operation, {}), /pathParams.id is required/);
});

test("tool descriptions include MCP normalization guidance", () => {
  const operation = operationByName.get("ruddur_create_marketplace_listing");
  assert.ok(operation);

  const tool = toolForOperation(operation);

  assert.match(tool.description, /natural marketplace payloads/);
  assert.match(tool.description, /integer USD cents/);
  assert.match(tool.description, /\$12\.34 is 1234/);
  assert.match(tool.description, /outcome-focused and buyer-facing/);
  assert.match(tool.description, /question-format, free-text, PII\/data-handling/);
  assert.match(tool.description, /unless explicitly requested or specifically required/);
  assert.match(JSON.stringify(tool.inputSchema), /omit assessmentConfig/);
});

test("assessment waypoint tools require persisted read-after-write verification", () => {
  const operation = operationByName.get("ruddur_create_waypoint");
  assert.ok(operation);

  const tool = toolForOperation(operation);

  assert.match(tool.description, /unique non-empty id/);
  assert.match(tool.description, /unique non-empty string label and value/);
  assert.match(tool.description, /ruddur_list_waypoints/);
  assert.match(tool.description, /before reporting success/);
  assert.match(tool.description, /complete config and questions atomically/);
  assert.match(tool.description, /Option scores are optional/);
  assert.match(tool.description, /scoring\.dimensions is accepted as an alias/);
});
