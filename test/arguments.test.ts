import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_CREATOR_ASSESSMENT_CONFIG, normalizeToolArguments } from "../src/arguments.js";
import { operationByName } from "../src/catalog.js";

test("normalizes top-level write fields into the request body", () => {
  const operation = operationByName.get("ruddur_create_heading");
  assert.ok(operation);

  const args = normalizeToolArguments(operation, { name: "Money and Marriage Test", status: "draft" });

  assert.deepEqual(args.body, { name: "Money and Marriage Test", status: "draft" });
});

test("parses JSON string bodies before forwarding to the API", () => {
  const operation = operationByName.get("ruddur_import_headings");
  assert.ok(operation);

  const args = normalizeToolArguments(operation, { body: '{"headings":[{"name":"Plan"}]}' });

  assert.deepEqual(args.body, { headings: [{ name: "Plan" }] });
});

test("keeps path, query, confirmation, and idempotency arguments out of inferred body", () => {
  const operation = operationByName.get("ruddur_update_heading_status");
  assert.ok(operation);

  const args = normalizeToolArguments(operation, {
    pathParams: { id: "heading-1" },
    query: { source: "test" },
    confirm: true,
    idempotencyKey: "status-1",
    status: "draft",
  });

  assert.deepEqual(args.pathParams, { id: "heading-1" });
  assert.deepEqual(args.query, { source: "test" });
  assert.equal(args.confirm, true);
  assert.equal(args.idempotencyKey, "status-1");
  assert.deepEqual(args.body, { status: "draft" });
});

test("adds default creator assessment config to heading waypoints", () => {
  const operation = operationByName.get("ruddur_create_heading");
  assert.ok(operation);

  const args = normalizeToolArguments(operation, {
    name: "Money and Marriage",
    waypoints: [{ title: "Assess Your Money Mindset" }],
  });

  assert.deepEqual(args.body, {
    name: "Money and Marriage",
    waypoints: [{
      title: "Assess Your Money Mindset",
      creatorAssessmentConfig: DEFAULT_CREATOR_ASSESSMENT_CONFIG,
    }],
  });
});

test("adds default creator assessment config to imported heading waypoints", () => {
  const operation = operationByName.get("ruddur_import_headings");
  assert.ok(operation);

  const args = normalizeToolArguments(operation, {
    body: {
      headings: [{
        name: "Money and Marriage",
        waypoints: [{ title: "Assess Your Money Mindset" }],
      }],
    },
  });

  assert.deepEqual(args.body, {
    headings: [{
      name: "Money and Marriage",
      waypoints: [{
        title: "Assess Your Money Mindset",
        creatorAssessmentConfig: DEFAULT_CREATOR_ASSESSMENT_CONFIG,
      }],
    }],
  });
});

test("adds default creator assessment config to standalone waypoint writes", () => {
  const operation = operationByName.get("ruddur_create_waypoint");
  assert.ok(operation);

  const args = normalizeToolArguments(operation, { title: "Assess Your Money Mindset" });

  assert.deepEqual(args.body, {
    title: "Assess Your Money Mindset",
    creatorAssessmentConfig: DEFAULT_CREATOR_ASSESSMENT_CONFIG,
  });
});

test("preserves existing creator assessment config", () => {
  const operation = operationByName.get("ruddur_create_heading");
  assert.ok(operation);

  const existingConfig = { version: "schema-v1", mode: "checklist", required: true };
  const args = normalizeToolArguments(operation, {
    name: "Money and Marriage",
    waypoints: [{ title: "Assess Your Money Mindset", creatorAssessmentConfig: existingConfig }],
  });

  assert.deepEqual((args.body as { waypoints: Array<{ creatorAssessmentConfig: unknown }> }).waypoints[0].creatorAssessmentConfig, existingConfig);
});
