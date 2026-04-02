---
name: server-actions
description: "Deploy forkfeed server code, sync manifests, publish MCP package, or all. Asks which action to run."
user-invocable: true
allowed-tools: Bash, AskUserQuestion
---

# Forkfeed Server Actions

Ask the user which action they want to perform using AskUserQuestion with these 6 options:

1. **Publish all** - Deploy card server, sync manifests, build + publish MCP package. The full release.
2. **Deploy card server** - Deploy code to Cloudflare Workers only.
3. **Sync manifests** - Upload all manifests to production D1 only.
4. **Publish MCP** - Build and publish the forkfeed-mcp npm package only.
5. **Deploy + MCP** - Deploy card server and publish MCP package (no manifest sync).
6. **Wipe DB** - Delete all content from production D1.

## After the user picks

Run the corresponding commands:

- **Publish all**:
  ```bash
  npm run deploy && npm run sync && cd packages/forkfeed-mcp && npm run build && npm publish
  ```

- **Deploy card server**: `npm run deploy`

- **Sync manifests**: `npm run sync`

- **Publish MCP**:
  ```bash
  cd packages/forkfeed-mcp && npm run build && npm publish
  ```

- **Deploy + MCP**:
  ```bash
  npm run deploy && cd packages/forkfeed-mcp && npm run build && npm publish
  ```

- **Wipe DB**: Ask for confirmation first ("This will delete ALL content from the production D1 database. Are you sure?"). If confirmed, run:
  ```bash
  npx wrangler d1 execute forkfeed-server-db --remote --command="DELETE FROM cards; DELETE FROM feeds; DELETE FROM forks; DELETE FROM engagement_events;"
  ```
  After wiping, suggest running `npm run sync` to re-populate from manifests.

## MCP version bump

Before publishing MCP, check if `packages/forkfeed-mcp/src/` has changed since the last publish. If yes, bump the patch version in `packages/forkfeed-mcp/package.json` before building.

Show the output to the user. If it fails, show the error and suggest checking ADMIN_KEY, npm auth, or network connectivity.
