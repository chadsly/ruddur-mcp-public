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
  assert.match(JSON.stringify(tool.inputSchema), /assessmentConfig is optional/);
});
