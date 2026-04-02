---
name: server-actions
description: "Deploy forkfeed server code, push manifests, publish MCP package, or all. Asks which action to run."
user-invocable: true
allowed-tools: Bash, AskUserQuestion
---

# Forkfeed Server Actions

Ask the user which action they want to perform using AskUserQuestion with these 4 options:

1. **Publish all** - Deploy card server, push manifests, build + publish MCP package. The full release.
2. **Push manifests** - Push all manifests to production via app-server.
3. **Publish MCP** - Build and publish the forkfeed-mcp npm package only.
4. **Wipe DB** - Delete all content from production D1.

Less common actions (deploy-only, deploy+push, deploy+MCP) are reachable via the "Other" free-text input.

## After the user picks

Run the corresponding commands:

- **Publish all**:
  ```bash
  npm run deploy && npm run push && cd packages/forkfeed-mcp && npm run build && npm publish
  ```

- **Push manifests**: `npm run push`

- **Publish MCP**:
  ```bash
  cd packages/forkfeed-mcp && npm run build && npm publish
  ```

- **Wipe DB**: Ask for confirmation first ("This will delete ALL content from the production D1 database. Are you sure?"). If confirmed, run:
  ```bash
  npx wrangler d1 execute forkfeed-server-db --remote --command="DELETE FROM cards; DELETE FROM feeds; DELETE FROM forks; DELETE FROM engagement_events;"
  ```
  After wiping, suggest running `npm run push` to re-populate from manifests.

## MCP version bump

Before publishing MCP, check if `packages/forkfeed-mcp/src/` has changed since the last publish. If yes, bump the patch version in `packages/forkfeed-mcp/package.json` before building.

Show the output to the user. If it fails, show the error and suggest checking FORKFEED_TOKEN, npm auth, or network connectivity.
