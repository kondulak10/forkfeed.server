---
name: server-actions
description: "Deploy the forkfeed server, regenerate content, or publish a fork to the app. Asks which action to run."
user-invocable: true
allowed-tools: Bash, AskUserQuestion
---

# Forkfeed Server Actions

Content lives as typed files under `forks/` and is bundled into the worker at deploy
time. There is no database and no push step. Ask the user which action they want using
AskUserQuestion with these options:

1. **Publish** - Deploy the worker AND register every fork with the forkfeed app. The common release.
2. **Deploy only** - Regenerate the registry, typecheck, and deploy the worker (no app registration).
3. **Convert manifests** - Migrate legacy `manifests/*.json` into typed `forks/` files.

## After the user picks

Run the corresponding commands:

- **Publish** (deploy + register every fork):
  ```bash
  npm run publish
  ```
  Needs `FORKFEED_SERVER_URL` (deployed worker URL) and `FORKFEED_TOKEN` in `.dev.vars`.
  It deploys, then `scripts/publish.mjs` reads `GET /forks` and registers each fork with
  the app. Forks register as **private**; to go public, change visibility in the app
  (requires admin approval). Use `npm run register` to register without redeploying.

- **Deploy only**:
  ```bash
  npm run deploy
  ```
  (`deploy` self-runs the registry regen + typecheck before `wrangler deploy`.)

- **Convert manifests**: regenerate typed files from legacy JSON (skips generator-backed manifests):
  ```bash
  npm run convert                          # all manifests/*.json
  npm run convert -- manifests/<file>.json # one manifest
  ```
  Then `npm run deploy` (which re-runs convert + typecheck before deploying).

Show the output to the user. If it fails, show the error and suggest checking
FORKFEED_TOKEN, npm auth, or network connectivity.
