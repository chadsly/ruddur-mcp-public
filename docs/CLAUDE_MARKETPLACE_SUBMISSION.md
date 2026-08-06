# Claude marketplace submission

The plugin at `plugins/ruddur-claude` connects to the public Streamable HTTP endpoint `https://mcp.ruddur.com/mcp`. Authentication uses OAuth Authorization Code with PKCE and opens Ruddur's browser login/consent screen on first use. Users do not configure environment variables.

Before submission:

1. Deploy and verify the public HTTPS endpoint and OAuth discovery routes.
2. Run `npx -y @anthropic-ai/claude-code plugin validate plugins/ruddur-claude --strict`.
3. Install the marketplace from this repository and complete a browser OAuth flow.
4. Verify one read call, one approved write call, token expiry behavior, and revocation.
5. Submit the repository and required privacy, terms, support, and security-review information through Anthropic's current marketplace process.
