import assert from "node:assert/strict";
import test from "node:test";
import { resolveBodyLimit, resolveBodyLimitMb } from "../src/body-limit.js";

test("uses the shared upload maximum by default", () => {
  assert.equal(resolveBodyLimit({ UPLOAD_MAX_MB: "10" }), "10mb");
  assert.equal(
    resolveBodyLimit({ UPLOAD_MAX_MB: "10", RUDDUR_MCP_BODY_MAX_MB: "" }),
    "10mb",
  );
});

test("allows an MCP-specific body maximum override", () => {
  assert.equal(
    resolveBodyLimit({
      UPLOAD_MAX_MB: "10",
      RUDDUR_MCP_BODY_MAX_MB: "14",
    }),
    "14mb",
  );
});

test("falls back safely when configuration is missing or invalid", () => {
  assert.equal(resolveBodyLimitMb({}), 10);
  assert.equal(resolveBodyLimitMb({ UPLOAD_MAX_MB: "invalid" }), 10);
  assert.equal(resolveBodyLimitMb({ UPLOAD_MAX_MB: "0" }), 10);
});
