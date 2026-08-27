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
