import assert from "node:assert/strict";
import test from "node:test";
import { RuddurApiError, RuddurClient } from "../src/client.js";
import { operationByName } from "../src/catalog.js";

test("client adds bearer auth, query parameters, and JSON body", async () => {
  let captured: { url?: string; init?: RequestInit } = {};
  const fetchImpl: typeof fetch = async (input, init) => {
    captured = { url: String(input), init };
    return new Response(JSON.stringify({ ok: true }), {
      status: 201,
      headers: { "content-type": "application/json" },
    });
  };
  const operation = operationByName.get("ruddur_create_heading");
  assert.ok(operation);
  const client = new RuddurClient("https://api.example.test", "secret-token", 1000, fetchImpl);
  const result = await client.call(operation, {
    query: { source: "mcp" },
    body: { name: "Plan" },
    idempotencyKey: "audit-1",
  });

  assert.equal(captured.url, "https://api.example.test/api/creator/headings?source=mcp");
  assert.equal(new Headers(captured.init?.headers).get("Authorization"), "Bearer secret-token");
  assert.equal(new Headers(captured.init?.headers).get("Content-Type"), "application/json");
  assert.equal(new Headers(captured.init?.headers).get("Idempotency-Key"), "audit-1");
  assert.equal(captured.init?.body, JSON.stringify({ name: "Plan" }));
  assert.deepEqual(result, { status: 201, body: { ok: true } });
});

test("client returns structured API errors", async () => {
  const fetchImpl: typeof fetch = async () => new Response(JSON.stringify({ code: "INSUFFICIENT_SCOPE" }), {
    status: 403,
    headers: { "content-type": "application/json" },
  });
  const operation = operationByName.get("ruddur_create_heading");
  assert.ok(operation);
  const client = new RuddurClient("https://api.example.test", "secret-token", 1000, fetchImpl);
  await assert.rejects(
    () => client.call(operation, { body: {} }),
    (error: unknown) => error instanceof RuddurApiError && error.status === 403,
  );
});
