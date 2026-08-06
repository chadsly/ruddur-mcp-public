# Codex marketplace submission

The plugin at `plugins/ruddur` connects to `https://mcp.ruddur.com/mcp`. Its marketplace policy uses authentication on first use. Ruddur performs browser OAuth with PKCE; users do not supply a token or environment file.

Before submission:

1. Deploy the backend OAuth routes, frontend consent page, and public MCP container.
2. Verify TLS and both OAuth discovery documents from the public internet.
3. Run the plugin validator and MCP test suite.
4. Install from this repository and complete OAuth in Codex.
5. Verify scoped tool discovery, one read call, one explicitly confirmed write call, expiry, and revocation.
6. Submit the marketplace package with the Ruddur privacy policy, terms, support contact, and security-review details required by the current public marketplace process.
