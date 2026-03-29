---
name: server-actions
description: "Deploy forkfeed server code, sync manifests, or both. Asks which action to run."
user-invocable: true
allowed-tools: Bash, AskUserQuestion
---

# Forkfeed Server Actions

Ask the user which action they want to perform using AskUserQuestion with these 4 options:

1. **Publish (deploy + sync)** - Deploy code and sync all manifests to production. This is the most common action.
2. **Deploy only** - Deploy code to Cloudflare Workers without syncing manifest data.
3. **Sync only** - Upload all manifests to production D1 without redeploying code.
4. **Wipe DB** - Delete all content from the production D1 database (forks, feeds, cards, engagement). Useful before a clean re-sync.

## After the user picks

Run the corresponding command:

- **Publish**: `npm run publish`
- **Deploy only**: `npm run deploy`
- **Sync only**: `npm run sync`
- **Wipe DB**: Ask for confirmation first ("This will delete ALL content from the production D1 database. Are you sure?"). If confirmed, run:
  ```bash
  npx wrangler d1 execute forkfeed-server-db --remote --command="DELETE FROM cards; DELETE FROM feeds; DELETE FROM forks; DELETE FROM engagement_events;"
  ```
  After wiping, suggest running `npm run sync` to re-populate from manifests.

Show the output to the user. If it fails, show the error and suggest checking ADMIN_KEY or network connectivity.
