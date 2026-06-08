# Forkfeed MCP

Turn your GitHub commits into swipeable forkfeed content - written as typed files
into your forked forkfeed server.

## Prerequisites

- Git (a repo with commits)
- [Claude Code](https://claude.ai/code)
- Node 18+
- Your own forked + deployed `forkfeed.server` (see [DEPLOY.md](DEPLOY.md))
- A forkfeed account token for publishing

## Step 1: Get your token

1. Go to [forkfeed.link/admin/user/token](https://forkfeed.link/admin/user/token)
2. Sign in and click "Generate Token"
3. Copy the `ff_...` token (shown only once)

## Step 2: Add the MCP server

**macOS / Linux / WSL:**
```bash
claude mcp add forkfeed --transport stdio -e FORKFEED_TOKEN=ff_your_token_here -- npx -y forkfeed-mcp@latest
```

**Windows (native):**
```bash
claude mcp add forkfeed --transport stdio -e FORKFEED_TOKEN=ff_your_token_here -- cmd /c npx -y forkfeed-mcp@latest
```

## Step 3: Generate content from a commit

Open Claude Code in your forked forkfeed.server repo (or in any git project, passing
`outDir` to point at your forkserver repo):

```
> /forkfeed
```

or just:

```
> turn my latest commit into forkfeed content
```

Claude analyzes the commit diff, generates 6 swipeable cards, and **writes typed
TypeScript files** into `forks/<forkId>/` in your forkserver repo.

## Step 4: Deploy and publish

In your forkserver repo:

```bash
npm run deploy      # regenerates forks/index.ts + typechecks, then deploys the worker
```

Then register the fork with the forkfeed app (Claude can do this via the
`forkfeed_publish` tool):

```
> publish fork tfip-owner-repo from https://your-worker.workers.dev
```

Your content starts as **private**. To make it public, change visibility in the
forkfeed app (requires admin approval).

## How it works

```
Your Claude Code session
  |
  |-- git CLI --> reads your commit diff + stats
  |-- forkfeed_guide --> learns the card format
  |-- generates 6 cards from the diff
  |-- forkfeed_build --> writes forks/<forkId>/<feedId>.ts + fork.ts (typed)
        |
        you: npm run deploy   (your Cloudflare Worker)
        |
  |-- forkfeed_publish --> registers the fork's metadata with forkfeed.link
        |-- app fetches GET /forks/:forkId from your worker
        |-- stores fork + feeds (private), proxies card reads to your worker
```

## Tools

| Tool | What it does |
|---|---|
| `forkfeed_guide` | Returns the card-format guide |
| `forkfeed_commits` | Lists commits, or returns a commit's diff + suggested images |
| `forkfeed_build` | Writes typed `forks/<forkId>/*.ts` content files |
| `forkfeed_publish` | Registers a deployed fork with the forkfeed app (private) |
| `forkfeed_status` | Lists your published forks + feeds |

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "FORKFEED_TOKEN not set" | Re-run `claude mcp add` with your token |
| "Authentication required" | Token invalid, regenerate at forkfeed.link/admin/user/token |
| "Fork server rejected the read key" | Pass the right `readKey` to `forkfeed_publish` (default `read`) |
| "Fork not found on <url>" | Deploy the worker first (`npm run deploy`) so it serves `GET /forks/:forkId` |
| MCP server not connecting | Run `claude mcp list` to verify it's registered |
