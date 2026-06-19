import assert from "node:assert/strict";
import test from "node:test";
import { loadConfig } from "../src/config.js";

test("RUDDUR_API_BASE defaults to https://ruddur.com", () => {
  const originalBase = process.env.RUDDUR_API_BASE;
  const originalToken = process.env.RUDDUR_CREATOR_API_TOKEN;
  try {
    delete process.env.RUDDUR_API_BASE;
    process.env.RUDDUR_CREATOR_API_TOKEN = "test-token";
    assert.equal(loadConfig().apiBase, "https://ruddur.com");
  } finally {
    if (originalBase === undefined) delete process.env.RUDDUR_API_BASE;
    else process.env.RUDDUR_API_BASE = originalBase;
    if (originalToken === undefined) delete process.env.RUDDUR_CREATOR_API_TOKEN;
    else process.env.RUDDUR_CREATOR_API_TOKEN = originalToken;
  }
});
