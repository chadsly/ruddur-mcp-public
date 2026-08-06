import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const readJson = async (path: string) =>
  JSON.parse(await readFile(resolve(repoRoot, path), "utf8"));

test("marketplace package identifies and wires the Ruddur MCP", async () => {
  const manifest = await readJson("plugins/ruddur/.codex-plugin/plugin.json");
  const mcp = await readJson("plugins/ruddur/.mcp.json");
  const marketplace = await readJson(".agents/plugins/marketplace.json");

  assert.equal(manifest.name, "ruddur");
  assert.equal(manifest.mcpServers, "./.mcp.json");
  assert.equal(manifest.interface.privacyPolicyURL, "https://ruddur.com/privacy");
  assert.equal(manifest.interface.termsOfServiceURL, "https://ruddur.com/terms");
  assert.equal(manifest.interface.defaultPrompt.length, 3);

  assert.equal(mcp.mcpServers.ruddur.type, "http");
  assert.equal(mcp.mcpServers.ruddur.url, "https://mcp.ruddur.com/mcp");
  assert.equal(mcp.mcpServers.ruddur.env, undefined);
  assert.doesNotMatch(JSON.stringify(mcp), /token[=:]\s*[A-Za-z0-9_-]{12,}/i);

  assert.equal(marketplace.name, "ruddur-plugins");
  assert.equal(marketplace.plugins[0].name, manifest.name);
  assert.equal(marketplace.plugins[0].source.path, "./plugins/ruddur");
});

test("Claude marketplace package installs a read-only Ruddur MCP", async () => {
  const manifest = await readJson("plugins/ruddur-claude/.claude-plugin/plugin.json");
  const mcp = await readJson("plugins/ruddur-claude/.mcp.json");
  const marketplace = await readJson(".claude-plugin/marketplace.json");

  assert.equal(manifest.name, "ruddur");
  assert.equal(manifest.mcpServers, "./.mcp.json");
  assert.equal(manifest.defaultEnabled, false);

  assert.equal(mcp.mcpServers.ruddur.type, "http");
  assert.equal(mcp.mcpServers.ruddur.url, "https://mcp.ruddur.com/mcp");
  assert.equal(mcp.mcpServers.ruddur.env, undefined);
  assert.doesNotMatch(JSON.stringify(mcp), /token[=:]\s*[A-Za-z0-9_-]{12,}/i);

  assert.equal(marketplace.name, "ruddur-plugins");
  assert.equal(marketplace.plugins[0].name, manifest.name);
  assert.equal(marketplace.plugins[0].source, "./plugins/ruddur-claude");
  assert.equal(marketplace.plugins[0].defaultEnabled, false);
});
