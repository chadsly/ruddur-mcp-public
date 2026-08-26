# Connect Claude to Ruddur

This guide connects Claude Code to your Ruddur creator account on macOS or Linux. Use the hosted marketplace installation when it is available. The local installation is retained for development and pre-deployment testing.

## Recommended: Hosted Marketplace Installation

The hosted Ruddur plugin connects to `https://mcp.ruddur.com/mcp` and signs you in through Ruddur's browser-based authorization flow. It does not require Node.js, a local `.env` file, or a pasted API token.

Add Ruddur's marketplace, install the plugin for your user account, and enable it:

```bash
claude plugin marketplace add https://gitlab.com/ruddur1/ruddur-mcp.git
claude plugin install ruddur@ruddur-plugins --scope user
claude plugin enable ruddur@ruddur-plugins --scope user
```

Restart Claude Code, then confirm that the plugin is installed:

```bash
claude plugin list
```

On first use, Claude opens Ruddur's browser login and consent flow. Complete that flow, then ask Claude to retrieve your Ruddur creator profile without making changes.

If the hosted endpoint or marketplace installation is not yet available, use the local installation below.

## Local Development Installation

### What You Need

- Your Ruddur Creator API token
- Claude Code installed and signed in
- Node.js version 20 or newer
- About five minutes

Keep your API token private. Do not paste it into a Claude conversation or share it with anyone.

### 1. Check Claude Code and Node.js

Open Terminal and run:

```bash
claude --version
node --version
npx --version
```

Each command should print a version. The Node.js result must start with `v20` or a higher number. If `claude` is not found, install [Claude Code](https://docs.anthropic.com/en/docs/claude-code/setup). If `node` or `npx` is not found, or Node.js is older than version 20, install the LTS version from [nodejs.org](https://nodejs.org/) and reopen Terminal.

### 2. Create Your Private Ruddur Credentials File

Run:

```bash
mkdir -p ~/.ruddur
chmod 700 ~/.ruddur
nano ~/.ruddur/.env
```

Paste the following into the editor, replacing `PASTE_YOUR_TOKEN_HERE` with your Ruddur Creator API token:

```dotenv
RUDDUR_API_BASE=https://ruddur.com
RUDDUR_CREATOR_API_TOKEN=PASTE_YOUR_TOKEN_HERE
RUDDUR_MCP_ALLOW_MUTATIONS=false
```

Save the file:

1. Press `Control-O`.
2. Press `Enter`.
3. Press `Control-X`.

Protect the file by running:

```bash
chmod 600 ~/.ruddur/.env
```

### 3. Connect Ruddur to Claude Code

Copy and run this entire command in Terminal:

```bash
claude mcp add-json --scope user ruddur '{
  "type": "stdio",
  "command": "npx",
  "args": ["-y", "git+https://gitlab.com/ruddur1/ruddur-mcp.git"],
  "env": {
    "RUDDUR_MCP_ENV_FILE": "'"$HOME"'/.ruddur/.env"
  }
}'
```

The `--scope user` option makes Ruddur available in Claude Code from any project on this computer. The first connection may take a minute while `npx` downloads and builds the MCP server from GitLab. No repository clone is required.

Confirm that Ruddur is connected:

```bash
claude mcp get ruddur
```

You should see the `ruddur` server configuration with a connected status. You can also run `claude mcp list` to see all configured MCP servers.

### 4. Run the First Tests

Start Claude Code:

```bash
claude
```

Send these requests one at a time.

### Confirm the connection

> Use the Ruddur MCP server to retrieve my Ruddur creator profile. Do not make any changes.

### List your Headings

> Use the Ruddur MCP server to list my Headings. Show their names, IDs, and statuses. Do not modify anything.

### Check a Heading and its Waypoints

Replace `[HEADING_ID]` with an ID from the previous response:

> Retrieve Ruddur Heading `[HEADING_ID]` and list its Waypoints. Include each Waypoint's creator assessment configuration. Do not modify anything.

### Check marketplace access

> Search the Ruddur marketplace for published Headings. Return the first five results. Do not purchase, license, or modify anything.

If these tests work, Claude is connected to Ruddur in read-only mode. In read-only mode, Claude will only see tools with names like `get`, `list`, `search`, and `export`. That is expected.

### 5. Allow Claude to Create and Edit Content

Only do this after the read-only tests pass.

Exit Claude Code. Then run:

```bash
nano ~/.ruddur/.env
```

Change:

```dotenv
RUDDUR_MCP_ALLOW_MUTATIONS=false
```

to:

```dotenv
RUDDUR_MCP_ALLOW_MUTATIONS=true
```

Save with `Control-O`, `Enter`, and `Control-X`. Start Claude Code again:

```bash
claude
```

Before creating anything, confirm Claude can now see Ruddur write tools:

> Use the Ruddur MCP server to list the available Ruddur tools. Confirm whether tools such as ruddur_create_heading and ruddur_create_waypoint are available. Do not make any changes yet.

If Claude says it only sees read-scoped tools, fully exit Claude Code, confirm `RUDDUR_MCP_ALLOW_MUTATIONS=true` is saved in `~/.ruddur/.env`, and start Claude Code again.

Create a useful private draft that you can review and continue developing:

> Use the Ruddur MCP server to create a private draft Heading named "Build a Consistent Weekly Planning Habit." Describe it as a practical path for reviewing priorities, planning the coming week, and following through on important work. Add these Waypoints in order:
>
> 1. Choose a regular weekly planning time.
> 2. Review unfinished tasks and current commitments.
> 3. Select the three most important outcomes for the coming week.
> 4. Schedule the first action for each priority.
> 5. Complete a short end-of-week reflection.
>
> Give each Waypoint a concise, useful description. Omit creatorAssessmentConfig unless I explicitly ask for an assessment-style waypoint. Keep the Heading private and in draft status. Do not publish it. When finished, show me the Heading ID, each Waypoint ID, and a summary of what you created.

Open Ruddur and review the draft. Confirm that:

- The Heading is private and has not been published.
- The five Waypoints appear in the correct order.
- Each Waypoint has a useful description.
- The ordinary Waypoints do not include a creator assessment configuration.

You can keep and improve this draft. To practice a safe destructive action instead, ask Claude:

> Delete the private draft Heading named "Build a Consistent Weekly Planning Habit." Tell me exactly what will be deleted and ask for confirmation before taking any action.

Claude should ask for confirmation before deleting it.

## Troubleshooting

### Ruddur does not appear in `claude mcp list`

Run `claude mcp get ruddur` to check its configuration. If it does not exist, run the connection command in Step 3 again. Then fully exit and restart Claude Code.

### Ruddur is configured but fails to connect

Run `claude mcp get ruddur` and review the reported error. Confirm that GitLab is reachable from your network and that `npx --version` succeeds. The first launch requires network access so `npx` can download the MCP server and its dependencies.

If Claude reports that a server named `ruddur` already exists and you intentionally want to replace its configuration, remove it and then repeat Step 3:

```bash
claude mcp remove --scope user ruddur
```

### `node` or `npx` is not found

Install the Node.js LTS release from [nodejs.org](https://nodejs.org/), then reopen Terminal.

### Authentication or `401` error

Your API token may be missing, expired, or incorrect. Open `~/.ruddur/.env`, replace the token, and restart Claude Code.

### Permission or `403` error

Your token does not include permission for that operation. Ask your Ruddur administrator for a creator token with the required scopes.

### Claude says mutations are disabled

Set `RUDDUR_MCP_ALLOW_MUTATIONS=true` in `~/.ruddur/.env`, save the file, and restart Claude Code.

### Claude only sees read-scoped tools

Claude is still running the MCP server in read-only mode, or the token was restricted to read-only scopes. First confirm `RUDDUR_MCP_ALLOW_MUTATIONS=true` is saved in `~/.ruddur/.env`, then fully quit and restart Claude Code. If the write tools still do not appear, ask your Ruddur administrator for a Creator API token that includes content management permission.

### Claude asks about `creatorAssessmentConfig`

Tell Claude to omit `creatorAssessmentConfig` for ordinary growth-path Waypoints. Include a valid `creatorAssessmentConfig` only for explicit assessment-style Waypoints. An empty `{}` is not valid.

## Security Reminders

- Never paste your API token into Claude chat.
- Never email or message the `.env` file to anyone.
- Do not store the token in a project or Git repository.
- If the token is exposed, revoke it in Ruddur and create a replacement.
