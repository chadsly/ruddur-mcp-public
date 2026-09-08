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


test("upstream failures never expose HTML or server diagnostic objects", async () => {
  const operation = operationByName.get("ruddur_search_client_coaches")!;
  for (const [status, contentType, body] of [
    [500, "text/html", "<html>Internal Server Error: private database credentials</html>"],
    [502, "application/json", JSON.stringify({ error: "private database credentials", stack: "private stack" })],
    [422, "application/json", "{malformed private response"],
    [404, "text/html", "<html>private proxy details</html>"],
  ] as const) {
    const client = new RuddurClient("https://api.example.test", "secret-token", 1000,
      async () => new Response(body, { status, headers: { "content-type": contentType } }));
    await assert.rejects(() => client.call(operation, {}), (error: unknown) => {
      assert.ok(error instanceof RuddurApiError);
      assert.equal(error.status, status);
      assert.doesNotMatch(JSON.stringify(error.responseBody), /private|<html>|stack/);
      assert.equal((error.responseBody as { code: string }).code, status >= 500 ? "UPSTREAM_ERROR" : "API_ERROR");
      return true;
    });
  }
});

test("expected validation errors retain code and message without unrelated fields", async () => {
  const operation = operationByName.get("ruddur_preview_client_coaching_slots")!;
  const client = new RuddurClient("https://api.example.test", "secret-token", 1000,
    async () => new Response(JSON.stringify({ code: "INVALID_DATE", error: "date must be YYYY-MM-DD", stack: "private", creatorId: "private" }),
      { status: 422, headers: { "content-type": "application/json" } }));
  await assert.rejects(() => client.call(operation, { pathParams: { id: "test" } }), (error: unknown) => {
    assert.ok(error instanceof RuddurApiError);
    assert.deepEqual(error.responseBody, { code: "INVALID_DATE", error: "date must be YYYY-MM-DD" });
    return true;
  });
});
