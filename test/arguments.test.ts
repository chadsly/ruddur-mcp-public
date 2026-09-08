import assert from "node:assert/strict";
import test from "node:test";
import { normalizeToolArguments } from "../src/arguments.js";
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

test("does not add assessment config to ordinary heading waypoints", () => {
  const operation = operationByName.get("ruddur_create_heading");
  assert.ok(operation);

  const args = normalizeToolArguments(operation, {
    name: "Money and Marriage",
    waypoints: [{ title: "Assess Your Money Mindset" }],
  });

  assert.deepEqual(args.body, {
    name: "Money and Marriage",
    nodes: [{
      id: "assess-your-money-mindset",
      type: "default",
      data: {
        label: "Assess Your Money Mindset",
        labelText: "Assess Your Money Mindset",
        status: "not_started",
      },
      position: { x: 200, y: 160 },
      status: "not_started",
    }],
    edges: [],
    waypoints: [{
      id: "assess-your-money-mindset",
      title: "Assess Your Money Mindset",
      placement: {
        nodeId: "assess-your-money-mindset",
        order: 0,
        status: "not_started",
        position: { x: 200, y: 160 },
        type: "default",
      },
    }],
  });
});

test("does not add assessment config to imported ordinary heading waypoints", () => {
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
      nodes: [{
        id: "assess-your-money-mindset",
        type: "default",
        data: {
          label: "Assess Your Money Mindset",
          labelText: "Assess Your Money Mindset",
          status: "not_started",
        },
        position: { x: 200, y: 160 },
        status: "not_started",
      }],
      edges: [],
      waypoints: [{
        id: "assess-your-money-mindset",
        title: "Assess Your Money Mindset",
        placement: {
          nodeId: "assess-your-money-mindset",
          order: 0,
          status: "not_started",
          position: { x: 200, y: 160 },
          type: "default",
        },
      }],
    }],
  });
});

test("does not add assessment config to ordinary standalone waypoint writes", () => {
  const operation = operationByName.get("ruddur_create_waypoint");
  assert.ok(operation);

  const args = normalizeToolArguments(operation, { title: "Assess Your Money Mindset" });

  assert.deepEqual(args.body, { title: "Assess Your Money Mindset" });
});

test("preserves existing assessment config", () => {
  const operation = operationByName.get("ruddur_create_heading");
  assert.ok(operation);

  const existingConfig = { kind: "creator-assessment", schemaVersion: 1, version: "2.0.0" };
  const args = normalizeToolArguments(operation, {
    name: "Money and Marriage",
    waypoints: [{ title: "Assess Your Money Mindset", assessmentConfig: existingConfig }],
  });

  assert.deepEqual((args.body as { waypoints: Array<{ assessmentConfig: unknown }> }).waypoints[0].assessmentConfig, existingConfig);
});

test("maps creatorAssessmentConfig alias to assessmentConfig", () => {
  const operation = operationByName.get("ruddur_create_waypoint");
  assert.ok(operation);

  const existingConfig = { kind: "creator-assessment", schemaVersion: 1, version: "2.0.0" };
  const args = normalizeToolArguments(operation, {
    title: "Assess Your Money Mindset",
    creatorAssessmentConfig: existingConfig,
  });

  assert.deepEqual(args.body, {
    title: "Assess Your Money Mindset",
    assessmentConfig: existingConfig,
  });
});

test("normalizes marketplace creator JSON into listing and heading payload", () => {
  const operation = operationByName.get("ruddur_create_marketplace_listing");
  assert.ok(operation);

  const args = normalizeToolArguments(operation, {
    title: "Money and Marriage",
    marketplace: {
      description: "Understand your financial relationship.",
      price: "0",
      currency: "usd",
      status: "published",
      tags: "money, marriage",
    },
    waypoints: [{ title: "Assess Your Money Mindset" }],
  });

  assert.deepEqual(args.body, {
    name: "Money and Marriage",
    description: "Understand your financial relationship.",
    price: "0",
    currency: "USD",
    status: "PUBLISHED",
    tags: ["money", "marriage"],
    heading: {
      name: "Money and Marriage",
      nodes: [{
        id: "assess-your-money-mindset",
        type: "default",
        data: {
          label: "Assess Your Money Mindset",
          labelText: "Assess Your Money Mindset",
          status: "not_started",
        },
        position: { x: 200, y: 160 },
        status: "not_started",
      }],
      edges: [],
      waypoints: [{
        id: "assess-your-money-mindset",
        title: "Assess Your Money Mindset",
        placement: {
          nodeId: "assess-your-money-mindset",
          order: 0,
          status: "not_started",
          position: { x: 200, y: 160 },
          type: "default",
        },
      }],
    },
  });
});

test("adds sequential canvas edges for multi-waypoint headings", () => {
  const operation = operationByName.get("ruddur_create_heading");
  assert.ok(operation);

  const args = normalizeToolArguments(operation, {
    name: "Planning",
    waypoints: [
      { title: "Choose a Planning Time" },
      { title: "Review Commitments" },
    ],
  });

  assert.deepEqual((args.body as { edges: unknown[] }).edges, [{
    id: "choose-a-planning-time->review-commitments",
    source: "choose-a-planning-time",
    target: "review-commitments",
    animated: true,
    markerEnd: { type: "arrowclosed" },
  }]);
});

test("normalizes media aliases", () => {
  const rename = operationByName.get("ruddur_update_media_asset");
  assert.ok(rename);
  assert.deepEqual(normalizeToolArguments(rename, { title: "Cover Image" }).body, { title: "Cover Image", name: "Cover Image" });

  const presign = operationByName.get("ruddur_create_media_upload");
  assert.ok(presign);
  assert.deepEqual(normalizeToolArguments(presign, {
    name: "cover.png",
    mimeType: "image/png",
    size: 1234,
  }).body, {
    name: "cover.png",
    mimeType: "image/png",
    size: 1234,
    fileName: "cover.png",
    contentType: "image/png",
    fileSize: 1234,
  });
});

test("normalizes coupon aliases", () => {
  const operation = operationByName.get("ruddur_create_coupon");
  assert.ok(operation);

  const args = normalizeToolArguments(operation, {
    marketplaceListingId: "listing-1",
    promoCode: "save20",
    percentOff: 20,
    expires: "2026-12-31",
    usageLimit: 50,
  });

  assert.deepEqual(args.body, {
    marketplaceListingId: "listing-1",
    promoCode: "save20",
    percentOff: 20,
    expires: "2026-12-31",
    usageLimit: 50,
    listingId: "listing-1",
    expiresAt: "2026-12-31",
    maxRedemptions: 50,
    code: "save20",
    discountType: "PERCENT",
    discountValue: 20,
  });
});

test("normalizes SKU-scoped promotion aliases", () => {
  const operation = operationByName.get("ruddur_create_promotion");
  assert.ok(operation);
  const args = normalizeToolArguments(operation, {
    promoCode: "launch25", percentOff: 25, skus: ["HDG-LAUNCH-1234"],
    starts: "2026-09-01T00:00:00Z", expires: "2026-09-30T00:00:00Z",
    usageLimit: 100, perCustomerLimit: 1, minimumSpend: 500,
  });
  assert.deepEqual(args.body, {
    promoCode: "launch25", percentOff: 25, skus: ["HDG-LAUNCH-1234"], starts: "2026-09-01T00:00:00Z",
    expires: "2026-09-30T00:00:00Z", usageLimit: 100, perCustomerLimit: 1, minimumSpend: 500,
    code: "launch25", offeringIds: ["HDG-LAUNCH-1234"], startsAt: "2026-09-01T00:00:00Z",
    expiresAt: "2026-09-30T00:00:00Z", maxRedemptions: 100, maxRedemptionsPerCustomer: 1,
    minimumPurchaseAmount: 500, discountType: "PERCENTAGE", discountValue: 25, scope: "SPECIFIC_OFFERINGS",
  });
});

test("normalizes waypoint placement aliases", () => {
  const operation = operationByName.get("ruddur_attach_waypoint");
  assert.ok(operation);

  const args = normalizeToolArguments(operation, {
    heading: "heading-1",
    index: 2,
    state: "not_started",
  });

  assert.deepEqual(args.body, {
    heading: "heading-1",
    index: 2,
    state: "not_started",
    headingId: "heading-1",
    placement: {
      order: 2,
      status: "not_started",
    },
  });
});

test("normalizes collaborator and creator profile aliases", () => {
  const collaborator = operationByName.get("ruddur_add_heading_collaborator");
  assert.ok(collaborator);
  assert.deepEqual(normalizeToolArguments(collaborator, {
    userId: "user-2",
    permission: "editor",
  }).body, {
    userId: "user-2",
    permission: "editor",
    collaboratorUserId: "user-2",
    role: "editor",
  });

  const profile = operationByName.get("ruddur_update_creator_profile");
  assert.ok(profile);
  assert.deepEqual(normalizeToolArguments(profile, { name: "Chad" }).body, { name: "Chad", displayName: "Chad" });
});

test("normalizes analytics and entitlement aliases", () => {
  const event = operationByName.get("ruddur_record_creator_event");
  assert.ok(event);
  assert.deepEqual(normalizeToolArguments(event, {
    event: "heading_created",
    timestamp: "2026-06-26T00:00:00.000Z",
  }).body, {
    event: "heading_created",
    timestamp: "2026-06-26T00:00:00.000Z",
    eventType: "heading_created",
    occurredAt: "2026-06-26T00:00:00.000Z",
  });

  const entitlement = operationByName.get("ruddur_verify_entitlement");
  assert.ok(entitlement);
  assert.deepEqual(normalizeToolArguments(entitlement, {
    marketplaceListingId: "listing-1",
    customerUserId: "user-3",
  }).body, {
    marketplaceListingId: "listing-1",
    customerUserId: "user-3",
    listingId: "listing-1",
    userId: "user-3",
  });
});
