# Forkfeed MCP

Push your GitHub commits to forkfeed as swipeable content, from any project.

## Prerequisites

- Git (you need a repo with commits)
- [Claude Code](https://claude.ai/code)
- Node 18+

---

## Step 1: Get your token

1. Go to [forkfeed.link/admin/user/token](https://forkfeed.link/admin/user/token)
2. Sign in and click "Generate Token"
3. Copy the `ff_...` token (shown only once)

---

## Step 2: Add the MCP server

One command:

**macOS / Linux / WSL:**
```bash
claude mcp add forkfeed --transport stdio -e FORKFEED_TOKEN=ff_your_token_here -- npx -y forkfeed-mcp@latest
```

**Windows (native):**
```bash
claude mcp add forkfeed --transport stdio -e FORKFEED_TOKEN=ff_your_token_here -- cmd /c npx -y forkfeed-mcp@latest
```

That's it. No config files to edit.

---

## Step 3: Push a commit

Open Claude Code in any git project:

```
> push my latest commit to forkfeed
```

Claude will analyze the current repo, fetch the diff, generate 8 swipeable cards, and push them.

Other things you can say:
- "push my last 3 commits to forkfeed"
- "push commit abc1234 to forkfeed"
- "check my forkfeed status"

---

## How it works

```
Your Claude Code session
  |
  |-- git/gh CLI --> reads your commit data
  |-- forkfeed_guide --> learns the card format
  |-- generates 8-card manifest from the diff
  |-- forkfeed_push --> uploads to forkfeed
        |
        forkfeed.link API
          |-- stores cards on the content server
          |-- registers your fork
          |-- done (content starts as private)
```

Your content starts as **private**. To make it public, change visibility in the forkfeed app (requires admin approval).

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "FORKFEED_TOKEN not set" | Re-run `claude mcp add` with your token |
| "Authentication required" | Token invalid, regenerate at forkfeed.link/admin/user/token |
| "Fork owned by another user" | Someone else already registered that repo's fork ID |
| MCP server not connecting | Run `claude mcp list` to verify it's registered |

